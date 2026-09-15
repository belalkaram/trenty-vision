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
exports.StationsService = void 0;
var client_1 = require("../../database/client");
var index_1 = require("../../database/schema/index");
var drizzle_orm_1 = require("drizzle-orm");
var errors_1 = require("../../utils/errors");
var audit_service_1 = require("../audit/audit.service");
var StationsService = /** @class */ (function () {
    function StationsService() {
    }
    StationsService.getCompanyId = function () {
        return __awaiter(this, void 0, void 0, function () {
            var comp;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, client_1.db.query.companies.findFirst()];
                    case 1:
                        comp = _a.sent();
                        if (!comp) {
                            throw new Error('Default company not found');
                        }
                        return [2 /*return*/, comp.id];
                }
            });
        });
    };
    StationsService.list = function () {
        return __awaiter(this, void 0, void 0, function () {
            var allStations, stationsWithStaff;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, client_1.db
                            .select({
                            id: index_1.stations.id,
                            name: index_1.stations.name,
                            code: index_1.stations.code,
                            color: index_1.stations.color,
                            description: index_1.stations.description,
                            maxCapacity: index_1.stations.maxCapacity,
                            routingWeight: index_1.stations.routingWeight,
                            active: index_1.stations.active,
                            departmentId: index_1.stations.departmentId,
                            departmentName: index_1.departments.name,
                            createdAt: index_1.stations.createdAt,
                            updatedAt: index_1.stations.updatedAt,
                        })
                            .from(index_1.stations)
                            .leftJoin(index_1.departments, (0, drizzle_orm_1.eq)(index_1.stations.departmentId, index_1.departments.id))];
                    case 1:
                        allStations = _a.sent();
                        return [4 /*yield*/, Promise.all(allStations.map(function (st) { return __awaiter(_this, void 0, void 0, function () {
                                var staff, chatsRow;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0: return [4 /*yield*/, client_1.db
                                                .select({
                                                employeeId: index_1.employees.id,
                                                userId: index_1.users.id,
                                                name: index_1.users.name,
                                                email: index_1.users.email,
                                                status: index_1.employees.status,
                                                whatsappNumber: index_1.employees.whatsappNumber,
                                            })
                                                .from(index_1.employees)
                                                .innerJoin(index_1.users, (0, drizzle_orm_1.eq)(index_1.employees.userId, index_1.users.id))
                                                .where((0, drizzle_orm_1.eq)(index_1.employees.stationId, st.id))];
                                        case 1:
                                            staff = _b.sent();
                                            return [4 /*yield*/, client_1.db
                                                    .select({ count: (0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["count(*)::int"], ["count(*)::int"]))) })
                                                    .from(index_1.conversations)
                                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_1.conversations.assignedStationId, st.id), (0, drizzle_orm_1.eq)(index_1.conversations.status, 'open')))];
                                        case 2:
                                            chatsRow = (_b.sent())[0];
                                            return [2 /*return*/, __assign(__assign({}, st), { code: st.code || '', color: st.color || '#1c9770', maxCapacity: st.maxCapacity, isUnlimited: st.maxCapacity === null, routingWeight: (_a = st.routingWeight) !== null && _a !== void 0 ? _a : 1, status: st.active ? 'active' : 'inactive', assignedAgentsCount: staff.length, employeeCount: staff.length, activeChatsCount: (chatsRow === null || chatsRow === void 0 ? void 0 : chatsRow.count) || 0, employees: staff, employeeIds: staff.map(function (s) { return s.employeeId; }) })];
                                    }
                                });
                            }); }))];
                    case 2:
                        stationsWithStaff = _a.sent();
                        return [2 /*return*/, stationsWithStaff];
                }
            });
        });
    };
    StationsService.getById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var st, staff, chatsRow;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, client_1.db
                            .select({
                            id: index_1.stations.id,
                            name: index_1.stations.name,
                            code: index_1.stations.code,
                            color: index_1.stations.color,
                            description: index_1.stations.description,
                            maxCapacity: index_1.stations.maxCapacity,
                            routingWeight: index_1.stations.routingWeight,
                            active: index_1.stations.active,
                            departmentId: index_1.stations.departmentId,
                            departmentName: index_1.departments.name,
                            createdAt: index_1.stations.createdAt,
                            updatedAt: index_1.stations.updatedAt,
                        })
                            .from(index_1.stations)
                            .leftJoin(index_1.departments, (0, drizzle_orm_1.eq)(index_1.stations.departmentId, index_1.departments.id))
                            .where((0, drizzle_orm_1.eq)(index_1.stations.id, id))
                            .then(function (rows) { return rows[0]; })];
                    case 1:
                        st = _b.sent();
                        if (!st) {
                            throw new errors_1.NotFoundError('Station not found');
                        }
                        return [4 /*yield*/, client_1.db
                                .select({
                                employeeId: index_1.employees.id,
                                userId: index_1.users.id,
                                name: index_1.users.name,
                                email: index_1.users.email,
                                status: index_1.employees.status,
                                whatsappNumber: index_1.employees.whatsappNumber,
                            })
                                .from(index_1.employees)
                                .innerJoin(index_1.users, (0, drizzle_orm_1.eq)(index_1.employees.userId, index_1.users.id))
                                .where((0, drizzle_orm_1.eq)(index_1.employees.stationId, st.id))];
                    case 2:
                        staff = _b.sent();
                        return [4 /*yield*/, client_1.db
                                .select({ count: (0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["count(*)::int"], ["count(*)::int"]))) })
                                .from(index_1.conversations)
                                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_1.conversations.assignedStationId, st.id), (0, drizzle_orm_1.eq)(index_1.conversations.status, 'open')))];
                    case 3:
                        chatsRow = (_b.sent())[0];
                        return [2 /*return*/, __assign(__assign({}, st), { code: st.code || '', color: st.color || '#1c9770', maxCapacity: st.maxCapacity, isUnlimited: st.maxCapacity === null, routingWeight: (_a = st.routingWeight) !== null && _a !== void 0 ? _a : 1, status: st.active ? 'active' : 'inactive', assignedAgentsCount: staff.length, employeeCount: staff.length, activeChatsCount: (chatsRow === null || chatsRow === void 0 ? void 0 : chatsRow.count) || 0, employees: staff, employeeIds: staff.map(function (s) { return s.employeeId; }) })];
                }
            });
        });
    };
    StationsService.create = function (input, actorId) {
        return __awaiter(this, void 0, void 0, function () {
            var companyId, station;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.getCompanyId()];
                    case 1:
                        companyId = _c.sent();
                        return [4 /*yield*/, client_1.db
                                .insert(index_1.stations)
                                .values({
                                companyId: companyId,
                                departmentId: input.departmentId || null,
                                name: input.name,
                                code: input.code || null,
                                color: input.color || '#1c9770',
                                description: input.description || null,
                                maxCapacity: input.maxCapacity !== undefined ? input.maxCapacity : 20,
                                routingWeight: (_a = input.routingWeight) !== null && _a !== void 0 ? _a : 1,
                                active: (_b = input.active) !== null && _b !== void 0 ? _b : true,
                            })
                                .returning()];
                    case 2:
                        station = (_c.sent())[0];
                        if (!(input.employeeIds && input.employeeIds.length > 0)) return [3 /*break*/, 4];
                        return [4 /*yield*/, client_1.db
                                .update(index_1.employees)
                                .set({ stationId: station.id })
                                .where((0, drizzle_orm_1.inArray)(index_1.employees.id, input.employeeIds))];
                    case 3:
                        _c.sent();
                        _c.label = 4;
                    case 4: return [4 /*yield*/, audit_service_1.AuditService.log({
                            actorId: actorId,
                            action: 'station.create',
                            entityType: 'station',
                            entityId: station.id,
                            newValues: station,
                        })];
                    case 5:
                        _c.sent();
                        return [2 /*return*/, this.getById(station.id)];
                }
            });
        });
    };
    StationsService.update = function (id, input, actorId) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, updated;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.getById(id)];
                    case 1:
                        existing = _b.sent();
                        return [4 /*yield*/, client_1.db
                                .update(index_1.stations)
                                .set({
                                name: (_a = input.name) !== null && _a !== void 0 ? _a : existing.name,
                                departmentId: input.departmentId !== undefined ? input.departmentId : existing.departmentId,
                                code: input.code !== undefined ? input.code : existing.code,
                                color: input.color !== undefined ? input.color : existing.color,
                                description: input.description !== undefined ? input.description : existing.description,
                                maxCapacity: input.maxCapacity !== undefined ? input.maxCapacity : existing.maxCapacity,
                                routingWeight: input.routingWeight !== undefined ? input.routingWeight : existing.routingWeight,
                                active: input.active !== undefined ? input.active : existing.active,
                                updatedAt: new Date(),
                            })
                                .where((0, drizzle_orm_1.eq)(index_1.stations.id, id))
                                .returning()];
                    case 2:
                        updated = (_b.sent())[0];
                        if (!(input.employeeIds !== undefined)) return [3 /*break*/, 5];
                        // Disassociate current employees from this station
                        return [4 /*yield*/, client_1.db.update(index_1.employees).set({ stationId: null }).where((0, drizzle_orm_1.eq)(index_1.employees.stationId, id))];
                    case 3:
                        // Disassociate current employees from this station
                        _b.sent();
                        if (!(input.employeeIds.length > 0)) return [3 /*break*/, 5];
                        return [4 /*yield*/, client_1.db
                                .update(index_1.employees)
                                .set({ stationId: id })
                                .where((0, drizzle_orm_1.inArray)(index_1.employees.id, input.employeeIds))];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5: return [4 /*yield*/, audit_service_1.AuditService.log({
                            actorId: actorId,
                            action: 'station.update',
                            entityType: 'station',
                            entityId: id,
                            oldValues: existing,
                            newValues: updated,
                        })];
                    case 6:
                        _b.sent();
                        return [2 /*return*/, this.getById(id)];
                }
            });
        });
    };
    StationsService.delete = function (id, actorId) {
        return __awaiter(this, void 0, void 0, function () {
            var existing;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getById(id)];
                    case 1:
                        existing = _a.sent();
                        // Unassign employees and conversations
                        return [4 /*yield*/, client_1.db.update(index_1.employees).set({ stationId: null }).where((0, drizzle_orm_1.eq)(index_1.employees.stationId, id))];
                    case 2:
                        // Unassign employees and conversations
                        _a.sent();
                        return [4 /*yield*/, client_1.db.update(index_1.conversations).set({ assignedStationId: null }).where((0, drizzle_orm_1.eq)(index_1.conversations.assignedStationId, id))];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, client_1.db.update(index_1.leads).set({ stationId: null }).where((0, drizzle_orm_1.eq)(index_1.leads.stationId, id))];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, client_1.db.delete(index_1.stations).where((0, drizzle_orm_1.eq)(index_1.stations.id, id))];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, audit_service_1.AuditService.log({
                                actorId: actorId,
                                action: 'station.delete',
                                entityType: 'station',
                                entityId: id,
                                oldValues: existing,
                            })];
                    case 6:
                        _a.sent();
                        return [2 /*return*/, { success: true, message: 'Station deleted successfully' }];
                }
            });
        });
    };
    return StationsService;
}());
exports.StationsService = StationsService;
var templateObject_1, templateObject_2;
