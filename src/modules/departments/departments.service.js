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
exports.DepartmentsService = void 0;
var client_1 = require("../../database/client");
var index_1 = require("../../database/schema/index");
var drizzle_orm_1 = require("drizzle-orm");
var errors_1 = require("../../utils/errors");
var audit_service_1 = require("../audit/audit.service");
var DepartmentsService = /** @class */ (function () {
    function DepartmentsService() {
    }
    DepartmentsService.getCompanyId = function () {
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
    DepartmentsService.list = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, client_1.db.select().from(index_1.departments)];
            });
        });
    };
    DepartmentsService.getById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var dept;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, client_1.db.query.departments.findFirst({
                            where: (0, drizzle_orm_1.eq)(index_1.departments.id, id),
                        })];
                    case 1:
                        dept = _a.sent();
                        if (!dept) {
                            throw new errors_1.NotFoundError('Department not found');
                        }
                        return [2 /*return*/, dept];
                }
            });
        });
    };
    DepartmentsService.create = function (input, actorId) {
        return __awaiter(this, void 0, void 0, function () {
            var companyId, dept;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.getCompanyId()];
                    case 1:
                        companyId = _b.sent();
                        return [4 /*yield*/, client_1.db
                                .insert(index_1.departments)
                                .values({
                                companyId: companyId,
                                name: input.name,
                                description: input.description,
                                active: (_a = input.active) !== null && _a !== void 0 ? _a : true,
                            })
                                .returning()];
                    case 2:
                        dept = (_b.sent())[0];
                        return [4 /*yield*/, audit_service_1.AuditService.log({
                                actorId: actorId,
                                action: 'department.create',
                                entityType: 'department',
                                entityId: dept.id,
                                newValues: dept,
                            })];
                    case 3:
                        _b.sent();
                        return [2 /*return*/, dept];
                }
            });
        });
    };
    DepartmentsService.update = function (id, input, actorId) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, updated;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, this.getById(id)];
                    case 1:
                        existing = _d.sent();
                        return [4 /*yield*/, client_1.db
                                .update(index_1.departments)
                                .set({
                                name: (_a = input.name) !== null && _a !== void 0 ? _a : existing.name,
                                description: (_b = input.description) !== null && _b !== void 0 ? _b : existing.description,
                                active: (_c = input.active) !== null && _c !== void 0 ? _c : existing.active,
                                updatedAt: new Date(),
                            })
                                .where((0, drizzle_orm_1.eq)(index_1.departments.id, id))
                                .returning()];
                    case 2:
                        updated = (_d.sent())[0];
                        return [4 /*yield*/, audit_service_1.AuditService.log({
                                actorId: actorId,
                                action: 'department.update',
                                entityType: 'department',
                                entityId: id,
                                oldValues: existing,
                                newValues: updated,
                            })];
                    case 3:
                        _d.sent();
                        return [2 /*return*/, updated];
                }
            });
        });
    };
    DepartmentsService.delete = function (id, actorId) {
        return __awaiter(this, void 0, void 0, function () {
            var existing;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getById(id)];
                    case 1:
                        existing = _a.sent();
                        // Unassign employees and stations
                        return [4 /*yield*/, client_1.db.update(index_1.employees).set({ departmentId: null }).where((0, drizzle_orm_1.eq)(index_1.employees.departmentId, id))];
                    case 2:
                        // Unassign employees and stations
                        _a.sent();
                        return [4 /*yield*/, client_1.db.update(index_1.stations).set({ departmentId: null }).where((0, drizzle_orm_1.eq)(index_1.stations.departmentId, id))];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, client_1.db.delete(index_1.departments).where((0, drizzle_orm_1.eq)(index_1.departments.id, id))];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, audit_service_1.AuditService.log({
                                actorId: actorId,
                                action: 'department.delete',
                                entityType: 'department',
                                entityId: id,
                                oldValues: existing,
                            })];
                    case 5:
                        _a.sent();
                        return [2 /*return*/, { success: true, message: 'Department deleted successfully' }];
                }
            });
        });
    };
    return DepartmentsService;
}());
exports.DepartmentsService = DepartmentsService;
