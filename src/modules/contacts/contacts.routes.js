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
exports.contactsRoutes = contactsRoutes;
var drizzle_orm_1 = require("drizzle-orm");
var zod_1 = require("zod");
var client_1 = require("../../database/client");
var index_1 = require("../../database/schema/index");
var auth_middleware_1 = require("../../middleware/auth.middleware");
var phone_validator_1 = require("../../utils/phone.validator");
var landing_sync_service_1 = require("../../services/landing-sync.service");
var listContactsQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().min(1).max(100).default(50),
    offset: zod_1.z.coerce.number().min(0).default(0),
});
var updateContactSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    avatarUrl: zod_1.z.string().url().nullable().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
function contactsRoutes(app) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            app.addHook('preHandler', auth_middleware_1.authenticate);
            /**
             * GET /api/v1/contacts — Search and list contacts
             */
            app.get('/', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var query, whereClause, rawSearch, s, searchConditions, cleanDigits, strippedZero, formatted, rows, contactIds, enhancedRows, pgArrayLiteral, latestConversations, employeeMap_1, _i, _a, row;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            query = listContactsQuerySchema.parse(request.query);
                            whereClause = undefined;
                            if (query.search && query.search.trim() !== '') {
                                rawSearch = query.search.trim();
                                s = "%".concat(rawSearch, "%");
                                searchConditions = [
                                    (0, drizzle_orm_1.ilike)(index_1.contacts.name, s),
                                    (0, drizzle_orm_1.ilike)(index_1.contacts.phoneNumber, s),
                                    (0, drizzle_orm_1.ilike)(index_1.contacts.whatsappJid, s),
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
                                whereClause = drizzle_orm_1.or.apply(void 0, searchConditions);
                            }
                            return [4 /*yield*/, client_1.db
                                    .select({
                                    id: index_1.contacts.id,
                                    name: index_1.contacts.name,
                                    phoneNumber: index_1.contacts.phoneNumber,
                                    whatsappJid: index_1.contacts.whatsappJid,
                                    createdAt: index_1.contacts.createdAt,
                                    updatedAt: index_1.contacts.updatedAt,
                                })
                                    .from(index_1.contacts)
                                    .where(whereClause)
                                    .orderBy((0, drizzle_orm_1.desc)(index_1.contacts.updatedAt))
                                    .limit(query.limit)
                                    .offset(query.offset)];
                        case 1:
                            rows = _b.sent();
                            contactIds = rows.map(function (r) { return r.id; });
                            enhancedRows = rows;
                            if (!(contactIds.length > 0)) return [3 /*break*/, 3];
                            pgArrayLiteral = "{".concat(contactIds.join(','), "}");
                            return [4 /*yield*/, client_1.db.execute((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n        SELECT DISTINCT ON (c.contact_id)\n          c.contact_id,\n          u.name AS \"assignedEmployeeName\"\n        FROM conversations c\n        LEFT JOIN employees e ON c.assigned_employee_id = e.id\n        LEFT JOIN users u ON e.user_id = u.id\n        WHERE c.contact_id = ANY(", "::uuid[])\n        ORDER BY c.contact_id, c.created_at DESC\n      "], ["\n        SELECT DISTINCT ON (c.contact_id)\n          c.contact_id,\n          u.name AS \"assignedEmployeeName\"\n        FROM conversations c\n        LEFT JOIN employees e ON c.assigned_employee_id = e.id\n        LEFT JOIN users u ON e.user_id = u.id\n        WHERE c.contact_id = ANY(", "::uuid[])\n        ORDER BY c.contact_id, c.created_at DESC\n      "])), pgArrayLiteral))];
                        case 2:
                            latestConversations = _b.sent();
                            employeeMap_1 = new Map();
                            for (_i = 0, _a = latestConversations.rows; _i < _a.length; _i++) {
                                row = _a[_i];
                                employeeMap_1.set(row.contact_id, row.assignedEmployeeName);
                            }
                            enhancedRows = rows.map(function (r) { return (__assign(__assign({}, r), { assignedEmployeeName: employeeMap_1.get(r.id) || null })); });
                            _b.label = 3;
                        case 3: return [2 /*return*/, reply.send({ success: true, data: enhancedRows })];
                    }
                });
            }); });
            /**
             * GET /api/v1/contacts/:id — Single contact detail with conversations & leads
             */
            app.get('/:id', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, contact, contactConversations, contactLeads;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            return [4 /*yield*/, client_1.db
                                    .select()
                                    .from(index_1.contacts)
                                    .where((0, drizzle_orm_1.eq)(index_1.contacts.id, id))
                                    .limit(1)];
                        case 1:
                            contact = (_a.sent())[0];
                            if (!contact) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Contact not found' })];
                            }
                            return [4 /*yield*/, client_1.db
                                    .select()
                                    .from(index_1.conversations)
                                    .where((0, drizzle_orm_1.eq)(index_1.conversations.contactId, id))
                                    .orderBy((0, drizzle_orm_1.desc)(index_1.conversations.updatedAt))];
                        case 2:
                            contactConversations = _a.sent();
                            return [4 /*yield*/, client_1.db
                                    .select()
                                    .from(index_1.leads)
                                    .where((0, drizzle_orm_1.eq)(index_1.leads.contactId, id))
                                    .orderBy((0, drizzle_orm_1.desc)(index_1.leads.createdAt))];
                        case 3:
                            contactLeads = _a.sent();
                            return [2 /*return*/, reply.send({
                                    success: true,
                                    data: __assign(__assign({}, contact), { conversations: contactConversations, leads: contactLeads }),
                                })];
                    }
                });
            }); });
            /**
             * PATCH /api/v1/contacts/:id — Update contact info
             */
            app.patch('/:id', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, parsed, existing, mergedMetadata, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            parsed = updateContactSchema.safeParse(request.body);
                            if (!parsed.success) {
                                return [2 /*return*/, reply.status(400).send({ success: false, error: 'Invalid contact updates', details: parsed.error.format() })];
                            }
                            return [4 /*yield*/, client_1.db
                                    .select({ metadata: index_1.contacts.metadata })
                                    .from(index_1.contacts)
                                    .where((0, drizzle_orm_1.eq)(index_1.contacts.id, id))
                                    .limit(1)];
                        case 1:
                            existing = (_a.sent())[0];
                            if (!existing) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Contact not found' })];
                            }
                            mergedMetadata = parsed.data.metadata
                                ? __assign(__assign({}, (existing.metadata || {})), parsed.data.metadata) : existing.metadata;
                            return [4 /*yield*/, client_1.db
                                    .update(index_1.contacts)
                                    .set(__assign(__assign({}, parsed.data), { metadata: mergedMetadata, updatedAt: new Date() }))
                                    .where((0, drizzle_orm_1.eq)(index_1.contacts.id, id))
                                    .returning()];
                        case 2:
                            updated = (_a.sent())[0];
                            if (!updated) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Contact not found' })];
                            }
                            return [2 /*return*/, reply.send({ success: true, data: updated })];
                    }
                });
            }); });
            /**
             * DELETE /api/v1/contacts/:id — Delete a contact
             */
            app.delete('/:id', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, deleted;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            return [4 /*yield*/, client_1.db
                                    .delete(index_1.contacts)
                                    .where((0, drizzle_orm_1.eq)(index_1.contacts.id, id))
                                    .returning()];
                        case 1:
                            deleted = (_a.sent())[0];
                            if (!deleted) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Contact not found' })];
                            }
                            return [2 /*return*/, reply.send({ success: true, data: { id: id } })];
                    }
                });
            }); });
            /**
             * POST /api/v1/contacts/:id/sync-landing — Manually sync a specific contact to Trinity Vision landing page
             */
            app.post('/:id/sync-landing', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, contact, contactForSync, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            return [4 /*yield*/, client_1.db
                                    .select()
                                    .from(index_1.contacts)
                                    .where((0, drizzle_orm_1.eq)(index_1.contacts.id, id))
                                    .limit(1)];
                        case 1:
                            contact = (_a.sent())[0];
                            if (!contact) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Contact not found' })];
                            }
                            contactForSync = __assign(__assign({}, contact), { metadata: __assign(__assign({}, (contact.metadata || {})), { trinityLandingSynced: false }) });
                            return [4 /*yield*/, landing_sync_service_1.LandingSyncService.syncContact(contactForSync)];
                        case 2:
                            result = _a.sent();
                            return [2 /*return*/, reply.send(result)];
                    }
                });
            }); });
            /**
             * POST /api/v1/contacts/sync-all-landing — Sync all unsynced contacts to Trinity Vision landing page
             */
            app.post('/sync-all-landing', function (_request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var allContacts, unsynced, syncedCount, failedCount, _i, unsynced_1, c, res;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, client_1.db
                                .select()
                                .from(index_1.contacts)
                                .limit(200)];
                        case 1:
                            allContacts = _a.sent();
                            unsynced = allContacts.filter(function (c) {
                                var meta = (c.metadata || {});
                                return meta.trinityLandingSynced !== true;
                            });
                            syncedCount = 0;
                            failedCount = 0;
                            _i = 0, unsynced_1 = unsynced;
                            _a.label = 2;
                        case 2:
                            if (!(_i < unsynced_1.length)) return [3 /*break*/, 5];
                            c = unsynced_1[_i];
                            return [4 /*yield*/, landing_sync_service_1.LandingSyncService.syncContact(c)];
                        case 3:
                            res = _a.sent();
                            if (res.success) {
                                syncedCount++;
                            }
                            else {
                                failedCount++;
                            }
                            _a.label = 4;
                        case 4:
                            _i++;
                            return [3 /*break*/, 2];
                        case 5: return [2 /*return*/, reply.send({
                                success: true,
                                data: {
                                    totalEvaluated: unsynced.length,
                                    syncedCount: syncedCount,
                                    failedCount: failedCount,
                                },
                            })];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
var templateObject_1;
