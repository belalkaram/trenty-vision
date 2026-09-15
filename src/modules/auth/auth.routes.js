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
exports.authRoutes = authRoutes;
var auth_service_1 = require("./auth.service");
var auth_schema_1 = require("./auth.schema");
var auth_middleware_1 = require("../../middleware/auth.middleware");
var api_response_1 = require("../../utils/api-response");
var index_1 = require("../../config/index");
function setAuthCookies(reply, tokens) {
    var isProd = index_1.config.NODE_ENV === 'production' || !!process.env.VERCEL;
    // Access token cookie (15 mins)
    reply.setCookie('access_token', tokens.accessToken, {
        path: '/',
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 15 * 60, // 15 mins in seconds
    });
    // Refresh token cookie (7 days)
    reply.setCookie('refresh_token', tokens.refreshToken, {
        path: '/api/v1/auth/refresh',
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });
}
function clearAuthCookies(reply) {
    reply.clearCookie('access_token', { path: '/' });
    reply.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
}
function getClientIp(request) {
    var xff = request.headers['x-forwarded-for'];
    if (typeof xff === 'string')
        return xff.split(',')[0].trim();
    var xRealIp = request.headers['x-real-ip'];
    if (typeof xRealIp === 'string')
        return xRealIp;
    try {
        return request.ip || '127.0.0.1';
    }
    catch (_e) {
        return '127.0.0.1';
    }
}
function authRoutes(fastify) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            // POST /login
            fastify.post('/login', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var input, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            input = auth_schema_1.loginSchema.parse(request.body);
                            return [4 /*yield*/, auth_service_1.AuthService.login(input, {
                                    ip: getClientIp(request),
                                    userAgent: request.headers['user-agent'],
                                })];
                        case 1:
                            result = _a.sent();
                            setAuthCookies(reply, result.tokens);
                            return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, { user: result.user, tokens: result.tokens }, 'Login successful')];
                    }
                });
            }); });
            // POST /register
            fastify.post('/register', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var input, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            input = auth_schema_1.registerSchema.parse(request.body);
                            return [4 /*yield*/, auth_service_1.AuthService.register(input, {
                                    ip: getClientIp(request),
                                    userAgent: request.headers['user-agent'],
                                })];
                        case 1:
                            result = _a.sent();
                            setAuthCookies(reply, result.tokens);
                            return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, { user: result.user, tokens: result.tokens }, 'Registration successful', 201)];
                    }
                });
            }); });
            // POST /refresh
            fastify.post('/refresh', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var token, tokens;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            token = (_a = request.cookies) === null || _a === void 0 ? void 0 : _a.refresh_token;
                            if (!token && request.body && typeof request.body === 'object' && 'refreshToken' in request.body) {
                                token = request.body.refreshToken;
                            }
                            if (!token) {
                                return [2 /*return*/, reply.status(401).send({
                                        success: false,
                                        data: null,
                                        message: 'Refresh token missing',
                                        errors: null,
                                        meta: { requestId: request.id },
                                    })];
                            }
                            return [4 /*yield*/, auth_service_1.AuthService.refresh(token)];
                        case 1:
                            tokens = _b.sent();
                            setAuthCookies(reply, tokens);
                            return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, { tokens: tokens }, 'Token refreshed')];
                    }
                });
            }); });
            // POST /logout
            fastify.post('/logout', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    clearAuthCookies(reply);
                    return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, null, 'Logged out successfully')];
                });
            }); });
            // POST /forgot-password
            fastify.post('/forgot-password', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var input, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            input = auth_schema_1.forgotPasswordSchema.parse(request.body);
                            return [4 /*yield*/, auth_service_1.AuthService.forgotPassword(input)];
                        case 1:
                            result = _a.sent();
                            return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, result, result.message)];
                    }
                });
            }); });
            // POST /reset-password
            fastify.post('/reset-password', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var input, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            input = auth_schema_1.resetPasswordSchema.parse(request.body);
                            return [4 /*yield*/, auth_service_1.AuthService.resetPassword(input)];
                        case 1:
                            result = _a.sent();
                            return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, result, result.message)];
                    }
                });
            }); });
            // GET /me
            fastify.get('/me', { preHandler: [auth_middleware_1.authenticate] }, function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var me;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, auth_service_1.AuthService.getMe(request.user.id)];
                        case 1:
                            me = _a.sent();
                            return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, me, 'Current user profile')];
                    }
                });
            }); });
            // POST /change-password
            fastify.post('/change-password', { preHandler: [auth_middleware_1.authenticate] }, function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var role, input, result;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            role = (_a = request.user) === null || _a === void 0 ? void 0 : _a.roleName;
                            if (role !== 'adminstrator' && role !== 'super_admin' && role !== 'admin') {
                                return [2 /*return*/, reply.status(403).send({
                                        success: false,
                                        data: null,
                                        message: 'صلاحية تغيير كلمة المرور مقتصرة على المدير فقط',
                                        errors: null,
                                        meta: { requestId: request.id },
                                    })];
                            }
                            input = auth_schema_1.changePasswordSchema.parse(request.body);
                            return [4 /*yield*/, auth_service_1.AuthService.changePassword(request.user.id, input)];
                        case 1:
                            result = _b.sent();
                            return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, result, result.message)];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
