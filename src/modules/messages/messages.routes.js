"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagesRoutes = messagesRoutes;
var drizzle_orm_1 = require("drizzle-orm");
var zod_1 = require("zod");
var client_1 = require("../../database/client");
var index_1 = require("../../database/schema/index");
var auth_middleware_1 = require("../../middleware/auth.middleware");
var outbound_queue_service_1 = require("../../services/outbound-queue.service");
var storage_provider_1 = require("../../providers/storage/storage.provider");
var ws_hub_1 = require("../../websocket/ws.hub");
var logger_1 = require("../../utils/logger");
var storage = new storage_provider_1.LocalStorageProvider();
var listMessagesQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().min(1).max(100).default(50),
    offset: zod_1.z.coerce.number().min(0).default(0),
});
var sendMessageSchema = zod_1.z.object({
    text: zod_1.z.string().optional(),
    type: zod_1.z.enum(['text', 'image', 'video', 'audio', 'voice_note', 'document', 'location']).default('text'),
    media: zod_1.z
        .object({
        dataUrl: zod_1.z.string().min(10),
        fileName: zod_1.z.string().optional(),
        mimeType: zod_1.z.string().optional(),
        caption: zod_1.z.string().optional(),
    })
        .optional(),
    quotedMessageId: zod_1.z.string().uuid().optional(),
});
function messagesRoutes(app) {
    return __awaiter(this, void 0, void 0, function () {
        var notesHandler;
        var _this = this;
        return __generator(this, function (_a) {
            app.addHook('preHandler', auth_middleware_1.authenticate);
            /**
             * GET /api/v1/conversations/:conversationId/messages — Paginated messages list
             */
            app.get('/:conversationId/messages', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var conversationId, query, rows, updated, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            conversationId = request.params.conversationId;
                            query = listMessagesQuerySchema.parse(request.query);
                            return [4 /*yield*/, client_1.db
                                    .select({
                                    id: index_1.messages.id,
                                    whatsappMessageId: index_1.messages.whatsappMessageId,
                                    direction: index_1.messages.direction,
                                    senderType: index_1.messages.senderType,
                                    senderUserId: index_1.messages.senderUserId,
                                    senderUserName: index_1.users.name,
                                    type: index_1.messages.type,
                                    text: index_1.messages.text,
                                    mediaId: index_1.messages.mediaId,
                                    quotedMessageId: index_1.messages.quotedMessageId,
                                    status: index_1.messages.status,
                                    timestamp: index_1.messages.timestamp,
                                    metadata: index_1.messages.metadata,
                                    createdAt: index_1.messages.createdAt,
                                })
                                    .from(index_1.messages)
                                    .leftJoin(index_1.users, (0, drizzle_orm_1.eq)(index_1.messages.senderUserId, index_1.users.id))
                                    .where((0, drizzle_orm_1.eq)(index_1.messages.conversationId, conversationId))
                                    .orderBy((0, drizzle_orm_1.asc)(index_1.messages.timestamp))
                                    .limit(query.limit)
                                    .offset(query.offset)];
                        case 1:
                            rows = _a.sent();
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, client_1.db
                                    .update(index_1.conversations)
                                    .set({ unreadCount: '0', updatedAt: new Date() })
                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_1.conversations.id, conversationId), (0, drizzle_orm_1.ne)(index_1.conversations.unreadCount, '0')))
                                    .returning({ id: index_1.conversations.id })];
                        case 3:
                            updated = _a.sent();
                            if (updated.length > 0) {
                                ws_hub_1.wsHub.broadcast('conversation.read', { conversationId: conversationId });
                                ws_hub_1.wsHub.broadcast('conversation.updated', { conversationId: conversationId, unreadCount: 0 });
                            }
                            return [3 /*break*/, 5];
                        case 4:
                            err_1 = _a.sent();
                            logger_1.logger.debug({ err: err_1 }, 'Failed to clear unreadCount on fetch messages');
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/, reply.send({
                                success: true,
                                data: rows,
                                meta: {
                                    limit: query.limit,
                                    offset: query.offset,
                                    count: rows.length,
                                },
                            })];
                    }
                });
            }); });
            /**
             * POST /api/v1/conversations/:conversationId/messages — Send outbound message
             */
            app.post('/:conversationId/messages', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var conversationId, parsed, _a, text, type, media, quotedMessageId, conv, accountId, defaultAccount, rawNumber, toJid, mediaUrl, mediaBuffer, resolvedMimeType, resolvedFileName, metadata, base64Data, _b, storageKey, size, err_2, senderUserId, messageText, whatsappMessageId, savedMsg, sendResult, finalStatus, broadcastPayload;
                var _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            conversationId = request.params.conversationId;
                            parsed = sendMessageSchema.safeParse(request.body);
                            if (!parsed.success) {
                                return [2 /*return*/, reply.status(400).send({ success: false, error: 'Invalid message payload', details: parsed.error.format() })];
                            }
                            _a = parsed.data, text = _a.text, type = _a.type, media = _a.media, quotedMessageId = _a.quotedMessageId;
                            if (!text && !media) {
                                return [2 /*return*/, reply.status(400).send({ success: false, error: 'Message must contain either text or media' })];
                            }
                            return [4 /*yield*/, client_1.db
                                    .select({
                                    id: index_1.conversations.id,
                                    companyId: index_1.conversations.companyId,
                                    whatsappAccountId: index_1.conversations.whatsappAccountId,
                                    contactId: index_1.conversations.contactId,
                                    contactName: index_1.contacts.name,
                                    contactPhone: index_1.contacts.phoneNumber,
                                    contactJid: index_1.contacts.whatsappJid,
                                })
                                    .from(index_1.conversations)
                                    .innerJoin(index_1.contacts, (0, drizzle_orm_1.eq)(index_1.conversations.contactId, index_1.contacts.id))
                                    .where((0, drizzle_orm_1.eq)(index_1.conversations.id, conversationId))
                                    .limit(1)];
                        case 1:
                            conv = (_e.sent())[0];
                            if (!conv) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Conversation not found' })];
                            }
                            accountId = conv.whatsappAccountId;
                            if (!!accountId) return [3 /*break*/, 3];
                            return [4 /*yield*/, client_1.db.select().from(index_1.whatsappAccounts).limit(1)];
                        case 2:
                            defaultAccount = (_e.sent())[0];
                            if (!defaultAccount) {
                                return [2 /*return*/, reply.status(400).send({ success: false, error: 'No WhatsApp account configured on the system' })];
                            }
                            accountId = defaultAccount.id;
                            _e.label = 3;
                        case 3:
                            rawNumber = conv.contactPhone.replace(/\D/g, '');
                            toJid = conv.contactJid || "".concat(rawNumber, "@s.whatsapp.net");
                            mediaBuffer = null;
                            resolvedMimeType = (media === null || media === void 0 ? void 0 : media.mimeType) || 'application/octet-stream';
                            resolvedFileName = (media === null || media === void 0 ? void 0 : media.fileName) || "file_".concat(Date.now());
                            metadata = {};
                            if (!(media && media.dataUrl)) return [3 /*break*/, 7];
                            _e.label = 4;
                        case 4:
                            _e.trys.push([4, 6, , 7]);
                            base64Data = media.dataUrl.includes(';base64,') ? media.dataUrl.split(';base64,')[1] : media.dataUrl;
                            mediaBuffer = Buffer.from(base64Data, 'base64');
                            return [4 /*yield*/, storage.upload(mediaBuffer, {
                                    fileName: resolvedFileName,
                                    mimeType: resolvedMimeType,
                                    directory: 'chat_media',
                                })];
                        case 5:
                            _b = _e.sent(), storageKey = _b.storageKey, size = _b.size;
                            mediaUrl = "/api/v1/media/".concat(encodeURIComponent(storageKey));
                            metadata.url = mediaUrl;
                            metadata.fileName = resolvedFileName;
                            metadata.mimeType = resolvedMimeType;
                            metadata.fileLength = size;
                            if (media.caption)
                                metadata.caption = media.caption;
                            return [3 /*break*/, 7];
                        case 6:
                            err_2 = _e.sent();
                            logger_1.logger.error({ err: err_2 }, 'Failed to save outgoing media file');
                            return [2 /*return*/, reply.status(500).send({ success: false, error: 'Failed to save media file' })];
                        case 7:
                            senderUserId = ((_c = request.user) === null || _c === void 0 ? void 0 : _c.id) || null;
                            messageText = text || (type !== 'text' ? "[".concat(type, "]") : '');
                            whatsappMessageId = "crm_".concat(Date.now(), "_").concat(Math.random().toString(36).substring(2, 7));
                            return [4 /*yield*/, client_1.db
                                    .insert(index_1.messages)
                                    .values({
                                    conversationId: conversationId,
                                    contactId: conv.contactId,
                                    senderType: 'employee',
                                    senderUserId: senderUserId,
                                    direction: 'outgoing',
                                    type: type,
                                    text: messageText,
                                    whatsappMessageId: whatsappMessageId,
                                    quotedMessageId: quotedMessageId || null,
                                    status: 'pending',
                                    metadata: metadata,
                                })
                                    .returning()];
                        case 8:
                            savedMsg = (_e.sent())[0];
                            return [4 /*yield*/, outbound_queue_service_1.OutboundQueueService.sendMessage({
                                    companyId: conv.companyId,
                                    accountId: accountId,
                                    conversationId: conversationId,
                                    messageId: savedMsg.id,
                                    toJid: toJid,
                                    type: type,
                                    text: text,
                                    mediaBuffer: mediaBuffer,
                                    mediaUrl: mediaUrl,
                                    mediaMime: resolvedMimeType,
                                    mediaFilename: resolvedFileName,
                                    caption: text || (media === null || media === void 0 ? void 0 : media.caption),
                                    quotedMessageId: quotedMessageId,
                                })];
                        case 9:
                            sendResult = _e.sent();
                            finalStatus = sendResult.status === 'sent' ? 'sent' : 'queued';
                            if (sendResult.whatsappMessageId) {
                                whatsappMessageId = sendResult.whatsappMessageId;
                            }
                            return [4 /*yield*/, client_1.db
                                    .update(index_1.messages)
                                    .set({
                                    status: finalStatus,
                                    whatsappMessageId: whatsappMessageId,
                                    updatedAt: new Date(),
                                })
                                    .where((0, drizzle_orm_1.eq)(index_1.messages.id, savedMsg.id))];
                        case 10:
                            _e.sent();
                            // 6. Update Conversation last message
                            return [4 /*yield*/, client_1.db
                                    .update(index_1.conversations)
                                    .set({
                                    lastMessageText: messageText,
                                    lastMessageAt: new Date(),
                                    status: 'open',
                                    updatedAt: new Date(),
                                })
                                    .where((0, drizzle_orm_1.eq)(index_1.conversations.id, conversationId))];
                        case 11:
                            // 6. Update Conversation last message
                            _e.sent();
                            broadcastPayload = __assign(__assign({}, savedMsg), { status: finalStatus, whatsappMessageId: whatsappMessageId, senderUserName: ((_d = request.user) === null || _d === void 0 ? void 0 : _d.name) || 'Staff', conversationId: conversationId });
                            ws_hub_1.wsHub.broadcast('whatsapp.message', broadcastPayload);
                            ws_hub_1.wsHub.broadcast('conversation.updated', {
                                conversationId: conversationId,
                                lastMessageText: messageText,
                                lastMessageAt: savedMsg.createdAt,
                            });
                            logger_1.logger.info({ messageId: savedMsg.id, conversationId: conversationId, toJid: toJid, status: finalStatus }, 'Outbound message processed');
                            return [2 /*return*/, reply.status(201).send({
                                    success: true,
                                    data: broadcastPayload,
                                })];
                    }
                });
            }); });
            notesHandler = function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var conversationId, raw, noteText, conv, senderUserId, authorName, savedMsg, broadcastPayload;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            conversationId = request.params.conversationId;
                            raw = request.body || {};
                            noteText = (raw.text || raw.notes || '').trim();
                            if (!noteText) {
                                return [2 /*return*/, reply.status(400).send({ success: false, error: 'Note text is required' })];
                            }
                            return [4 /*yield*/, client_1.db
                                    .select({ id: index_1.conversations.id, contactId: index_1.conversations.contactId })
                                    .from(index_1.conversations)
                                    .where((0, drizzle_orm_1.eq)(index_1.conversations.id, conversationId))
                                    .limit(1)];
                        case 1:
                            conv = (_c.sent())[0];
                            if (!conv) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Conversation not found' })];
                            }
                            senderUserId = ((_a = request.user) === null || _a === void 0 ? void 0 : _a.id) || null;
                            authorName = ((_b = request.user) === null || _b === void 0 ? void 0 : _b.name) || 'فريق العمل';
                            return [4 /*yield*/, client_1.db
                                    .insert(index_1.messages)
                                    .values({
                                    conversationId: conversationId,
                                    contactId: conv.contactId,
                                    senderType: 'employee',
                                    senderUserId: senderUserId,
                                    direction: 'outgoing',
                                    type: 'system',
                                    text: noteText,
                                    status: 'sent',
                                    metadata: {
                                        isInternalNote: true,
                                        authorName: authorName,
                                    },
                                })
                                    .returning()];
                        case 2:
                            savedMsg = (_c.sent())[0];
                            broadcastPayload = __assign(__assign({}, savedMsg), { senderUserName: authorName, conversationId: conversationId });
                            ws_hub_1.wsHub.broadcast('whatsapp.message', broadcastPayload);
                            return [2 /*return*/, reply.status(201).send({
                                    success: true,
                                    data: broadcastPayload,
                                })];
                    }
                });
            }); };
            app.post('/:conversationId/notes', notesHandler);
            app.patch('/:conversationId/notes', notesHandler);
            return [2 /*return*/];
        });
    });
}
