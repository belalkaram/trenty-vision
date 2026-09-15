"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsHub = void 0;
var ws_1 = require("ws");
var logger_1 = require("../utils/logger");
/**
 * WebSocket Hub — manages real-time client connections and broadcasts events.
 * Clients subscribe to WhatsApp session updates, inbox updates, and notifications.
 */
var WebSocketHub = /** @class */ (function () {
    function WebSocketHub() {
        this.clients = new Map();
        this.heartbeatInterval = null;
    }
    WebSocketHub.getInstance = function () {
        if (!WebSocketHub.instance) {
            WebSocketHub.instance = new WebSocketHub();
        }
        return WebSocketHub.instance;
    };
    /**
     * Register WebSocket upgrade handler on Fastify instance.
     */
    WebSocketHub.prototype.registerRoutes = function (app) {
        var _this = this;
        app.get('/ws', { websocket: true }, function (socket, req) {
            var clientId = "ws_".concat(Date.now(), "_").concat(Math.random().toString(36).slice(2, 8));
            var client = {
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
            _this.clients.set(clientId, client);
            logger_1.logger.info({ clientId: clientId, totalClients: _this.clients.size }, 'WebSocket client connected');
            // Send welcome
            _this.sendTo(clientId, {
                type: 'system',
                event: 'connected',
                data: { clientId: clientId, timestamp: new Date().toISOString() },
            });
            // Handle incoming messages from client
            socket.on('message', function (data) {
                try {
                    var message = JSON.parse(data.toString());
                    _this.handleClientMessage(clientId, message);
                }
                catch (err) {
                    logger_1.logger.warn({ clientId: clientId, err: err }, 'Invalid WebSocket message received');
                }
            });
            // Handle pong for heartbeat
            socket.on('pong', function () {
                var c = _this.clients.get(clientId);
                if (c)
                    c.lastPing = Date.now();
            });
            // Cleanup on close
            socket.on('close', function () {
                _this.clients.delete(clientId);
                logger_1.logger.info({ clientId: clientId, totalClients: _this.clients.size }, 'WebSocket client disconnected');
            });
            socket.on('error', function (err) {
                logger_1.logger.error({ clientId: clientId, err: err }, 'WebSocket client error');
                _this.clients.delete(clientId);
            });
        });
        // Start heartbeat
        this.startHeartbeat();
        logger_1.logger.info('WebSocket Hub initialized on /ws');
    };
    /**
     * Handle messages from client (subscribe/unsubscribe, identity, etc.)
     */
    WebSocketHub.prototype.handleClientMessage = function (clientId, message) {
        var client = this.clients.get(clientId);
        if (!client)
            return;
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
    };
    /**
     * Send a message to a specific client.
     */
    WebSocketHub.prototype.sendTo = function (clientId, payload) {
        var client = this.clients.get(clientId);
        if (client && client.ws.readyState === ws_1.WebSocket.OPEN) {
            client.ws.send(JSON.stringify(payload));
        }
    };
    /**
     * Broadcast an event to all subscribed clients.
     */
    WebSocketHub.prototype.broadcast = function (event, data) {
        var payload = JSON.stringify({ type: 'event', event: event, data: data, timestamp: new Date().toISOString() });
        var sent = 0;
        for (var _i = 0, _a = this.clients; _i < _a.length; _i++) {
            var _b = _a[_i], clientId = _b[0], client = _b[1];
            if (client.ws.readyState === ws_1.WebSocket.OPEN && (client.subscribedEvents.has('*') || client.subscribedEvents.has(event))) {
                client.ws.send(payload);
                sent++;
            }
        }
        if (sent > 0) {
            logger_1.logger.debug({ event: event, sentTo: sent, totalClients: this.clients.size }, 'Broadcast event');
        }
    };
    /**
     * Broadcast to clients subscribed to a specific WhatsApp account.
     */
    WebSocketHub.prototype.broadcastToAccount = function (accountId, event, data) {
        var payload = JSON.stringify({ type: 'event', event: event, data: data, accountId: accountId, timestamp: new Date().toISOString() });
        for (var _i = 0, _a = this.clients; _i < _a.length; _i++) {
            var _b = _a[_i], clientId = _b[0], client = _b[1];
            if (client.ws.readyState === ws_1.WebSocket.OPEN && client.subscribedEvents.has(event)) {
                client.ws.send(payload);
            }
        }
    };
    /**
     * Heartbeat ping/pong every 30s to keep connections alive.
     */
    WebSocketHub.prototype.startHeartbeat = function () {
        var _this = this;
        this.heartbeatInterval = setInterval(function () {
            var now = Date.now();
            for (var _i = 0, _a = _this.clients; _i < _a.length; _i++) {
                var _b = _a[_i], clientId = _b[0], client = _b[1];
                if (now - client.lastPing > 60000) {
                    // No pong for 60s, terminate
                    client.ws.terminate();
                    _this.clients.delete(clientId);
                    logger_1.logger.info({ clientId: clientId }, 'WebSocket client terminated due to heartbeat timeout');
                }
                else if (client.ws.readyState === ws_1.WebSocket.OPEN) {
                    client.ws.ping();
                }
            }
        }, 30000);
    };
    /**
     * Shutdown the hub — close all connections.
     */
    WebSocketHub.prototype.shutdown = function () {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        for (var _i = 0, _a = this.clients; _i < _a.length; _i++) {
            var _b = _a[_i], clientId = _b[0], client = _b[1];
            client.ws.close(1001, 'Server shutting down');
        }
        this.clients.clear();
        logger_1.logger.info('WebSocket Hub shut down');
    };
    Object.defineProperty(WebSocketHub.prototype, "clientCount", {
        get: function () {
            return this.clients.size;
        },
        enumerable: false,
        configurable: true
    });
    return WebSocketHub;
}());
exports.wsHub = WebSocketHub.getInstance();
