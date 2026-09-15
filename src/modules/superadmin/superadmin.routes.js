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
exports.superAdminRoutes = superAdminRoutes;
var client_1 = require("../../database/client");
var users_1 = require("../../database/schema/users");
var roles_1 = require("../../database/schema/roles");
var schema = require("../../database/schema");
var drizzle_orm_1 = require("drizzle-orm");
var zod_1 = require("zod");
var password_service_1 = require("../../services/password.service");
var fs_1 = require("fs");
var path_1 = require("path");
var SUPER_ADMIN_EMAIL = 'belalkaram50@gmail.com';
var SUPER_ADMIN_PASSWORD = '12345678@Kag';
var SUPER_ADMIN_TOKEN = 'super_secret_token_12345678_kag';
function superAdminRoutes(fastify) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            // Login
            fastify.post('/login', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var schema, parsed, inputEmail, inputPassword;
                return __generator(this, function (_a) {
                    schema = zod_1.z.object({ email: zod_1.z.string(), password: zod_1.z.string() });
                    parsed = schema.safeParse(request.body);
                    if (!parsed.success) {
                        return [2 /*return*/, reply.code(400).send({ success: false, error: 'Invalid input' })];
                    }
                    inputEmail = parsed.data.email.trim().toLowerCase();
                    inputPassword = parsed.data.password.trim();
                    if (inputEmail === SUPER_ADMIN_EMAIL.toLowerCase() && inputPassword === SUPER_ADMIN_PASSWORD) {
                        return [2 /*return*/, reply.send({ success: true, token: SUPER_ADMIN_TOKEN })];
                    }
                    return [2 /*return*/, reply.code(401).send({ success: false, error: 'Invalid credentials' })];
                });
            }); });
            // Protect all other routes
            fastify.addHook('preHandler', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var authHeader;
                return __generator(this, function (_a) {
                    if (request.url.includes('/login'))
                        return [2 /*return*/];
                    authHeader = request.headers.authorization;
                    if (!authHeader || authHeader !== "Bearer ".concat(SUPER_ADMIN_TOKEN)) {
                        return [2 /*return*/, reply.code(401).send({ success: false, error: 'Unauthorized Super Admin' })];
                    }
                    return [2 /*return*/];
                });
            }); });
            // Get all administrators
            fastify.get('/users', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var admins;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, client_1.db
                                .select({
                                id: users_1.users.id,
                                name: users_1.users.name,
                                email: users_1.users.email,
                                status: users_1.users.status,
                                lastLoginAt: users_1.users.lastLoginAt,
                                trialEndsAt: users_1.users.trialEndsAt,
                                createdAt: users_1.users.createdAt,
                            })
                                .from(users_1.users)
                                .innerJoin(roles_1.roles, (0, drizzle_orm_1.eq)(users_1.users.roleId, roles_1.roles.id))
                                .where((0, drizzle_orm_1.eq)(roles_1.roles.name, 'adminstrator'))
                                .orderBy((0, drizzle_orm_1.desc)(users_1.users.createdAt))];
                        case 1:
                            admins = _a.sent();
                            return [2 /*return*/, reply.send({ success: true, data: admins })];
                    }
                });
            }); });
            // Create new administrator
            fastify.post('/users', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var schema, parsed, existing, adminRole, passwordHash, trialEndsAt, d, newUser;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            schema = zod_1.z.object({
                                name: zod_1.z.string().min(2),
                                email: zod_1.z.string().email(),
                                password: zod_1.z.string().min(6),
                                trialDays: zod_1.z.number().nullable().optional(),
                            });
                            parsed = schema.safeParse(request.body);
                            if (!parsed.success) {
                                return [2 /*return*/, reply.code(400).send({ success: false, error: 'بيانات غير صالحة' })];
                            }
                            return [4 /*yield*/, client_1.db.select().from(users_1.users).where((0, drizzle_orm_1.eq)(users_1.users.email, parsed.data.email))];
                        case 1:
                            existing = (_a.sent())[0];
                            if (existing) {
                                return [2 /*return*/, reply.code(400).send({ success: false, error: 'البريد الإلكتروني مسجل مسبقاً' })];
                            }
                            return [4 /*yield*/, client_1.db.select().from(roles_1.roles).where((0, drizzle_orm_1.eq)(roles_1.roles.name, 'adminstrator'))];
                        case 2:
                            adminRole = (_a.sent())[0];
                            if (!adminRole) {
                                return [2 /*return*/, reply.code(500).send({ success: false, error: 'دور المشرف (adminstrator) غير موجود في النظام' })];
                            }
                            return [4 /*yield*/, password_service_1.PasswordService.hash(parsed.data.password)];
                        case 3:
                            passwordHash = _a.sent();
                            trialEndsAt = null;
                            if (parsed.data.trialDays !== undefined && parsed.data.trialDays !== null) {
                                d = new Date();
                                d.setDate(d.getDate() + parsed.data.trialDays);
                                trialEndsAt = d;
                            }
                            return [4 /*yield*/, client_1.db
                                    .insert(users_1.users)
                                    .values({
                                    email: parsed.data.email,
                                    name: parsed.data.name,
                                    passwordHash: passwordHash,
                                    roleId: adminRole.id,
                                    status: 'active',
                                    trialEndsAt: trialEndsAt,
                                })
                                    .returning()];
                        case 4:
                            newUser = (_a.sent())[0];
                            return [2 /*return*/, reply.send({ success: true, data: newUser })];
                    }
                });
            }); });
            // Update trial days or status
            fastify.patch('/users/:id', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var schema, parsed, updateData, d, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            schema = zod_1.z.object({
                                name: zod_1.z.string().optional(),
                                status: zod_1.z.enum(['active', 'inactive', 'suspended']).optional(),
                                trialDays: zod_1.z.number().nullable().optional(),
                            });
                            parsed = schema.safeParse(request.body);
                            if (!parsed.success) {
                                return [2 /*return*/, reply.code(400).send({ success: false, error: 'Invalid data' })];
                            }
                            updateData = {};
                            if (parsed.data.name)
                                updateData.name = parsed.data.name;
                            if (parsed.data.status)
                                updateData.status = parsed.data.status;
                            if (parsed.data.trialDays !== undefined) {
                                if (parsed.data.trialDays === null) {
                                    updateData.trialEndsAt = null;
                                }
                                else {
                                    d = new Date();
                                    d.setDate(d.getDate() + parsed.data.trialDays);
                                    updateData.trialEndsAt = d;
                                }
                            }
                            return [4 /*yield*/, client_1.db
                                    .update(users_1.users)
                                    .set(updateData)
                                    .where((0, drizzle_orm_1.eq)(users_1.users.id, request.params.id))
                                    .returning()];
                        case 1:
                            updated = (_a.sent())[0];
                            if (!updated) {
                                return [2 /*return*/, reply.code(404).send({ success: false, error: 'User not found' })];
                            }
                            return [2 /*return*/, reply.send({ success: true, data: updated })];
                    }
                });
            }); });
            // Delete user
            fastify.delete('/users/:id', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var deleted;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, client_1.db
                                .delete(users_1.users)
                                .where((0, drizzle_orm_1.eq)(users_1.users.id, request.params.id))
                                .returning()];
                        case 1:
                            deleted = (_a.sent())[0];
                            if (!deleted) {
                                return [2 /*return*/, reply.code(404).send({ success: false, error: 'User not found' })];
                            }
                            return [2 /*return*/, reply.send({ success: true, data: deleted })];
                    }
                });
            }); });
            // Clear CRM & Inbox (Partial Reset)
            fastify.post('/clear-inbox', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var schemaObj, parsed, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            schemaObj = zod_1.z.object({
                                confirmText: zod_1.z.string()
                            });
                            parsed = schemaObj.safeParse(request.body);
                            if (!parsed.success || parsed.data.confirmText !== 'CLEAR_INBOX') {
                                return [2 /*return*/, reply.code(400).send({ success: false, error: 'تأكيد العملية غير صحيح' })];
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 13, , 14]);
                            // 1. Clear Logs & Temporary Data
                            return [4 /*yield*/, client_1.db.delete(schema.auditLogs)];
                        case 2:
                            // 1. Clear Logs & Temporary Data
                            _a.sent();
                            return [4 /*yield*/, client_1.db.delete(schema.notifications)];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, client_1.db.delete(schema.reminders)];
                        case 4:
                            _a.sent();
                            // 2. Clear Messages & Chats
                            return [4 /*yield*/, client_1.db.delete(schema.messages)];
                        case 5:
                            // 2. Clear Messages & Chats
                            _a.sent();
                            return [4 /*yield*/, client_1.db.delete(schema.conversations)];
                        case 6:
                            _a.sent();
                            // 3. Clear CRM Data
                            return [4 /*yield*/, client_1.db.delete(schema.leads)];
                        case 7:
                            // 3. Clear CRM Data
                            _a.sent();
                            return [4 /*yield*/, client_1.db.delete(schema.crmConnections)];
                        case 8:
                            _a.sent();
                            return [4 /*yield*/, client_1.db.delete(schema.contacts)];
                        case 9:
                            _a.sent();
                            // 4. Clear Employees & Organization
                            return [4 /*yield*/, client_1.db.delete(schema.employees)];
                        case 10:
                            // 4. Clear Employees & Organization
                            _a.sent();
                            return [4 /*yield*/, client_1.db.delete(schema.stations)];
                        case 11:
                            _a.sent();
                            return [4 /*yield*/, client_1.db.delete(schema.departments)];
                        case 12:
                            _a.sent();
                            return [2 /*return*/, reply.send({ success: true, message: 'تم تفريغ صندوق المحادثات وبيانات الموظفين بنجاح' })];
                        case 13:
                            err_1 = _a.sent();
                            request.log.error({ err: err_1 }, 'Clear inbox failed');
                            return [2 /*return*/, reply.code(500).send({ success: false, error: 'حدث خطأ أثناء التفريغ. يرجى مراجعة سجلات الخادم.' })];
                        case 14: return [2 /*return*/];
                    }
                });
            }); });
            // Factory Reset
            fastify.post('/factory-reset', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var schemaObj, parsed, adminRole, uploadsPath, files, _i, files_1, file, err_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            schemaObj = zod_1.z.object({
                                confirmText: zod_1.z.string()
                            });
                            parsed = schemaObj.safeParse(request.body);
                            if (!parsed.success || parsed.data.confirmText !== 'RESET_ALL_DATA') {
                                return [2 /*return*/, reply.code(400).send({ success: false, error: 'تأكيد العملية غير صحيح' })];
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 22, , 23]);
                            // 1. Clear Logs & Temporary Data
                            return [4 /*yield*/, client_1.db.delete(schema.auditLogs)];
                        case 2:
                            // 1. Clear Logs & Temporary Data
                            _a.sent();
                            return [4 /*yield*/, client_1.db.delete(schema.notifications)];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, client_1.db.delete(schema.reminders)];
                        case 4:
                            _a.sent();
                            // 2. Clear Messages & Chats
                            return [4 /*yield*/, client_1.db.delete(schema.messages)];
                        case 5:
                            // 2. Clear Messages & Chats
                            _a.sent();
                            return [4 /*yield*/, client_1.db.delete(schema.conversations)];
                        case 6:
                            _a.sent();
                            // 3. Clear CRM Data
                            return [4 /*yield*/, client_1.db.delete(schema.leads)];
                        case 7:
                            // 3. Clear CRM Data
                            _a.sent();
                            return [4 /*yield*/, client_1.db.delete(schema.crmConnections)];
                        case 8:
                            _a.sent();
                            return [4 /*yield*/, client_1.db.delete(schema.contacts)];
                        case 9:
                            _a.sent();
                            // 4. Clear Meta Data
                            return [4 /*yield*/, client_1.db.delete(schema.tags)];
                        case 10:
                            // 4. Clear Meta Data
                            _a.sent();
                            return [4 /*yield*/, client_1.db.delete(schema.quickReplies)];
                        case 11:
                            _a.sent();
                            return [4 /*yield*/, client_1.db.delete(schema.automationRules)];
                        case 12:
                            _a.sent();
                            // 5. Clear WhatsApp Auth and Accounts
                            return [4 /*yield*/, client_1.db.delete(schema.whatsappSessions)];
                        case 13:
                            // 5. Clear WhatsApp Auth and Accounts
                            _a.sent();
                            return [4 /*yield*/, client_1.db.delete(schema.whatsappAuthKeys)];
                        case 14:
                            _a.sent();
                            return [4 /*yield*/, client_1.db.delete(schema.whatsappAccounts)];
                        case 15:
                            _a.sent();
                            // 6. Clear Employees & Organization
                            return [4 /*yield*/, client_1.db.delete(schema.employees)];
                        case 16:
                            // 6. Clear Employees & Organization
                            _a.sent();
                            return [4 /*yield*/, client_1.db.delete(schema.stations)];
                        case 17:
                            _a.sent();
                            return [4 /*yield*/, client_1.db.delete(schema.departments)];
                        case 18:
                            _a.sent();
                            return [4 /*yield*/, client_1.db.select().from(roles_1.roles).where((0, drizzle_orm_1.eq)(roles_1.roles.name, 'adminstrator'))];
                        case 19:
                            adminRole = (_a.sent())[0];
                            if (!adminRole) return [3 /*break*/, 21];
                            return [4 /*yield*/, client_1.db.delete(users_1.users).where((0, drizzle_orm_1.not)((0, drizzle_orm_1.eq)(users_1.users.roleId, adminRole.id)))];
                        case 20:
                            _a.sent();
                            _a.label = 21;
                        case 21:
                            uploadsPath = path_1.default.resolve(process.cwd(), 'storage', 'uploads');
                            if (fs_1.default.existsSync(uploadsPath)) {
                                files = fs_1.default.readdirSync(uploadsPath);
                                for (_i = 0, files_1 = files; _i < files_1.length; _i++) {
                                    file = files_1[_i];
                                    if (file !== '.gitkeep') {
                                        fs_1.default.unlinkSync(path_1.default.join(uploadsPath, file));
                                    }
                                }
                            }
                            return [2 /*return*/, reply.send({ success: true, message: 'تم إعادة ضبط المصنع بنجاح' })];
                        case 22:
                            err_2 = _a.sent();
                            request.log.error({ err: err_2 }, 'Factory reset failed');
                            return [2 /*return*/, reply.code(500).send({ success: false, error: 'حدث خطأ أثناء ضبط المصنع. يرجى مراجعة سجلات الخادم.' })];
                        case 23: return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
