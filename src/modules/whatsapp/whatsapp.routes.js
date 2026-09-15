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
exports.whatsappRoutes = whatsappRoutes;
var drizzle_orm_1 = require("drizzle-orm");
var zod_1 = require("zod");
var client_1 = require("../../database/client");
var index_1 = require("../../database/schema/index");
var index_2 = require("../../config/index");
var ws_hub_1 = require("../../websocket/ws.hub");
var logger_1 = require("../../utils/logger");
function getLocalSessionManager() {
    return __awaiter(this, void 0, void 0, function () {
        var mod, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(index_2.config.DEPLOYMENT_MODE === 'local')) return [3 /*break*/, 4];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('./session.manager'); })];
                case 2:
                    mod = _a.sent();
                    return [2 /*return*/, mod.sessionManager];
                case 3:
                    e_1 = _a.sent();
                    logger_1.logger.warn({ err: e_1 }, 'Could not load local sessionManager');
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/, null];
            }
        });
    });
}
function queueBridgeCommand(companyId_1, accountId_1, action_1) {
    return __awaiter(this, arguments, void 0, function (companyId, accountId, action, payload) {
        var cmd;
        if (payload === void 0) { payload = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, client_1.db
                        .insert(index_1.bridgeCommands)
                        .values({
                        companyId: companyId,
                        accountId: accountId,
                        action: action,
                        payload: payload,
                        status: 'pending',
                    })
                        .returning()];
                case 1:
                    cmd = (_a.sent())[0];
                    return [2 /*return*/, cmd];
            }
        });
    });
}
// ─── Schemas ─────────────────────────────────────────────
var createAccountSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(1).max(150),
});
// ─── Routes ──────────────────────────────────────────────
function whatsappRoutes(app) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            /**
             * GET /api/v1/whatsapp/accounts — List all WhatsApp accounts
             */
            app.get('/accounts', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var accounts, sm, enriched, heartbeat, isBridgeActive_1;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, client_1.db
                                .select()
                                .from(index_1.whatsappAccounts)
                                .orderBy(index_1.whatsappAccounts.createdAt)];
                        case 1:
                            accounts = _a.sent();
                            return [4 /*yield*/, getLocalSessionManager()];
                        case 2:
                            sm = _a.sent();
                            if (!sm) return [3 /*break*/, 4];
                            return [4 /*yield*/, Promise.all(accounts.map(function (account) { return __awaiter(_this, void 0, void 0, function () {
                                    var liveStatus, liveQr, livePairing;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, sm.getAccountStatus(account.id)];
                                            case 1:
                                                liveStatus = _a.sent();
                                                return [4 /*yield*/, sm.getQRCode(account.id)];
                                            case 2:
                                                liveQr = (_a.sent()) || liveStatus.qrCode || null;
                                                return [4 /*yield*/, sm.getPairingCode(account.id)];
                                            case 3:
                                                livePairing = (_a.sent()) || liveStatus.pairingCode || null;
                                                return [2 /*return*/, __assign(__assign({}, account), { isPrimaryDispatcher: Boolean(account.isPrimaryDispatcher), dispatcherSlot: account.dispatcherSlot || null, status: liveStatus.status !== 'disconnected' ? liveStatus.status : account.status, liveStatus: liveStatus.status, liveQrCode: liveQr, livePairingCode: livePairing, livePhoneNumber: liveStatus.phoneNumber || account.phoneNumber, liveDeviceName: liveStatus.deviceName || account.deviceName, liveError: liveStatus.error || null, bridgeStatus: 'online' })];
                                        }
                                    });
                                }); }))];
                        case 3:
                            enriched = _a.sent();
                            return [3 /*break*/, 6];
                        case 4: return [4 /*yield*/, client_1.db
                                .select()
                                .from(index_1.bridgeHeartbeats)
                                .orderBy((0, drizzle_orm_1.desc)(index_1.bridgeHeartbeats.lastSeenAt))
                                .limit(1)];
                        case 5:
                            heartbeat = (_a.sent())[0];
                            isBridgeActive_1 = heartbeat
                                ? (Date.now() - new Date(heartbeat.lastSeenAt).getTime()) < 35000
                                : false;
                            enriched = accounts.map(function (account) { return (__assign(__assign({}, account), { isPrimaryDispatcher: Boolean(account.isPrimaryDispatcher), dispatcherSlot: account.dispatcherSlot || null, liveStatus: isBridgeActive_1 ? account.status : 'disconnected', liveQrCode: isBridgeActive_1 ? (account.bridgeQrCode || null) : null, livePairingCode: null, livePhoneNumber: account.phoneNumber, liveDeviceName: account.deviceName, liveError: isBridgeActive_1 ? null : 'سيرفر Baileys المحلي غير متصل', bridgeStatus: isBridgeActive_1 ? 'online' : 'offline' })); });
                            _a.label = 6;
                        case 6: return [2 /*return*/, reply.send({ success: true, data: enriched })];
                    }
                });
            }); });
            /**
             * POST /api/v1/whatsapp/accounts — Create a new WhatsApp account
             */
            app.post('/accounts', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var parsed, company, account;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            parsed = createAccountSchema.safeParse(request.body);
                            if (!parsed.success) {
                                return [2 /*return*/, reply.status(400).send({ success: false, error: 'Invalid input', details: parsed.error.format() })];
                            }
                            return [4 /*yield*/, client_1.db.select().from(index_1.companies).limit(1)];
                        case 1:
                            company = (_a.sent())[0];
                            if (!company) {
                                return [2 /*return*/, reply.status(500).send({ success: false, error: 'No company found. Run db:seed first.' })];
                            }
                            return [4 /*yield*/, client_1.db
                                    .insert(index_1.whatsappAccounts)
                                    .values({
                                    companyId: company.id,
                                    displayName: parsed.data.displayName,
                                    status: 'disconnected',
                                })
                                    .returning()];
                        case 2:
                            account = (_a.sent())[0];
                            logger_1.logger.info({ accountId: account.id, displayName: account.displayName }, 'WhatsApp account created');
                            return [2 /*return*/, reply.status(201).send({ success: true, data: account })];
                    }
                });
            }); });
            /**
             * GET /api/v1/whatsapp/accounts/:id — Get a specific WhatsApp account
             */
            app.get('/accounts/:id', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, account, sm, liveStatus, liveQr, livePairing;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            return [4 /*yield*/, client_1.db
                                    .select()
                                    .from(index_1.whatsappAccounts)
                                    .where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, id))];
                        case 1:
                            account = (_a.sent())[0];
                            if (!account) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Account not found' })];
                            }
                            return [4 /*yield*/, getLocalSessionManager()];
                        case 2:
                            sm = _a.sent();
                            if (!sm) return [3 /*break*/, 6];
                            return [4 /*yield*/, sm.getAccountStatus(id)];
                        case 3:
                            liveStatus = _a.sent();
                            return [4 /*yield*/, sm.getQRCode(id)];
                        case 4:
                            liveQr = (_a.sent()) || liveStatus.qrCode || null;
                            return [4 /*yield*/, sm.getPairingCode(id)];
                        case 5:
                            livePairing = (_a.sent()) || liveStatus.pairingCode || null;
                            return [2 /*return*/, reply.send({
                                    success: true,
                                    data: __assign(__assign({}, account), { liveStatus: liveStatus.status, liveQrCode: liveQr, livePairingCode: livePairing, livePhoneNumber: liveStatus.phoneNumber, liveJid: liveStatus.jid, liveDeviceName: liveStatus.deviceName }),
                                })];
                        case 6: return [2 /*return*/, reply.send({
                                success: true,
                                data: __assign(__assign({}, account), { liveStatus: account.status, liveQrCode: account.bridgeQrCode, livePairingCode: null, livePhoneNumber: account.phoneNumber, liveJid: account.jid, liveDeviceName: account.deviceName }),
                            })];
                    }
                });
            }); });
            /**
             * POST /api/v1/whatsapp/accounts/:id/connect — Start connection (generates QR)
             */
            app.post('/accounts/:id/connect', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, account, sm, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            return [4 /*yield*/, client_1.db
                                    .select()
                                    .from(index_1.whatsappAccounts)
                                    .where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, id))];
                        case 1:
                            account = (_a.sent())[0];
                            if (!account) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Account not found' })];
                            }
                            return [4 /*yield*/, getLocalSessionManager()];
                        case 2:
                            sm = _a.sent();
                            if (!sm) return [3 /*break*/, 7];
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 5, , 6]);
                            return [4 /*yield*/, sm.connectAccount(id)];
                        case 4:
                            _a.sent();
                            return [2 /*return*/, reply.send({ success: true, message: 'Connection initiated. Watch WebSocket for QR code.' })];
                        case 5:
                            err_1 = _a.sent();
                            logger_1.logger.error({ accountId: id, err: err_1 }, 'Failed to connect WhatsApp account');
                            return [2 /*return*/, reply.status(500).send({ success: false, error: 'Failed to start connection' })];
                        case 6: return [3 /*break*/, 9];
                        case 7: return [4 /*yield*/, queueBridgeCommand(account.companyId, id, 'connect')];
                        case 8:
                            _a.sent();
                            return [2 /*return*/, reply.send({ success: true, message: 'تم إرسال أمر الاتصال إلى سيرفر WhatsApp المحلي.' })];
                        case 9: return [2 /*return*/];
                    }
                });
            }); });
            /**
             * POST /api/v1/whatsapp/accounts/:id/disconnect — Disconnect (keeps auth)
             */
            app.post('/accounts/:id/disconnect', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, account, sm, err_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            return [4 /*yield*/, client_1.db.select().from(index_1.whatsappAccounts).where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, id)).limit(1)];
                        case 1:
                            account = (_a.sent())[0];
                            if (!account)
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Account not found' })];
                            return [4 /*yield*/, getLocalSessionManager()];
                        case 2:
                            sm = _a.sent();
                            if (!sm) return [3 /*break*/, 7];
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 5, , 6]);
                            return [4 /*yield*/, sm.disconnectAccount(id)];
                        case 4:
                            _a.sent();
                            return [2 /*return*/, reply.send({ success: true, message: 'Account disconnected' })];
                        case 5:
                            err_2 = _a.sent();
                            logger_1.logger.error({ accountId: id, err: err_2 }, 'Failed to disconnect WhatsApp account');
                            return [2 /*return*/, reply.status(500).send({ success: false, error: 'Failed to disconnect' })];
                        case 6: return [3 /*break*/, 9];
                        case 7: return [4 /*yield*/, queueBridgeCommand(account.companyId, id, 'disconnect')];
                        case 8:
                            _a.sent();
                            return [2 /*return*/, reply.send({ success: true, message: 'تم إرسال أمر قطع الاتصال إلى سيرفر WhatsApp المحلي.' })];
                        case 9: return [2 /*return*/];
                    }
                });
            }); });
            /**
             * POST /api/v1/whatsapp/accounts/:id/logout — Logout (clears auth, needs new QR)
             */
            app.post('/accounts/:id/logout', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, account, sm, err_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            return [4 /*yield*/, client_1.db.select().from(index_1.whatsappAccounts).where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, id)).limit(1)];
                        case 1:
                            account = (_a.sent())[0];
                            if (!account)
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Account not found' })];
                            return [4 /*yield*/, getLocalSessionManager()];
                        case 2:
                            sm = _a.sent();
                            if (!sm) return [3 /*break*/, 7];
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 5, , 6]);
                            return [4 /*yield*/, sm.logoutAccount(id)];
                        case 4:
                            _a.sent();
                            return [2 /*return*/, reply.send({ success: true, message: 'Account logged out. Auth state cleared.' })];
                        case 5:
                            err_3 = _a.sent();
                            logger_1.logger.error({ accountId: id, err: err_3 }, 'Failed to logout WhatsApp account');
                            return [2 /*return*/, reply.status(500).send({ success: false, error: 'Failed to logout' })];
                        case 6: return [3 /*break*/, 9];
                        case 7: return [4 /*yield*/, queueBridgeCommand(account.companyId, id, 'logout')];
                        case 8:
                            _a.sent();
                            return [2 /*return*/, reply.send({ success: true, message: 'تم إرسال أمر تسجيل الخروج إلى سيرفر WhatsApp المحلي.' })];
                        case 9: return [2 /*return*/];
                    }
                });
            }); });
            /**
             * POST /api/v1/whatsapp/accounts/:id/reconnect — Reconnect account
             */
            app.post('/accounts/:id/reconnect', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, account, sm, err_4;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            return [4 /*yield*/, client_1.db.select().from(index_1.whatsappAccounts).where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, id)).limit(1)];
                        case 1:
                            account = (_a.sent())[0];
                            if (!account)
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Account not found' })];
                            return [4 /*yield*/, getLocalSessionManager()];
                        case 2:
                            sm = _a.sent();
                            if (!sm) return [3 /*break*/, 7];
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 5, , 6]);
                            return [4 /*yield*/, sm.reconnectAccount(id)];
                        case 4:
                            _a.sent();
                            return [2 /*return*/, reply.send({ success: true, message: 'Reconnection initiated' })];
                        case 5:
                            err_4 = _a.sent();
                            logger_1.logger.error({ accountId: id, err: err_4 }, 'Failed to reconnect WhatsApp account');
                            return [2 /*return*/, reply.status(500).send({ success: false, error: 'Failed to reconnect' })];
                        case 6: return [3 /*break*/, 9];
                        case 7: return [4 /*yield*/, queueBridgeCommand(account.companyId, id, 'reconnect')];
                        case 8:
                            _a.sent();
                            return [2 /*return*/, reply.send({ success: true, message: 'تم إرسال أمر إعادة الاتصال إلى سيرفر WhatsApp المحلي.' })];
                        case 9: return [2 /*return*/];
                    }
                });
            }); });
            /**
             * POST /api/v1/whatsapp/accounts/:id/restart — Restart account session (alias)
             */
            app.post('/accounts/:id/restart', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, account, sm, err_5;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            return [4 /*yield*/, client_1.db.select().from(index_1.whatsappAccounts).where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, id)).limit(1)];
                        case 1:
                            account = (_a.sent())[0];
                            if (!account)
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Account not found' })];
                            return [4 /*yield*/, getLocalSessionManager()];
                        case 2:
                            sm = _a.sent();
                            if (!sm) return [3 /*break*/, 7];
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 5, , 6]);
                            return [4 /*yield*/, sm.restartAccount(id)];
                        case 4:
                            _a.sent();
                            return [2 /*return*/, reply.send({ success: true, message: 'Session restarted successfully' })];
                        case 5:
                            err_5 = _a.sent();
                            logger_1.logger.error({ accountId: id, err: err_5 }, 'Failed to restart WhatsApp account');
                            return [2 /*return*/, reply.status(500).send({ success: false, error: 'Failed to restart' })];
                        case 6: return [3 /*break*/, 9];
                        case 7: return [4 /*yield*/, queueBridgeCommand(account.companyId, id, 'restart')];
                        case 8:
                            _a.sent();
                            return [2 /*return*/, reply.send({ success: true, message: 'تم إرسال أمر إعادة التشغيل إلى سيرفر WhatsApp المحلي.' })];
                        case 9: return [2 /*return*/];
                    }
                });
            }); });
            /**
             * POST /api/v1/whatsapp/accounts/:id/reset — Complete wipe and reset of auth credentials
             */
            app.post('/accounts/:id/reset', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, account, sm, err_6;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            return [4 /*yield*/, client_1.db.select().from(index_1.whatsappAccounts).where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, id)).limit(1)];
                        case 1:
                            account = (_a.sent())[0];
                            if (!account)
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Account not found' })];
                            return [4 /*yield*/, getLocalSessionManager()];
                        case 2:
                            sm = _a.sent();
                            if (!sm) return [3 /*break*/, 7];
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 5, , 6]);
                            return [4 /*yield*/, sm.resetAccount(id)];
                        case 4:
                            _a.sent();
                            return [2 /*return*/, reply.send({ success: true, message: 'Account session reset. Ready for fresh pairing.' })];
                        case 5:
                            err_6 = _a.sent();
                            logger_1.logger.error({ accountId: id, err: err_6 }, 'Failed to reset WhatsApp account');
                            return [2 /*return*/, reply.status(500).send({ success: false, error: 'Failed to reset' })];
                        case 6: return [3 /*break*/, 9];
                        case 7: return [4 /*yield*/, queueBridgeCommand(account.companyId, id, 'reset')];
                        case 8:
                            _a.sent();
                            return [2 /*return*/, reply.send({ success: true, message: 'تم إرسال أمر إعادة الضبط إلى سيرفر WhatsApp المحلي.' })];
                        case 9: return [2 /*return*/];
                    }
                });
            }); });
            /**
             * DELETE /api/v1/whatsapp/accounts/:id — Delete account permanently
             */
            app.delete('/accounts/:id', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, sm, err_7;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            return [4 /*yield*/, getLocalSessionManager()];
                        case 1:
                            sm = _a.sent();
                            if (!sm) return [3 /*break*/, 5];
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, sm.deleteAccount(id)];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            err_7 = _a.sent();
                            logger_1.logger.error({ accountId: id, err: err_7 }, 'Failed to delete local session');
                            return [3 /*break*/, 5];
                        case 5: return [4 /*yield*/, client_1.db.delete(index_1.whatsappAccounts).where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, id))];
                        case 6:
                            _a.sent();
                            return [2 /*return*/, reply.send({ success: true, message: 'Account deleted successfully' })];
                    }
                });
            }); });
            /**
             * POST /api/v1/whatsapp/accounts/:id/pairing-code — Request 8-character phone pairing code
             */
            app.post('/accounts/:id/pairing-code', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, phoneNumber, sm, code, err_8, account, cmd, i, updatedCmd, code;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            id = request.params.id;
                            phoneNumber = (request.body || {}).phoneNumber;
                            if (!phoneNumber || phoneNumber.trim().length < 6) {
                                return [2 /*return*/, reply.status(400).send({
                                        success: false,
                                        error: 'يرجى إدخال رقم هاتف صالح مع رمز الدولة (مثال: +965XXXXXXXX أو +201XXXXXXXXX)',
                                    })];
                            }
                            return [4 /*yield*/, getLocalSessionManager()];
                        case 1:
                            sm = _b.sent();
                            if (!sm) return [3 /*break*/, 6];
                            _b.label = 2;
                        case 2:
                            _b.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, sm.requestPairingCode(id, phoneNumber.trim())];
                        case 3:
                            code = _b.sent();
                            return [2 /*return*/, reply.send({
                                    success: true,
                                    data: {
                                        pairingCode: code,
                                        formattedCode: code.length === 8 ? "".concat(code.slice(0, 4), "-").concat(code.slice(4)) : code,
                                        phoneNumber: phoneNumber.trim(),
                                    },
                                    message: 'Pairing code generated successfully',
                                })];
                        case 4:
                            err_8 = _b.sent();
                            logger_1.logger.error({ accountId: id, phoneNumber: phoneNumber, err: err_8 }, 'Failed to request pairing code');
                            return [2 /*return*/, reply.status(500).send({
                                    success: false,
                                    error: err_8.message || 'فشل توليد كود الاقتران. تأكد من أن الرقم غير مرتبط بالفعل.',
                                })];
                        case 5: return [3 /*break*/, 14];
                        case 6: return [4 /*yield*/, client_1.db.select().from(index_1.whatsappAccounts).where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, id)).limit(1)];
                        case 7:
                            account = (_b.sent())[0];
                            if (!account)
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Account not found' })];
                            return [4 /*yield*/, queueBridgeCommand(account.companyId, id, 'pairing_code', { phoneNumber: phoneNumber.trim() })];
                        case 8:
                            cmd = _b.sent();
                            i = 0;
                            _b.label = 9;
                        case 9:
                            if (!(i < 8)) return [3 /*break*/, 13];
                            return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 500); })];
                        case 10:
                            _b.sent();
                            return [4 /*yield*/, client_1.db.select().from(index_1.bridgeCommands).where((0, drizzle_orm_1.eq)(index_1.bridgeCommands.id, cmd.id)).limit(1)];
                        case 11:
                            updatedCmd = (_b.sent())[0];
                            if (updatedCmd && updatedCmd.status === 'completed' && ((_a = updatedCmd.result) === null || _a === void 0 ? void 0 : _a.pairingCode)) {
                                code = updatedCmd.result.pairingCode;
                                return [2 /*return*/, reply.send({
                                        success: true,
                                        data: {
                                            pairingCode: code,
                                            formattedCode: code.length === 8 ? "".concat(code.slice(0, 4), "-").concat(code.slice(4)) : code,
                                            phoneNumber: phoneNumber.trim(),
                                        },
                                        message: 'Pairing code generated successfully',
                                    })];
                            }
                            _b.label = 12;
                        case 12:
                            i++;
                            return [3 /*break*/, 9];
                        case 13: return [2 /*return*/, reply.send({
                                success: true,
                                data: { commandId: cmd.id, status: 'pending' },
                                message: 'تم إرسال طلب رمز الاقتران إلى السيرفر المحلي.',
                            })];
                        case 14: return [2 /*return*/];
                    }
                });
            }); });
            /**
             * GET /api/v1/whatsapp/accounts/:id/pairing-code — Get current pairing code
             */
            app.get('/accounts/:id/pairing-code', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, sm, code, cmd, code;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            id = request.params.id;
                            return [4 /*yield*/, getLocalSessionManager()];
                        case 1:
                            sm = _b.sent();
                            if (!sm) return [3 /*break*/, 3];
                            return [4 /*yield*/, sm.getPairingCode(id)];
                        case 2:
                            code = _b.sent();
                            if (!code) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'No pairing code available' })];
                            }
                            return [2 /*return*/, reply.send({ success: true, data: { pairingCode: code } })];
                        case 3: return [4 /*yield*/, client_1.db
                                .select()
                                .from(index_1.bridgeCommands)
                                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_1.bridgeCommands.accountId, id), (0, drizzle_orm_1.eq)(index_1.bridgeCommands.action, 'pairing_code')))
                                .orderBy((0, drizzle_orm_1.desc)(index_1.bridgeCommands.createdAt))
                                .limit(1)];
                        case 4:
                            cmd = (_b.sent())[0];
                            code = (_a = cmd === null || cmd === void 0 ? void 0 : cmd.result) === null || _a === void 0 ? void 0 : _a.pairingCode;
                            if (!code)
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'No pairing code available' })];
                            return [2 /*return*/, reply.send({ success: true, data: { pairingCode: code } })];
                    }
                });
            }); });
            /**
             * GET /api/v1/whatsapp/accounts/:id/qr — Get current QR code
             */
            app.get('/accounts/:id/qr', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, sm, qrCode, acc;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            return [4 /*yield*/, getLocalSessionManager()];
                        case 1:
                            sm = _a.sent();
                            if (!sm) return [3 /*break*/, 3];
                            return [4 /*yield*/, sm.getQRCode(id)];
                        case 2:
                            qrCode = _a.sent();
                            if (!qrCode) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'No QR code available' })];
                            }
                            return [2 /*return*/, reply.send({ success: true, data: { qrCode: qrCode } })];
                        case 3: return [4 /*yield*/, client_1.db.select().from(index_1.whatsappAccounts).where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, id)).limit(1)];
                        case 4:
                            acc = (_a.sent())[0];
                            if (!(acc === null || acc === void 0 ? void 0 : acc.bridgeQrCode)) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'No QR code available' })];
                            }
                            return [2 /*return*/, reply.send({ success: true, data: { qrCode: acc.bridgeQrCode } })];
                    }
                });
            }); });
            /**
             * PATCH /api/v1/whatsapp/accounts/:id/dispatcher — Configure Primary Dispatcher status
             * Allows setting an account as Primary Dispatcher 1 or Primary Dispatcher 2 (Max 2 accounts)
             */
            app.patch('/accounts/:id/dispatcher', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, schema, parsed, _a, isPrimaryDispatcher, dispatcherSlot, account, currentDispatchers, resolvedSlot, occupiedSlots, updated, updated;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            id = request.params.id;
                            schema = zod_1.z.object({
                                isPrimaryDispatcher: zod_1.z.boolean(),
                                dispatcherSlot: zod_1.z.number().int().min(1).max(2).optional().nullable(),
                            });
                            parsed = schema.safeParse(request.body);
                            if (!parsed.success) {
                                return [2 /*return*/, reply.status(400).send({
                                        success: false,
                                        error: 'البيانات المدخلة غير صالحة',
                                        details: parsed.error.format(),
                                    })];
                            }
                            _a = parsed.data, isPrimaryDispatcher = _a.isPrimaryDispatcher, dispatcherSlot = _a.dispatcherSlot;
                            return [4 /*yield*/, client_1.db
                                    .select()
                                    .from(index_1.whatsappAccounts)
                                    .where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, id))
                                    .limit(1)];
                        case 1:
                            account = (_b.sent())[0];
                            if (!account) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'حساب WhatsApp غير موجود' })];
                            }
                            if (!isPrimaryDispatcher) return [3 /*break*/, 4];
                            return [4 /*yield*/, client_1.db
                                    .select()
                                    .from(index_1.whatsappAccounts)
                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.isPrimaryDispatcher, true), (0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["", " != ", "::uuid"], ["", " != ", "::uuid"])), index_1.whatsappAccounts.id, id)))];
                        case 2:
                            currentDispatchers = _b.sent();
                            if (currentDispatchers.length >= 2) {
                                return [2 /*return*/, reply.status(400).send({
                                        success: false,
                                        error: 'الحد الأقصى للأرقام الأساسية الموزعة هو رقمان فقط (الموزع الأول والموزع الثاني). يرجى إلغاء تعيين أحد الأرقام الموزعة السابقة لتتمكن من تعيين هذا الرقم.',
                                        currentDispatchers: currentDispatchers.map(function (d) { return ({
                                            id: d.id,
                                            displayName: d.displayName,
                                            slot: d.dispatcherSlot,
                                            phoneNumber: d.phoneNumber,
                                        }); }),
                                    })];
                            }
                            resolvedSlot = dispatcherSlot;
                            occupiedSlots = new Set(currentDispatchers.map(function (d) { return d.dispatcherSlot; }));
                            if (!resolvedSlot || occupiedSlots.has(resolvedSlot)) {
                                if (!occupiedSlots.has(1)) {
                                    resolvedSlot = 1;
                                }
                                else if (!occupiedSlots.has(2)) {
                                    resolvedSlot = 2;
                                }
                                else {
                                    resolvedSlot = 1;
                                }
                            }
                            return [4 /*yield*/, client_1.db
                                    .update(index_1.whatsappAccounts)
                                    .set({
                                    isPrimaryDispatcher: true,
                                    dispatcherSlot: resolvedSlot,
                                    updatedAt: new Date(),
                                })
                                    .where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, id))
                                    .returning()];
                        case 3:
                            updated = (_b.sent())[0];
                            ws_hub_1.wsHub.broadcast('whatsapp.dispatcher_updated', {
                                accountId: id,
                                isPrimaryDispatcher: true,
                                dispatcherSlot: resolvedSlot,
                            });
                            return [2 /*return*/, reply.send({
                                    success: true,
                                    message: "\u062A\u0645 \u062A\u0639\u064A\u064A\u0646 \u0627\u0644\u0631\u0642\u0645 \u0643\u0631\u0642\u0645 \u0645\u0648\u0632\u0639 \u0623\u0633\u0627\u0633\u064A (".concat(resolvedSlot === 1 ? 'الموزع الأول' : 'الموزع الثاني', ") \u0628\u0646\u062C\u0627\u062D."),
                                    data: updated,
                                })];
                        case 4: return [4 /*yield*/, client_1.db
                                .update(index_1.whatsappAccounts)
                                .set({
                                isPrimaryDispatcher: false,
                                dispatcherSlot: null,
                                updatedAt: new Date(),
                            })
                                .where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, id))
                                .returning()];
                        case 5:
                            updated = (_b.sent())[0];
                            ws_hub_1.wsHub.broadcast('whatsapp.dispatcher_updated', {
                                accountId: id,
                                isPrimaryDispatcher: false,
                                dispatcherSlot: null,
                            });
                            return [2 /*return*/, reply.send({
                                    success: true,
                                    message: 'تم إلغاء تعيين الرقم كموزع أساسي بنجاح.',
                                    data: updated,
                                })];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
var templateObject_1;
