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
exports.RolesService = void 0;
var client_1 = require("../../database/client");
var index_1 = require("../../database/schema/index");
var drizzle_orm_1 = require("drizzle-orm");
var errors_1 = require("../../utils/errors");
var audit_service_1 = require("../audit/audit.service");
var RolesService = /** @class */ (function () {
    function RolesService() {
    }
    RolesService.listRoles = function () {
        return __awaiter(this, void 0, void 0, function () {
            var allRoles, results;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, client_1.db.select().from(index_1.roles)];
                    case 1:
                        allRoles = _a.sent();
                        return [4 /*yield*/, Promise.all(allRoles.map(function (role) { return __awaiter(_this, void 0, void 0, function () {
                                var assigned;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, client_1.db
                                                .select({
                                                id: index_1.permissions.id,
                                                name: index_1.permissions.name,
                                                displayName: index_1.permissions.displayName,
                                                groupName: index_1.permissions.groupName,
                                            })
                                                .from(index_1.rolePermissions)
                                                .innerJoin(index_1.permissions, (0, drizzle_orm_1.eq)(index_1.rolePermissions.permissionId, index_1.permissions.id))
                                                .where((0, drizzle_orm_1.eq)(index_1.rolePermissions.roleId, role.id))];
                                        case 1:
                                            assigned = _a.sent();
                                            return [2 /*return*/, __assign(__assign({}, role), { permissions: assigned })];
                                    }
                                });
                            }); }))];
                    case 2:
                        results = _a.sent();
                        return [2 /*return*/, results];
                }
            });
        });
    };
    RolesService.listPermissions = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, client_1.db.select().from(index_1.permissions)];
            });
        });
    };
    RolesService.getRole = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var role, assigned;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, client_1.db.query.roles.findFirst({
                            where: (0, drizzle_orm_1.eq)(index_1.roles.id, id),
                        })];
                    case 1:
                        role = _a.sent();
                        if (!role) {
                            throw new errors_1.NotFoundError('Role not found');
                        }
                        return [4 /*yield*/, client_1.db
                                .select({
                                id: index_1.permissions.id,
                                name: index_1.permissions.name,
                                displayName: index_1.permissions.displayName,
                                groupName: index_1.permissions.groupName,
                            })
                                .from(index_1.rolePermissions)
                                .innerJoin(index_1.permissions, (0, drizzle_orm_1.eq)(index_1.rolePermissions.permissionId, index_1.permissions.id))
                                .where((0, drizzle_orm_1.eq)(index_1.rolePermissions.roleId, role.id))];
                    case 2:
                        assigned = _a.sent();
                        return [2 /*return*/, __assign(__assign({}, role), { permissions: assigned })];
                }
            });
        });
    };
    RolesService.createRole = function (input, actorId) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, newRole, validPerms;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, client_1.db.query.roles.findFirst({
                            where: (0, drizzle_orm_1.eq)(index_1.roles.name, input.name),
                        })];
                    case 1:
                        existing = _a.sent();
                        if (existing) {
                            throw new errors_1.ConflictError('A role with this name already exists');
                        }
                        return [4 /*yield*/, client_1.db
                                .insert(index_1.roles)
                                .values({
                                name: input.name,
                                displayName: input.displayName,
                                description: input.description,
                                isSystem: false,
                            })
                                .returning()];
                    case 2:
                        newRole = (_a.sent())[0];
                        return [4 /*yield*/, client_1.db
                                .select()
                                .from(index_1.permissions)
                                .where((0, drizzle_orm_1.inArray)(index_1.permissions.name, input.permissions))];
                    case 3:
                        validPerms = _a.sent();
                        if (!(validPerms.length > 0)) return [3 /*break*/, 5];
                        return [4 /*yield*/, client_1.db.insert(index_1.rolePermissions).values(validPerms.map(function (p) { return ({
                                roleId: newRole.id,
                                permissionId: p.id,
                            }); }))];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [4 /*yield*/, audit_service_1.AuditService.log({
                            actorId: actorId,
                            action: 'role.create',
                            entityType: 'role',
                            entityId: newRole.id,
                            newValues: { name: newRole.name, permissions: input.permissions },
                        })];
                    case 6:
                        _a.sent();
                        return [2 /*return*/, this.getRole(newRole.id)];
                }
            });
        });
    };
    RolesService.updateRole = function (id, input, actorId) {
        return __awaiter(this, void 0, void 0, function () {
            var role, oldRole, validPerms, updatedRole;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, client_1.db.query.roles.findFirst({
                            where: (0, drizzle_orm_1.eq)(index_1.roles.id, id),
                        })];
                    case 1:
                        role = _c.sent();
                        if (!role) {
                            throw new errors_1.NotFoundError('Role not found');
                        }
                        if (role.isSystem && input.displayName && role.name === 'super_admin') {
                            throw new errors_1.ValidationError('System super_admin role cannot be modified');
                        }
                        return [4 /*yield*/, this.getRole(id)];
                    case 2:
                        oldRole = _c.sent();
                        return [4 /*yield*/, client_1.db
                                .update(index_1.roles)
                                .set({
                                displayName: (_a = input.displayName) !== null && _a !== void 0 ? _a : role.displayName,
                                description: (_b = input.description) !== null && _b !== void 0 ? _b : role.description,
                            })
                                .where((0, drizzle_orm_1.eq)(index_1.roles.id, id))];
                    case 3:
                        _c.sent();
                        if (!input.permissions) return [3 /*break*/, 7];
                        // Remove existing permissions
                        return [4 /*yield*/, client_1.db.delete(index_1.rolePermissions).where((0, drizzle_orm_1.eq)(index_1.rolePermissions.roleId, id))];
                    case 4:
                        // Remove existing permissions
                        _c.sent();
                        return [4 /*yield*/, client_1.db
                                .select()
                                .from(index_1.permissions)
                                .where((0, drizzle_orm_1.inArray)(index_1.permissions.name, input.permissions))];
                    case 5:
                        validPerms = _c.sent();
                        if (!(validPerms.length > 0)) return [3 /*break*/, 7];
                        return [4 /*yield*/, client_1.db.insert(index_1.rolePermissions).values(validPerms.map(function (p) { return ({
                                roleId: id,
                                permissionId: p.id,
                            }); }))];
                    case 6:
                        _c.sent();
                        _c.label = 7;
                    case 7: return [4 /*yield*/, this.getRole(id)];
                    case 8:
                        updatedRole = _c.sent();
                        return [4 /*yield*/, audit_service_1.AuditService.log({
                                actorId: actorId,
                                action: 'role.update',
                                entityType: 'role',
                                entityId: id,
                                oldValues: oldRole,
                                newValues: updatedRole,
                            })];
                    case 9:
                        _c.sent();
                        return [2 /*return*/, updatedRole];
                }
            });
        });
    };
    return RolesService;
}());
exports.RolesService = RolesService;
