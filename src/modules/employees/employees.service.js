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
exports.EmployeesService = void 0;
var client_1 = require("../../database/client");
var index_1 = require("../../database/schema/index");
var drizzle_orm_1 = require("drizzle-orm");
var pg_core_1 = require("drizzle-orm/pg-core");
var errors_1 = require("../../utils/errors");
var password_service_1 = require("../../services/password.service");
var audit_service_1 = require("../audit/audit.service");
var supervisorEmployee = (0, pg_core_1.alias)(index_1.employees, 'supervisor_employee');
var supervisorUser = (0, pg_core_1.alias)(index_1.users, 'supervisor_user');
var EmployeesService = /** @class */ (function () {
    function EmployeesService() {
    }
    EmployeesService.getCompanyId = function () {
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
    EmployeesService.list = function (filters) {
        return __awaiter(this, void 0, void 0, function () {
            var conditions, whereClause, rows, withWorkload;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        conditions = [];
                        if (filters === null || filters === void 0 ? void 0 : filters.departmentId) {
                            conditions.push((0, drizzle_orm_1.eq)(index_1.employees.departmentId, filters.departmentId));
                        }
                        if (filters === null || filters === void 0 ? void 0 : filters.stationId) {
                            conditions.push((0, drizzle_orm_1.eq)(index_1.employees.stationId, filters.stationId));
                        }
                        if (filters === null || filters === void 0 ? void 0 : filters.supervisorId) {
                            conditions.push((0, drizzle_orm_1.eq)(index_1.employees.supervisorId, filters.supervisorId));
                        }
                        if (filters === null || filters === void 0 ? void 0 : filters.status) {
                            conditions.push((0, drizzle_orm_1.eq)(index_1.employees.status, filters.status));
                        }
                        whereClause = conditions.length > 0 ? drizzle_orm_1.and.apply(void 0, conditions) : undefined;
                        return [4 /*yield*/, client_1.db
                                .select({
                                id: index_1.employees.id,
                                userId: index_1.users.id,
                                name: index_1.users.name,
                                email: index_1.users.email,
                                avatar: index_1.users.avatar,
                                roleId: index_1.roles.id,
                                roleName: index_1.roles.name,
                                roleDisplayName: index_1.roles.displayName,
                                departmentId: index_1.departments.id,
                                departmentName: index_1.departments.name,
                                stationId: index_1.stations.id,
                                stationName: index_1.stations.name,
                                supervisorId: index_1.employees.supervisorId,
                                supervisorName: supervisorUser.name,
                                whatsappNumber: index_1.employees.whatsappNumber,
                                phone: index_1.employees.whatsappNumber,
                                status: index_1.employees.status,
                                lastSeenAt: index_1.employees.lastSeenAt,
                                createdAt: index_1.employees.createdAt,
                            })
                                .from(index_1.employees)
                                .innerJoin(index_1.users, (0, drizzle_orm_1.eq)(index_1.employees.userId, index_1.users.id))
                                .innerJoin(index_1.roles, (0, drizzle_orm_1.eq)(index_1.users.roleId, index_1.roles.id))
                                .leftJoin(index_1.departments, (0, drizzle_orm_1.eq)(index_1.employees.departmentId, index_1.departments.id))
                                .leftJoin(index_1.stations, (0, drizzle_orm_1.eq)(index_1.employees.stationId, index_1.stations.id))
                                .leftJoin(supervisorEmployee, (0, drizzle_orm_1.eq)(index_1.employees.supervisorId, supervisorEmployee.id))
                                .leftJoin(supervisorUser, (0, drizzle_orm_1.eq)(supervisorEmployee.userId, supervisorUser.id))
                                .where(whereClause)];
                    case 1:
                        rows = _a.sent();
                        return [4 /*yield*/, Promise.all(rows.map(function (emp) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, openChats, pendingLeads, pendingReminders;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0: return [4 /*yield*/, Promise.all([
                                                client_1.db
                                                    .select({ count: (0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["count(*)"], ["count(*)"]))) })
                                                    .from(index_1.conversations)
                                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_1.conversations.assignedEmployeeId, emp.id), (0, drizzle_orm_1.eq)(index_1.conversations.status, 'open')))
                                                    .then(function (r) { var _a; return Number(((_a = r[0]) === null || _a === void 0 ? void 0 : _a.count) || 0); }),
                                                client_1.db
                                                    .select({ count: (0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["count(*)"], ["count(*)"]))) })
                                                    .from(index_1.leads)
                                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_1.leads.assignedEmployeeId, emp.id), (0, drizzle_orm_1.eq)(index_1.leads.stage, 'new')))
                                                    .then(function (r) { var _a; return Number(((_a = r[0]) === null || _a === void 0 ? void 0 : _a.count) || 0); }),
                                                client_1.db
                                                    .select({ count: (0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["count(*)"], ["count(*)"]))) })
                                                    .from(index_1.reminders)
                                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_1.reminders.assignedUserId, emp.userId), (0, drizzle_orm_1.eq)(index_1.reminders.status, 'pending')))
                                                    .then(function (r) { var _a; return Number(((_a = r[0]) === null || _a === void 0 ? void 0 : _a.count) || 0); }),
                                            ])];
                                        case 1:
                                            _a = _b.sent(), openChats = _a[0], pendingLeads = _a[1], pendingReminders = _a[2];
                                            return [2 /*return*/, __assign(__assign({}, emp), { workload: {
                                                        openConversations: openChats,
                                                        newLeads: pendingLeads,
                                                        pendingReminders: pendingReminders,
                                                        totalScore: openChats * 2 + pendingLeads * 3 + pendingReminders,
                                                    } })];
                                    }
                                });
                            }); }))];
                    case 2:
                        withWorkload = _a.sent();
                        return [2 /*return*/, withWorkload];
                }
            });
        });
    };
    EmployeesService.getById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var rows, emp, _a, openChats, pendingLeads, pendingReminders;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, client_1.db
                            .select({
                            id: index_1.employees.id,
                            userId: index_1.users.id,
                            name: index_1.users.name,
                            email: index_1.users.email,
                            avatar: index_1.users.avatar,
                            roleId: index_1.roles.id,
                            roleName: index_1.roles.name,
                            roleDisplayName: index_1.roles.displayName,
                            departmentId: index_1.departments.id,
                            departmentName: index_1.departments.name,
                            stationId: index_1.stations.id,
                            stationName: index_1.stations.name,
                            supervisorId: index_1.employees.supervisorId,
                            supervisorName: supervisorUser.name,
                            whatsappNumber: index_1.employees.whatsappNumber,
                            phone: index_1.employees.whatsappNumber,
                            status: index_1.employees.status,
                            lastSeenAt: index_1.employees.lastSeenAt,
                            createdAt: index_1.employees.createdAt,
                        })
                            .from(index_1.employees)
                            .innerJoin(index_1.users, (0, drizzle_orm_1.eq)(index_1.employees.userId, index_1.users.id))
                            .innerJoin(index_1.roles, (0, drizzle_orm_1.eq)(index_1.users.roleId, index_1.roles.id))
                            .leftJoin(index_1.departments, (0, drizzle_orm_1.eq)(index_1.employees.departmentId, index_1.departments.id))
                            .leftJoin(index_1.stations, (0, drizzle_orm_1.eq)(index_1.employees.stationId, index_1.stations.id))
                            .leftJoin(supervisorEmployee, (0, drizzle_orm_1.eq)(index_1.employees.supervisorId, supervisorEmployee.id))
                            .leftJoin(supervisorUser, (0, drizzle_orm_1.eq)(supervisorEmployee.userId, supervisorUser.id))
                            .where((0, drizzle_orm_1.eq)(index_1.employees.id, id))];
                    case 1:
                        rows = _b.sent();
                        emp = rows[0];
                        if (!emp) {
                            throw new errors_1.NotFoundError('Employee not found');
                        }
                        return [4 /*yield*/, Promise.all([
                                client_1.db
                                    .select({ count: (0, drizzle_orm_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["count(*)"], ["count(*)"]))) })
                                    .from(index_1.conversations)
                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_1.conversations.assignedEmployeeId, emp.id), (0, drizzle_orm_1.eq)(index_1.conversations.status, 'open')))
                                    .then(function (r) { var _a; return Number(((_a = r[0]) === null || _a === void 0 ? void 0 : _a.count) || 0); }),
                                client_1.db
                                    .select({ count: (0, drizzle_orm_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject(["count(*)"], ["count(*)"]))) })
                                    .from(index_1.leads)
                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_1.leads.assignedEmployeeId, emp.id), (0, drizzle_orm_1.eq)(index_1.leads.stage, 'new')))
                                    .then(function (r) { var _a; return Number(((_a = r[0]) === null || _a === void 0 ? void 0 : _a.count) || 0); }),
                                client_1.db
                                    .select({ count: (0, drizzle_orm_1.sql)(templateObject_6 || (templateObject_6 = __makeTemplateObject(["count(*)"], ["count(*)"]))) })
                                    .from(index_1.reminders)
                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_1.reminders.assignedUserId, emp.userId), (0, drizzle_orm_1.eq)(index_1.reminders.status, 'pending')))
                                    .then(function (r) { var _a; return Number(((_a = r[0]) === null || _a === void 0 ? void 0 : _a.count) || 0); }),
                            ])];
                    case 2:
                        _a = _b.sent(), openChats = _a[0], pendingLeads = _a[1], pendingReminders = _a[2];
                        return [2 /*return*/, __assign(__assign({}, emp), { workload: {
                                    openConversations: openChats,
                                    newLeads: pendingLeads,
                                    pendingReminders: pendingReminders,
                                } })];
                }
            });
        });
    };
    EmployeesService.create = function (input, actorId) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, companyId, passwordHash, roleId, defaultRole, _a, newUser, newEmployee;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, client_1.db.query.users.findFirst({
                            where: (0, drizzle_orm_1.eq)(index_1.users.email, input.email.toLowerCase()),
                        })];
                    case 1:
                        existing = _b.sent();
                        if (existing) {
                            throw new errors_1.ConflictError('A user with this email already exists');
                        }
                        return [4 /*yield*/, this.getCompanyId()];
                    case 2:
                        companyId = _b.sent();
                        return [4 /*yield*/, password_service_1.PasswordService.hash(input.password || 'Password123!')];
                    case 3:
                        passwordHash = _b.sent();
                        roleId = input.roleId;
                        if (!!roleId) return [3 /*break*/, 7];
                        return [4 /*yield*/, client_1.db.query.roles.findFirst({
                                where: (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(index_1.roles.name, 'employee'), (0, drizzle_orm_1.eq)(index_1.roles.name, 'staff')),
                            })];
                    case 4:
                        _a = (_b.sent());
                        if (_a) return [3 /*break*/, 6];
                        return [4 /*yield*/, client_1.db.query.roles.findFirst()];
                    case 5:
                        _a = (_b.sent());
                        _b.label = 6;
                    case 6:
                        defaultRole = _a;
                        if (!defaultRole) {
                            throw new Error('No roles configured in system');
                        }
                        roleId = defaultRole.id;
                        _b.label = 7;
                    case 7: return [4 /*yield*/, client_1.db
                            .insert(index_1.users)
                            .values({
                            name: input.name,
                            email: input.email.toLowerCase(),
                            passwordHash: passwordHash,
                            roleId: roleId,
                            emailVerified: true,
                            status: 'active',
                        })
                            .returning()];
                    case 8:
                        newUser = (_b.sent())[0];
                        return [4 /*yield*/, client_1.db
                                .insert(index_1.employees)
                                .values({
                                userId: newUser.id,
                                companyId: companyId,
                                departmentId: input.departmentId || null,
                                stationId: input.stationId || null,
                                supervisorId: input.supervisorId || null,
                                whatsappNumber: input.whatsappNumber || null,
                                status: input.status,
                            })
                                .returning()];
                    case 9:
                        newEmployee = (_b.sent())[0];
                        return [4 /*yield*/, audit_service_1.AuditService.log({
                                actorId: actorId,
                                action: 'employee.create',
                                entityType: 'employee',
                                entityId: newEmployee.id,
                                newValues: {
                                    id: newEmployee.id,
                                    name: newUser.name,
                                    email: newUser.email,
                                    departmentId: input.departmentId,
                                    stationId: input.stationId,
                                    supervisorId: input.supervisorId,
                                },
                            })];
                    case 10:
                        _b.sent();
                        return [2 /*return*/, this.getById(newEmployee.id)];
                }
            });
        });
    };
    EmployeesService.update = function (id, input, actorId) {
        return __awaiter(this, void 0, void 0, function () {
            var current, userUpdates, empUpdates, updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getById(id)];
                    case 1:
                        current = _a.sent();
                        if (!(input.name || input.email || input.roleId)) return [3 /*break*/, 3];
                        userUpdates = { updatedAt: new Date() };
                        if (input.name)
                            userUpdates.name = input.name;
                        if (input.email)
                            userUpdates.email = input.email.toLowerCase();
                        if (input.roleId)
                            userUpdates.roleId = input.roleId;
                        return [4 /*yield*/, client_1.db.update(index_1.users).set(userUpdates).where((0, drizzle_orm_1.eq)(index_1.users.id, current.userId))];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        empUpdates = { updatedAt: new Date() };
                        if (input.departmentId !== undefined)
                            empUpdates.departmentId = input.departmentId;
                        if (input.stationId !== undefined)
                            empUpdates.stationId = input.stationId;
                        if (input.supervisorId !== undefined)
                            empUpdates.supervisorId = input.supervisorId;
                        if (input.whatsappNumber !== undefined)
                            empUpdates.whatsappNumber = input.whatsappNumber;
                        if (input.status !== undefined)
                            empUpdates.status = input.status;
                        return [4 /*yield*/, client_1.db.update(index_1.employees).set(empUpdates).where((0, drizzle_orm_1.eq)(index_1.employees.id, id))];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, this.getById(id)];
                    case 5:
                        updated = _a.sent();
                        return [4 /*yield*/, audit_service_1.AuditService.log({
                                actorId: actorId,
                                action: 'employee.update',
                                entityType: 'employee',
                                entityId: id,
                                oldValues: current,
                                newValues: updated,
                            })];
                    case 6:
                        _a.sent();
                        return [2 /*return*/, updated];
                }
            });
        });
    };
    EmployeesService.updateStatus = function (id, status) {
        return __awaiter(this, void 0, void 0, function () {
            var emp;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, client_1.db
                            .update(index_1.employees)
                            .set({
                            status: status,
                            lastSeenAt: new Date(),
                            updatedAt: new Date(),
                        })
                            .where((0, drizzle_orm_1.eq)(index_1.employees.id, id))
                            .returning()];
                    case 1:
                        emp = (_a.sent())[0];
                        if (!emp) {
                            throw new errors_1.NotFoundError('Employee not found');
                        }
                        return [2 /*return*/, emp];
                }
            });
        });
    };
    EmployeesService.getSupervisors = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, client_1.db
                        .select({
                        id: index_1.employees.id,
                        name: index_1.users.name,
                        email: index_1.users.email,
                        roleName: index_1.roles.name,
                    })
                        .from(index_1.employees)
                        .innerJoin(index_1.users, (0, drizzle_orm_1.eq)(index_1.employees.userId, index_1.users.id))
                        .innerJoin(index_1.roles, (0, drizzle_orm_1.eq)(index_1.users.roleId, index_1.roles.id))
                        .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(index_1.roles.name, 'adminstrator'), (0, drizzle_orm_1.eq)(index_1.roles.name, 'supervisor'), (0, drizzle_orm_1.eq)(index_1.roles.name, 'admin'), (0, drizzle_orm_1.eq)(index_1.roles.name, 'super_admin')))];
            });
        });
    };
    EmployeesService.delete = function (id, actorId) {
        return __awaiter(this, void 0, void 0, function () {
            var current;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getById(id)];
                    case 1:
                        current = _a.sent();
                        // Unassign relations safely
                        return [4 /*yield*/, client_1.db.update(index_1.conversations).set({ assignedEmployeeId: null }).where((0, drizzle_orm_1.eq)(index_1.conversations.assignedEmployeeId, id))];
                    case 2:
                        // Unassign relations safely
                        _a.sent();
                        return [4 /*yield*/, client_1.db.update(index_1.leads).set({ assignedEmployeeId: null }).where((0, drizzle_orm_1.eq)(index_1.leads.assignedEmployeeId, id))];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, client_1.db.update(index_1.employees).set({ supervisorId: null }).where((0, drizzle_orm_1.eq)(index_1.employees.supervisorId, id))];
                    case 4:
                        _a.sent();
                        // Delete employee record
                        return [4 /*yield*/, client_1.db.delete(index_1.employees).where((0, drizzle_orm_1.eq)(index_1.employees.id, id))];
                    case 5:
                        // Delete employee record
                        _a.sent();
                        if (!current.userId) return [3 /*break*/, 7];
                        return [4 /*yield*/, client_1.db.delete(index_1.users).where((0, drizzle_orm_1.eq)(index_1.users.id, current.userId))];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7: return [4 /*yield*/, audit_service_1.AuditService.log({
                            actorId: actorId,
                            action: 'employee.delete',
                            entityType: 'employee',
                            entityId: id,
                            oldValues: current,
                        })];
                    case 8:
                        _a.sent();
                        return [2 /*return*/, { success: true, message: 'Employee deleted successfully' }];
                }
            });
        });
    };
    return EmployeesService;
}());
exports.EmployeesService = EmployeesService;
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6;
