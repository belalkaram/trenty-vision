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
exports.SettingsService = void 0;
var client_1 = require("../../database/client");
var index_1 = require("../../database/schema/index");
var drizzle_orm_1 = require("drizzle-orm");
var errors_1 = require("../../utils/errors");
var audit_service_1 = require("../audit/audit.service");
var logger_1 = require("../../utils/logger");
var business_hours_converter_1 = require("../../utils/business-hours.converter");
var IGNORED_KEYS = new Set(['list', 'map', 'results', 'undefined', 'null']);
var SettingsService = /** @class */ (function () {
    function SettingsService() {
    }
    /**
     * Cleans up junk keys (e.g. list, map) accidentally stored in the settings table
     */
    SettingsService.cleanupJunkSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, client_1.db.delete(index_1.settings).where((0, drizzle_orm_1.inArray)(index_1.settings.key, Array.from(IGNORED_KEYS)))];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        err_1 = _a.sent();
                        logger_1.logger.debug({ err: err_1 }, 'Error cleaning up junk settings');
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    SettingsService.getAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            var list, map, _i, list_1, item, oohVal, oohTmpl, rawBHours, unified;
            var _a, _b, _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0: return [4 /*yield*/, this.cleanupJunkSettings()];
                    case 1:
                        _g.sent();
                        return [4 /*yield*/, client_1.db.select().from(index_1.settings)];
                    case 2:
                        list = _g.sent();
                        map = {};
                        for (_i = 0, list_1 = list; _i < list_1.length; _i++) {
                            item = list_1[_i];
                            if (IGNORED_KEYS.has(item.key))
                                continue;
                            map[item.key] = item.value;
                        }
                        // Bidirectional normalization to guarantee both camelCase and snake_case exist
                        if (map['assignment_mode'] !== undefined && map['routingStrategy'] === undefined) {
                            map['routingStrategy'] = map['assignment_mode'];
                        }
                        else if (map['routingStrategy'] !== undefined && map['assignment_mode'] === undefined) {
                            map['assignment_mode'] = map['routingStrategy'];
                        }
                        if (map['assignment_enabled'] !== undefined && map['autoAssignmentEnabled'] === undefined) {
                            map['autoAssignmentEnabled'] = map['assignment_enabled'];
                        }
                        else if (map['autoAssignmentEnabled'] !== undefined && map['assignment_enabled'] === undefined) {
                            map['assignment_enabled'] = map['autoAssignmentEnabled'];
                        }
                        if (map['welcome_message_enabled'] !== undefined) {
                            map['greetingBotEnabled'] = map['welcome_message_enabled'];
                            map['welcomeMessageEnabled'] = map['welcome_message_enabled'];
                        }
                        if (map['welcome_message_template'] !== undefined) {
                            map['greetingMessage'] = map['welcome_message_template'];
                            map['welcomeMessageTemplate'] = map['welcome_message_template'];
                        }
                        oohVal = (_c = (_b = (_a = map['out_of_hours_message_enabled']) !== null && _a !== void 0 ? _a : map['outOfHoursMessageEnabled']) !== null && _b !== void 0 ? _b : map['outOfOfficeBotEnabled']) !== null && _c !== void 0 ? _c : map['outOfOfficeEnabled'];
                        if (oohVal !== undefined) {
                            map['out_of_hours_message_enabled'] = oohVal;
                            map['outOfHoursMessageEnabled'] = oohVal;
                            map['outOfOfficeBotEnabled'] = oohVal;
                            map['outOfOfficeEnabled'] = oohVal;
                        }
                        oohTmpl = (_e = (_d = map['out_of_hours_message_template']) !== null && _d !== void 0 ? _d : map['outOfHoursMessageTemplate']) !== null && _e !== void 0 ? _e : map['outOfOfficeMessage'];
                        if (oohTmpl !== undefined) {
                            map['out_of_hours_message_template'] = oohTmpl;
                            map['outOfHoursMessageTemplate'] = oohTmpl;
                            map['outOfOfficeMessage'] = oohTmpl;
                        }
                        rawBHours = (_f = map['business_hours']) !== null && _f !== void 0 ? _f : map['businessHours'];
                        if (rawBHours) {
                            unified = (0, business_hours_converter_1.unifyBusinessHours)(rawBHours);
                            map['business_hours'] = unified;
                            map['businessHours'] = unified;
                            map['businessHoursStart'] = unified.start;
                            map['businessHoursEnd'] = unified.end;
                            map['activeDays'] = unified.activeDays;
                        }
                        return [2 /*return*/, {
                                list: list.filter(function (i) { return !IGNORED_KEYS.has(i.key); }),
                                map: map,
                            }];
                }
            });
        });
    };
    SettingsService.get = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var setting, bh;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (IGNORED_KEYS.has(key))
                            return [2 /*return*/, null];
                        return [4 /*yield*/, client_1.db.query.settings.findFirst({
                                where: (0, drizzle_orm_1.eq)(index_1.settings.key, key),
                            })];
                    case 1:
                        setting = _a.sent();
                        if (!!setting) return [3 /*break*/, 4];
                        // Fallback check mirrored keys
                        if (key === 'routingStrategy')
                            return [2 /*return*/, this.get('assignment_mode')];
                        if (key === 'assignment_mode')
                            return [2 /*return*/, this.get('routingStrategy')];
                        if (key === 'autoAssignmentEnabled')
                            return [2 /*return*/, this.get('assignment_enabled')];
                        if (key === 'assignment_enabled')
                            return [2 /*return*/, this.get('autoAssignmentEnabled')];
                        if (!(key === 'businessHoursStart' || key === 'businessHoursEnd' || key === 'activeDays')) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.get('business_hours')];
                    case 2:
                        bh = _a.sent();
                        return [2 /*return*/, bh ? (0, business_hours_converter_1.unifyBusinessHours)(bh)[key === 'activeDays' ? 'workDays' : key] : null];
                    case 3: throw new errors_1.NotFoundError("Setting \"".concat(key, "\" not found"));
                    case 4:
                        if (key === 'businessHours' || key === 'business_hours') {
                            return [2 /*return*/, (0, business_hours_converter_1.unifyBusinessHours)(setting.value)];
                        }
                        return [2 /*return*/, setting.value];
                }
            });
        });
    };
    SettingsService.set = function (key, value, actorId) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, updated, mirrorPairs, targets, _i, targets_1, targetKey;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!key || IGNORED_KEYS.has(key))
                            return [2 /*return*/, null];
                        if (key === 'businessHours' || key === 'business_hours') {
                            value = (0, business_hours_converter_1.unifyBusinessHours)(value);
                        }
                        return [4 /*yield*/, client_1.db.query.settings.findFirst({
                                where: (0, drizzle_orm_1.eq)(index_1.settings.key, key),
                            })];
                    case 1:
                        existing = _d.sent();
                        if (!existing) return [3 /*break*/, 4];
                        return [4 /*yield*/, client_1.db
                                .update(index_1.settings)
                                .set({
                                value: value,
                                updatedAt: new Date(),
                            })
                                .where((0, drizzle_orm_1.eq)(index_1.settings.key, key))
                                .returning()];
                    case 2:
                        updated = (_d.sent())[0];
                        return [4 /*yield*/, audit_service_1.AuditService.log({
                                actorId: actorId,
                                action: 'setting.update',
                                entityType: 'setting',
                                entityId: existing.id,
                                oldValues: (_a = {}, _a[key] = existing.value, _a),
                                newValues: (_b = {}, _b[key] = value, _b),
                            })];
                    case 3:
                        _d.sent();
                        return [3 /*break*/, 7];
                    case 4: return [4 /*yield*/, client_1.db
                            .insert(index_1.settings)
                            .values({
                            key: key,
                            value: value,
                            groupName: 'custom',
                        })
                            .returning()];
                    case 5:
                        updated = (_d.sent())[0];
                        return [4 /*yield*/, audit_service_1.AuditService.log({
                                actorId: actorId,
                                action: 'setting.create',
                                entityType: 'setting',
                                entityId: updated.id,
                                newValues: (_c = {}, _c[key] = value, _c),
                            })];
                    case 6:
                        _d.sent();
                        _d.label = 7;
                    case 7:
                        mirrorPairs = {
                            routingStrategy: ['assignment_mode'],
                            assignment_mode: ['routingStrategy'],
                            autoAssignmentEnabled: ['assignment_enabled'],
                            assignment_enabled: ['autoAssignmentEnabled'],
                            welcomeMessageEnabled: ['welcome_message_enabled', 'greetingBotEnabled'],
                            greetingBotEnabled: ['welcome_message_enabled', 'welcomeMessageEnabled'],
                            welcome_message_enabled: ['welcomeMessageEnabled', 'greetingBotEnabled'],
                            welcomeMessageTemplate: ['welcome_message_template', 'greetingMessage'],
                            greetingMessage: ['welcome_message_template', 'welcomeMessageTemplate'],
                            welcome_message_template: ['welcomeMessageTemplate', 'greetingMessage'],
                            outOfOfficeEnabled: ['out_of_hours_message_enabled', 'outOfHoursMessageEnabled', 'outOfOfficeBotEnabled'],
                            outOfOfficeBotEnabled: ['out_of_hours_message_enabled', 'outOfHoursMessageEnabled', 'outOfOfficeEnabled'],
                            outOfHoursMessageEnabled: ['out_of_hours_message_enabled', 'outOfOfficeBotEnabled', 'outOfOfficeEnabled'],
                            out_of_hours_message_enabled: ['outOfHoursMessageEnabled', 'outOfOfficeBotEnabled', 'outOfOfficeEnabled'],
                            outOfOfficeMessage: ['out_of_hours_message_template', 'outOfHoursMessageTemplate'],
                            outOfHoursMessageTemplate: ['out_of_hours_message_template', 'outOfOfficeMessage'],
                            out_of_hours_message_template: ['outOfHoursMessageTemplate', 'outOfOfficeMessage'],
                            businessHours: ['business_hours'],
                            business_hours: ['businessHours'],
                            landingSyncEnabled: ['landing_sync_enabled'],
                            landing_sync_enabled: ['landingSyncEnabled'],
                            landingSyncUrl: ['landing_sync_url'],
                            landing_sync_url: ['landingSyncUrl'],
                        };
                        targets = mirrorPairs[key];
                        if (!targets) return [3 /*break*/, 11];
                        _i = 0, targets_1 = targets;
                        _d.label = 8;
                    case 8:
                        if (!(_i < targets_1.length)) return [3 /*break*/, 11];
                        targetKey = targets_1[_i];
                        return [4 /*yield*/, client_1.db
                                .insert(index_1.settings)
                                .values({ key: targetKey, value: value, groupName: 'synced' })
                                .onConflictDoUpdate({ target: index_1.settings.key, set: { value: value, updatedAt: new Date() } })];
                    case 9:
                        _d.sent();
                        _d.label = 10;
                    case 10:
                        _i++;
                        return [3 /*break*/, 8];
                    case 11: return [2 /*return*/, updated];
                }
            });
        });
    };
    SettingsService.updateBatch = function (items, actorId) {
        return __awaiter(this, void 0, void 0, function () {
            var results, _i, _a, _b, key, value, res;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        results = [];
                        _i = 0, _a = Object.entries(items);
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        _b = _a[_i], key = _b[0], value = _b[1];
                        if (IGNORED_KEYS.has(key) || !key || value === undefined)
                            return [3 /*break*/, 3];
                        return [4 /*yield*/, this.set(key, value, actorId)];
                    case 2:
                        res = _c.sent();
                        if (res)
                            results.push(res);
                        _c.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, results];
                }
            });
        });
    };
    return SettingsService;
}());
exports.SettingsService = SettingsService;
