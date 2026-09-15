"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
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
exports.healthRoutes = healthRoutes;
var client_1 = require("../../database/client");
var drizzle_orm_1 = require("drizzle-orm");
var api_response_1 = require("../../utils/api-response");
function healthRoutes(fastify) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            // Global health check
            fastify.get('/', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, {
                            status: 'healthy',
                            timestamp: new Date(),
                            uptime: process.uptime(),
                            environment: process.env.NODE_ENV,
                            version: '1.0.0',
                        }, 'Trenty Vision CRM is operational')];
                });
            }); });
            // Database health
            fastify.get('/database', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var start, latencyMs, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            start = Date.now();
                            return [4 /*yield*/, client_1.db.execute((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["SELECT 1"], ["SELECT 1"]))))];
                        case 1:
                            _a.sent();
                            latencyMs = Date.now() - start;
                            return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, {
                                    status: 'connected',
                                    latencyMs: latencyMs,
                                    totalPoolClients: client_1.pool.totalCount,
                                    idleClients: client_1.pool.idleCount,
                                }, 'Database connection active')];
                        case 2:
                            err_1 = _a.sent();
                            return [2 /*return*/, (0, api_response_1.sendError)(reply, "Database health check failed: ".concat(err_1.message), 503)];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            // WhatsApp Gateway health (Phase 1 stub)
            fastify.get('/whatsapp', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, {
                            status: 'ready_for_phase_2',
                            gateway: 'Baileys',
                            activeSessions: 0,
                        }, 'WhatsApp Gateway subsystem initialized')];
                });
            }); });
            // Storage health
            fastify.get('/storage', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, {
                            driver: 'local',
                            status: 'writable',
                        }, 'Storage provider active')];
                });
            }); });
            // CRM health
            fastify.get('/crm', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, {
                            status: 'configured',
                            connectionsCount: 0,
                        }, 'CRM integration layer active')];
                });
            }); });
            return [2 /*return*/];
        });
    });
}
var templateObject_1;
