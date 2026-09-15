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
exports.forwardInboundMessageToEmployee = forwardInboundMessageToEmployee;
exports.handleInboundMessage = handleInboundMessage;
var drizzle_orm_1 = require("drizzle-orm");
var client_1 = require("../../database/client");
var index_1 = require("../../database/schema/index");
var ws_hub_1 = require("../../websocket/ws.hub");
var logger_1 = require("../../utils/logger");
var phone_validator_1 = require("../../utils/phone.validator");
var session_manager_1 = require("./session.manager");
var baileys_1 = require("@whiskeysockets/baileys");
var assignment_service_1 = require("../automations/assignment.service");
var whatsapp_reminder_service_1 = require("../reminders/whatsapp-reminder.service");
var landing_sync_service_1 = require("../../services/landing-sync.service");
/**
 * Extracts message content details from a Baileys message object.
 */
function extractMessageContent(msg) {
    var message = msg.message;
    if (!message)
        return { type: 'text', text: null, mediaId: null, metadata: {} };
    if (message.conversation) {
        return { type: 'text', text: message.conversation, mediaId: null, metadata: {} };
    }
    if (message.extendedTextMessage) {
        return {
            type: 'text',
            text: message.extendedTextMessage.text || '',
            mediaId: null,
            metadata: {
                contextInfo: message.extendedTextMessage.contextInfo ? {
                    stanzaId: message.extendedTextMessage.contextInfo.stanzaId,
                    participant: message.extendedTextMessage.contextInfo.participant,
                } : undefined,
            },
        };
    }
    if (message.imageMessage) {
        return {
            type: 'image',
            text: message.imageMessage.caption || null,
            mediaId: null,
            metadata: {
                mimetype: message.imageMessage.mimetype,
                fileLength: message.imageMessage.fileLength,
                width: message.imageMessage.width,
                height: message.imageMessage.height,
            },
        };
    }
    if (message.videoMessage) {
        return {
            type: 'video',
            text: message.videoMessage.caption || null,
            mediaId: null,
            metadata: {
                mimetype: message.videoMessage.mimetype,
                fileLength: message.videoMessage.fileLength,
                seconds: message.videoMessage.seconds,
            },
        };
    }
    if (message.audioMessage) {
        var isVoiceNote = message.audioMessage.ptt === true;
        return {
            type: isVoiceNote ? 'voice_note' : 'audio',
            text: null,
            mediaId: null,
            metadata: {
                mimetype: message.audioMessage.mimetype,
                fileLength: message.audioMessage.fileLength,
                seconds: message.audioMessage.seconds,
                ptt: message.audioMessage.ptt,
            },
        };
    }
    if (message.documentMessage) {
        return {
            type: 'document',
            text: message.documentMessage.caption || null,
            mediaId: null,
            metadata: {
                mimetype: message.documentMessage.mimetype,
                fileName: message.documentMessage.fileName,
                fileLength: message.documentMessage.fileLength,
            },
        };
    }
    if (message.locationMessage) {
        return {
            type: 'location',
            text: message.locationMessage.name || null,
            mediaId: null,
            metadata: {
                latitude: message.locationMessage.degreesLatitude,
                longitude: message.locationMessage.degreesLongitude,
                name: message.locationMessage.name,
                address: message.locationMessage.address,
            },
        };
    }
    if (message.contactMessage || message.contactsArrayMessage) {
        return { type: 'contact', text: null, mediaId: null, metadata: { contact: message.contactMessage || message.contactsArrayMessage } };
    }
    if (message.stickerMessage) {
        return { type: 'sticker', text: null, mediaId: null, metadata: { mimetype: message.stickerMessage.mimetype } };
    }
    return { type: 'text', text: null, mediaId: null, metadata: {} };
}
// Concurrency lock: sequential execution queue per sender to eliminate race conditions
var senderQueues = new Map();
function runInSenderSequence(senderKey, task) {
    var current = senderQueues.get(senderKey) || Promise.resolve();
    var next = current.then(task, task);
    senderQueues.set(senderKey, next);
    next.finally(function () {
        if (senderQueues.get(senderKey) === next) {
            senderQueues.delete(senderKey);
        }
    });
    return next;
}
/**
 * Forwards an incoming customer WhatsApp message directly to the assigned employee's personal WhatsApp number.
 * Built with full anti-loop protection, E.164 normalization, and safe error handling.
 */
