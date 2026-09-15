"use strict";
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
exports.OutboundQueueService = void 0;
var client_1 = require("../database/client");
var outbound_queue_1 = require("../database/schema/outbound-queue");
var index_1 = require("../config/index");
var logger_1 = require("../utils/logger");
var OutboundQueueService = /** @class */ (function () {
    function OutboundQueueService() {
    }
    /**
     * Universal message dispatcher:
     * - In local mode: attempts direct send via Baileys session socket
     * - In online mode (or if local socket offline): enqueues message into database outbound_queue
     */
    OutboundQueueService.sendMessage = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var companyId, accountId, conversationId, messageId, toJid, _a, type, text, mediaBuffer, mediaUrl, mediaMime, mediaFilename, caption, quotedMessageId, _b, priority, sessionManager, provider, whatsappMessageId, res, res, res, res, res, err_1, mediaData, record, err_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        companyId = options.companyId, accountId = options.accountId, conversationId = options.conversationId, messageId = options.messageId, toJid = options.toJid, _a = options.type, type = _a === void 0 ? 'text' : _a, text = options.text, mediaBuffer = options.mediaBuffer, mediaUrl = options.mediaUrl, mediaMime = options.mediaMime, mediaFilename = options.mediaFilename, caption = options.caption, quotedMessageId = options.quotedMessageId, _b = options.priority, priority = _b === void 0 ? 0 : _b;
                        if (!(index_1.config.DEPLOYMENT_MODE === 'local')) return [3 /*break*/, 16];
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 15, , 16]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('../modules/whatsapp/session.manager'); })];
                    case 2:
                        sessionManager = (_c.sent()).sessionManager;
                        provider = sessionManager.getProvider(accountId);
                        if (!provider) return [3 /*break*/, 13];
                        whatsappMessageId = "crm_".concat(Date.now(), "_").concat(Math.random().toString(36).substring(2, 7));
                        if (!(type === 'text' && text)) return [3 /*break*/, 4];
                        return [4 /*yield*/, provider.sendText(toJid, text, { quotedMessageId: quotedMessageId || undefined })];
                    case 3:
                        res = _c.sent();
                        if (res === null || res === void 0 ? void 0 : res.id)
                            whatsappMessageId = res.id;
                        return [3 /*break*/, 12];
                    case 4:
                        if (!(type === 'image' && mediaBuffer)) return [3 /*break*/, 6];
                        return [4 /*yield*/, provider.sendImage(toJid, mediaBuffer, mediaMime || 'image/jpeg', {
                                caption: caption || text || undefined,
                                quotedMessageId: quotedMessageId || undefined,
                            })];
                    case 5:
                        res = _c.sent();
                        if (res === null || res === void 0 ? void 0 : res.id)
                            whatsappMessageId = res.id;
                        return [3 /*break*/, 12];
                    case 6:
                        if (!(type === 'video' && mediaBuffer)) return [3 /*break*/, 8];
                        return [4 /*yield*/, provider.sendVideo(toJid, mediaBuffer, mediaMime || 'video/mp4', {
                                caption: caption || text || undefined,
                                quotedMessageId: quotedMessageId || undefined,
                            })];
                    case 7:
                        res = _c.sent();
                        if (res === null || res === void 0 ? void 0 : res.id)
                            whatsappMessageId = res.id;
                        return [3 /*break*/, 12];
                    case 8:
                        if (!((type === 'audio' || type === 'voice_note') && mediaBuffer)) return [3 /*break*/, 10];
                        return [4 /*yield*/, provider.sendAudio(toJid, mediaBuffer, type === 'voice_note', {
                                quotedMessageId: quotedMessageId || undefined,
                            })];
                    case 9:
                        res = _c.sent();
                        if (res === null || res === void 0 ? void 0 : res.id)
                            whatsappMessageId = res.id;
                        return [3 /*break*/, 12];
                    case 10:
                        if (!(type === 'document' && mediaBuffer)) return [3 /*break*/, 12];
                        return [4 /*yield*/, provider.sendDocument(toJid, mediaBuffer, mediaFilename || 'file', mediaMime || 'application/octet-stream', {
                                caption: caption || text || undefined,
                                quotedMessageId: quotedMessageId || undefined,
                            })];
                    case 11:
                        res = _c.sent();
                        if (res === null || res === void 0 ? void 0 : res.id)
                            whatsappMessageId = res.id;
                        _c.label = 12;
                    case 12: return [2 /*return*/, {
                            success: true,
                            whatsappMessageId: whatsappMessageId,
                            status: 'sent',
                        }];
                    case 13:
                        logger_1.logger.warn({ accountId: accountId }, 'OutboundQueueService: Local provider not connected, falling back to queue');
                        _c.label = 14;
                    case 14: return [3 /*break*/, 16];
                    case 15:
                        err_1 = _c.sent();
                        logger_1.logger.error({ accountId: accountId, toJid: toJid, err: err_1 === null || err_1 === void 0 ? void 0 : err_1.message }, 'OutboundQueueService: Error in local direct send, queuing message');
                        return [3 /*break*/, 16];
                    case 16:
                        _c.trys.push([16, 18, , 19]);
                        mediaData = mediaBuffer ? mediaBuffer.toString('base64') : (mediaUrl || null);
                        return [4 /*yield*/, client_1.db
                                .insert(outbound_queue_1.outboundQueue)
                                .values({
                                companyId: companyId,
                                accountId: accountId,
                                conversationId: conversationId || null,
                                messageId: messageId || null,
                                toJid: toJid,
                                type: type,
                                text: text || null,
                                mediaData: mediaData,
                                mediaMime: mediaMime || null,
                                mediaFilename: mediaFilename || null,
                                caption: caption || null,
                                quotedMessageId: quotedMessageId || null,
                                priority: priority,
                                status: 'pending',
                            })
                                .returning()];
                    case 17:
                        record = (_c.sent())[0];
                        return [2 /*return*/, {
                                success: true,
                                status: 'queued',
                                queueId: record.id,
                            }];
                    case 18:
                        err_2 = _c.sent();
                        logger_1.logger.error({ err: err_2, companyId: companyId, accountId: accountId, toJid: toJid }, 'OutboundQueueService: Failed to enqueue outbound message');
                        return [2 /*return*/, {
                                success: false,
                                status: 'failed',
                                error: (err_2 === null || err_2 === void 0 ? void 0 : err_2.message) || 'Failed to queue message',
                            }];
                    case 19: return [2 /*return*/];
                }
            });
        });
    };
    return OutboundQueueService;
}());
exports.OutboundQueueService = OutboundQueueService;
