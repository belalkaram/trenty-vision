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
exports.settingsRoutes = settingsRoutes;
var settings_service_1 = require("./settings.service");
var settings_schema_1 = require("./settings.schema");
var auth_middleware_1 = require("../../middleware/auth.middleware");
var rbac_middleware_1 = require("../../middleware/rbac.middleware");
var api_response_1 = require("../../utils/api-response");
function settingsRoutes(fastify) {
    return __awaiter(this, void 0, void 0, function () {
        var handleBatchUpdate;
        var _this = this;
        return __generator(this, function (_a) {
            fastify.addHook('preHandler', auth_middleware_1.authenticate);
            // Get all settings
            fastify.get('/', { preHandler: [(0, rbac_middleware_1.requirePermission)('manage_settings')] }, function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var all;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, settings_service_1.SettingsService.getAll()];
                        case 1:
                            all = _a.sent();
                            return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, __assign(__assign({}, all.map), { list: all.list, map: all.map }), 'Settings retrieved')];
                    }
                });
            }); });
            // Get single setting by key
            fastify.get('/:key', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var key, val;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            key = request.params.key;
                            return [4 /*yield*/, settings_service_1.SettingsService.get(key)];
                        case 1:
                            val = _a.sent();
                            return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, { key: key, value: val }, 'Setting value')];
                    }
                });
            }); });
            handleBatchUpdate = function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var settingsToUpdate, results, all;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            settingsToUpdate = {};
                            if (request.body && typeof request.body === 'object') {
                                if ('settings' in request.body && typeof request.body.settings === 'object') {
                                    settingsToUpdate = request.body.settings;
                                }
                                else {
                                    settingsToUpdate = request.body;
                                }
                            }
                            // Strip internal/meta keys
                            delete settingsToUpdate.list;
                            delete settingsToUpdate.map;
                            delete settingsToUpdate.results;
                            return [4 /*yield*/, settings_service_1.SettingsService.updateBatch(settingsToUpdate, (_a = request.user) === null || _a === void 0 ? void 0 : _a.id)];
                        case 1:
                            results = _b.sent();
                            return [4 /*yield*/, settings_service_1.SettingsService.getAll()];
                        case 2:
                            all = _b.sent();
                            return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, __assign(__assign({}, all.map), { results: results }), 'Settings updated successfully')];
                    }
                });
            }); };
            fastify.post('/', { preHandler: [(0, rbac_middleware_1.requirePermission)('manage_settings')] }, handleBatchUpdate);
            fastify.put('/', { preHandler: [(0, rbac_middleware_1.requirePermission)('manage_settings')] }, handleBatchUpdate);
            // Update single setting
            fastify.put('/:key', { preHandler: [(0, rbac_middleware_1.requirePermission)('manage_settings')] }, function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var key, input, updated;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            key = request.params.key;
                            input = settings_schema_1.updateSettingSchema.parse(request.body);
                            return [4 /*yield*/, settings_service_1.SettingsService.set(key, input.value, (_a = request.user) === null || _a === void 0 ? void 0 : _a.id)];
                        case 1:
                            updated = _b.sent();
                            return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, updated, "Setting \"".concat(key, "\" updated"))];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