function forwardInboundMessageToEmployee(params) {
    return __awaiter(this, void 0, void 0, function () {
        var employeeId, conversationId, contact, message, accountId, accountPhoneNumber, isNewAssignment, rawText, emp, employeeName, rawEmpPhone, phoneValidation, cleanEmpDigits, cleanAccountDigits, provider, _i, _a, _b, p, connectedAccount, candidate, contentSnippet, fileName, cleanCustDigits, directWaLink, contactDisplayName, alertMessage, empJid, sentResult, forwardErr_1, fallbackReason, dbErr_1;
        var _c, _d, _e, _f, _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    _j.trys.push([0, 5, , 10]);
                    employeeId = params.employeeId, conversationId = params.conversationId, contact = params.contact, message = params.message, accountId = params.accountId, accountPhoneNumber = params.accountPhoneNumber, isNewAssignment = params.isNewAssignment;
                    rawText = (message.text || '').trim();
                    if (rawText.startsWith('🔔 *إشعار') ||
                        rawText.startsWith('📩 *رسالة واردة') ||
                        rawText.startsWith('🔔 *عميل جديد') ||
                        rawText.includes('لوحة تحكم CRM') ||
                        rawText.includes('مرسلة آلياً عبر نظام إدارة واتساب CRM')) {
                        logger_1.logger.info({ conversationId: conversationId }, 'Skipping forward: Message is an internal CRM notification banner (anti-loop)');
                        return [2 /*return*/, { success: false, reason: 'anti_loop_banner' }];
                    }
                    return [4 /*yield*/, client_1.db
                            .select({
                            id: index_1.employees.id,
                            whatsappNumber: index_1.employees.whatsappNumber,
                            name: index_1.users.name,
                            email: index_1.users.email,
                            status: index_1.employees.status,
                        })
                            .from(index_1.employees)
                            .leftJoin(index_1.users, (0, drizzle_orm_1.eq)(index_1.employees.userId, index_1.users.id))
                            .where((0, drizzle_orm_1.eq)(index_1.employees.id, employeeId))
                            .limit(1)];
                case 1:
                    emp = (_j.sent())[0];
                    if (!emp) {
                        logger_1.logger.warn({ employeeId: employeeId, conversationId: conversationId }, 'Assigned employee record not found in database');
                        return [2 /*return*/, { success: false, reason: 'employee_not_found' }];
                    }
                    employeeName = emp.name || 'الموظف المسند';
                    if (emp.status === 'inactive') {
                        logger_1.logger.info({ employeeId: employeeId, name: employeeName }, 'Employee is inactive, skipping WhatsApp forward');
                        return [2 /*return*/, { success: false, reason: 'employee_inactive' }];
                    }
                    rawEmpPhone = (emp.whatsappNumber || '').trim();
                    if (!rawEmpPhone) {
                        logger_1.logger.info({ employeeId: employeeId, name: employeeName }, 'Employee has no personal WhatsApp number configured in CRM');
                        return [2 /*return*/, { success: false, reason: 'no_phone_configured' }];
                    }
                    phoneValidation = (0, phone_validator_1.validateAndFormatPhone)(rawEmpPhone);
                    cleanEmpDigits = phoneValidation.digitsOnly || rawEmpPhone.replace(/\D/g, '');
                    if (!cleanEmpDigits || cleanEmpDigits.length < 8) {
                        logger_1.logger.warn({ employeeId: employeeId, rawEmpPhone: rawEmpPhone }, 'Employee WhatsApp number is invalid or too short');
                        return [2 /*return*/, { success: false, reason: 'invalid_employee_phone' }];
                    }
                    cleanAccountDigits = (accountPhoneNumber || '').replace(/\D/g, '');
                    if (cleanAccountDigits && cleanEmpDigits === cleanAccountDigits) {
                        logger_1.logger.warn({ cleanEmpDigits: cleanEmpDigits, cleanAccountDigits: cleanAccountDigits }, 'Employee WhatsApp number is the same as the connected system WhatsApp account (skipping to prevent self-loop)');
                        return [2 /*return*/, { success: false, reason: 'same_as_system_account' }];
                    }
                    provider = accountId ? session_manager_1.sessionManager.getProvider(accountId) : null;
                    if (!provider || ((_c = provider.connectionState) === null || _c === void 0 ? void 0 : _c.status) !== 'connected') {
                        // Look for any connected provider in active sessions
                        for (_i = 0, _a = session_manager_1.sessionManager.getActiveSessions(); _i < _a.length; _i++) {
                            _b = _a[_i], p = _b[1];
                            if (((_d = p.connectionState) === null || _d === void 0 ? void 0 : _d.status) === 'connected') {
                                provider = p;
                                break;
                            }
                        }
                    }
                    if (!(!provider || ((_e = provider.connectionState) === null || _e === void 0 ? void 0 : _e.status) !== 'connected')) return [3 /*break*/, 3];
                    return [4 /*yield*/, client_1.db
                            .select()
                            .from(index_1.whatsappAccounts)
                            .where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.status, 'connected'))
                            .limit(1)];
                case 2:
                    connectedAccount = (_j.sent())[0];
                    if (connectedAccount) {
                        candidate = session_manager_1.sessionManager.getProvider(connectedAccount.id);
                        if (candidate && ((_f = candidate.connectionState) === null || _f === void 0 ? void 0 : _f.status) === 'connected') {
                            provider = candidate;
                        }
                    }
                    _j.label = 3;
                case 3:
                    if (!provider || ((_g = provider.connectionState) === null || _g === void 0 ? void 0 : _g.status) !== 'connected') {
                        logger_1.logger.warn({ accountId: accountId, employeeId: employeeId }, 'Cannot forward message to employee: No active WhatsApp socket provider is currently connected');
                        return [2 /*return*/, { success: false, reason: 'no_active_provider' }];
                    }
                    contentSnippet = message.text || '';
                    if (message.type === 'image') {
                        contentSnippet = message.text ? "\uD83D\uDCF7 [\u0635\u0648\u0631\u0629 \u0645\u0631\u0641\u0642\u0629]: ".concat(message.text) : '📷 [صورة مرفقة من العميل]';
                    }
                    else if (message.type === 'voice_note' || message.type === 'audio') {
                        contentSnippet = '🎤 [رسالة صوتية واردة من العميل]';
                    }
                    else if (message.type === 'document') {
                        fileName = ((_h = message.metadata) === null || _h === void 0 ? void 0 : _h.fileName) || '';
                        contentSnippet = fileName ? "\uD83D\uDCC4 [\u0645\u0633\u062A\u0646\u062F \u0645\u0631\u0641\u0642]: ".concat(fileName) : '📄 [مستند مرفق من العميل]';
                    }
                    else if (message.type === 'video') {
                        contentSnippet = message.text ? "\uD83C\uDFA5 [\u0645\u0642\u0637\u0639 \u0641\u064A\u062F\u064A\u0648]: ".concat(message.text) : '🎥 [مقطع فيديو من العميل]';
                    }
                    else if (message.type === 'location') {
                        contentSnippet = '📍 [موقع جغرافي مرسل من العميل]';
                    }
                    else if (!contentSnippet) {
                        contentSnippet = "[\u0631\u0633\u0627\u0644\u0629 \u0645\u0646 \u0646\u0648\u0639: ".concat(message.type, "]");
                    }
                    cleanCustDigits = (contact.phoneNumber || '').replace(/\D/g, '');
                    directWaLink = cleanCustDigits ? "https://wa.me/".concat(cleanCustDigits) : '';
                    contactDisplayName = contact.name && contact.name !== contact.phoneNumber
                        ? "".concat(contact.name, " (").concat(contact.phoneNumber, ")")
                        : contact.phoneNumber;
                    alertMessage = [
                        isNewAssignment
                            ? "\uD83D\uDD14 *\u0625\u0634\u0639\u0627\u0631: \u0639\u0645\u064A\u0644 \u062C\u062F\u064A\u062F \u0645\u0633\u0646\u062F \u0625\u0644\u064A\u0643*"
                            : "\uD83D\uDCE9 *\u0631\u0633\u0627\u0644\u0629 \u0648\u0627\u0631\u062F\u0629 \u0645\u0646 \u0639\u0645\u064A\u0644 \u0645\u0633\u0646\u062F \u0625\u0644\u064A\u0643*",
                        "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501",
                        "\u0645\u0631\u062D\u0628\u0627\u064B *".concat(employeeName, "*\u060C \u0648\u0635\u0644\u062A\u0643 \u0631\u0633\u0627\u0644\u0629 \u062C\u062F\u064A\u062F\u0629 \u0645\u0646 \u0627\u0644\u0639\u0645\u064A\u0644:"),
                        "\uD83D\uDC64 *\u0627\u0644\u0639\u0645\u064A\u0644:* ".concat(contactDisplayName),
                        "\uD83D\uDCF1 *\u0631\u0642\u0645 \u0627\u0644\u0639\u0645\u064A\u0644:* ".concat(contact.phoneNumber),
                        "\uD83D\uDCAC *\u0627\u0644\u0631\u0633\u0627\u0644\u0629:*",
                        "".concat(contentSnippet),
                        "",
                        directWaLink ? "\uD83D\uDC49 *\u0645\u062D\u0627\u062F\u062B\u0629 \u0627\u0644\u0639\u0645\u064A\u0644 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629:* ".concat(directWaLink) : '',
                        "\u23F0 *\u0627\u0644\u0648\u0642\u062A:* ".concat(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })),
                        "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501",
                        "\u0645\u0631\u0633\u0644\u0629 \u0622\u0644\u064A\u0627\u064B \u0639\u0628\u0631 \u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0648\u0627\u062A\u0633\u0627\u0628 CRM."
                    ].filter(Boolean).join('\n');
                    empJid = "".concat(cleanEmpDigits, "@s.whatsapp.net");
                    return [4 /*yield*/, provider.sendText(empJid, alertMessage)];
                case 4:
                    sentResult = _j.sent();
                    logger_1.logger.info({
                        conversationId: conversationId,
                        employeeId: emp.id,
                        employeeName: employeeName,
                        employeePhone: phoneValidation.formatted || rawEmpPhone,
                        customerPhone: contact.phoneNumber,
                        whatsappMessageId: sentResult === null || sentResult === void 0 ? void 0 : sentResult.id,
                    }, 'Successfully forwarded incoming customer message to assigned employee on WhatsApp');
                    return [2 /*return*/, { success: true }];
                case 5:
                    forwardErr_1 = _j.sent();
                    logger_1.logger.error({
                        err: forwardErr_1 === null || forwardErr_1 === void 0 ? void 0 : forwardErr_1.message,
                        stack: forwardErr_1 === null || forwardErr_1 === void 0 ? void 0 : forwardErr_1.stack,
                        employeeId: params.employeeId,
                        conversationId: params.conversationId,
                    }, 'Error in forwardInboundMessageToEmployee: Exception caught and handled safely');
                    _j.label = 6;
                case 6:
                    _j.trys.push([6, 8, , 9]);
                    fallbackReason = (forwardErr_1 === null || forwardErr_1 === void 0 ? void 0 : forwardErr_1.message) || 'unknown_error';
                    return [4 /*yield*/, client_1.db.insert(index_1.messages).values({
                            conversationId: params.conversationId,
                            contactId: params.contact.id,
                            senderType: 'system',
                            direction: 'outgoing',
                            type: 'system',
                            text: "\u26A0\uFE0F \u062A\u0639\u0630\u0631 \u0625\u0639\u0627\u062F\u0629 \u062A\u0648\u062C\u064A\u0647 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0644\u0644\u0645\u0648\u0638\u0641 \u0639\u0628\u0631 \u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628. \u0627\u0644\u0633\u0628\u0628: ".concat(fallbackReason),
                            status: 'sent',
                        })];
                case 7:
                    _j.sent();
                    ws_hub_1.wsHub.broadcast('conversation_update', { id: params.conversationId });
                    return [3 /*break*/, 9];
                case 8:
                    dbErr_1 = _j.sent();
                    logger_1.logger.error({ dbErr: dbErr_1 }, 'Failed to insert fallback system message for failed forward');
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/, { success: false, reason: (forwardErr_1 === null || forwardErr_1 === void 0 ? void 0 : forwardErr_1.message) || 'unknown_error' }];
                case 10: return [2 /*return*/];
            }
        });
    });
}
/**
 * Processes an incoming WhatsApp message:
 * 1. Idempotency check — skip if whatsapp_message_id already exists
 * 2. Resolve normalized JID and real phone number (even if from WhatsApp LID)
 * 3. Resolve or create Contact
 * 4. Resolve or create Conversation (with strict Persistent Sticky Assignment)
 * 5. Auto-assign conversation if unassigned (respecting persistent sticky agent)
 * 6. Save Message
 * 7. Update Conversation with last message info
 * 8. Broadcast via WebSocket with full employee notification details
 * 9. Dispatch/Forward message to assigned employee on WhatsApp
 */
