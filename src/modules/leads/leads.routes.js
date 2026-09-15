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
exports.leadsRoutes = leadsRoutes;
var drizzle_orm_1 = require("drizzle-orm");
var zod_1 = require("zod");
var client_1 = require("../../database/client");
var index_1 = require("../../database/schema/index");
var auth_middleware_1 = require("../../middleware/auth.middleware");
var ws_hub_1 = require("../../websocket/ws.hub");
var leadStages = ['new', 'contacted', 'qualified', 'waiting', 'converted', 'lost'];
var listLeadsQuerySchema = zod_1.z.object({
    stage: zod_1.z.enum(leadStages).optional(),
    stationId: zod_1.z.string().uuid().optional(),
    assignedEmployeeId: zod_1.z.string().uuid().optional(),
    contactId: zod_1.z.string().uuid().optional(),
    limit: zod_1.z.coerce.number().min(1).max(100).default(50),
    offset: zod_1.z.coerce.number().min(0).default(0),
});
var createLeadSchema = zod_1.z.object({
    contactId: zod_1.z.string().uuid(),
    source: zod_1.z.string().optional(),
    campaign: zod_1.z.string().optional(),
    destination: zod_1.z.string().optional(),
    travelDate: zod_1.z.string().optional(),
    stage: zod_1.z.enum(leadStages).default('new'),
    stationId: zod_1.z.string().uuid().optional(),
    assignedEmployeeId: zod_1.z.string().uuid().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
var updateStageSchema = zod_1.z.object({
    stage: zod_1.z.enum(leadStages),
});
var updateLeadSchema = zod_1.z.object({
    destination: zod_1.z.string().optional(),
    travelDate: zod_1.z.string().optional(),
    campaign: zod_1.z.string().optional(),
    assignedEmployeeId: zod_1.z.string().uuid().nullable().optional(),
    stationId: zod_1.z.string().uuid().nullable().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
function leadsRoutes(app) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            app.addHook('preHandler', auth_middleware_1.authenticate);
            /**
             * GET /api/v1/leads — List leads with filters
             */
            app.get('/', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var query, conditions, whereClause, rows;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            query = listLeadsQuerySchema.parse(request.query);
                            conditions = [];
                            if (query.stage)
                                conditions.push((0, drizzle_orm_1.eq)(index_1.leads.stage, query.stage));
                            if (query.stationId)
                                conditions.push((0, drizzle_orm_1.eq)(index_1.leads.stationId, query.stationId));
                            if (query.assignedEmployeeId)
                                conditions.push((0, drizzle_orm_1.eq)(index_1.leads.assignedEmployeeId, query.assignedEmployeeId));
                            if (query.contactId)
                                conditions.push((0, drizzle_orm_1.eq)(index_1.leads.contactId, query.contactId));
                            whereClause = conditions.length > 0 ? drizzle_orm_1.and.apply(void 0, conditions) : undefined;
                            return [4 /*yield*/, client_1.db
                                    .select({
                                    id: index_1.leads.id,
                                    source: index_1.leads.source,
                                    campaign: index_1.leads.campaign,
                                    destination: index_1.leads.destination,
                                    travelDate: index_1.leads.travelDate,
                                    stage: index_1.leads.stage,
                                    metadata: index_1.leads.metadata,
                                    createdAt: index_1.leads.createdAt,
                                    updatedAt: index_1.leads.updatedAt,
                                    contact: {
                                        id: index_1.contacts.id,
                                        name: index_1.contacts.name,
                                        phoneNumber: index_1.contacts.phoneNumber,
                                    },
                                    station: {
                                        id: index_1.stations.id,
                                        name: index_1.stations.name,
                                    },
                                    assignedEmployee: {
                                        id: index_1.employees.id,
                                        name: index_1.users.name,
                                    },
                                })
                                    .from(index_1.leads)
                                    .innerJoin(index_1.contacts, (0, drizzle_orm_1.eq)(index_1.leads.contactId, index_1.contacts.id))
                                    .leftJoin(index_1.stations, (0, drizzle_orm_1.eq)(index_1.leads.stationId, index_1.stations.id))
                                    .leftJoin(index_1.employees, (0, drizzle_orm_1.eq)(index_1.leads.assignedEmployeeId, index_1.employees.id))
                                    .leftJoin(index_1.users, (0, drizzle_orm_1.eq)(index_1.employees.userId, index_1.users.id))
                                    .where(whereClause)
                                    .orderBy((0, drizzle_orm_1.desc)(index_1.leads.createdAt))
                                    .limit(query.limit)
                                    .offset(query.offset)];
                        case 1:
                            rows = _a.sent();
                            return [2 /*return*/, reply.send({ success: true, data: rows })];
                    }
                });
            }); });
            /**
             * POST /api/v1/leads — Create lead for contact
             */
            app.post('/', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var parsed, created;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            parsed = createLeadSchema.safeParse(request.body);
                            if (!parsed.success) {
                                return [2 /*return*/, reply.status(400).send({ success: false, error: 'Invalid lead payload', details: parsed.error.format() })];
                            }
                            return [4 /*yield*/, client_1.db
                                    .insert(index_1.leads)
                                    .values(parsed.data)
                                    .returning()];
                        case 1:
                            created = (_a.sent())[0];
                            ws_hub_1.wsHub.broadcast('lead.created', created);
                            return [2 /*return*/, reply.status(201).send({ success: true, data: created })];
                    }
                });
            }); });
            /**
             * PATCH /api/v1/leads/:id/stage — Advance or change lead pipeline stage
             */
            app.patch('/:id/stage', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, parsed, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            parsed = updateStageSchema.safeParse(request.body);
                            if (!parsed.success) {
                                return [2 /*return*/, reply.status(400).send({ success: false, error: 'Invalid stage', details: parsed.error.format() })];
                            }
                            return [4 /*yield*/, client_1.db
                                    .update(index_1.leads)
                                    .set({ stage: parsed.data.stage, updatedAt: new Date() })
                                    .where((0, drizzle_orm_1.eq)(index_1.leads.id, id))
                                    .returning()];
                        case 1:
                            updated = (_a.sent())[0];
                            if (!updated) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Lead not found' })];
                            }
                            ws_hub_1.wsHub.broadcast('lead.updated', { leadId: id, stage: parsed.data.stage });
                            return [2 /*return*/, reply.send({ success: true, data: updated })];
                    }
                });
            }); });
            /**
             * PATCH /api/v1/leads/:id — Update lead info
             */
            app.patch('/:id', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, parsed, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            parsed = updateLeadSchema.safeParse(request.body);
                            if (!parsed.success) {
                                return [2 /*return*/, reply.status(400).send({ success: false, error: 'Invalid lead update', details: parsed.error.format() })];
                            }
                            return [4 /*yield*/, client_1.db
                                    .update(index_1.leads)
                                    .set(__assign(__assign({}, parsed.data), { updatedAt: new Date() }))
                                    .where((0, drizzle_orm_1.eq)(index_1.leads.id, id))
                                    .returning()];
                        case 1:
                            updated = (_a.sent())[0];
                            if (!updated) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Lead not found' })];
                            }
                            return [2 /*return*/, reply.send({ success: true, data: updated })];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
