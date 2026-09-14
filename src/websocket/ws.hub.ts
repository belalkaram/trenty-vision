import { WebSocket, RawData } from 'ws';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { logger } from '../utils/logger';

interface WSClient {
  ws: WebSocket;
  userId?: string;
  accountId?: string;
  subscribedEvents: Set<string>;
  lastPing: number;
}

/**
 * WebSocket Hub — manages real-time client connections and broadcasts events.
 * Clients subscribe to WhatsApp session updates, inbox updates, and notifications.
 */
class WebSocketHub {
  private clients: Map<string, WSClient> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private static instance: WebSocketHub;

  private constructor() {}

  static getInstance(): WebSocketHub {
    if (!WebSocketHub.instance) {
      WebSocketHub.instance = new WebSocketHub();
    }
    return WebSocketHub.instance;
  }

  /**
   * Register WebSocket upgrade handler on Fastify instance.
   */
  registerRoutes(app: FastifyInstance): void {
    app.get('/ws', { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
      const clientId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const client: WSClient = {
        ws: socket,
        subscribedEvents: new Set([
          '*',
          'whatsapp.qr',
          'whatsapp.status',
          'whatsapp.connected',
          'whatsapp.disconnected',
          'message.created',
          'message.updated',
          'whatsapp.message',
          'new_message',
          'conversation.updated',
          'conversation_update',
          'assigned',
          'reminder.created',
          'reminder.updated',
          'reminder.due',
        ]),
        lastPing: Date.now(),
      };

      this.clients.set(clientId, client);
      logger.info({ clientId, totalClients: this.clients.size }, 'WebSocket client connected');

      // Send welcome
      this.sendTo(clientId, {
        type: 'system',
        event: 'connected',
        data: { clientId, timestamp: new Date().toISOString() },
      });

      // Handle incoming messages from client
      socket.on('message', (data: RawData) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (err) {
          logger.warn({ clientId, err }, 'Invalid WebSocket message received');
        }
      });

      // Handle pong for heartbeat
      socket.on('pong', () => {
        const c = this.clients.get(clientId);
        if (c) c.lastPing = Date.now();
      });

      // Cleanup on close
      socket.on('close', () => {
        this.clients.delete(clientId);
        logger.info({ clientId, totalClients: this.clients.size }, 'WebSocket client disconnected');
      });

      socket.on('error', (err: Error) => {
        logger.error({ clientId, err }, 'WebSocket client error');
        this.clients.delete(clientId);
      });
    });

    // Start heartbeat
    this.startHeartbeat();
    logger.info('WebSocket Hub initialized on /ws');
  }

  /**
   * Handle messages from client (subscribe/unsubscribe, identity, etc.)
   */
  private handleClientMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        if (message.event) {
          client.subscribedEvents.add(message.event);
        }
        break;
      case 'unsubscribe':
        if (message.event) {
          client.subscribedEvents.delete(message.event);
        }
        break;
      case 'identify':
        client.userId = message.userId;
        client.accountId = message.accountId;
        break;
      case 'ping':
        this.sendTo(clientId, { type: 'pong', timestamp: Date.now() });
        break;
      default:
        break;
    }
  }

  /**
   * Send a message to a specific client.
   */
  private sendTo(clientId: string, payload: any): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(payload));
    }
  }

  /**
   * Broadcast an event to all subscribed clients.
   */
  broadcast(event: string, data: any): void {
    const payload = JSON.stringify({ type: 'event', event, data, timestamp: new Date().toISOString() });
    let sent = 0;

    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN && (client.subscribedEvents.has('*') || client.subscribedEvents.has(event))) {
        client.ws.send(payload);
        sent++;
      }
    }

    if (sent > 0) {
      logger.debug({ event, sentTo: sent, totalClients: this.clients.size }, 'Broadcast event');
    }
  }

  /**
   * Broadcast to clients subscribed to a specific WhatsApp account.
   */
  broadcastToAccount(accountId: string, event: string, data: any): void {
    const payload = JSON.stringify({ type: 'event', event, data, accountId, timestamp: new Date().toISOString() });

    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN && client.subscribedEvents.has(event)) {
        client.ws.send(payload);
      }
    }
  }

  /**
   * Heartbeat ping/pong every 30s to keep connections alive.
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      for (const [clientId, client] of this.clients) {
        if (now - client.lastPing > 60000) {
          // No pong for 60s, terminate
          client.ws.terminate();
          this.clients.delete(clientId);
          logger.info({ clientId }, 'WebSocket client terminated due to heartbeat timeout');
        } else if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      }
    }, 30000);
  }

  /**
   * Shutdown the hub — close all connections.
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const [clientId, client] of this.clients) {
      client.ws.close(1001, 'Server shutting down');
    }
    this.clients.clear();
    logger.info('WebSocket Hub shut down');
  }

  get clientCount(): number {
    return this.clients.size;
  }
}

export const wsHub = WebSocketHub.getInstance();
