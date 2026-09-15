"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
exports.RulesEngine = void 0;
var client_1 = require("../../database/client");
var schema = require("../../database/schema/index");
var drizzle_orm_1 = require("drizzle-orm");
var logger_1 = require("../../utils/logger");
var outbound_queue_service_1 = require("../../services/outbound-queue.service");
var ws_hub_1 = require("../../websocket/ws.hub");
var assignment_service_1 = require("./assignment.service");
var RulesEngine = /** @class */ (function () {
    function RulesEngine() {
    }
    /**
     * Check if current time is within configured business hours
     */
    RulesEngine.isWithinBusinessHours = function () {
        return __awaiter(this, arguments, void 0, function (date) {
            var config, scheduleByDay, tz, formatter, parts, hour, minute, weekdayStr, _i, parts_1, p, dayKeyMap, dayNumMap, currentMinutes, dayKey, todaySchedule, _a, startH, startM, _b, endH, endM, startMin, endMin, dayNum, _c, startH, startM, _d, endH, endM, startMinutes, endMinutes;
            var _e;
            if (date === void 0) { date = new Date(); }
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0: return [4 /*yield*/, assignment_service_1.AssignmentService.getSetting('business_hours', null)];
                    case 1:
                        config = _f.sent();
                        return [4 /*yield*/, assignment_service_1.AssignmentService.getSetting('businessHours', null)];
                    case 2:
                        scheduleByDay = _f.sent();
                        // If master config is explicitly disabled, business hours are 24/7
                        if (config && config.enabled === false) {
                            return [2 /*return*/, true];
                        }
                        try {
                            tz = (config === null || config === void 0 ? void 0 : config.timezone) || 'Asia/Kuwait';
                            formatter = new Intl.DateTimeFormat('en-US', {
                                timeZone: tz,
                                hour: 'numeric',
                                minute: 'numeric',
                                hour12: false,
                                weekday: 'short',
                            });
                            parts = formatter.formatToParts(date);
                            hour = 0;
                            minute = 0;
                            weekdayStr = '';
                            for (_i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
                                p = parts_1[_i];
                                if (p.type === 'hour')
                                    hour = parseInt(p.value, 10);
                                if (p.type === 'minute')
                                    minute = parseInt(p.value, 10);
                                if (p.type === 'weekday')
                                    weekdayStr = p.value;
                            }
                            dayKeyMap = {
                                Sun: 'sunday',
                                Mon: 'monday',
                                Tue: 'tuesday',
                                Wed: 'wednesday',
                                Thu: 'thursday',
                                Fri: 'friday',
                                Sat: 'saturday',
                            };
                            dayNumMap = {
                                Sun: 0,
                                Mon: 1,
                                Tue: 2,
                                Wed: 3,
                                Thu: 4,
                                Fri: 5,
                                Sat: 6,
                            };
                            currentMinutes = hour * 60 + minute;
                            dayKey = dayKeyMap[weekdayStr];
                            // 1. If daily schedule (SettingsPage format) is present
                            if (scheduleByDay && typeof scheduleByDay === 'object' && dayKey && scheduleByDay[dayKey]) {
                                todaySchedule = scheduleByDay[dayKey];
                                if (todaySchedule.enabled === false) {
                                    return [2 /*return*/, false]; // Closed today
                                }
                                if (todaySchedule.start && todaySchedule.end) {
                                    _a = todaySchedule.start.split(':').map(function (v) { return parseInt(v, 10); }), startH = _a[0], startM = _a[1];
                                    _b = todaySchedule.end.split(':').map(function (v) { return parseInt(v, 10); }), endH = _b[0], endM = _b[1];
                                    startMin = startH * 60 + (startM || 0);
                                    endMin = endH * 60 + (endM || 0);
                                    return [2 /*return*/, currentMinutes >= startMin && currentMinutes <= endMin];
                                }
                            }
                            // 2. Fallback to general config format
                            if (config && config.workDays && config.start && config.end) {
                                dayNum = (_e = dayNumMap[weekdayStr]) !== null && _e !== void 0 ? _e : date.getDay();
                                if (!config.workDays.includes(dayNum)) {
                                    return [2 /*return*/, false];
                                }
                                _c = config.start.split(':').map(function (v) { return parseInt(v, 10); }), startH = _c[0], startM = _c[1];
                                _d = config.end.split(':').map(function (v) { return parseInt(v, 10); }), endH = _d[0], endM = _d[1];
                                startMinutes = startH * 60 + (startM || 0);
                                endMinutes = endH * 60 + (endM || 0);
                                return [2 /*return*/, currentMinutes >= startMinutes && currentMinutes <= endMinutes];
                            }
                            // If no config found at all, assume 24/7 open
                            return [2 /*return*/, true];
                        }
                        catch (err) {
                            logger_1.logger.error({ err: err }, 'Error calculating business hours, failing open');
                            return [2 /*return*/, true];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if this is the first interaction from a contact
     */
    RulesEngine.isFirstInbound = function (contactId) {
        return __awaiter(this, void 0, void 0, function () {
            var messageCount, count;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, client_1.db.execute((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n      SELECT COUNT(m.id) as count\n      FROM messages m\n      INNER JOIN conversations c ON c.id = m.conversation_id\n      WHERE c.contact_id = ", "\n    "], ["\n      SELECT COUNT(m.id) as count\n      FROM messages m\n      INNER JOIN conversations c ON c.id = m.conversation_id\n      WHERE c.contact_id = ", "\n    "])), contactId))];
                    case 1:
                        messageCount = _b.sent();
                        count = parseInt(((_a = messageCount.rows[0]) === null || _a === void 0 ? void 0 : _a.count) || '0', 10);
                        // If count is 1 (the message just received) or 0, this is the first inbound
                        return [2 /*return*/, count <= 1];
                }
            });
        });
    };
    /**
     * Helper to normalize Arabic and English text for accurate comparison
     */
    RulesEngine.normalizeText = function (text) {
        if (!text || typeof text !== 'string')
            return '';
        return text
            .toLowerCase()
            .trim()
            // Remove Arabic diacritics / tashkeel
            .replace(/[\u064B-\u065F\u0670]/g, '')
            // Normalize Alefs (أ, إ, آ, ٱ -> ا)
            .replace(/[أإآٱ]/g, 'ا')
            // Normalize Taa Marbouta (ة -> ه)
            .replace(/ة/g, 'ه')
            // Normalize Yaa (ى -> ي)
            .replace(/ى/g, 'ي')
            // Collapse multiple whitespace
            .replace(/\s+/g, ' ');
    };
    /**
     * Match inbound message text against active keyword rules
     * Supports both frontend data structure and legacy formats:
     * - conditions.keyword (singular string) or conditions.keywords / contains (array)
     * - matchType: 'exact', 'contains', 'starts_with'
     * - actions: [{ type: 'reply', text: '...' }, { type: 'assign_station', stationId: '...' }]
     */
    RulesEngine.matchKeywordRules = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            var rawInput, normInput, rules, matchedRules, tagsToAdd, targetStationId, autoReplyText, _loop_1, _i, rules_1, rule, state_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!text || typeof text !== 'string') {
                            return [2 /*return*/, { matchedRules: [], tagsToAdd: [] }];
                        }
                        rawInput = text.toLowerCase().trim();
                        normInput = this.normalizeText(text);
                        return [4 /*yield*/, client_1.db.query.automationRules.findMany({
                                where: (0, drizzle_orm_1.eq)(schema.automationRules.enabled, true),
                                orderBy: [schema.automationRules.priority],
                            })];
                    case 1:
                        rules = _a.sent();
                        matchedRules = [];
                        tagsToAdd = [];
                        _loop_1 = function (rule) {
                            var conditions = (rule.conditions || {});
                            // Extract all candidate keywords from both modern and legacy formats
                            var candidateKeywords = [];
                            if (typeof conditions.keyword === 'string' && conditions.keyword.trim() !== '') {
                                candidateKeywords.push(conditions.keyword.trim());
                            }
                            if (Array.isArray(conditions.keywords)) {
                                candidateKeywords.push.apply(candidateKeywords, conditions.keywords.filter(function (k) { return typeof k === 'string' && k.trim() !== ''; }));
                            }
                            if (Array.isArray(conditions.contains)) {
                                candidateKeywords.push.apply(candidateKeywords, conditions.contains.filter(function (k) { return typeof k === 'string' && k.trim() !== ''; }));
                            }
                            if (candidateKeywords.length === 0)
                                return "continue";
                            var matchType = (conditions.matchType || 'contains').toLowerCase();
                            var isMatch = candidateKeywords.some(function (kw) {
                                if (!kw)
                                    return false;
                                var rawKw = kw.toLowerCase().trim();
                                var normKw = _this.normalizeText(kw);
                                if (matchType === 'exact') {
                                    return normInput === normKw || rawInput === rawKw;
                                }
                                else if (matchType === 'starts_with') {
                                    return normInput.startsWith(normKw) || rawInput.startsWith(rawKw);
                                }
                                else {
                                    // Default: 'contains'
                                    return normInput.includes(normKw) || rawInput.includes(rawKw);
                                }
                            });
                            if (isMatch) {
                                matchedRules.push(rule);
                                var actions = (rule.actions || []);
                                for (var _b = 0, actions_1 = actions; _b < actions_1.length; _b++) {
                                    var action = actions_1[_b];
                                    // Extract reply text from all possible formats
                                    if (action.type === 'reply' && action.text) {
                                        autoReplyText = action.text;
                                    }
                                    else if (action.replyText) {
                                        autoReplyText = action.replyText;
                                    }
                                    else if (action.autoReply) {
                                        autoReplyText = action.autoReply;
                                    }
                                    else if (action.text && !autoReplyText) {
                                        autoReplyText = action.text;
                                    }
                                    // Extract target station from all possible formats
                                    if (action.type === 'assign_station' && action.stationId) {
                                        targetStationId = action.stationId;
                                    }
                                    else if (action.assignStationId) {
                                        targetStationId = action.assignStationId;
                                    }
                                    else if (action.targetStationId) {
                                        targetStationId = action.targetStationId;
                                    }
                                    else if (action.stationId) {
                                        targetStationId = action.stationId;
                                    }
                                    if (action.addTags && Array.isArray(action.addTags)) {
                                        tagsToAdd.push.apply(tagsToAdd, action.addTags);
                                    }
                                }
                                logger_1.logger.info({ ruleId: rule.id, ruleName: rule.name, matchType: matchType, autoReplyText: autoReplyText, targetStationId: targetStationId }, 'Automation rule successfully matched incoming message');
                                // If this rule provided a reply, take the highest priority match
                                if (autoReplyText) {
                                    return "break";
                                }
                            }
                        };
                        for (_i = 0, rules_1 = rules; _i < rules_1.length; _i++) {
                            rule = rules_1[_i];
                            state_1 = _loop_1(rule);
                            if (state_1 === "break")
                                break;
                        }
                        return [2 /*return*/, { matchedRules: matchedRules, targetStationId: targetStationId, tagsToAdd: tagsToAdd, autoReplyText: autoReplyText }];
                }
            });
        });
    };
    /**
     * Dispatch an automated WhatsApp response message from the bot
     * Includes anti-loop debounce protection and real-time broadcasts
     */
    RulesEngine.sendAutomatedReply = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var conversationId, contactId, accountId, toJid, text, triggerReason, now, replyHash, lastSent, _i, _a, _b, k, v, acc, companyId, savedMsg, providerMessageId, status, sendResult, broadcastPayload;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        conversationId = params.conversationId, contactId = params.contactId, accountId = params.accountId, toJid = params.toJid, text = params.text, triggerReason = params.triggerReason;
                        if (!text || text.trim() === '')
                            return [2 /*return*/, false];
                        now = Date.now();
                        replyHash = "".concat(conversationId, ":").concat(triggerReason, ":").concat(text.trim().slice(0, 30));
                        lastSent = this.recentReplies.get(replyHash);
                        if (lastSent && now - lastSent < 10000) {
                            logger_1.logger.warn({ conversationId: conversationId, triggerReason: triggerReason, elapsedMs: now - lastSent }, 'Skipped duplicate automated reply due to loop-prevention cooldown');
                            return [2 /*return*/, false];
                        }
                        this.recentReplies.set(replyHash, now);
                        // Clean up cache periodically
                        if (this.recentReplies.size > 500) {
                            for (_i = 0, _a = this.recentReplies.entries(); _i < _a.length; _i++) {
                                _b = _a[_i], k = _b[0], v = _b[1];
                                if (now - v > 60000)
                                    this.recentReplies.delete(k);
                            }
                        }
                        return [4 /*yield*/, client_1.db
                                .select({ companyId: schema.whatsappAccounts.companyId })
                                .from(schema.whatsappAccounts)
                                .where((0, drizzle_orm_1.eq)(schema.whatsappAccounts.id, accountId))
                                .limit(1)];
                    case 1:
                        acc = (_c.sent())[0];
                        companyId = acc === null || acc === void 0 ? void 0 : acc.companyId;
                        return [4 /*yield*/, client_1.db
                                .insert(schema.messages)
                                .values({
                                conversationId: conversationId,
                                contactId: contactId,
                                whatsappMessageId: undefined,
                                direction: 'outgoing',
                                senderType: 'automation',
                                type: 'text',
                                text: text,
                                status: 'pending',
                                metadata: { triggerReason: triggerReason, automated: true },
                            })
                                .returning()];
                    case 2:
                        savedMsg = (_c.sent())[0];
                        status = 'pending';
                        if (!companyId) return [3 /*break*/, 5];
                        return [4 /*yield*/, outbound_queue_service_1.OutboundQueueService.sendMessage({
                                companyId: companyId,
                                accountId: accountId,
                                conversationId: conversationId,
                                messageId: savedMsg.id,
                                toJid: toJid,
                                type: 'text',
                                text: text,
                                priority: 1, // High priority for automated replies
                            })];
                    case 3:
                        sendResult = _c.sent();
                        status = sendResult.status === 'sent' ? 'sent' : 'queued';
                        if (sendResult.whatsappMessageId) {
                            providerMessageId = sendResult.whatsappMessageId;
                        }
                        return [4 /*yield*/, client_1.db
                                .update(schema.messages)
                                .set({
                                status: status,
                                whatsappMessageId: providerMessageId,
                                updatedAt: new Date(),
                            })
                                .where((0, drizzle_orm_1.eq)(schema.messages.id, savedMsg.id))];
                    case 4:
                        _c.sent();
                        _c.label = 5;
                    case 5: 
                    // Update conversation snippet
                    return [4 /*yield*/, client_1.db
                            .update(schema.conversations)
                            .set({
                            lastMessageText: text,
                            lastMessageAt: new Date(),
                            updatedAt: new Date(),
                        })
                            .where((0, drizzle_orm_1.eq)(schema.conversations.id, conversationId))];
                    case 6:
                        // Update conversation snippet
                        _c.sent();
                        broadcastPayload = __assign(__assign({}, savedMsg), { conversationId: conversationId });
                        ws_hub_1.wsHub.broadcast('whatsapp.message', broadcastPayload);
                        ws_hub_1.wsHub.broadcast('message.created', { accountId: accountId, message: broadcastPayload });
                        ws_hub_1.wsHub.broadcast('new_message', { conversationId: conversationId, message: broadcastPayload });
                        ws_hub_1.wsHub.broadcast('conversation.updated', {
                            id: conversationId,
                            conversationId: conversationId,
                            lastMessageText: text,
                            lastMessageAt: new Date().toISOString(),
                        });
                        ws_hub_1.wsHub.broadcast('conversation_update', {
                            id: conversationId,
                            conversationId: conversationId,
                            lastMessageText: text,
                            lastMessageAt: new Date().toISOString(),
                        });
                        logger_1.logger.info({ conversationId: conversationId, triggerReason: triggerReason, providerMessageId: providerMessageId }, 'Automated bot response sent and persisted');
                        return [2 /*return*/, true];
                }
            });
        });
    };
    /**
     * Main processor for incoming messages
     */
    RulesEngine.processInboundMessage = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var conversationId, contactId, accountId, toJid, messageText, conversation, systemAutomation, _a, botRepliesAllowed, keywordMatched, preferredStationId, match, welcomeSent, outOfHoursSent, welcomeEnabled, isFirst, welcomeTemplate, oohEnabledRaw, oohBotEnabledRaw, oohMessageEnabledRaw, oohEnabledFrontendRaw, isExplicitlyDisabled, isOohEnabled, withinHours, oohTemplate;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        conversationId = params.conversationId, contactId = params.contactId, accountId = params.accountId, toJid = params.toJid, messageText = params.messageText;
                        return [4 /*yield*/, client_1.db.query.conversations.findFirst({
                                where: (0, drizzle_orm_1.eq)(schema.conversations.id, conversationId),
                            })];
                    case 1:
                        conversation = _c.sent();
                        if (!conversation) {
                            return [2 /*return*/, { welcomeSent: false, outOfHoursSent: false, keywordMatched: false }];
                        }
                        return [4 /*yield*/, assignment_service_1.AssignmentService.getSetting('automation_enabled', null)];
                    case 2:
                        if (!((_b = (_c.sent())) !== null && _b !== void 0)) return [3 /*break*/, 3];
                        _a = _b;
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, assignment_service_1.AssignmentService.getSetting('automationEnabled', true)];
                    case 4:
                        _a = (_c.sent());
                        _c.label = 5;
                    case 5:
                        systemAutomation = _a;
                        botRepliesAllowed = Boolean(systemAutomation) && conversation.automationEnabled && !conversation.humanMode;
                        keywordMatched = false;
                        if (!(messageText && botRepliesAllowed)) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.matchKeywordRules(messageText)];
                    case 6:
                        match = _c.sent();
                        if (!(match.matchedRules.length > 0)) return [3 /*break*/, 8];
                        keywordMatched = true;
                        preferredStationId = match.targetStationId;
                        if (!match.autoReplyText) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.sendAutomatedReply({
                                conversationId: conversationId,
                                contactId: contactId,
                                accountId: accountId,
                                toJid: toJid,
                                text: match.autoReplyText,
                                triggerReason: 'keyword',
                            })];
                    case 7:
                        _c.sent();
                        _c.label = 8;
                    case 8:
                        if (!!conversation.assignedEmployeeId) return [3 /*break*/, 10];
                        return [4 /*yield*/, assignment_service_1.AssignmentService.autoAssignConversation(conversationId, {
                                preferredStationId: preferredStationId,
                            })];
                    case 9:
                        _c.sent();
                        return [3 /*break*/, 12];
                    case 10:
                        if (!(preferredStationId && preferredStationId !== conversation.assignedStationId)) return [3 /*break*/, 12];
                        // If conversation already assigned to employee, only update station if rule specifies new station
                        return [4 /*yield*/, client_1.db
                                .update(schema.conversations)
                                .set({ assignedStationId: preferredStationId, updatedAt: new Date() })
                                .where((0, drizzle_orm_1.eq)(schema.conversations.id, conversationId))];
                    case 11:
                        // If conversation already assigned to employee, only update station if rule specifies new station
                        _c.sent();
                        _c.label = 12;
                    case 12:
                        welcomeSent = false;
                        outOfHoursSent = false;
                        if (!botRepliesAllowed) {
                            return [2 /*return*/, { welcomeSent: welcomeSent, outOfHoursSent: outOfHoursSent, keywordMatched: keywordMatched }];
                        }
                        return [4 /*yield*/, assignment_service_1.AssignmentService.getSetting('welcome_message_enabled', true)];
                    case 13:
                        welcomeEnabled = _c.sent();
                        if (!welcomeEnabled) return [3 /*break*/, 17];
                        return [4 /*yield*/, this.isFirstInbound(contactId)];
                    case 14:
                        isFirst = _c.sent();
                        if (!isFirst) return [3 /*break*/, 17];
                        return [4 /*yield*/, assignment_service_1.AssignmentService.getSetting('welcome_message_template', 'مرحباً بك في ترينتي فيجن (Trenty Vision) للخدمات والرعاية الصحية! يسعدنا تواصلك معنا، سيقوم أحد أخصائيي الرعاية بالرد عليك ومساعدتك في أقرب وقت.')];
                    case 15:
                        welcomeTemplate = _c.sent();
                        return [4 /*yield*/, this.sendAutomatedReply({
                                conversationId: conversationId,
                                contactId: contactId,
                                accountId: accountId,
                                toJid: toJid,
                                text: welcomeTemplate,
                                triggerReason: 'welcome',
                            })];
                    case 16:
                        _c.sent();
                        welcomeSent = true;
                        // Don't double-reply with out-of-hours immediately after welcome
                        return [2 /*return*/, { welcomeSent: welcomeSent, outOfHoursSent: outOfHoursSent, keywordMatched: keywordMatched }];
                    case 17: return [4 /*yield*/, assignment_service_1.AssignmentService.getSetting('out_of_hours_message_enabled', false)];
                    case 18:
                        oohEnabledRaw = _c.sent();
                        return [4 /*yield*/, assignment_service_1.AssignmentService.getSetting('outOfOfficeBotEnabled', null)];
                    case 19:
                        oohBotEnabledRaw = _c.sent();
                        return [4 /*yield*/, assignment_service_1.AssignmentService.getSetting('outOfHoursMessageEnabled', null)];
                    case 20:
                        oohMessageEnabledRaw = _c.sent();
                        return [4 /*yield*/, assignment_service_1.AssignmentService.getSetting('outOfOfficeEnabled', null)];
                    case 21:
                        oohEnabledFrontendRaw = _c.sent();
                        isExplicitlyDisabled = oohEnabledRaw === false ||
                            oohEnabledRaw === 'false' ||
                            oohBotEnabledRaw === false ||
                            oohBotEnabledRaw === 'false' ||
                            oohMessageEnabledRaw === false ||
                            oohMessageEnabledRaw === 'false' ||
                            oohEnabledFrontendRaw === false ||
                            oohEnabledFrontendRaw === 'false';
                        isOohEnabled = !isExplicitlyDisabled &&
                            (oohEnabledRaw === true ||
                                oohEnabledRaw === 'true' ||
                                oohBotEnabledRaw === true ||
                                oohMessageEnabledRaw === true ||
                                oohEnabledFrontendRaw === true);
                        if (!isOohEnabled) return [3 /*break*/, 25];
                        return [4 /*yield*/, this.isWithinBusinessHours()];
                    case 22:
                        withinHours = _c.sent();
                        if (!!withinHours) return [3 /*break*/, 25];
                        return [4 /*yield*/, assignment_service_1.AssignmentService.getSetting('out_of_hours_message_template', 'شكراً لتواصلك مع ترينتي فيجن (Trenty Vision) للرعاية الصحية! نحن حالياً خارج أوقات العمل الرسمية. سنقوم بالرد عليك وتقديم الرعاية المطلوبة فور بدء دوام العمل القادم.')];
                    case 23:
                        oohTemplate = _c.sent();
                        return [4 /*yield*/, this.sendAutomatedReply({
                                conversationId: conversationId,
                                contactId: contactId,
                                accountId: accountId,
                                toJid: toJid,
                                text: oohTemplate,
                                triggerReason: 'out_of_hours',
                            })];
                    case 24:
                        _c.sent();
                        outOfHoursSent = true;
                        _c.label = 25;
                    case 25: return [2 /*return*/, { welcomeSent: welcomeSent, outOfHoursSent: outOfHoursSent, keywordMatched: keywordMatched }];
                }
            });
        });
    };
    /**
     * Cooldown cache to prevent bot reply loops (conversationId:reason:hash -> timestamp)
     */
    RulesEngine.recentReplies = new Map();
    return RulesEngine;
}());
exports.RulesEngine = RulesEngine;
var templateObject_1;
