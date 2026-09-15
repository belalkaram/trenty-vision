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
exports.buildApp = buildApp;
var fastify_1 = require("fastify");
var cookie_1 = require("@fastify/cookie");
var cors_1 = require("@fastify/cors");
var formbody_1 = require("@fastify/formbody");
var rate_limit_1 = require("@fastify/rate-limit");
var static_1 = require("@fastify/static");
var websocket_1 = require("@fastify/websocket");
var path_1 = require("path");
var fs_1 = require("fs");
var index_1 = require("./config/index");
var request_id_middleware_1 = require("./middleware/request-id.middleware");
var error_handler_1 = require("./middleware/error-handler");
// Route modules
var auth_routes_1 = require("./modules/auth/auth.routes");
var roles_routes_1 = require("./modules/roles/roles.routes");
var departments_routes_1 = require("./modules/departments/departments.routes");
var stations_routes_1 = require("./modules/stations/stations.routes");
var employees_routes_1 = require("./modules/employees/employees.routes");
var audit_routes_1 = require("./modules/audit/audit.routes");
var settings_routes_1 = require("./modules/settings/settings.routes");
var health_routes_1 = require("./modules/health/health.routes");
var whatsapp_routes_1 = require("./modules/whatsapp/whatsapp.routes");
var conversations_routes_1 = require("./modules/conversations/conversations.routes");
var messages_routes_1 = require("./modules/messages/messages.routes");
var contacts_routes_1 = require("./modules/contacts/contacts.routes");
var leads_routes_1 = require("./modules/leads/leads.routes");
var quick_replies_routes_1 = require("./modules/quick-replies/quick-replies.routes");
var media_routes_1 = require("./modules/media/media.routes");
var automations_routes_1 = require("./modules/automations/automations.routes");
var reports_routes_1 = require("./modules/reports/reports.routes");
var superadmin_routes_1 = require("./modules/superadmin/superadmin.routes");
var bridge_routes_1 = require("./modules/bridge/bridge.routes");
var ws_hub_1 = require("./websocket/ws.hub");
function buildApp() {
    return __awaiter(this, void 0, void 0, function () {
        var app, clientDistDir, publicDir, _e_1, viewsDir, spaIndexHtml, serveSpaOrHtml;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    app = (0, fastify_1.default)({
                        logger: false, // Using our custom Pino logger
                        trustProxy: true,
                    });
                    // Request ID
                    app.addHook('onRequest', request_id_middleware_1.requestIdMiddleware);
                    // Plugins
                    return [4 /*yield*/, app.register(cookie_1.default, {
                            secret: index_1.config.COOKIE_SECRET,
                        })];
                case 1:
                    // Plugins
                    _a.sent();
                    return [4 /*yield*/, app.register(cors_1.default, {
                            origin: true,
                            credentials: true,
                        })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, app.register(formbody_1.default)];
                case 3:
                    _a.sent();
                    // Allow empty JSON bodies and handle serverless pre-parsed bodies
                    app.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body, done) {
                        var _a, _b;
                        if (!body || body.trim() === '') {
                            if (((_a = req.raw) === null || _a === void 0 ? void 0 : _a.body) && typeof req.raw.body === 'object') {
                                done(null, req.raw.body);
                                return;
                            }
                            done(null, {});
                            return;
                        }
                        try {
                            done(null, JSON.parse(body));
                        }
                        catch (err) {
                            if (((_b = req.raw) === null || _b === void 0 ? void 0 : _b.body) && typeof req.raw.body === 'object') {
                                done(null, req.raw.body);
                                return;
                            }
                            err.statusCode = 400;
                            done(err, undefined);
                        }
                    });
                    if (!!process.env.VERCEL) return [3 /*break*/, 5];
                    return [4 /*yield*/, app.register(rate_limit_1.default, {
                            max: 100,
                            timeWindow: '1 minute',
                            keyGenerator: function (req) {
                                var _a, _b;
                                var xff = req.headers['x-forwarded-for'];
                                if (typeof xff === 'string')
                                    return xff.split(',')[0].trim();
                                return ((_b = (_a = req.raw) === null || _a === void 0 ? void 0 : _a.socket) === null || _b === void 0 ? void 0 : _b.remoteAddress) || req.ip || '127.0.0.1';
                            },
                        })];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    if (!!process.env.VERCEL) return [3 /*break*/, 7];
                    return [4 /*yield*/, app.register(websocket_1.default)];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7:
                    clientDistDir = path_1.default.resolve(process.cwd(), 'dist/client');
                    if (!!process.env.VERCEL) return [3 /*break*/, 14];
                    publicDir = path_1.default.resolve(process.cwd(), 'public');
                    _a.label = 8;
                case 8:
                    _a.trys.push([8, 11, , 12]);
                    if (!fs_1.default.existsSync(publicDir)) return [3 /*break*/, 10];
                    return [4 /*yield*/, app.register(static_1.default, {
                            root: publicDir,
                            prefix: '/public/',
                            decorateReply: true,
                        })];
                case 9:
                    _a.sent();
                    _a.label = 10;
                case 10: return [3 /*break*/, 12];
                case 11:
                    _e_1 = _a.sent();
                    return [3 /*break*/, 12];
                case 12:
                    if (!fs_1.default.existsSync(clientDistDir)) return [3 /*break*/, 14];
                    return [4 /*yield*/, app.register(static_1.default, {
                            root: clientDistDir,
                            prefix: '/',
                            decorateReply: false,
                        })];
                case 13:
                    _a.sent();
                    _a.label = 14;
                case 14:
                    // Error Handler
                    app.setErrorHandler(error_handler_1.errorHandler);
                    // Register API v1 routes
                    return [4 /*yield*/, app.register(health_routes_1.healthRoutes, { prefix: '/health' })];
                case 15:
                    // Register API v1 routes
                    _a.sent();
                    return [4 /*yield*/, app.register(function (v1) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, v1.register(health_routes_1.healthRoutes, { prefix: '/health' })];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, v1.register(auth_routes_1.authRoutes, { prefix: '/auth' })];
                                    case 2:
                                        _a.sent();
                                        return [4 /*yield*/, v1.register(roles_routes_1.rolesRoutes, { prefix: '/roles' })];
                                    case 3:
                                        _a.sent();
                                        return [4 /*yield*/, v1.register(departments_routes_1.departmentsRoutes, { prefix: '/departments' })];
                                    case 4:
                                        _a.sent();
                                        return [4 /*yield*/, v1.register(stations_routes_1.stationsRoutes, { prefix: '/stations' })];
                                    case 5:
                                        _a.sent();
                                        return [4 /*yield*/, v1.register(employees_routes_1.employeesRoutes, { prefix: '/employees' })];
                                    case 6:
                                        _a.sent();
                                        return [4 /*yield*/, v1.register(audit_routes_1.auditRoutes, { prefix: '/audit' })];
                                    case 7:
                                        _a.sent();
                                        return [4 /*yield*/, v1.register(settings_routes_1.settingsRoutes, { prefix: '/settings' })];
                                    case 8:
                                        _a.sent();
                                        return [4 /*yield*/, v1.register(whatsapp_routes_1.whatsappRoutes, { prefix: '/whatsapp' })];
                                    case 9:
                                        _a.sent();
                                        return [4 /*yield*/, v1.register(conversations_routes_1.conversationsRoutes, { prefix: '/conversations' })];
                                    case 10:
                                        _a.sent();
                                        return [4 /*yield*/, v1.register(messages_routes_1.messagesRoutes, { prefix: '/conversations' })];
                                    case 11:
                                        _a.sent();
                                        return [4 /*yield*/, v1.register(contacts_routes_1.contactsRoutes, { prefix: '/contacts' })];
                                    case 12:
                                        _a.sent();
                                        return [4 /*yield*/, v1.register(leads_routes_1.leadsRoutes, { prefix: '/leads' })];
                                    case 13:
                                        _a.sent();
                                        return [4 /*yield*/, v1.register(quick_replies_routes_1.quickRepliesRoutes, { prefix: '/quick-replies' })];
                                    case 14:
                                        _a.sent();
                                        return [4 /*yield*/, v1.register(media_routes_1.mediaRoutes, { prefix: '/media' })];
                                    case 15:
                                        _a.sent();
                                        return [4 /*yield*/, v1.register(automations_routes_1.automationsRoutes, { prefix: '/automations' })];
                                    case 16:
                                        _a.sent();
                                        return [4 /*yield*/, v1.register(reports_routes_1.reportsRoutes, { prefix: '/reports' })];
                                    case 17:
                                        _a.sent();
                                        return [4 /*yield*/, v1.register(superadmin_routes_1.superAdminRoutes, { prefix: '/superadmin' })];
                                    case 18:
                                        _a.sent();
                                        return [4 /*yield*/, v1.register(bridge_routes_1.bridgeRoutes, { prefix: '/bridge' })];
                                    case 19:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }, { prefix: '/api/v1' })];
                case 16:
                    _a.sent();
                    // Register WebSocket Hub (only in persistent server mode)
                    if (!process.env.VERCEL) {
                        ws_hub_1.wsHub.registerRoutes(app);
                    }
                    viewsDir = path_1.default.resolve(process.cwd(), 'views');
                    spaIndexHtml = path_1.default.join(clientDistDir, 'index.html');
                    serveSpaOrHtml = function (fallbackRelativePath) {
                        return function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                            var legacyPath;
                            return __generator(this, function (_a) {
                                if (fs_1.default.existsSync(spaIndexHtml)) {
                                    reply.type('text/html');
                                    return [2 /*return*/, fs_1.default.createReadStream(spaIndexHtml)];
                                }
                                legacyPath = path_1.default.join(viewsDir, fallbackRelativePath);
                                if (fs_1.default.existsSync(legacyPath)) {
                                    reply.type('text/html');
                                    return [2 /*return*/, fs_1.default.createReadStream(legacyPath)];
                                }
                                return [2 /*return*/, reply.redirect('/login')];
                            });
                        }); };
                    };
                    app.get('/', serveSpaOrHtml('dashboard/index.html'));
                    app.get('/login', serveSpaOrHtml('auth/login.html'));
                    app.get('/employees', serveSpaOrHtml('employees/index.html'));
                    app.get('/stations', serveSpaOrHtml('stations/index.html'));
                    app.get('/departments', function (_req, reply) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, reply.redirect('/')];
                    }); }); });
                    app.get('/settings', serveSpaOrHtml('settings/index.html'));
                    app.get('/audit', serveSpaOrHtml('audit/index.html'));
                    app.get('/whatsapp', serveSpaOrHtml('whatsapp/index.html'));
                    app.get('/inbox', serveSpaOrHtml('inbox/index.html'));
                    app.get('/automations', serveSpaOrHtml('automations/index.html'));
                    app.get('/reports', serveSpaOrHtml('reports/index.html'));
                    app.get('/contacts', serveSpaOrHtml('contacts/index.html'));
                    // Fallback 404 for SPA client-side deep routing
                    app.setNotFoundHandler(function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            if (request.url.startsWith('/api/') || request.url.startsWith('/ws')) {
                                reply.code(404).send({ success: false, message: 'API Route Not Found' });
                                return [2 /*return*/];
                            }
                            if (fs_1.default.existsSync(spaIndexHtml)) {
                                reply.type('text/html');
                                return [2 /*return*/, fs_1.default.createReadStream(spaIndexHtml)];
                            }
                            reply.code(404).send('Page Not Found');
                            return [2 /*return*/];
                        });
                    }); });
                    return [2 /*return*/, app];
            }
        });
    });
}
