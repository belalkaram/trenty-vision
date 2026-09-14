import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Ignore audio context errors (e.g. before user interaction)
  }
}

export function useWebSocket() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountingRef = useRef(false);

  const connect = useCallback(() => {
    if (isUnmountingRef.current) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        console.log('Operations WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { event: eventName, data } = payload;

          switch (eventName) {
            case 'new_message':
            case 'message.created':
            case 'whatsapp.message':
            case 'employee.notification':
            case 'message_status':
            case 'message.updated':
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
              {
                const convId = data?.conversationId || data?.message?.conversationId || data?.id;
                if (convId) {
                  queryClient.invalidateQueries({ queryKey: ['messages', convId] });
                }
              }

              // Play chime and trigger notification for incoming customer messages
              {
                const msg = data?.message || data;
                const isIncoming = msg?.direction === 'incoming' || msg?.senderType === 'customer' || eventName === 'employee.notification';
                if (isIncoming) {
                  playNotificationChime();
                  if ('Notification' in window && Notification.permission === 'granted') {
                    try {
                      const title = msg?.contactName || msg?.contactPhone ? `رسالة جديدة من ${msg.contactName || msg.contactPhone}` : 'رسالة جديدة من العميل';
                      const body = msg?.text || (msg?.type ? `[${msg.type}]` : 'وصلت رسالة جديدة على رقم واتساب الإدارة');
                      new Notification(title, {
                        body,
                        icon: '/public/icons/logo.png',
                      });
                    } catch {
                      // ignore
                    }
                  }
                }
              }
              break;

            case 'conversation_update':
            case 'conversation.updated':
            case 'conversation.read':
            case 'assigned':
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
              if (data?.conversationId || data?.id) {
                const cId = data?.conversationId || data?.id;
                queryClient.invalidateQueries({ queryKey: ['messages', cId] });
              }
              if (eventName === 'assigned') {
                playNotificationChime();
              }
              break;

            case 'conversation.deleted':
            case 'conversation_deleted':
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
              if (data?.conversationId || data?.id) {
                const cId = data?.conversationId || data?.id;
                queryClient.removeQueries({ queryKey: ['messages', cId] });
              }
              break;

            case 'session_update':
            case 'whatsapp.status':
            case 'whatsapp.qr':
            case 'qr':
              queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
              break;

            case 'contacts.sync':
              queryClient.invalidateQueries({ queryKey: ['contacts'] });
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
              break;

            case 'metrics_update':
              queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
              break;

            case 'reminder.created':
            case 'reminder.updated':
            case 'reminder.deleted':
            case 'reminder.due':
              queryClient.invalidateQueries({ queryKey: ['reminders'] });
              // Native notification if supported
              if (eventName === 'reminder.due' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification('تذكير متابعة مستحق', {
                    body: data?.title || 'لديك موعد متابعة محادثة مستحق الآن',
                    icon: '/public/icons/logo.png',
                  });
                } catch {
                  // ignore
                }
              }
              break;

            default:
              break;
          }
        } catch {
          // ignore non-json messages (e.g. heartbeat ping)
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (!isUnmountingRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('WebSocket connection failed:', e);
      if (!isUnmountingRef.current) {
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    }
  }, [queryClient]);

  useEffect(() => {
    isUnmountingRef.current = false;
    connect();

    return () => {
      isUnmountingRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected };
}