function handleInboundMessage(accountId, msg) {
    return __awaiter(this, void 0, void 0, function () {
        var whatsappMessageId, remoteJid, normalizedRemoteJid;
        var _this = this;
        var _a, _b;
        return __generator(this, function (_c) {
            whatsappMessageId = (_a = msg.key) === null || _a === void 0 ? void 0 : _a.id;
            remoteJid = (_b = msg.key) === null || _b === void 0 ? void 0 : _b.remoteJid;
            if (!whatsappMessageId || !remoteJid) {
                logger_1.logger.warn({ accountId: accountId }, 'Inbound message missing key data, skipping');
                return [2 /*return*/];
            }
            // Skip status broadcasts
            if (remoteJid === 'status@broadcast')
                return [2 /*return*/];
            normalizedRemoteJid = (0, baileys_1.jidNormalizedUser)(remoteJid);
            // Serialize incoming messages per sender to completely eliminate race conditions
            return [2 /*return*/, runInSenderSequence(normalizedRemoteJid, function () { return __awaiter(_this, void 0, void 0, function () {
                    var existingMsg, resolvedPhoneDigits, isLid, provider, phoneCheck, formattedPhone, contact, account, companyId, displayName, newContact, existing, updates, existingMeta, updated, isFromMe, contactId, contactMeta, conversation_1, isNewConversation, sticky, newConvo, sticky, persistentEmpId, conversationId_1, _a, type, text, mediaId, metadata, messageTimestamp, rawContextInfo, rawQuotedStanzaId, quotedMsg, quotedText, prevMsg, reminderResult, senderType, direction, msgStatus, quotedMessageInternalId, quotedRow, savedMessage, currentUnread, newUnreadCount, wasNewlyAssigned, assignResult, assignErr_1, broadcastMsg, convUpdatePayload, RulesEngine, autoErr_1, err_1;
                    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
                    return __generator(this, function (_w) {
                        switch (_w.label) {
                            case 0:
                                _w.trys.push([0, 34, , 35]);
                                return [4 /*yield*/, client_1.db
                                        .select({ id: index_1.messages.id })
                                        .from(index_1.messages)
                                        .where((0, drizzle_orm_1.eq)(index_1.messages.whatsappMessageId, whatsappMessageId))
                                        .limit(1)];
                            case 1:
                                existingMsg = _w.sent();
                                if (existingMsg.length > 0) {
                                    logger_1.logger.debug({ whatsappMessageId: whatsappMessageId }, 'Duplicate message, skipping');
                                    return [2 /*return*/];
                                }
                                resolvedPhoneDigits = null;
                                isLid = (0, baileys_1.isLidUser)(remoteJid) || remoteJid.endsWith('@lid');
                                if (!isLid) return [3 /*break*/, 3];
                                provider = session_manager_1.sessionManager.getProvider(accountId);
                                if (!provider) return [3 /*break*/, 3];
                                return [4 /*yield*/, provider.getPhoneNumberForLid(remoteJid)];
                            case 2:
                                resolvedPhoneDigits = _w.sent();
                                _w.label = 3;
                            case 3:
                                if (!resolvedPhoneDigits) {
                                    resolvedPhoneDigits = normalizedRemoteJid.split('@')[0];
                                }
                                phoneCheck = (0, phone_validator_1.validateAndFormatPhone)(resolvedPhoneDigits);
                                formattedPhone = phoneCheck.isValid
                                    ? phoneCheck.formatted
                                    : (resolvedPhoneDigits.startsWith('+') ? resolvedPhoneDigits : "+".concat(resolvedPhoneDigits.replace(/\D/g, '')));
                                return [4 /*yield*/, client_1.db
                                        .select()
                                        .from(index_1.contacts)
                                        .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(index_1.contacts.phoneNumber, formattedPhone), (0, drizzle_orm_1.eq)(index_1.contacts.whatsappJid, normalizedRemoteJid), (0, drizzle_orm_1.eq)(index_1.contacts.whatsappJid, remoteJid)))
                                        .limit(1)];
                            case 4:
                                contact = _w.sent();
                                return [4 /*yield*/, client_1.db
                                        .select()
                                        .from(index_1.whatsappAccounts)
                                        .where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, accountId))
                                        .limit(1)];
                            case 5:
                                account = _w.sent();
                                if (account.length === 0) {
                                    logger_1.logger.error({ accountId: accountId }, 'WhatsApp account not found');
                                    return [2 /*return*/];
                                }
                                companyId = account[0].companyId;
                                if (!(contact.length === 0)) return [3 /*break*/, 7];
                                displayName = (msg.pushName && msg.pushName.trim() !== '') ? msg.pushName.trim() : formattedPhone;
                                return [4 /*yield*/, client_1.db
                                        .insert(index_1.contacts)
                                        .values({
                                        companyId: companyId,
                                        name: displayName,
                                        phoneNumber: formattedPhone,
                                        whatsappJid: isLid ? normalizedRemoteJid : (phoneCheck.whatsappJid || normalizedRemoteJid),
                                        source: 'whatsapp',
                                        metadata: {
                                            whatsappPushName: msg.pushName || null,
                                            lid: isLid ? remoteJid : null,
                                            isSavedOnPhone: false,
                                        },
                                    })
                                        .returning()];
                            case 6:
                                newContact = (_w.sent())[0];
                                contact = [newContact];
                                logger_1.logger.info({ phoneNumber: formattedPhone, contactId: newContact.id, displayName: displayName }, 'Created new contact');
                                return [3 /*break*/, 9];
                            case 7:
                                existing = contact[0];
                                updates = { updatedAt: new Date() };
                                if (!existing.whatsappJid || (existing.whatsappJid.endsWith('@lid') && !isLid)) {
                                    updates.whatsappJid = normalizedRemoteJid;
                                }
                                if (msg.pushName && (existing.name === existing.phoneNumber || !existing.name)) {
                                    updates.name = msg.pushName.trim();
                                }
                                existingMeta = (existing.metadata || {});
                                if (msg.pushName && existingMeta.whatsappPushName !== msg.pushName) {
                                    updates.metadata = __assign(__assign({}, existingMeta), { whatsappPushName: msg.pushName, lid: isLid ? remoteJid : existingMeta.lid });
                                }
                                if (!(Object.keys(updates).length > 1)) return [3 /*break*/, 9];
                                return [4 /*yield*/, client_1.db
                                        .update(index_1.contacts)
                                        .set(updates)
                                        .where((0, drizzle_orm_1.eq)(index_1.contacts.id, existing.id))
                                        .returning()];
                            case 8:
                                updated = (_w.sent())[0];
                                if (updated)
                                    contact = [updated];
                                _w.label = 9;
                            case 9:
                                isFromMe = Boolean((_b = msg.key) === null || _b === void 0 ? void 0 : _b.fromMe);
                                // Automatically register incoming customer contact to Trinity Vision landing page (fire-and-forget, non-blocking)
                                if (!isFromMe && !remoteJid.endsWith('@g.us') && !remoteJid.includes('@broadcast')) {
                                    landing_sync_service_1.LandingSyncService.syncContactAsync(contact[0]);
                                }
                                contactId = contact[0].id;
                                contactMeta = (contact[0].metadata || {});
                                return [4 /*yield*/, client_1.db
                                        .select()
                                        .from(index_1.conversations)
                                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_1.conversations.contactId, contactId), (0, drizzle_orm_1.eq)(index_1.conversations.whatsappAccountId, accountId)))
                                        .limit(1)];
                            case 10:
                                conversation_1 = _w.sent();
                                isNewConversation = false;
                                if (!(conversation_1.length === 0)) return [3 /*break*/, 13];
                                return [4 /*yield*/, assignment_service_1.AssignmentService.findStickyAgent(contactId)];
                            case 11:
                                sticky = _w.sent();
                                return [4 /*yield*/, client_1.db
                                        .insert(index_1.conversations)
                                        .values({
                                        companyId: companyId,
                                        contactId: contactId,
                                        whatsappAccountId: accountId,
                                        status: 'open',
                                        assignedEmployeeId: (sticky === null || sticky === void 0 ? void 0 : sticky.employeeId) || contactMeta.assignedEmployeeId || null,
                                        assignedStationId: (sticky === null || sticky === void 0 ? void 0 : sticky.stationId) || null,
                                        assignmentSource: sticky ? 'direct' : 'manual',
                                        lastMessageText: null,
                                        unreadCount: '1',
                                    })
                                        .returning()];
                            case 12:
                                newConvo = (_w.sent())[0];
                                conversation_1 = [newConvo];
                                isNewConversation = true;
                                logger_1.logger.info({ contactId: contactId, conversationId: newConvo.id, assignedEmployeeId: newConvo.assignedEmployeeId }, 'Created new conversation');
                                return [3 /*break*/, 16];
                            case 13:
                                if (!!conversation_1[0].assignedEmployeeId) return [3 /*break*/, 16];
                                return [4 /*yield*/, assignment_service_1.AssignmentService.findStickyAgent(contactId)];
                            case 14:
                                sticky = _w.sent();
                                persistentEmpId = (sticky === null || sticky === void 0 ? void 0 : sticky.employeeId) || contactMeta.assignedEmployeeId || null;
                                if (!persistentEmpId) return [3 /*break*/, 16];
                                conversation_1[0].assignedEmployeeId = persistentEmpId;
                                if (sticky === null || sticky === void 0 ? void 0 : sticky.stationId)
                                    conversation_1[0].assignedStationId = sticky.stationId;
                                return [4 /*yield*/, client_1.db
                                        .update(index_1.conversations)
                                        .set({
                                        assignedEmployeeId: persistentEmpId,
                                        assignedStationId: (sticky === null || sticky === void 0 ? void 0 : sticky.stationId) || conversation_1[0].assignedStationId,
                                        updatedAt: new Date(),
                                    })
                                        .where((0, drizzle_orm_1.eq)(index_1.conversations.id, conversation_1[0].id))];
                            case 15:
                                _w.sent();
                                logger_1.logger.info({ conversationId: conversation_1[0].id, assignedEmployeeId: persistentEmpId }, 'Restored persistent assigned employee from contact metadata / sticky agent');
                                _w.label = 16;
                            case 16:
                                conversationId_1 = conversation_1[0].id;
                                _a = extractMessageContent(msg), type = _a.type, text = _a.text, mediaId = _a.mediaId, metadata = _a.metadata;
                                messageTimestamp = msg.messageTimestamp
                                    ? new Date((typeof msg.messageTimestamp === 'number' ? msg.messageTimestamp : Number(msg.messageTimestamp)) * 1000)
                                    : new Date();
                                rawContextInfo = ((_d = (_c = msg.message) === null || _c === void 0 ? void 0 : _c.extendedTextMessage) === null || _d === void 0 ? void 0 : _d.contextInfo) ||
                                    ((_h = (_g = (_f = (_e = msg.message) === null || _e === void 0 ? void 0 : _e.ephemeralMessage) === null || _f === void 0 ? void 0 : _f.message) === null || _g === void 0 ? void 0 : _g.extendedTextMessage) === null || _h === void 0 ? void 0 : _h.contextInfo) ||
                                    ((_m = (_l = (_k = (_j = msg.message) === null || _j === void 0 ? void 0 : _j.viewOnceMessage) === null || _k === void 0 ? void 0 : _k.message) === null || _l === void 0 ? void 0 : _l.extendedTextMessage) === null || _m === void 0 ? void 0 : _m.contextInfo) ||
                                    ((_p = (_o = msg.message) === null || _o === void 0 ? void 0 : _o.imageMessage) === null || _p === void 0 ? void 0 : _p.contextInfo);
                                rawQuotedStanzaId = (rawContextInfo === null || rawContextInfo === void 0 ? void 0 : rawContextInfo.stanzaId) || ((_q = metadata === null || metadata === void 0 ? void 0 : metadata.contextInfo) === null || _q === void 0 ? void 0 : _q.stanzaId);
                                if (!text) return [3 /*break*/, 20];
                                quotedMsg = rawContextInfo === null || rawContextInfo === void 0 ? void 0 : rawContextInfo.quotedMessage;
                                quotedText = '';
                                if (quotedMsg && typeof quotedMsg === 'object') {
                                    quotedText =
                                        quotedMsg.conversation ||
                                            ((_r = quotedMsg.extendedTextMessage) === null || _r === void 0 ? void 0 : _r.text) ||
                                            ((_s = quotedMsg.imageMessage) === null || _s === void 0 ? void 0 : _s.caption) ||
                                            ((_t = quotedMsg.videoMessage) === null || _t === void 0 ? void 0 : _t.caption) ||
                                            '';
                                }
                                if (!(!quotedText && rawQuotedStanzaId && typeof rawQuotedStanzaId === 'string')) return [3 /*break*/, 18];
                                return [4 /*yield*/, client_1.db
                                        .select({ text: index_1.messages.text })
                                        .from(index_1.messages)
                                        .where((0, drizzle_orm_1.eq)(index_1.messages.whatsappMessageId, rawQuotedStanzaId))
                                        .limit(1)];
                            case 17:
                                prevMsg = (_w.sent())[0];
                                if (prevMsg === null || prevMsg === void 0 ? void 0 : prevMsg.text) {
                                    quotedText = prevMsg.text;
                                }
                                _w.label = 18;
                            case 18: return [4 /*yield*/, whatsapp_reminder_service_1.WhatsAppReminderService.handleIncomingReminder({
                                    senderPhoneOrJid: isFromMe
                                        ? (((_u = account[0]) === null || _u === void 0 ? void 0 : _u.phoneNumber) || formattedPhone || remoteJid)
                                        : (formattedPhone || ((_v = contact[0]) === null || _v === void 0 ? void 0 : _v.phoneNumber) || remoteJid),
                                    messageText: text,
                                    quotedMessageText: quotedText || null,
                                    accountId: accountId,
                                    isFromMe: isFromMe,
                                    remoteJid: remoteJid,
                                    currentConversationId: conversationId_1,
                                    currentContact: contact[0],
                                    provider: session_manager_1.sessionManager.getProvider(accountId) || null,
                                })];
                            case 19:
                                reminderResult = _w.sent();
                                if (reminderResult.handled) {
                                    logger_1.logger.info({ reminderId: reminderResult.reminderId, remoteJid: remoteJid, isFromMe: isFromMe }, 'WhatsApp message successfully processed as in-chat reminder command');
                                    return [2 /*return*/];
                                }
                                _w.label = 20;
                            case 20:
                                senderType = isFromMe ? 'employee' : 'customer';
                                direction = isFromMe ? 'outgoing' : 'incoming';
                                msgStatus = isFromMe ? 'sent' : 'delivered';
                                quotedMessageInternalId = null;
                                if (!(rawQuotedStanzaId && typeof rawQuotedStanzaId === 'string')) return [3 /*break*/, 22];
                                return [4 /*yield*/, client_1.db
                                        .select({ id: index_1.messages.id })
                                        .from(index_1.messages)
                                        .where((0, drizzle_orm_1.eq)(index_1.messages.whatsappMessageId, rawQuotedStanzaId))
                                        .limit(1)];
                            case 21:
                                quotedRow = (_w.sent())[0];
                                if (quotedRow) {
                                    quotedMessageInternalId = quotedRow.id;
                                }
                                _w.label = 22;
                            case 22: return [4 /*yield*/, client_1.db
                                    .insert(index_1.messages)
                                    .values({
                                    whatsappMessageId: whatsappMessageId,
                                    conversationId: conversationId_1,
                                    contactId: contactId,
                                    senderType: senderType,
                                    direction: direction,
                                    type: type,
                                    text: text,
                                    mediaId: mediaId,
                                    quotedMessageId: quotedMessageInternalId,
                                    timestamp: messageTimestamp,
                                    status: msgStatus,
                                    metadata: metadata,
                                })
                                    .returning()];
                            case 23:
                                savedMessage = (_w.sent())[0];
                                currentUnread = parseInt(conversation_1[0].unreadCount || '0', 10);
                                newUnreadCount = isFromMe ? conversation_1[0].unreadCount : String(currentUnread + 1);
                                // Reopen conversation if closed, KEEPING assignedEmployeeId intact
                                return [4 /*yield*/, client_1.db
                                        .update(index_1.conversations)
                                        .set({
                                        lastMessageText: text || "[".concat(type, "]"),
                                        lastMessageAt: messageTimestamp,
                                        unreadCount: newUnreadCount,
                                        status: 'open',
                                        updatedAt: new Date(),
                                    })
                                        .where((0, drizzle_orm_1.eq)(index_1.conversations.id, conversationId_1))];
                            case 24:
                                // Reopen conversation if closed, KEEPING assignedEmployeeId intact
                                _w.sent();
                                wasNewlyAssigned = false;
                                if (!(!isFromMe && (!conversation_1[0].assignedEmployeeId || isNewConversation))) return [3 /*break*/, 28];
                                _w.label = 25;
                            case 25:
                                _w.trys.push([25, 27, , 28]);
                                return [4 /*yield*/, assignment_service_1.AssignmentService.autoAssignConversation(conversationId_1, {
                                        skipWhatsAppNotification: true,
                                    })];
                            case 26:
                                assignResult = _w.sent();
                                if (assignResult === null || assignResult === void 0 ? void 0 : assignResult.assignedEmployeeId) {
                                    conversation_1[0].assignedEmployeeId = assignResult.assignedEmployeeId;
                                    conversation_1[0].assignedStationId = assignResult.assignedStationId;
                                    wasNewlyAssigned = true;
                                }
                                return [3 /*break*/, 28];
                            case 27:
                                assignErr_1 = _w.sent();
                                logger_1.logger.error({ assignErr: assignErr_1, conversationId: conversationId_1 }, 'Failed to auto-assign incoming conversation');
                                return [3 /*break*/, 28];
                            case 28:
                                broadcastMsg = __assign(__assign({}, savedMessage), { conversationId: conversationId_1, contactName: contact[0].name, contactPhone: contact[0].phoneNumber, assignedEmployeeId: conversation_1[0].assignedEmployeeId, assignedStationId: conversation_1[0].assignedStationId, whatsappAccount: account[0].displayName || account[0].phoneNumber });
                                ws_hub_1.wsHub.broadcast('message.created', {
                                    accountId: accountId,
                                    message: broadcastMsg,
                                });
                                ws_hub_1.wsHub.broadcast('whatsapp.message', broadcastMsg);
                                ws_hub_1.wsHub.broadcast('new_message', {
                                    conversationId: conversationId_1,
                                    message: broadcastMsg,
                                });
                                convUpdatePayload = {
                                    id: conversationId_1,
                                    conversationId: conversationId_1,
                                    lastMessageText: text || "[".concat(type, "]"),
                                    lastMessageAt: messageTimestamp,
                                    unreadCount: newUnreadCount,
                                    assignedEmployeeId: conversation_1[0].assignedEmployeeId,
                                    assignedStationId: conversation_1[0].assignedStationId,
                                    contact: {
                                        id: contact[0].id,
                                        name: contact[0].name,
                                        phoneNumber: contact[0].phoneNumber,
                                    },
                                };
                                ws_hub_1.wsHub.broadcast('conversation.updated', convUpdatePayload);
                                ws_hub_1.wsHub.broadcast('conversation_update', convUpdatePayload);
                                // Dedicated notification event for employee UI
                                if (!isFromMe && conversation_1[0].assignedEmployeeId) {
                                    ws_hub_1.wsHub.broadcast('employee.notification', {
                                        type: 'new_inbound_message',
                                        assignedEmployeeId: conversation_1[0].assignedEmployeeId,
                                        conversationId: conversationId_1,
                                        contactName: contact[0].name,
                                        contactPhone: contact[0].phoneNumber,
                                        messageText: text || "[".concat(type, "]"),
                                        timestamp: messageTimestamp,
                                        whatsappAccount: account[0].displayName || account[0].phoneNumber,
                                    });
                                    // 🚀 AUTOMATIC WHATSAPP FORWARDING TO ASSIGNED EMPLOYEE'S PERSONAL WHATSAPP
                                    // When a message arrives from a customer for an assigned conversation,
                                    // the connected WhatsApp account automatically forwards the message and client details
                                    // to the employee's personal WhatsApp number!
                                    forwardInboundMessageToEmployee({
                                        employeeId: conversation_1[0].assignedEmployeeId,
                                        conversationId: conversationId_1,
                                        contact: {
                                            id: contact[0].id,
                                            name: contact[0].name,
                                            phoneNumber: contact[0].phoneNumber,
                                        },
                                        message: { text: text, type: type, mediaId: mediaId, metadata: metadata },
                                        accountId: accountId,
                                        accountPhoneNumber: account[0].phoneNumber,
                                        isNewAssignment: isNewConversation || wasNewlyAssigned,
                                    }).catch(function (forwardErr) {
                                        logger_1.logger.error({
                                            err: forwardErr === null || forwardErr === void 0 ? void 0 : forwardErr.message,
                                            stack: forwardErr === null || forwardErr === void 0 ? void 0 : forwardErr.stack,
                                            conversationId: conversationId_1,
                                            employeeId: conversation_1[0].assignedEmployeeId,
                                        }, 'Background forward of inbound message to employee WhatsApp failed safely');
                                    });
                                }
                                logger_1.logger.info({ accountId: accountId, whatsappMessageId: whatsappMessageId, conversationId: conversationId_1, contactId: contactId, type: type, isFromMe: isFromMe, assignedEmployeeId: conversation_1[0].assignedEmployeeId }, 'WhatsApp message processed successfully');
                                if (!!isFromMe) return [3 /*break*/, 33];
                                _w.label = 29;
                            case 29:
                                _w.trys.push([29, 32, , 33]);
                                return [4 /*yield*/, Promise.resolve().then(function () { return require('../automations/rules.engine'); })];
                            case 30:
                                RulesEngine = (_w.sent()).RulesEngine;
                                return [4 /*yield*/, RulesEngine.processInboundMessage({
                                        conversationId: conversationId_1,
                                        contactId: contactId,
                                        accountId: accountId,
                                        toJid: remoteJid,
                                        messageText: text || '',
                                    })];
                            case 31:
                                _w.sent();
                                return [3 /*break*/, 33];
                            case 32:
                                autoErr_1 = _w.sent();
                                logger_1.logger.error({ autoErr: autoErr_1, conversationId: conversationId_1 }, 'Error running automation rules on inbound message');
                                return [3 /*break*/, 33];
                            case 33: return [3 /*break*/, 35];
                            case 34:
                                err_1 = _w.sent();
                                logger_1.logger.error({ accountId: accountId, whatsappMessageId: whatsappMessageId, err: err_1 }, 'Failed to process inbound message');
                                return [3 /*break*/, 35];
                            case 35: return [2 /*return*/];
                        }
                    });
                }); })];
        });
    });
}
