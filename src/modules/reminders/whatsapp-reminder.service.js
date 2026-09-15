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
exports.WhatsAppReminderService = void 0;
var client_1 = require("../../database/client");
var schema = require("../../database/schema/index");
var drizzle_orm_1 = require("drizzle-orm");
var logger_1 = require("../../utils/logger");
var ws_hub_1 = require("../../websocket/ws.hub");
var whatsapp_reminder_parser_1 = require("./whatsapp-reminder.parser");
var session_manager_1 = require("../whatsapp/session.manager");
var WhatsAppReminderService = /** @class */ (function () {
    function WhatsAppReminderService() {
    }
    /**
     * Checks if an incoming message is a reminder command from an authorized employee or admin.
     * If so, parses and records the reminder, links it to the conversation/client,
     * sends an instant confirmation to the employee on WhatsApp, and updates WebSocket clients.
     */
    WhatsAppReminderService.handleIncomingReminder = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var senderPhoneOrJid, messageText, quotedMessageText, accountId, isFromMe, remoteJid, currentConversationId, currentContact, provider, cleanSenderDigits_1, allEmployees, matchedEmployee, contactDigits_1, lid, resolvedPhone, resDigits_1, acc, isAccountOwner, companyEmp, firstUser, parsed, targetContact, targetConversation, curConv, cleanCustDigits, foundContacts, foundConversations, targetLeadId, lead, newReminder, broadcastPayload, activeProvider, _i, _a, _b, p, clientDisplayName, formattedDateString, confirmationMessage, replyJid, err_1;
            var _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _f.trys.push([0, 19, , 20]);
                        senderPhoneOrJid = params.senderPhoneOrJid, messageText = params.messageText, quotedMessageText = params.quotedMessageText, accountId = params.accountId, isFromMe = params.isFromMe, remoteJid = params.remoteJid, currentConversationId = params.currentConversationId, currentContact = params.currentContact, provider = params.provider;
                        // 1. Quick check: Is this even a reminder message?
                        if (!(0, whatsapp_reminder_parser_1.isReminderMessage)(messageText, Boolean(quotedMessageText))) {
                            return [2 /*return*/, { handled: false }];
                        }
                        cleanSenderDigits_1 = senderPhoneOrJid.split('@')[0].replace(/\D/g, '');
                        return [4 /*yield*/, client_1.db
                                .select({
                                id: schema.employees.id,
                                userId: schema.employees.userId,
                                whatsappNumber: schema.employees.whatsappNumber,
                                status: schema.employees.status,
                                userName: schema.users.name,
                                userEmail: schema.users.email,
                            })
                                .from(schema.employees)
                                .leftJoin(schema.users, (0, drizzle_orm_1.eq)(schema.employees.userId, schema.users.id))];
                    case 1:
                        allEmployees = _f.sent();
                        matchedEmployee = allEmployees.find(function (emp) {
                            if (!emp.whatsappNumber)
                                return false;
                            var empDigits = emp.whatsappNumber.replace(/\D/g, '');
                            return empDigits === cleanSenderDigits_1 || cleanSenderDigits_1.endsWith(empDigits) || empDigits.endsWith(cleanSenderDigits_1);
                        });
                        // If sender was an LID or senderPhoneOrJid didn't match, check currentContact phone
                        if (!matchedEmployee && (currentContact === null || currentContact === void 0 ? void 0 : currentContact.phoneNumber)) {
                            contactDigits_1 = currentContact.phoneNumber.replace(/\D/g, '');
                            if (contactDigits_1) {
                                matchedEmployee = allEmployees.find(function (emp) {
                                    if (!emp.whatsappNumber)
                                        return false;
                                    var empDigits = emp.whatsappNumber.replace(/\D/g, '');
                                    return empDigits === contactDigits_1 || contactDigits_1.endsWith(empDigits) || empDigits.endsWith(contactDigits_1);
                                });
                            }
                        }
                        if (!(!matchedEmployee && ((remoteJid === null || remoteJid === void 0 ? void 0 : remoteJid.endsWith('@lid')) || senderPhoneOrJid.endsWith('@lid')) && provider)) return [3 /*break*/, 3];
                        lid = (remoteJid === null || remoteJid === void 0 ? void 0 : remoteJid.endsWith('@lid')) ? remoteJid : senderPhoneOrJid;
                        return [4 /*yield*/, provider.getPhoneNumberForLid(lid)];
                    case 2:
                        resolvedPhone = _f.sent();
                        if (resolvedPhone) {
                            resDigits_1 = resolvedPhone.replace(/\D/g, '');
                            matchedEmployee = allEmployees.find(function (emp) {
                                if (!emp.whatsappNumber)
                                    return false;
                                var empDigits = emp.whatsappNumber.replace(/\D/g, '');
                                return empDigits === resDigits_1 || resDigits_1.endsWith(empDigits) || empDigits.endsWith(resDigits_1);
                            });
                        }
                        _f.label = 3;
                    case 3:
                        if (!!matchedEmployee) return [3 /*break*/, 8];
                        return [4 /*yield*/, client_1.db
                                .select()
                                .from(schema.whatsappAccounts)
                                .where((0, drizzle_orm_1.eq)(schema.whatsappAccounts.id, accountId))
                                .limit(1)];
                    case 4:
                        acc = (_f.sent())[0];
                        isAccountOwner = isFromMe || ((acc === null || acc === void 0 ? void 0 : acc.phoneNumber) && (cleanSenderDigits_1 === acc.phoneNumber.replace(/\D/g, '') ||
                            cleanSenderDigits_1.endsWith(acc.phoneNumber.replace(/\D/g, '')) ||
                            acc.phoneNumber.replace(/\D/g, '').endsWith(cleanSenderDigits_1)));
                        if (!(isAccountOwner && acc)) return [3 /*break*/, 8];
                        return [4 /*yield*/, client_1.db
                                .select({
                                id: schema.employees.id,
                                userId: schema.employees.userId,
                                whatsappNumber: schema.employees.whatsappNumber,
                                status: schema.employees.status,
                                userName: schema.users.name,
                                userEmail: schema.users.email,
                            })
                                .from(schema.employees)
                                .leftJoin(schema.users, (0, drizzle_orm_1.eq)(schema.employees.userId, schema.users.id))
                                .where((0, drizzle_orm_1.eq)(schema.employees.companyId, acc.companyId))
                                .limit(1)];
                    case 5:
                        companyEmp = (_f.sent())[0];
                        if (!companyEmp) return [3 /*break*/, 6];
                        matchedEmployee = companyEmp;
                        return [3 /*break*/, 8];
                    case 6: return [4 /*yield*/, client_1.db
                            .select({
                            id: schema.users.id,
                            name: schema.users.name,
                            email: schema.users.email,
                        })
                            .from(schema.users)
                            .limit(1)];
                    case 7:
                        firstUser = (_f.sent())[0];
                        if (firstUser) {
                            matchedEmployee = {
                                id: firstUser.id,
                                userId: firstUser.id,
                                whatsappNumber: acc.phoneNumber,
                                status: 'active',
                                userName: firstUser.name,
                                userEmail: firstUser.email,
                            };
                        }
                        _f.label = 8;
                    case 8:
                        if (!matchedEmployee || matchedEmployee.status === 'inactive') {
                            // Not a registered employee or admin, proceed as normal message
                            return [2 /*return*/, { handled: false, reason: 'sender_not_an_employee' }];
                        }
                        parsed = (0, whatsapp_reminder_parser_1.parseReminderCommand)(messageText, quotedMessageText || undefined);
                        if (!parsed) {
                            return [2 /*return*/, { handled: false, reason: 'parse_failed' }];
                        }
                        targetContact = currentContact;
                        targetConversation = void 0;
                        if (!currentConversationId) return [3 /*break*/, 10];
                        return [4 /*yield*/, client_1.db
                                .select()
                                .from(schema.conversations)
                                .where((0, drizzle_orm_1.eq)(schema.conversations.id, currentConversationId))
                                .limit(1)];
                    case 9:
                        curConv = (_f.sent())[0];
                        if (curConv)
                            targetConversation = curConv;
                        _f.label = 10;
                    case 10:
                        if (!parsed.clientPhone) return [3 /*break*/, 13];
                        cleanCustDigits = parsed.clientPhone.replace(/\D/g, '');
                        return [4 /*yield*/, client_1.db
                                .select()
                                .from(schema.contacts)
                                .where((0, drizzle_orm_1.ilike)(schema.contacts.phoneNumber, "%".concat(cleanCustDigits.slice(-9), "%")))
                                .limit(1)];
                    case 11:
                        foundContacts = _f.sent();
                        if (!(foundContacts.length > 0)) return [3 /*break*/, 13];
                        targetContact = foundContacts[0];
                        return [4 /*yield*/, client_1.db
                                .select()
                                .from(schema.conversations)
                                .where((0, drizzle_orm_1.eq)(schema.conversations.contactId, targetContact.id))
                                .orderBy((0, drizzle_orm_1.desc)(schema.conversations.updatedAt))
                                .limit(1)];
                    case 12:
                        foundConversations = _f.sent();
                        if (foundConversations.length > 0) {
                            targetConversation = foundConversations[0];
                        }
                        _f.label = 13;
                    case 13:
                        targetLeadId = null;
                        if (!targetContact) return [3 /*break*/, 15];
                        return [4 /*yield*/, client_1.db
                                .select({ id: schema.leads.id })
                                .from(schema.leads)
                                .where((0, drizzle_orm_1.eq)(schema.leads.contactId, targetContact.id))
                                .limit(1)];
                    case 14:
                        lead = (_f.sent())[0];
                        if (lead) {
                            targetLeadId = lead.id;
                        }
                        _f.label = 15;
                    case 15: return [4 /*yield*/, client_1.db
                            .insert(schema.reminders)
                            .values({
                            assignedUserId: matchedEmployee.userId,
                            conversationId: targetConversation ? targetConversation.id : null,
                            leadId: targetLeadId,
                            title: parsed.title,
                            note: parsed.note || null,
                            dueAt: parsed.dueAt,
                            status: 'pending',
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        })
                            .returning()];
                    case 16:
                        newReminder = (_f.sent())[0];
                        logger_1.logger.info({
                            reminderId: newReminder.id,
                            employeeId: matchedEmployee.id,
                            employeeName: matchedEmployee.userName,
                            clientPhone: parsed.clientPhone || (targetContact === null || targetContact === void 0 ? void 0 : targetContact.phoneNumber),
                            dueAt: parsed.dueAt.toISOString(),
                            title: parsed.title,
                        }, 'WhatsApp in-chat reminder successfully created and recorded');
                        broadcastPayload = __assign(__assign({}, newReminder), { dueAt: newReminder.dueAt.toISOString(), assignedUserName: matchedEmployee.userName, contactName: (targetContact === null || targetContact === void 0 ? void 0 : targetContact.name) || null, contactPhone: (targetContact === null || targetContact === void 0 ? void 0 : targetContact.phoneNumber) || parsed.clientPhone || null });
                        ws_hub_1.wsHub.broadcast('reminder.created', broadcastPayload);
                        ws_hub_1.wsHub.broadcast('reminders.update', broadcastPayload);
                        activeProvider = provider;
                        if (!activeProvider || ((_c = activeProvider.connectionState) === null || _c === void 0 ? void 0 : _c.status) !== 'connected') {
                            for (_i = 0, _a = session_manager_1.sessionManager.getActiveSessions(); _i < _a.length; _i++) {
                                _b = _a[_i], p = _b[1];
                                if (((_d = p.connectionState) === null || _d === void 0 ? void 0 : _d.status) === 'connected') {
                                    activeProvider = p;
                                    break;
                                }
                            }
                        }
                        if (!(activeProvider && ((_e = activeProvider.connectionState) === null || _e === void 0 ? void 0 : _e.status) === 'connected')) return [3 /*break*/, 18];
                        clientDisplayName = (targetContact === null || targetContact === void 0 ? void 0 : targetContact.name) && targetContact.name !== targetContact.phoneNumber
                            ? "".concat(targetContact.name, " (").concat(targetContact.phoneNumber, ")")
                            : (targetContact === null || targetContact === void 0 ? void 0 : targetContact.phoneNumber) || parsed.clientPhone || 'عام (مربوط بالمحادثة الحالية)';
                        formattedDateString = parsed.dueAt.toLocaleString('ar-EG', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        });
                        confirmationMessage = [
                            "\u2705 *\u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u062A\u0630\u0643\u064A\u0631 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645 \u0628\u0646\u062C\u0627\u062D!*",
                            "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501",
                            "\uD83D\uDCCC *\u0627\u0644\u0639\u0646\u0648\u0627\u0646:* ".concat(parsed.title),
                            "\uD83D\uDC64 *\u0627\u0644\u0639\u0645\u064A\u0644:* ".concat(clientDisplayName),
                            "\u23F0 *\u0645\u0648\u0639\u062F \u0627\u0644\u062A\u0646\u0628\u064A\u0647:* ".concat(formattedDateString),
                            parsed.note ? "\uD83D\uDCDD *\u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644:* ".concat(parsed.note) : '',
                            "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501",
                            "\uD83D\uDD14 \u0633\u064A\u0642\u0648\u0645 \u0627\u0644\u0646\u0638\u0627\u0645 \u0628\u062A\u0646\u0628\u064A\u0647\u0643 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0639\u0644\u0649 \u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628 \u0641\u0648\u0631 \u062D\u0644\u0648\u0644 \u0627\u0644\u0645\u0648\u0639\u062F."
                        ].filter(Boolean).join('\n');
                        replyJid = remoteJid || "".concat(cleanSenderDigits_1, "@s.whatsapp.net");
                        return [4 /*yield*/, activeProvider.sendText(replyJid, confirmationMessage)];
                    case 17:
                        _f.sent();
                        logger_1.logger.info({ replyJid: replyJid, reminderId: newReminder.id }, 'Dispatched WhatsApp confirmation for in-chat reminder');
                        _f.label = 18;
                    case 18: return [2 /*return*/, {
                            handled: true,
                            reminderId: newReminder.id,
                        }];
                    case 19:
                        err_1 = _f.sent();
                        logger_1.logger.error({ err: err_1 === null || err_1 === void 0 ? void 0 : err_1.message, stack: err_1 === null || err_1 === void 0 ? void 0 : err_1.stack, sender: params.senderPhoneOrJid }, 'Error handling in-chat WhatsApp reminder command');
                        return [2 /*return*/, { handled: false, reason: err_1 === null || err_1 === void 0 ? void 0 : err_1.message }];
                    case 20: return [2 /*return*/];
                }
            });
        });
    };
    return WhatsAppReminderService;
}());
exports.WhatsAppReminderService = WhatsAppReminderService;
