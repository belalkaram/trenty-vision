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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listConversationsQuerySchema = void 0;
exports.conversationsRoutes = conversationsRoutes;
var drizzle_orm_1 = require("drizzle-orm");
var zod_1 = require("zod");
var client_1 = require("../../database/client");
var index_1 = require("../../database/schema/index");
var auth_middleware_1 = require("../../middleware/auth.middleware");
var outbound_queue_service_1 = require("../../services/outbound-queue.service");
var index_2 = require("../../config/index");
var ws_hub_1 = require("../../websocket/ws.hub");
var logger_1 = require("../../utils/logger");
var phone_validator_1 = require("../../utils/phone.validator");
var assignment_service_1 = require("../automations/assignment.service");
// ─── Query & Body Schemas ───────────────────────────────────
exports.listConversationsQuerySchema = zod_1.z.object({
    status: zod_1.z.preprocess(function (val) { return (val === 'resolved' ? 'closed' : val); }, zod_1.z.enum(['open', 'pending', 'waiting', 'closed']).optional()),
    stationId: zod_1.z.string().uuid().optional(),
    assignedEmployeeId: zod_1.z.string().uuid().optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(50),
    offset: zod_1.z.coerce.number().min(0).default(0),
});
var assignSchema = zod_1.z.object({
    assignedEmployeeId: zod_1.z.string().uuid().nullable().optional(),
    assignedStationId: zod_1.z.string().uuid().nullable().optional(),
    assignedSupervisorId: zod_1.z.string().uuid().nullable().optional(),
});
var statusSchema = zod_1.z.object({
    status: zod_1.z.enum(['open', 'pending', 'waiting', 'closed']),
});
var modeSchema = zod_1.z.object({
    humanMode: zod_1.z.boolean().optional(),
    automationEnabled: zod_1.z.boolean().optional(),
});
function conversationsRoutes(app) {
    return __awaiter(this, void 0, void 0, function () {
        var assignHandler;
        var _this = this;
        return __generator(this, function (_a) {
            app.addHook('preHandler', auth_middleware_1.authenticate);
            /**
             * GET /api/v1/conversations — List conversations with filters and search
             */
            app.get('/', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var fiveMinutesAgo, _a, query, conditions, rawSearch, s, searchConditions, cleanDigits, strippedZero, formatted, whereClause, rows, counts, mappedRows;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                            return [4 /*yield*/, client_1.db
                                    .update(index_1.conversations)
                                    .set({ status: 'closed', updatedAt: new Date() })
                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_1.conversations.status, 'open'), (0, drizzle_orm_1.or)((0, drizzle_orm_1.lte)(index_1.conversations.lastMessageAt, fiveMinutesAgo), (0, drizzle_orm_1.and)((0, drizzle_orm_1.isNull)(index_1.conversations.lastMessageAt), (0, drizzle_orm_1.lte)(index_1.conversations.createdAt, fiveMinutesAgo)))))];
                        case 1:
                            _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _a = _b.sent();
                            return [3 /*break*/, 3];
                        case 3:
                            query = exports.listConversationsQuerySchema.parse(request.query);
                            conditions = [];
                            if (query.status) {
                                conditions.push((0, drizzle_orm_1.eq)(index_1.conversations.status, query.status));
                            }
                            if (query.stationId) {
                                conditions.push((0, drizzle_orm_1.eq)(index_1.conversations.assignedStationId, query.stationId));
                            }
                            if (query.assignedEmployeeId) {
                                conditions.push((0, drizzle_orm_1.eq)(index_1.conversations.assignedEmployeeId, query.assignedEmployeeId));
                            }
                            if (query.search && query.search.trim() !== '') {
                                rawSearch = query.search.trim();
                                s = "%".concat(rawSearch, "%");
                                searchConditions = [
                                    (0, drizzle_orm_1.ilike)(index_1.contacts.name, s),
                                    (0, drizzle_orm_1.ilike)(index_1.contacts.phoneNumber, s),
                                    (0, drizzle_orm_1.ilike)(index_1.contacts.whatsappJid, s),
                                    (0, drizzle_orm_1.ilike)(index_1.conversations.lastMessageText, s),
                                ];
                                cleanDigits = rawSearch.replace(/\D/g, '');
                                if (cleanDigits.length >= 3) {
                                    searchConditions.push((0, drizzle_orm_1.ilike)(index_1.contacts.phoneNumber, "%".concat(cleanDigits, "%")));
                                    strippedZero = cleanDigits.replace(/^0+/, '');
                                    if (strippedZero.length >= 3 && strippedZero !== cleanDigits) {
                                        searchConditions.push((0, drizzle_orm_1.ilike)(index_1.contacts.phoneNumber, "%".concat(strippedZero, "%")));
                                    }
                                }
                                formatted = (0, phone_validator_1.validateAndFormatPhone)(rawSearch);
                                if (formatted.isValid && formatted.e164) {
                                    searchConditions.push((0, drizzle_orm_1.ilike)(index_1.contacts.phoneNumber, "%".concat(formatted.e164, "%")));
                                }
                                conditions.push(drizzle_orm_1.or.apply(void 0, searchConditions));
                            }
                            whereClause = conditions.length > 0 ? drizzle_orm_1.and.apply(void 0, conditions) : undefined;
                            return [4 /*yield*/, client_1.db
                                    .select({
                                    id: index_1.conversations.id,
                                    status: index_1.conversations.status,
                                    lastMessageText: index_1.conversations.lastMessageText,
                                    lastMessageAt: index_1.conversations.lastMessageAt,
                                    unreadCount: index_1.conversations.unreadCount,
                                    humanMode: index_1.conversations.humanMode,
                                    automationEnabled: index_1.conversations.automationEnabled,
                                    createdAt: index_1.conversations.createdAt,
                                    updatedAt: index_1.conversations.updatedAt,
                                    contact: {
                                        id: index_1.contacts.id,
                                        name: index_1.contacts.name,
                                        phoneNumber: index_1.contacts.phoneNumber,
                                        whatsappJid: index_1.contacts.whatsappJid,
                                        avatarUrl: index_1.contacts.avatarUrl,
                                    },
                                    station: {
                                        id: index_1.stations.id,
                                        name: index_1.stations.name,
                                    },
                                    assignedEmployee: {
                                        id: index_1.employees.id,
                                        name: index_1.users.name,
                                        email: index_1.users.email,
                                    },
                                    whatsappAccount: {
                                        id: index_1.whatsappAccounts.id,
                                        displayName: index_1.whatsappAccounts.displayName,
                                        phoneNumber: index_1.whatsappAccounts.phoneNumber,
                                    },
                                })
                                    .from(index_1.conversations)
                                    .innerJoin(index_1.contacts, (0, drizzle_orm_1.eq)(index_1.conversations.contactId, index_1.contacts.id))
                                    .leftJoin(index_1.stations, (0, drizzle_orm_1.eq)(index_1.conversations.assignedStationId, index_1.stations.id))
                                    .leftJoin(index_1.employees, (0, drizzle_orm_1.eq)(index_1.conversations.assignedEmployeeId, index_1.employees.id))
                                    .leftJoin(index_1.users, (0, drizzle_orm_1.eq)(index_1.employees.userId, index_1.users.id))
                                    .leftJoin(index_1.whatsappAccounts, (0, drizzle_orm_1.eq)(index_1.conversations.whatsappAccountId, index_1.whatsappAccounts.id))
                                    .where(whereClause)
                                    .orderBy((0, drizzle_orm_1.desc)(index_1.conversations.lastMessageAt), (0, drizzle_orm_1.desc)(index_1.conversations.updatedAt))
                                    .limit(query.limit)
                                    .offset(query.offset)];
                        case 4:
                            rows = _b.sent();
                            return [4 /*yield*/, client_1.db
                                    .select({
                                    openCount: (0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["count(*) filter (where ", " = 'open')"], ["count(*) filter (where ", " = 'open')"])), index_1.conversations.status),
                                    pendingCount: (0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["count(*) filter (where ", " = 'pending')"], ["count(*) filter (where ", " = 'pending')"])), index_1.conversations.status),
                                    closedCount: (0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["count(*) filter (where ", " = 'closed')"], ["count(*) filter (where ", " = 'closed')"])), index_1.conversations.status),
                                    totalCount: (0, drizzle_orm_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["count(*)"], ["count(*)"]))),
                                })
                                    .from(index_1.conversations)];
                        case 5:
                            counts = (_b.sent())[0];
                            mappedRows = rows.map(function (row) {
                                var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                                return (__assign(__assign({}, row), { unreadCount: parseInt(row.unreadCount || '0', 10) || 0, contactId: (_a = row.contact) === null || _a === void 0 ? void 0 : _a.id, contactName: ((_b = row.contact) === null || _b === void 0 ? void 0 : _b.name) || ((_c = row.contact) === null || _c === void 0 ? void 0 : _c.phoneNumber) || 'عميل واتساب', contactPhone: ((_d = row.contact) === null || _d === void 0 ? void 0 : _d.phoneNumber) || '', contactAvatar: ((_e = row.contact) === null || _e === void 0 ? void 0 : _e.avatarUrl) || '', stationId: (_f = row.station) === null || _f === void 0 ? void 0 : _f.id, stationName: ((_g = row.station) === null || _g === void 0 ? void 0 : _g.name) || '', assignedAgentId: (_h = row.assignedEmployee) === null || _h === void 0 ? void 0 : _h.id, assignedAgentName: ((_j = row.assignedEmployee) === null || _j === void 0 ? void 0 : _j.name) || '', lastMessageTimestamp: row.lastMessageAt
                                        ? new Date(row.lastMessageAt).toISOString()
                                        : row.updatedAt
                                            ? new Date(row.updatedAt).toISOString()
                                            : undefined }));
                            });
                            return [2 /*return*/, reply.send({
                                    success: true,
                                    data: mappedRows,
                                    meta: {
                                        limit: query.limit,
                                        offset: query.offset,
                                        counts: {
                                            open: Number((counts === null || counts === void 0 ? void 0 : counts.openCount) || 0),
                                            pending: Number((counts === null || counts === void 0 ? void 0 : counts.pendingCount) || 0),
                                            closed: Number((counts === null || counts === void 0 ? void 0 : counts.closedCount) || 0),
                                            total: Number((counts === null || counts === void 0 ? void 0 : counts.totalCount) || 0),
                                        },
                                    },
                                })];
                    }
                });
            }); });
            /**
             * POST /api/v1/conversations/start — Start a new outbound conversation
             */
            app.post('/start', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var user, schemaValidator, parsed, _a, phoneNumber, contactName, messageText, whatsappAccountId, stationId, assignedEmployeeId, phoneCheck, formattedPhone, accountId, slot1Account, anyDispatcher, connected, firstAcc, account, contact, remoteJid, convo, updateData, rawNumber, toJid, whatsappMessageId, savedMsg, sendResult, finalStatus;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            user = request.user;
                            schemaValidator = zod_1.z.object({
                                phoneNumber: zod_1.z.string().min(1),
                                contactName: zod_1.z.string().optional(),
                                messageText: zod_1.z.string().optional(),
                                whatsappAccountId: zod_1.z.string().uuid().optional(),
                                stationId: zod_1.z.string().uuid().optional().nullable(),
                                assignedEmployeeId: zod_1.z.string().uuid().optional().nullable(),
                            });
                            parsed = schemaValidator.safeParse(request.body);
                            if (!parsed.success) {
                                return [2 /*return*/, reply.status(400).send({
                                        success: false,
                                        error: 'بيانات المحادثة غير صالحة',
                                        details: parsed.error.format(),
                                    })];
                            }
                            _a = parsed.data, phoneNumber = _a.phoneNumber, contactName = _a.contactName, messageText = _a.messageText, whatsappAccountId = _a.whatsappAccountId, stationId = _a.stationId, assignedEmployeeId = _a.assignedEmployeeId;
                            phoneCheck = (0, phone_validator_1.validateAndFormatPhone)(phoneNumber);
                            if (!phoneCheck.isValid) {
                                return [2 /*return*/, reply.status(400).send({
                                        success: false,
                                        error: phoneCheck.error || 'رقم الهاتف غير صالح',
                                    })];
                            }
                            formattedPhone = phoneCheck.formatted;
                            accountId = whatsappAccountId;
                            if (!!accountId) return [3 /*break*/, 8];
                            return [4 /*yield*/, client_1.db
                                    .select()
                                    .from(index_1.whatsappAccounts)
                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.isPrimaryDispatcher, true), (0, drizzle_orm_1.eq)(index_1.whatsappAccounts.dispatcherSlot, 1)))
                                    .limit(1)];
                        case 1:
                            slot1Account = (_b.sent())[0];
                            if (!slot1Account) return [3 /*break*/, 2];
                            accountId = slot1Account.id;
                            return [3 /*break*/, 8];
                        case 2: return [4 /*yield*/, client_1.db
                                .select()
                                .from(index_1.whatsappAccounts)
                                .where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.isPrimaryDispatcher, true))
                                .limit(1)];
                        case 3:
                            anyDispatcher = (_b.sent())[0];
                            if (!anyDispatcher) return [3 /*break*/, 4];
                            accountId = anyDispatcher.id;
                            return [3 /*break*/, 8];
                        case 4: return [4 /*yield*/, client_1.db
                                .select()
                                .from(index_1.whatsappAccounts)
                                .where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.status, 'connected'))
                                .limit(1)];
                        case 5:
                            connected = (_b.sent())[0];
                            if (!connected) return [3 /*break*/, 6];
                            accountId = connected.id;
                            return [3 /*break*/, 8];
                        case 6: return [4 /*yield*/, client_1.db.select().from(index_1.whatsappAccounts).limit(1)];
                        case 7:
                            firstAcc = (_b.sent())[0];
                            if (!firstAcc) {
                                return [2 /*return*/, reply.status(400).send({
                                        success: false,
                                        error: 'لا يوجد أي حساب واتساب مسجل في النظام للإرسال منه.',
                                    })];
                            }
                            accountId = firstAcc.id;
                            _b.label = 8;
                        case 8: return [4 /*yield*/, client_1.db
                                .select()
                                .from(index_1.whatsappAccounts)
                                .where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, accountId))
                                .limit(1)];
                        case 9:
                            account = (_b.sent())[0];
                            if (!account) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'حساب WhatsApp المحدد غير موجود' })];
                            }
                            return [4 /*yield*/, client_1.db
                                    .select()
                                    .from(index_1.contacts)
                                    .where((0, drizzle_orm_1.eq)(index_1.contacts.phoneNumber, formattedPhone))
                                    .limit(1)];
                        case 10:
                            contact = (_b.sent())[0];
                            if (!!contact) return [3 /*break*/, 12];
                            remoteJid = "".concat(formattedPhone.replace(/\D/g, ''), "@s.whatsapp.net");
                            return [4 /*yield*/, client_1.db
                                    .insert(index_1.contacts)
                                    .values({
                                    companyId: account.companyId,
                                    name: (contactName === null || contactName === void 0 ? void 0 : contactName.trim()) || formattedPhone,
                                    phoneNumber: formattedPhone,
                                    whatsappJid: remoteJid,
                                    source: 'manual_outbound',
                                })
                                    .returning()];
                        case 11:
                            contact = (_b.sent())[0];
                            return [3 /*break*/, 14];
                        case 12:
                            if (!(contactName && contactName.trim() !== '' && contact.name === contact.phoneNumber)) return [3 /*break*/, 14];
                            return [4 /*yield*/, client_1.db
                                    .update(index_1.contacts)
                                    .set({ name: contactName.trim(), updatedAt: new Date() })
                                    .where((0, drizzle_orm_1.eq)(index_1.contacts.id, contact.id))
                                    .returning()];
                        case 13:
                            // Update contact name if it was previously just the phone number
                            contact = (_b.sent())[0];
                            _b.label = 14;
                        case 14: return [4 /*yield*/, client_1.db
                                .select()
                                .from(index_1.conversations)
                                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_1.conversations.contactId, contact.id), (0, drizzle_orm_1.eq)(index_1.conversations.whatsappAccountId, account.id)))
                                .limit(1)];
                        case 15:
                            convo = (_b.sent())[0];
                            if (!!convo) return [3 /*break*/, 17];
                            return [4 /*yield*/, client_1.db
                                    .insert(index_1.conversations)
                                    .values({
                                    companyId: account.companyId,
                                    contactId: contact.id,
                                    whatsappAccountId: account.id,
                                    assignedStationId: stationId || null,
                                    assignedEmployeeId: assignedEmployeeId || null,
                                    status: 'open',
                                    lastMessageText: (messageText === null || messageText === void 0 ? void 0 : messageText.trim()) || null,
                                    lastMessageAt: (messageText === null || messageText === void 0 ? void 0 : messageText.trim()) ? new Date() : null,
                                    unreadCount: '0',
                                })
                                    .returning()];
                        case 16:
                            convo = (_b.sent())[0];
                            return [3 /*break*/, 19];
                        case 17:
                            updateData = { updatedAt: new Date() };
                            if (convo.status === 'closed') {
                                updateData.status = 'open';
                            }
                            if (stationId)
                                updateData.assignedStationId = stationId;
                            if (assignedEmployeeId)
                                updateData.assignedEmployeeId = assignedEmployeeId;
                            return [4 /*yield*/, client_1.db
                                    .update(index_1.conversations)
                                    .set(updateData)
                                    .where((0, drizzle_orm_1.eq)(index_1.conversations.id, convo.id))
                                    .returning()];
                        case 18:
                            convo = (_b.sent())[0];
                            _b.label = 19;
                        case 19:
                            if (!(messageText && messageText.trim() !== '')) return [3 /*break*/, 24];
                            rawNumber = formattedPhone.replace(/\D/g, '');
                            toJid = contact.whatsappJid || "".concat(rawNumber, "@s.whatsapp.net");
                            whatsappMessageId = "crm_".concat(Date.now(), "_").concat(Math.random().toString(36).substring(2, 7));
                            return [4 /*yield*/, client_1.db
                                    .insert(index_1.messages)
                                    .values({
                                    conversationId: convo.id,
                                    contactId: contact.id,
                                    senderType: 'employee',
                                    senderUserId: user.id,
                                    direction: 'outgoing',
                                    type: 'text',
                                    text: messageText.trim(),
                                    whatsappMessageId: whatsappMessageId,
                                    status: 'pending',
                                })
                                    .returning()];
                        case 20:
                            savedMsg = (_b.sent())[0];
                            return [4 /*yield*/, outbound_queue_service_1.OutboundQueueService.sendMessage({
                                    companyId: account.companyId,
                                    accountId: account.id,
                                    conversationId: convo.id,
                                    messageId: savedMsg.id,
                                    toJid: toJid,
                                    type: 'text',
                                    text: messageText.trim(),
                                })];
                        case 21:
                            sendResult = _b.sent();
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
                        case 22:
                            _b.sent();
                            return [4 /*yield*/, client_1.db
                                    .update(index_1.conversations)
                                    .set({
                                    lastMessageText: messageText.trim(),
                                    lastMessageAt: new Date(),
                                    updatedAt: new Date(),
                                })
                                    .where((0, drizzle_orm_1.eq)(index_1.conversations.id, convo.id))];
                        case 23:
                            _b.sent();
                            ws_hub_1.wsHub.broadcast('message.created', {
                                accountId: account.id,
                                message: __assign(__assign({}, savedMsg), { conversationId: convo.id, contactName: contact.name, contactPhone: contact.phoneNumber }),
                            });
                            _b.label = 24;
                        case 24:
                            ws_hub_1.wsHub.broadcast('conversation.created', {
                                conversationId: convo.id,
                                contactName: contact.name,
                                contactPhone: contact.phoneNumber,
                                accountId: account.id,
                            });
                            return [2 /*return*/, reply.status(201).send({
                                    success: true,
                                    data: __assign(__assign({}, convo), { contact: contact, whatsappAccount: {
                                            id: account.id,
                                            displayName: account.displayName,
                                            phoneNumber: account.phoneNumber,
                                        } }),
                                })];
                    }
                });
            }); });
            /**
             * GET /api/v1/conversations/:id/timeline — Full Follow-Up Timeline & History
             */
            app.get('/:id/timeline', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, convo, convReminders, internalNotes, timelineItems;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            return [4 /*yield*/, client_1.db
                                    .select({
                                    id: index_1.conversations.id,
                                    contactId: index_1.conversations.contactId,
                                    status: index_1.conversations.status,
                                    createdAt: index_1.conversations.createdAt,
                                    updatedAt: index_1.conversations.updatedAt,
                                })
                                    .from(index_1.conversations)
                                    .where((0, drizzle_orm_1.eq)(index_1.conversations.id, id))
                                    .limit(1)];
                        case 1:
                            convo = (_a.sent())[0];
                            if (!convo) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'المحادثة غير موجودة' })];
                            }
                            return [4 /*yield*/, client_1.db
                                    .select({
                                    id: index_1.reminders.id,
                                    title: index_1.reminders.title,
                                    note: index_1.reminders.note,
                                    dueAt: index_1.reminders.dueAt,
                                    status: index_1.reminders.status,
                                    completedAt: index_1.reminders.completedAt,
                                    createdAt: index_1.reminders.createdAt,
                                    assignedUserName: index_1.users.name,
                                    assignedUserEmail: index_1.users.email,
                                })
                                    .from(index_1.reminders)
                                    .leftJoin(index_1.users, (0, drizzle_orm_1.eq)(index_1.reminders.assignedUserId, index_1.users.id))
                                    .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(index_1.reminders.conversationId, convo.id), (0, drizzle_orm_1.eq)(index_1.reminders.leadId, convo.contactId)))
                                    .orderBy((0, drizzle_orm_1.desc)(index_1.reminders.dueAt))];
                        case 2:
                            convReminders = _a.sent();
                            return [4 /*yield*/, client_1.db
                                    .select({
                                    id: index_1.messages.id,
                                    text: index_1.messages.text,
                                    metadata: index_1.messages.metadata,
                                    createdAt: index_1.messages.createdAt,
                                    timestamp: index_1.messages.timestamp,
                                    authorName: index_1.users.name,
                                })
                                    .from(index_1.messages)
                                    .leftJoin(index_1.users, (0, drizzle_orm_1.eq)(index_1.messages.senderUserId, index_1.users.id))
                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_1.messages.conversationId, convo.id), (0, drizzle_orm_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject(["", "->>'isInternalNote' = 'true'"], ["", "->>'isInternalNote' = 'true'"])), index_1.messages.metadata)))
                                    .orderBy((0, drizzle_orm_1.desc)(index_1.messages.createdAt))];
                        case 3:
                            internalNotes = _a.sent();
                            timelineItems = __spreadArray(__spreadArray(__spreadArray([], convReminders.map(function (r) { return ({
                                id: r.id,
                                type: 'reminder',
                                title: r.title,
                                description: r.note,
                                date: r.dueAt,
                                createdAt: r.createdAt,
                                completedAt: r.completedAt,
                                status: r.status,
                                author: r.assignedUserName || 'فريق العمل',
                                badge: r.status === 'completed' ? 'تمت المتابعة' : r.status === 'cancelled' ? 'ملغي' : 'متابعة مطلوبة',
                            }); }), true), internalNotes.map(function (n) {
                                var _a;
                                return ({
                                    id: n.id,
                                    type: 'note',
                                    title: 'ملاحظة داخلية',
                                    description: n.text,
                                    date: n.createdAt,
                                    createdAt: n.createdAt,
                                    status: 'note',
                                    author: n.authorName || ((_a = n.metadata) === null || _a === void 0 ? void 0 : _a.authorName) || 'الموظف',
                                    badge: 'ملاحظة',
                                });
                            }), true), [
                                {
                                    id: "created_".concat(convo.id),
                                    type: 'system',
                                    title: 'بدء المحادثة وفتح قناة التواصل',
                                    description: 'تم تسجيل المحادثة مع العميل في النظام',
                                    date: convo.createdAt,
                                    createdAt: convo.createdAt,
                                    status: convo.status,
                                    author: 'النظام',
                                    badge: 'بداية المحادثة',
                                },
                            ], false).sort(function (a, b) { return new Date(b.date).getTime() - new Date(a.date).getTime(); });
                            return [2 /*return*/, reply.send({
                                    success: true,
                                    data: timelineItems,
                                })];
                    }
                });
            }); });
            /**
             * GET /api/v1/conversations/:id — Single conversation details + contact + lead
             */
            app.get('/:id', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, row, lead;
                var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                return __generator(this, function (_k) {
                    switch (_k.label) {
                        case 0:
                            id = request.params.id;
                            return [4 /*yield*/, client_1.db
                                    .select({
                                    id: index_1.conversations.id,
                                    status: index_1.conversations.status,
                                    lastMessageText: index_1.conversations.lastMessageText,
                                    lastMessageAt: index_1.conversations.lastMessageAt,
                                    unreadCount: index_1.conversations.unreadCount,
                                    humanMode: index_1.conversations.humanMode,
                                    automationEnabled: index_1.conversations.automationEnabled,
                                    assignmentSource: index_1.conversations.assignmentSource,
                                    assignedAt: index_1.conversations.assignedAt,
                                    createdAt: index_1.conversations.createdAt,
                                    updatedAt: index_1.conversations.updatedAt,
                                    contact: {
                                        id: index_1.contacts.id,
                                        name: index_1.contacts.name,
                                        phoneNumber: index_1.contacts.phoneNumber,
                                        whatsappJid: index_1.contacts.whatsappJid,
                                        avatarUrl: index_1.contacts.avatarUrl,
                                        source: index_1.contacts.source,
                                        metadata: index_1.contacts.metadata,
                                    },
                                    station: {
                                        id: index_1.stations.id,
                                        name: index_1.stations.name,
                                    },
                                    assignedEmployee: {
                                        id: index_1.employees.id,
                                        name: index_1.users.name,
                                        email: index_1.users.email,
                                    },
                                    whatsappAccount: {
                                        id: index_1.whatsappAccounts.id,
                                        displayName: index_1.whatsappAccounts.displayName,
                                        phoneNumber: index_1.whatsappAccounts.phoneNumber,
                                    },
                                })
                                    .from(index_1.conversations)
                                    .innerJoin(index_1.contacts, (0, drizzle_orm_1.eq)(index_1.conversations.contactId, index_1.contacts.id))
                                    .leftJoin(index_1.stations, (0, drizzle_orm_1.eq)(index_1.conversations.assignedStationId, index_1.stations.id))
                                    .leftJoin(index_1.employees, (0, drizzle_orm_1.eq)(index_1.conversations.assignedEmployeeId, index_1.employees.id))
                                    .leftJoin(index_1.users, (0, drizzle_orm_1.eq)(index_1.employees.userId, index_1.users.id))
                                    .leftJoin(index_1.whatsappAccounts, (0, drizzle_orm_1.eq)(index_1.conversations.whatsappAccountId, index_1.whatsappAccounts.id))
                                    .where((0, drizzle_orm_1.eq)(index_1.conversations.id, id))
                                    .limit(1)];
                        case 1:
                            row = (_k.sent())[0];
                            if (!row) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Conversation not found' })];
                            }
                            return [4 /*yield*/, client_1.db
                                    .select()
                                    .from(index_1.leads)
                                    .where((0, drizzle_orm_1.eq)(index_1.leads.contactId, row.contact.id))
                                    .orderBy((0, drizzle_orm_1.desc)(index_1.leads.createdAt))
                                    .limit(1)];
                        case 2:
                            lead = (_k.sent())[0];
                            return [2 /*return*/, reply.send({
                                    success: true,
                                    data: __assign(__assign({}, row), { unreadCount: parseInt(row.unreadCount || '0', 10) || 0, contactId: (_a = row.contact) === null || _a === void 0 ? void 0 : _a.id, contactName: ((_b = row.contact) === null || _b === void 0 ? void 0 : _b.name) || ((_c = row.contact) === null || _c === void 0 ? void 0 : _c.phoneNumber) || 'عميل واتساب', contactPhone: ((_d = row.contact) === null || _d === void 0 ? void 0 : _d.phoneNumber) || '', contactAvatar: ((_e = row.contact) === null || _e === void 0 ? void 0 : _e.avatarUrl) || '', stationId: (_f = row.station) === null || _f === void 0 ? void 0 : _f.id, stationName: ((_g = row.station) === null || _g === void 0 ? void 0 : _g.name) || '', assignedAgentId: (_h = row.assignedEmployee) === null || _h === void 0 ? void 0 : _h.id, assignedAgentName: ((_j = row.assignedEmployee) === null || _j === void 0 ? void 0 : _j.name) || '', lastMessageTimestamp: row.lastMessageAt
                                            ? new Date(row.lastMessageAt).toISOString()
                                            : row.updatedAt
                                                ? new Date(row.updatedAt).toISOString()
                                                : undefined, lead: lead || null }),
                                })];
                    }
                });
            }); });
            assignHandler = function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, raw, updates, employeeId, stationId, updated, cont, meta, eventPayload;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            raw = request.body || {};
                            updates = {
                                updatedAt: new Date(),
                                assignedAt: new Date(),
                                assignmentSource: 'manual',
                            };
                            employeeId = raw.assignedEmployeeId !== undefined ? raw.assignedEmployeeId : raw.assignedAgentId;
                            if (employeeId !== undefined) {
                                updates.assignedEmployeeId = employeeId;
                            }
                            stationId = raw.assignedStationId !== undefined ? raw.assignedStationId : raw.stationId;
                            if (stationId !== undefined) {
                                updates.assignedStationId = stationId;
                            }
                            if (raw.assignedSupervisorId !== undefined) {
                                updates.assignedSupervisorId = raw.assignedSupervisorId;
                            }
                            return [4 /*yield*/, client_1.db
                                    .update(index_1.conversations)
                                    .set(updates)
                                    .where((0, drizzle_orm_1.eq)(index_1.conversations.id, id))
                                    .returning()];
                        case 1:
                            updated = (_a.sent())[0];
                            if (!updated) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Conversation not found' })];
                            }
                            if (!(updated.contactId && employeeId)) return [3 /*break*/, 5];
                            return [4 /*yield*/, client_1.db.select().from(index_1.contacts).where((0, drizzle_orm_1.eq)(index_1.contacts.id, updated.contactId)).limit(1)];
                        case 2:
                            cont = (_a.sent())[0];
                            if (!cont) return [3 /*break*/, 4];
                            meta = (cont.metadata || {});
                            meta.assignedEmployeeId = employeeId;
                            return [4 /*yield*/, client_1.db.update(index_1.contacts).set({ metadata: meta, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(index_1.contacts.id, cont.id))];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4:
                            // Dispatch instant WhatsApp alert to employee's personal phone number
                            if (raw.notifyEmployeeWhatsApp !== false) {
                                assignment_service_1.AssignmentService.notifyEmployeeViaWhatsApp({
                                    employeeId: employeeId,
                                    contactId: updated.contactId,
                                    conversationId: id,
                                    lastMessageText: updated.lastMessageText,
                                    whatsappAccountId: updated.whatsappAccountId,
                                    sourceDescription: 'قام مدير النظام بإسناد محادثة العميل التالية إليك مباشرة',
                                }).catch(function (err) { return logger_1.logger.warn({ err: err === null || err === void 0 ? void 0 : err.message, employeeId: employeeId }, 'Failed manual assign employee WhatsApp alert'); });
                            }
                            _a.label = 5;
                        case 5:
                            eventPayload = {
                                id: id,
                                conversationId: id,
                                assignedEmployeeId: employeeId !== undefined ? employeeId : updated.assignedEmployeeId,
                                assignedStationId: stationId !== undefined ? stationId : updated.assignedStationId,
                                updates: updates,
                            };
                            ws_hub_1.wsHub.broadcast('conversation.updated', eventPayload);
                            ws_hub_1.wsHub.broadcast('conversation_update', eventPayload);
                            ws_hub_1.wsHub.broadcast('assigned', { conversationId: id, assignedEmployeeId: employeeId });
                            logger_1.logger.info({ conversationId: id, updates: updates }, 'Conversation reassigned and contact metadata updated');
                            return [2 /*return*/, reply.send({ success: true, data: updated })];
                    }
                });
            }); };
            app.post('/:id/assign', assignHandler);
            app.patch('/:id/assign', assignHandler);
            /**
             * PATCH /api/v1/conversations/:id/status — Update status (open, pending, closed)
             */
            app.patch('/:id/status', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, parsed, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            parsed = statusSchema.safeParse(request.body);
                            if (!parsed.success) {
                                return [2 /*return*/, reply.status(400).send({ success: false, error: 'Invalid status', details: parsed.error.format() })];
                            }
                            return [4 /*yield*/, client_1.db
                                    .update(index_1.conversations)
                                    .set({ status: parsed.data.status, updatedAt: new Date() })
                                    .where((0, drizzle_orm_1.eq)(index_1.conversations.id, id))
                                    .returning()];
                        case 1:
                            updated = (_a.sent())[0];
                            if (!updated) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Conversation not found' })];
                            }
                            ws_hub_1.wsHub.broadcast('conversation.updated', { conversationId: id, status: parsed.data.status });
                            return [2 /*return*/, reply.send({ success: true, data: updated })];
                    }
                });
            }); });
            /**
             * POST /api/v1/conversations/:id/read — Mark conversation as read
             */
            app.post('/:id/read', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, conv, sessionManager, provider, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            return [4 /*yield*/, client_1.db
                                    .select({
                                    id: index_1.conversations.id,
                                    whatsappAccountId: index_1.conversations.whatsappAccountId,
                                    contactJid: index_1.contacts.whatsappJid,
                                })
                                    .from(index_1.conversations)
                                    .innerJoin(index_1.contacts, (0, drizzle_orm_1.eq)(index_1.conversations.contactId, index_1.contacts.id))
                                    .where((0, drizzle_orm_1.eq)(index_1.conversations.id, id))
                                    .limit(1)];
                        case 1:
                            conv = (_a.sent())[0];
                            if (!conv) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Conversation not found' })];
                            }
                            // Reset unread count
                            return [4 /*yield*/, client_1.db
                                    .update(index_1.conversations)
                                    .set({ unreadCount: '0', updatedAt: new Date() })
                                    .where((0, drizzle_orm_1.eq)(index_1.conversations.id, id))];
                        case 2:
                            // Reset unread count
                            _a.sent();
                            if (!(index_2.config.DEPLOYMENT_MODE === 'local' && conv.whatsappAccountId && conv.contactJid)) return [3 /*break*/, 8];
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 7, , 8]);
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('../whatsapp/session.manager'); })];
                        case 4:
                            sessionManager = (_a.sent()).sessionManager;
                            provider = sessionManager.getProvider(conv.whatsappAccountId);
                            if (!provider) return [3 /*break*/, 6];
                            return [4 /*yield*/, provider.markRead(conv.contactJid, [])];
                        case 5:
                            _a.sent();
                            _a.label = 6;
                        case 6: return [3 /*break*/, 8];
                        case 7:
                            err_1 = _a.sent();
                            logger_1.logger.debug({ err: err_1 }, 'Failed to send read receipt to WA socket');
                            return [3 /*break*/, 8];
                        case 8:
                            ws_hub_1.wsHub.broadcast('conversation.read', { conversationId: id });
                            ws_hub_1.wsHub.broadcast('conversation.updated', { conversationId: id, unreadCount: 0 });
                            return [2 /*return*/, reply.send({ success: true, message: 'Conversation marked as read' })];
                    }
                });
            }); });
            /**
             * PATCH /api/v1/conversations/:id/mode — Toggle human mode & automation
             */
            app.patch('/:id/mode', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, parsed, updates, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            parsed = modeSchema.safeParse(request.body);
                            if (!parsed.success) {
                                return [2 /*return*/, reply.status(400).send({ success: false, error: 'Invalid mode payload' })];
                            }
                            updates = { updatedAt: new Date() };
                            if (parsed.data.humanMode !== undefined)
                                updates.humanMode = parsed.data.humanMode;
                            if (parsed.data.automationEnabled !== undefined)
                                updates.automationEnabled = parsed.data.automationEnabled;
                            return [4 /*yield*/, client_1.db
                                    .update(index_1.conversations)
                                    .set(updates)
                                    .where((0, drizzle_orm_1.eq)(index_1.conversations.id, id))
                                    .returning()];
                        case 1:
                            updated = (_a.sent())[0];
                            if (!updated) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Conversation not found' })];
                            }
                            ws_hub_1.wsHub.broadcast('conversation.updated', __assign({ conversationId: id }, updates));
                            return [2 /*return*/, reply.send({ success: true, data: updated })];
                    }
                });
            }); });
            /**
             * DELETE /api/v1/conversations/:id — Delete conversation and all its messages/records
             */
            app.delete('/:id', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, uuidSchema, parsedId, existing, err_2;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            uuidSchema = zod_1.z.string().uuid();
                            parsedId = uuidSchema.safeParse(id);
                            if (!parsedId.success) {
                                return [2 /*return*/, reply.status(400).send({
                                        success: false,
                                        error: 'معرف المحادثة غير صالح (يجب أن يكون بصيغة UUID)',
                                    })];
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, client_1.db
                                    .select({ id: index_1.conversations.id, contactId: index_1.conversations.contactId })
                                    .from(index_1.conversations)
                                    .where((0, drizzle_orm_1.eq)(index_1.conversations.id, id))
                                    .limit(1)];
                        case 2:
                            existing = (_a.sent())[0];
                            if (!existing) {
                                return [2 /*return*/, reply.status(404).send({
                                        success: false,
                                        error: 'المحادثة غير موجودة أو تم حذفها بالفعل مسبقاً',
                                    })];
                            }
                            // 2. Perform safe transactional deletion
                            return [4 /*yield*/, client_1.db.transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: 
                                            // Delete messages associated with this conversation
                                            return [4 /*yield*/, tx.delete(index_1.messages).where((0, drizzle_orm_1.eq)(index_1.messages.conversationId, id))];
                                            case 1:
                                                // Delete messages associated with this conversation
                                                _a.sent();
                                                // Delete reminders associated with this conversation
                                                return [4 /*yield*/, tx.delete(index_1.reminders).where((0, drizzle_orm_1.eq)(index_1.reminders.conversationId, id))];
                                            case 2:
                                                // Delete reminders associated with this conversation
                                                _a.sent();
                                                // Delete conversation tags
                                                return [4 /*yield*/, tx.delete(index_1.conversationTags).where((0, drizzle_orm_1.eq)(index_1.conversationTags.conversationId, id))];
                                            case 3:
                                                // Delete conversation tags
                                                _a.sent();
                                                // Finally delete conversation record itself
                                                return [4 /*yield*/, tx.delete(index_1.conversations).where((0, drizzle_orm_1.eq)(index_1.conversations.id, id))];
                                            case 4:
                                                // Finally delete conversation record itself
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 3:
                            // 2. Perform safe transactional deletion
                            _a.sent();
                            // 3. Broadcast real-time deletion to all connected agents and clients
                            ws_hub_1.wsHub.broadcast('conversation.deleted', { id: id, conversationId: id });
                            ws_hub_1.wsHub.broadcast('conversation_deleted', { id: id, conversationId: id });
                            logger_1.logger.info({ conversationId: id, contactId: existing.contactId }, 'Conversation and associated data deleted successfully');
                            return [2 /*return*/, reply.send({
                                    success: true,
                                    message: 'تم مسح المحادثة وكافة رسائلها وسجلاتها بنجاح من النظام',
                                    data: { id: id },
                                })];
                        case 4:
                            err_2 = _a.sent();
                            logger_1.logger.error({ err: err_2, conversationId: id }, 'Database error while deleting conversation');
                            return [2 /*return*/, reply.status(500).send({
                                    success: false,
                                    error: 'حدث خطأ غير متوقع أثناء محاولة حذف المحادثة من قاعدة البيانات',
                                    details: err_2 === null || err_2 === void 0 ? void 0 : err_2.message,
                                })];
                        case 5: return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5;
