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
exports.AuthService = void 0;
var jsonwebtoken_1 = require("jsonwebtoken");
var client_1 = require("../../database/client");
var index_1 = require("../../database/schema/index");
var password_service_1 = require("../../services/password.service");
var index_2 = require("../../config/index");
var errors_1 = require("../../utils/errors");
var audit_service_1 = require("../audit/audit.service");
var crypto_1 = require("../../utils/crypto");
var drizzle_orm_1 = require("drizzle-orm");
var logger_1 = require("../../utils/logger");
var AuthService = /** @class */ (function () {
    function AuthService() {
    }
    /**
     * Generate access and refresh tokens
     */
    AuthService.generateTokens = function (user) {
        var payload = {
            userId: user.id,
            email: user.email,
            roleId: user.roleId,
        };
        var accessToken = jsonwebtoken_1.default.sign(payload, index_2.config.JWT_ACCESS_SECRET, {
            expiresIn: index_2.config.JWT_ACCESS_EXPIRES_IN,
        });
        var refreshToken = jsonwebtoken_1.default.sign(payload, index_2.config.JWT_REFRESH_SECRET, {
            expiresIn: index_2.config.JWT_REFRESH_EXPIRES_IN,
        });
        return { accessToken: accessToken, refreshToken: refreshToken };
    };
    /**
     * User login with email & password
     */
    AuthService.login = function (input, context) {
        return __awaiter(this, void 0, void 0, function () {
            var user, isValid, remainingTrialDays, now, diffMs, userRole, assignedPerms, tokens;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, client_1.db.query.users.findFirst({
                            where: (0, drizzle_orm_1.eq)(index_1.users.email, input.email.toLowerCase()),
                        })];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            throw new errors_1.UnauthorizedError('Invalid email or password');
                        }
                        if (user.status !== 'active') {
                            throw new errors_1.UnauthorizedError('Account is inactive or suspended');
                        }
                        return [4 /*yield*/, password_service_1.PasswordService.compare(input.password, user.passwordHash)];
                    case 2:
                        isValid = _a.sent();
                        if (!isValid) {
                            throw new errors_1.UnauthorizedError('Invalid email or password');
                        }
                        remainingTrialDays = null;
                        if (user.trialEndsAt) {
                            now = new Date();
                            if (now > user.trialEndsAt) {
                                throw new errors_1.UnauthorizedError('تم حذفك من النظام لانتهاء الفترة التجريبية');
                            }
                            diffMs = user.trialEndsAt.getTime() - now.getTime();
                            remainingTrialDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                        }
                        // Update lastLoginAt
                        return [4 /*yield*/, client_1.db
                                .update(index_1.users)
                                .set({ lastLoginAt: new Date() })
                                .where((0, drizzle_orm_1.eq)(index_1.users.id, user.id))];
                    case 3:
                        // Update lastLoginAt
                        _a.sent();
                        return [4 /*yield*/, client_1.db.query.roles.findFirst({
                                where: (0, drizzle_orm_1.eq)(index_1.roles.id, user.roleId),
                            })];
                    case 4:
                        userRole = _a.sent();
                        return [4 /*yield*/, client_1.db
                                .select({ name: index_1.permissions.name })
                                .from(index_1.rolePermissions)
                                .innerJoin(index_1.permissions, (0, drizzle_orm_1.eq)(index_1.rolePermissions.permissionId, index_1.permissions.id))
                                .where((0, drizzle_orm_1.eq)(index_1.rolePermissions.roleId, user.roleId))];
                    case 5:
                        assignedPerms = _a.sent();
                        tokens = this.generateTokens(user);
                        // Audit log
                        return [4 /*yield*/, audit_service_1.AuditService.log({
                                actorId: user.id,
                                action: 'auth.login',
                                entityType: 'user',
                                entityId: user.id,
                                ipAddress: context === null || context === void 0 ? void 0 : context.ip,
                                userAgent: context === null || context === void 0 ? void 0 : context.userAgent,
                                metadata: { email: user.email },
                            })];
                    case 6:
                        // Audit log
                        _a.sent();
                        return [2 /*return*/, {
                                user: {
                                    id: user.id,
                                    name: user.name,
                                    email: user.email,
                                    avatar: user.avatar,
                                    role: (userRole === null || userRole === void 0 ? void 0 : userRole.name) || 'unknown',
                                    roleDisplayName: (userRole === null || userRole === void 0 ? void 0 : userRole.displayName) || 'Unknown',
                                    permissions: assignedPerms.map(function (p) { return p.name; }),
                                    remainingTrialDays: remainingTrialDays,
                                },
                                tokens: tokens,
                            }];
                }
            });
        });
    };
    /**
     * User registration (by default assigns 'employee' role if not specified)
     */
    AuthService.register = function (input, context) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, roleId, defaultRole, passwordHash, emailToken, newUser, userRole, assignedPerms, tokens;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, client_1.db.query.users.findFirst({
                            where: (0, drizzle_orm_1.eq)(index_1.users.email, input.email.toLowerCase()),
                        })];
                    case 1:
                        existing = _a.sent();
                        if (existing) {
                            throw new errors_1.ConflictError('A user with this email already exists');
                        }
                        roleId = input.roleId;
                        if (!!roleId) return [3 /*break*/, 3];
                        return [4 /*yield*/, client_1.db.query.roles.findFirst({
                                where: (0, drizzle_orm_1.eq)(index_1.roles.name, 'employee'),
                            })];
                    case 2:
                        defaultRole = _a.sent();
                        if (!defaultRole) {
                            throw new Error('Default role not found in system');
                        }
                        roleId = defaultRole.id;
                        _a.label = 3;
                    case 3: return [4 /*yield*/, password_service_1.PasswordService.hash(input.password)];
                    case 4:
                        passwordHash = _a.sent();
                        emailToken = (0, crypto_1.generateRandomToken)(16);
                        return [4 /*yield*/, client_1.db
                                .insert(index_1.users)
                                .values({
                                name: input.name,
                                email: input.email.toLowerCase(),
                                passwordHash: passwordHash,
                                roleId: roleId,
                                emailToken: emailToken,
                                emailVerified: false,
                                status: 'active',
                            })
                                .returning()];
                    case 5:
                        newUser = (_a.sent())[0];
                        return [4 /*yield*/, client_1.db.query.roles.findFirst({
                                where: (0, drizzle_orm_1.eq)(index_1.roles.id, newUser.roleId),
                            })];
                    case 6:
                        userRole = _a.sent();
                        return [4 /*yield*/, client_1.db
                                .select({ name: index_1.permissions.name })
                                .from(index_1.rolePermissions)
                                .innerJoin(index_1.permissions, (0, drizzle_orm_1.eq)(index_1.rolePermissions.permissionId, index_1.permissions.id))
                                .where((0, drizzle_orm_1.eq)(index_1.rolePermissions.roleId, newUser.roleId))];
                    case 7:
                        assignedPerms = _a.sent();
                        tokens = this.generateTokens(newUser);
                        // Audit log
                        return [4 /*yield*/, audit_service_1.AuditService.log({
                                actorId: newUser.id,
                                action: 'auth.register',
                                entityType: 'user',
                                entityId: newUser.id,
                                ipAddress: context === null || context === void 0 ? void 0 : context.ip,
                                userAgent: context === null || context === void 0 ? void 0 : context.userAgent,
                                metadata: { email: newUser.email },
                            })];
                    case 8:
                        // Audit log
                        _a.sent();
                        return [2 /*return*/, {
                                user: {
                                    id: newUser.id,
                                    name: newUser.name,
                                    email: newUser.email,
                                    role: (userRole === null || userRole === void 0 ? void 0 : userRole.name) || 'employee',
                                    roleDisplayName: (userRole === null || userRole === void 0 ? void 0 : userRole.displayName) || 'Employee',
                                    permissions: assignedPerms.map(function (p) { return p.name; }),
                                },
                                tokens: tokens,
                            }];
                }
            });
        });
    };
    /**
     * Refresh access token using refresh token
     */
    AuthService.refresh = function (refreshToken) {
        return __awaiter(this, void 0, void 0, function () {
            var decoded, user, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        decoded = jsonwebtoken_1.default.verify(refreshToken, index_2.config.JWT_REFRESH_SECRET);
                        return [4 /*yield*/, client_1.db.query.users.findFirst({
                                where: (0, drizzle_orm_1.eq)(index_1.users.id, decoded.userId),
                            })];
                    case 1:
                        user = _a.sent();
                        if (!user || user.status !== 'active') {
                            throw new errors_1.UnauthorizedError('User is no longer active');
                        }
                        return [2 /*return*/, this.generateTokens(user)];
                    case 2:
                        err_1 = _a.sent();
                        throw new errors_1.UnauthorizedError('Invalid or expired refresh token');
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Initiate forgot password flow
     */
    AuthService.forgotPassword = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var user, resetToken, resetExpires;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, client_1.db.query.users.findFirst({
                            where: (0, drizzle_orm_1.eq)(index_1.users.email, input.email.toLowerCase()),
                        })];
                    case 1:
                        user = _a.sent();
                        // Always respond with success to prevent email enumeration
                        if (!user) {
                            return [2 /*return*/, { message: 'If the email exists, a password reset link has been sent.' }];
                        }
                        resetToken = (0, crypto_1.generateRandomToken)(32);
                        resetExpires = new Date(Date.now() + 1000 * 60 * 60);
                        return [4 /*yield*/, client_1.db
                                .update(index_1.users)
                                .set({ resetToken: resetToken, resetExpires: resetExpires })
                                .where((0, drizzle_orm_1.eq)(index_1.users.id, user.id))];
                    case 2:
                        _a.sent();
                        // In dev / initial phase, log the reset token to console/logger
                        logger_1.logger.info({ email: user.email, resetToken: resetToken, resetUrl: "".concat(index_2.config.APP_URL, "/reset-password?token=").concat(resetToken) }, 'Password reset requested');
                        return [2 /*return*/, { message: 'If the email exists, a password reset link has been sent.' }];
                }
            });
        });
    };
    /**
     * Reset password using reset token
     */
    AuthService.resetPassword = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var user, passwordHash;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, client_1.db.query.users.findFirst({
                            where: (0, drizzle_orm_1.eq)(index_1.users.resetToken, input.token),
                        })];
                    case 1:
                        user = _a.sent();
                        if (!user || !user.resetExpires || user.resetExpires < new Date()) {
                            throw new errors_1.ValidationError('Invalid or expired reset token');
                        }
                        return [4 /*yield*/, password_service_1.PasswordService.hash(input.password)];
                    case 2:
                        passwordHash = _a.sent();
                        return [4 /*yield*/, client_1.db
                                .update(index_1.users)
                                .set({
                                passwordHash: passwordHash,
                                resetToken: null,
                                resetExpires: null,
                            })
                                .where((0, drizzle_orm_1.eq)(index_1.users.id, user.id))];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, audit_service_1.AuditService.log({
                                actorId: user.id,
                                action: 'auth.reset_password',
                                entityType: 'user',
                                entityId: user.id,
                            })];
                    case 4:
                        _a.sent();
                        return [2 /*return*/, { message: 'Password has been reset successfully. You may now log in.' }];
                }
            });
        });
    };
    /**
     * Change password for logged-in user
     */
    AuthService.changePassword = function (userId, input) {
        return __awaiter(this, void 0, void 0, function () {
            var user, matches, passwordHash;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, client_1.db.query.users.findFirst({
                            where: (0, drizzle_orm_1.eq)(index_1.users.id, userId),
                        })];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            throw new errors_1.NotFoundError('User not found');
                        }
                        return [4 /*yield*/, password_service_1.PasswordService.compare(input.currentPassword, user.passwordHash)];
                    case 2:
                        matches = _a.sent();
                        if (!matches) {
                            throw new errors_1.ValidationError('Incorrect current password');
                        }
                        return [4 /*yield*/, password_service_1.PasswordService.hash(input.newPassword)];
                    case 3:
                        passwordHash = _a.sent();
                        return [4 /*yield*/, client_1.db.update(index_1.users).set({ passwordHash: passwordHash }).where((0, drizzle_orm_1.eq)(index_1.users.id, user.id))];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, audit_service_1.AuditService.log({
                                actorId: user.id,
                                action: 'auth.change_password',
                                entityType: 'user',
                                entityId: user.id,
                            })];
                    case 5:
                        _a.sent();
                        return [2 /*return*/, { message: 'Password changed successfully' }];
                }
            });
        });
    };
    /**
     * Get current user profile with role and permissions
     */
    AuthService.getMe = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user, userRole, assignedPerms, employee;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, client_1.db.query.users.findFirst({
                            where: (0, drizzle_orm_1.eq)(index_1.users.id, userId),
                        })];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            throw new errors_1.NotFoundError('User not found');
                        }
                        return [4 /*yield*/, client_1.db.query.roles.findFirst({
                                where: (0, drizzle_orm_1.eq)(index_1.roles.id, user.roleId),
                            })];
                    case 2:
                        userRole = _a.sent();
                        return [4 /*yield*/, client_1.db
                                .select({ name: index_1.permissions.name })
                                .from(index_1.rolePermissions)
                                .innerJoin(index_1.permissions, (0, drizzle_orm_1.eq)(index_1.rolePermissions.permissionId, index_1.permissions.id))
                                .where((0, drizzle_orm_1.eq)(index_1.rolePermissions.roleId, user.roleId))];
                    case 3:
                        assignedPerms = _a.sent();
                        return [4 /*yield*/, client_1.db
                                .select({ id: index_1.employees.id, stationId: index_1.employees.stationId })
                                .from(index_1.employees)
                                .where((0, drizzle_orm_1.eq)(index_1.employees.userId, user.id))
                                .limit(1)];
                    case 4:
                        employee = (_a.sent())[0];
                        return [2 /*return*/, {
                                id: user.id,
                                employeeId: (employee === null || employee === void 0 ? void 0 : employee.id) || null,
                                stationId: (employee === null || employee === void 0 ? void 0 : employee.stationId) || null,
                                name: user.name,
                                email: user.email,
                                avatar: user.avatar,
                                role: (userRole === null || userRole === void 0 ? void 0 : userRole.name) || 'unknown',
                                roleDisplayName: (userRole === null || userRole === void 0 ? void 0 : userRole.displayName) || 'Unknown',
                                permissions: assignedPerms.map(function (p) { return p.name; }),
                                createdAt: user.createdAt,
                            }];
                }
            });
        });
    };
    return AuthService;
}());
exports.AuthService = AuthService;
