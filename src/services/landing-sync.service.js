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
exports.LandingSyncService = void 0;
var drizzle_orm_1 = require("drizzle-orm");
var client_1 = require("../database/client");
var index_1 = require("../database/schema/index");
var index_2 = require("../config/index");
var logger_1 = require("../utils/logger");
var settings_service_1 = require("../modules/settings/settings.service");
var LandingSyncService = /** @class */ (function () {
    function LandingSyncService() {
    }
    /**
     * Normalize any phone number (especially Egyptian numbers) into the 11-digit
     * local mobile format (01xxxxxxxxx) expected by the landing page validator.
     */
    LandingSyncService.normalizeMobile = function (rawPhone) {
        if (!rawPhone)
            return '';
        // Strip all non-digit characters
        var digits = rawPhone.replace(/\D/g, '');
        // Case 1: International format for Egypt (+2010... / 2010...)
        // Example: 201080632351 -> 01080632351
        if (digits.startsWith('20') && digits.length === 12 && /^201[0125]/.test(digits)) {
            return '0' + digits.slice(2);
        }
        // Case 2: Double zero prefix 00201...
        if (digits.startsWith('0020') && digits.length === 14) {
            return '0' + digits.slice(4);
        }
        // Case 3: Already in Egyptian local format (010..., 011..., 012..., 015...) with 11 digits
        if (/^01[0125][0-9]{8}$/.test(digits)) {
            return digits;
        }
        // Case 4: Missing leading 0 (1080632351 -> 01080632351)
        if (/^1[0125][0-9]{8}$/.test(digits)) {
            return '0' + digits;
        }
        // Default fallback: return digits as-is
        return digits;
    };
    /**
     * Resolve the contact's name. If no valid name exists on WhatsApp or it equals the phone number,
     * provide a clean default to satisfy the landing page's mandatory full_name requirement.
     */
    LandingSyncService.resolveContactName = function (contact) {
        var _a;
        var rawName = (contact.name || '').trim();
        var rawPhone = (contact.phoneNumber || '').trim();
        var pushName = (((_a = contact.metadata) === null || _a === void 0 ? void 0 : _a.whatsappPushName) || '').trim();
        // Check if name is provided and distinct from phone number
        if (rawName && rawName !== rawPhone && !/^\+?[0-9\s\-()]+$/.test(rawName)) {
            return rawName;
        }
        // Check if pushName is provided and distinct from phone number
        if (pushName && pushName !== rawPhone && !/^\+?[0-9\s\-()]+$/.test(pushName)) {
            return pushName;
        }
        // Fallback: If no name exists, use clean placeholder
        return 'عميل واتساب';
    };
    /**
     * Synchronize contact directly to the Trinity Vision landing page API.
     * Performs deduplication check and records sync status in contact metadata.
     */
    LandingSyncService.syncContact = function (contact) {
        return __awaiter(this, void 0, void 0, function () {
            var isSyncEnabled, dbEnabled, _a, contactMeta, mobile, fullName, payload, targetUrl, dbUrl, _b, controller_1, timeoutId, response, responseData, _c, isSuccess, updatedMeta, errorMsg, updatedMeta, err_1, errorMsg, updatedMeta, dbErr_1;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        isSyncEnabled = index_2.config.LANDING_SYNC_ENABLED;
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, settings_service_1.SettingsService.get('landingSyncEnabled')];
                    case 2:
                        dbEnabled = _d.sent();
                        if (dbEnabled !== undefined && dbEnabled !== null) {
                            isSyncEnabled = dbEnabled === true || dbEnabled === 'true';
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _d.sent();
                        return [3 /*break*/, 4];
                    case 4:
                        if (!isSyncEnabled) {
                            logger_1.logger.info({ contactId: contact.id }, 'Landing page sync is disabled in settings, skipping');
                            return [2 /*return*/, { success: false, message: 'Landing page sync is disabled in settings' }];
                        }
                        contactMeta = (contact.metadata || {});
                        // Idempotency: Skip if already synced successfully
                        if (contactMeta.trinityLandingSynced === true) {
                            logger_1.logger.debug({ contactId: contact.id, phoneNumber: contact.phoneNumber }, 'Contact already synced to Trinity Vision landing page, skipping');
                            return [2 /*return*/, { success: true, message: 'Already synced' }];
                        }
                        mobile = this.normalizeMobile(contact.phoneNumber);
                        fullName = this.resolveContactName(contact);
                        payload = {
                            full_name: fullName,
                            mobile: mobile,
                            governorate: 'كفر الشيخ',
                            notes: 'مسجل تلقائياً عبر واتساب الأدمن CRM',
                            ad_code: 'whatsapp_crm',
                        };
                        targetUrl = index_2.config.LANDING_SYNC_URL;
                        _d.label = 5;
                    case 5:
                        _d.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, settings_service_1.SettingsService.get('landingSyncUrl')];
                    case 6:
                        dbUrl = _d.sent();
                        if (dbUrl && typeof dbUrl === 'string' && dbUrl.trim() !== '') {
                            targetUrl = dbUrl.trim();
                        }
                        return [3 /*break*/, 8];
                    case 7:
                        _b = _d.sent();
                        return [3 /*break*/, 8];
                    case 8:
                        _d.trys.push([8, 18, , 23]);
                        logger_1.logger.info({ contactId: contact.id, mobile: mobile, fullName: fullName, targetUrl: targetUrl }, 'Sending contact to Trinity Vision landing page');
                        controller_1 = new AbortController();
                        timeoutId = setTimeout(function () { return controller_1.abort(); }, 10000);
                        return [4 /*yield*/, fetch(targetUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json, text/plain, */*',
                                    'User-Agent': 'TrentyVision-WhatsAppCRM/1.0',
                                },
                                body: JSON.stringify(payload),
                                signal: controller_1.signal,
                            })];
                    case 9:
                        response = _d.sent();
                        clearTimeout(timeoutId);
                        responseData = null;
                        _d.label = 10;
                    case 10:
                        _d.trys.push([10, 12, , 13]);
                        return [4 /*yield*/, response.json()];
                    case 11:
                        responseData = _d.sent();
                        return [3 /*break*/, 13];
                    case 12:
                        _c = _d.sent();
                        return [3 /*break*/, 13];
                    case 13:
                        isSuccess = response.ok && (!responseData || responseData.success !== false);
                        if (!isSuccess) return [3 /*break*/, 15];
                        updatedMeta = __assign(__assign({}, contactMeta), { trinityLandingSynced: true, trinityLandingSyncedAt: new Date().toISOString(), trinityLandingResponse: responseData || { status: response.status } });
                        return [4 /*yield*/, client_1.db
                                .update(index_1.contacts)
                                .set({ metadata: updatedMeta, updatedAt: new Date() })
                                .where((0, drizzle_orm_1.eq)(index_1.contacts.id, contact.id))];
                    case 14:
                        _d.sent();
                        logger_1.logger.info({ contactId: contact.id, mobile: mobile, status: response.status }, 'Contact successfully synced to Trinity Vision landing page');
                        return [2 /*return*/, {
                                success: true,
                                status: response.status,
                                message: (responseData === null || responseData === void 0 ? void 0 : responseData.message) || 'Successfully registered',
                                payload: payload,
                            }];
                    case 15:
                        errorMsg = (responseData === null || responseData === void 0 ? void 0 : responseData.message) ||
                            "Landing page server responded with HTTP ".concat(response.status, ": ").concat(response.statusText);
                        updatedMeta = __assign(__assign({}, contactMeta), { trinityLandingSynced: false, trinityLandingLastAttempt: new Date().toISOString(), trinityLandingLastError: errorMsg, trinityLandingHttpStatus: response.status });
                        return [4 /*yield*/, client_1.db
                                .update(index_1.contacts)
                                .set({ metadata: updatedMeta, updatedAt: new Date() })
                                .where((0, drizzle_orm_1.eq)(index_1.contacts.id, contact.id))];
                    case 16:
                        _d.sent();
                        logger_1.logger.warn({ contactId: contact.id, mobile: mobile, status: response.status, error: errorMsg }, 'Trinity Vision landing page returned non-success response during contact sync');
                        return [2 /*return*/, {
                                success: false,
                                status: response.status,
                                message: errorMsg,
                                payload: payload,
                            }];
                    case 17: return [3 /*break*/, 23];
                    case 18:
                        err_1 = _d.sent();
                        errorMsg = err_1.name === 'AbortError' ? 'Connection timed out (10s)' : (err_1.message || 'Unknown network error');
                        _d.label = 19;
                    case 19:
                        _d.trys.push([19, 21, , 22]);
                        updatedMeta = __assign(__assign({}, contactMeta), { trinityLandingSynced: false, trinityLandingLastAttempt: new Date().toISOString(), trinityLandingLastError: errorMsg });
                        return [4 /*yield*/, client_1.db
                                .update(index_1.contacts)
                                .set({ metadata: updatedMeta, updatedAt: new Date() })
                                .where((0, drizzle_orm_1.eq)(index_1.contacts.id, contact.id))];
                    case 20:
                        _d.sent();
                        return [3 /*break*/, 22];
                    case 21:
                        dbErr_1 = _d.sent();
                        logger_1.logger.error({ contactId: contact.id, dbErr: dbErr_1 }, 'Failed to persist landing sync error to contact metadata');
                        return [3 /*break*/, 22];
                    case 22:
                        logger_1.logger.warn({ contactId: contact.id, mobile: mobile, error: errorMsg }, 'Network/connection error when syncing contact to Trinity Vision landing page');
                        return [2 /*return*/, {
                                success: false,
                                message: errorMsg,
                                payload: payload,
                            }];
                    case 23: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Non-blocking asynchronous sync execution. Fire-and-forget so that
     * WhatsApp incoming message handling is never delayed or blocked.
     */
    LandingSyncService.syncContactAsync = function (contact) {
        var _this = this;
        setImmediate(function () {
            _this.syncContact(contact).catch(function (err) {
                logger_1.logger.error({ contactId: contact.id, err: err }, 'Unhandled error in syncContactAsync');
            });
        });
    };
    return LandingSyncService;
}());
exports.LandingSyncService = LandingSyncService;
