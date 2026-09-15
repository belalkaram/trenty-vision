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
exports.sessionManager = void 0;
var drizzle_orm_1 = require("drizzle-orm");
var client_1 = require("../../database/client");
var index_1 = require("../../database/schema/index");
var baileys_provider_1 = require("../../providers/whatsapp/baileys.provider");
var ws_hub_1 = require("../../websocket/ws.hub");
var logger_1 = require("../../utils/logger");
var inbound_handler_1 = require("./inbound.handler");
/**
 * WhatsAppSessionManager — Singleton lifecycle manager for all WhatsApp connections.
 *
 * Responsibilities:
 * - Tracks active sessions: Map<accountId, BaileysProvider>
 * - Handles reconnection with exponential backoff
 * - Emits events to WebSocket Hub
 * - On server startup: auto-restores sessions with status 'connected' or 'connecting'
 * - On graceful shutdown: disconnects all active sockets
 */
var WhatsAppSessionManager = /** @class */ (function () {
    function WhatsAppSessionManager() {
        this.sessions = new Map();
        this.connectingLocks = new Set();
    }
    WhatsAppSessionManager.getInstance = function () {
        if (!WhatsAppSessionManager.instance) {
            WhatsAppSessionManager.instance = new WhatsAppSessionManager();
        }
        return WhatsAppSessionManager.instance;
    };
    /**
     * Initialize — restore all previously connected sessions on server startup.
     */
    WhatsAppSessionManager.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var accounts, _i, accounts_1, account, err_1, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logger_1.logger.info('WhatsAppSessionManager: Initializing and restoring sessions...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 10, , 11]);
                        return [4 /*yield*/, client_1.db
                                .select()
                                .from(index_1.whatsappAccounts)
                                .where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.status, 'connected'))];
                    case 2:
                        accounts = _a.sent();
                        logger_1.logger.info({ count: accounts.length }, 'WhatsAppSessionManager: Found accounts to restore');
                        _i = 0, accounts_1 = accounts;
                        _a.label = 3;
                    case 3:
                        if (!(_i < accounts_1.length)) return [3 /*break*/, 9];
                        account = accounts_1[_i];
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 8]);
                        return [4 /*yield*/, this.connectAccount(account.id)];
                    case 5:
                        _a.sent();
                        logger_1.logger.info({ accountId: account.id, displayName: account.displayName }, 'Session restored');
                        return [3 /*break*/, 8];
                    case 6:
                        err_1 = _a.sent();
                        logger_1.logger.error({ accountId: account.id, err: err_1 }, 'Failed to restore session');
                        // Update status to disconnected
                        return [4 /*yield*/, client_1.db
                                .update(index_1.whatsappAccounts)
                                .set({ status: 'disconnected', updatedAt: new Date() })
                                .where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, account.id))];
                    case 7:
                        // Update status to disconnected
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 8:
                        _i++;
                        return [3 /*break*/, 3];
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        err_2 = _a.sent();
                        logger_1.logger.error({ err: err_2 }, 'WhatsAppSessionManager: Failed to initialize');
                        return [3 /*break*/, 11];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Connect a WhatsApp account — creates a new BaileysProvider and starts connection.
     */
    WhatsAppSessionManager.prototype.connectAccount = function (accountId) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, status_1, provider;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Prevent overlapping connection attempts
                        if (this.connectingLocks.has(accountId)) {
                            logger_1.logger.warn({ accountId: accountId }, 'Connection already in progress, skipping duplicate connect');
                            return [2 /*return*/];
                        }
                        this.connectingLocks.add(accountId);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 7, 8]);
                        if (!this.sessions.has(accountId)) return [3 /*break*/, 4];
                        existing = this.sessions.get(accountId);
                        return [4 /*yield*/, existing.getStatus()];
                    case 2:
                        status_1 = _a.sent();
                        if (status_1.status === 'connected' || status_1.status === 'connecting' || status_1.status === 'qr_required') {
                            logger_1.logger.warn({ accountId: accountId }, 'Session already active, skipping duplicate connect');
                            return [2 /*return*/];
                        }
                        // Clean up stale session
                        return [4 /*yield*/, existing.disconnect()];
                    case 3:
                        // Clean up stale session
                        _a.sent();
                        this.sessions.delete(accountId);
                        _a.label = 4;
                    case 4:
                        provider = new baileys_provider_1.BaileysProvider(accountId);
                        // Wire up event listeners to broadcast via WebSocket Hub
                        provider.on('qr', function (accId, qrDataUrl) { return __awaiter(_this, void 0, void 0, function () {
                            var err_3;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        ws_hub_1.wsHub.broadcast('whatsapp.qr', { accountId: accId, qrCode: qrDataUrl });
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, client_1.db
                                                .update(index_1.whatsappAccounts)
                                                .set({
                                                bridgeQrCode: qrDataUrl,
                                                bridgeStatus: 'online',
                                                bridgeLastSeen: new Date(),
                                                updatedAt: new Date(),
                                            })
                                                .where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, accId))];
                                    case 2:
                                        _a.sent();
                                        return [3 /*break*/, 4];
                                    case 3:
                                        err_3 = _a.sent();
                                        logger_1.logger.debug({ accountId: accId, err: err_3 }, 'Failed to persist bridge QR code');
                                        return [3 /*break*/, 4];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); });
                        provider.on('status', function (accId, state) { return __awaiter(_this, void 0, void 0, function () {
                            var updateData, err_4;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        ws_hub_1.wsHub.broadcast('whatsapp.status', __assign({ accountId: accId }, state));
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        updateData = {
                                            status: state.status,
                                            bridgeStatus: 'online',
                                            bridgeLastSeen: new Date(),
                                            updatedAt: new Date(),
                                        };
                                        if (state.phoneNumber)
                                            updateData.phoneNumber = state.phoneNumber;
                                        if (state.jid)
                                            updateData.jid = state.jid;
                                        if (state.deviceName)
                                            updateData.deviceName = state.deviceName;
                                        if (state.status === 'connected') {
                                            updateData.connectedAt = new Date();
                                            updateData.bridgeQrCode = null; // Clear QR code once connected
                                        }
                                        if (state.lastSeenAt)
                                            updateData.lastSeenAt = state.lastSeenAt;
                                        return [4 /*yield*/, client_1.db
                                                .update(index_1.whatsappAccounts)
                                                .set(updateData)
                                                .where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, accId))];
                                    case 2:
                                        _a.sent();
                                        return [3 /*break*/, 4];
                                    case 3:
                                        err_4 = _a.sent();
                                        logger_1.logger.error({ accountId: accId, err: err_4 }, 'Failed to persist WhatsApp status to database');
                                        return [3 /*break*/, 4];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); });
                        provider.on('message', function (accId, message) { return __awaiter(_this, void 0, void 0, function () {
                            var inboundErr_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, (0, inbound_handler_1.handleInboundMessage)(accId, message)];
                                    case 1:
                                        _a.sent();
                                        return [3 /*break*/, 3];
                                    case 2:
                                        inboundErr_1 = _a.sent();
                                        logger_1.logger.error({ accountId: accId, err: inboundErr_1 }, 'Failed to process inbound message in session manager');
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); });
                        provider.on('message.update', function (accId, updates) {
                            ws_hub_1.wsHub.broadcast('message.updated', { accountId: accId, updates: updates });
                        });
                        provider.on('contacts.sync', function (accId, syncList) { return __awaiter(_this, void 0, void 0, function () {
                            var account, contactsTable, validateAndFormatPhone, or, _i, syncList_1, c, rawJid, name_1, digits, phoneValidation, formattedPhone, existing, meta, updateData, syncErr_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 12, , 13]);
                                        if (!Array.isArray(syncList) || syncList.length === 0)
                                            return [2 /*return*/];
                                        return [4 /*yield*/, client_1.db
                                                .select({ companyId: index_1.whatsappAccounts.companyId })
                                                .from(index_1.whatsappAccounts)
                                                .where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, accId))
                                                .limit(1)];
                                    case 1:
                                        account = (_a.sent())[0];
                                        if (!account)
                                            return [2 /*return*/];
                                        return [4 /*yield*/, Promise.resolve().then(function () { return require('../../database/schema/index'); })];
                                    case 2:
                                        contactsTable = (_a.sent()).contacts;
                                        return [4 /*yield*/, Promise.resolve().then(function () { return require('../../utils/phone.validator'); })];
                                    case 3:
                                        validateAndFormatPhone = (_a.sent()).validateAndFormatPhone;
                                        return [4 /*yield*/, Promise.resolve().then(function () { return require('drizzle-orm'); })];
                                    case 4:
                                        or = (_a.sent()).or;
                                        _i = 0, syncList_1 = syncList;
                                        _a.label = 5;
                                    case 5:
                                        if (!(_i < syncList_1.length)) return [3 /*break*/, 11];
                                        c = syncList_1[_i];
                                        rawJid = c.id || '';
                                        if (!rawJid || rawJid.includes('@g.us') || rawJid === 'status@broadcast')
                                            return [3 /*break*/, 10];
                                        name_1 = c.name || c.notify || c.verifiedName;
                                        digits = rawJid.split('@')[0].split(':')[0];
                                        phoneValidation = validateAndFormatPhone(digits);
                                        if (!phoneValidation.isValid)
                                            return [3 /*break*/, 10];
                                        formattedPhone = phoneValidation.formatted;
                                        return [4 /*yield*/, client_1.db
                                                .select()
                                                .from(contactsTable)
                                                .where(or((0, drizzle_orm_1.eq)(contactsTable.phoneNumber, formattedPhone), (0, drizzle_orm_1.eq)(contactsTable.whatsappJid, rawJid)))
                                                .limit(1)];
                                    case 6:
                                        existing = (_a.sent())[0];
                                        if (!existing) return [3 /*break*/, 8];
                                        meta = (existing.metadata || {});
                                        updateData = {
                                            metadata: __assign(__assign({}, meta), { isSavedOnPhone: true, phoneBookName: name_1 || meta.phoneBookName }),
                                            updatedAt: new Date(),
                                        };
                                        if (name_1 && (existing.name === existing.phoneNumber || !existing.name)) {
                                            updateData.name = name_1;
                                        }
                                        return [4 /*yield*/, client_1.db.update(contactsTable).set(updateData).where((0, drizzle_orm_1.eq)(contactsTable.id, existing.id))];
                                    case 7:
                                        _a.sent();
                                        return [3 /*break*/, 10];
                                    case 8:
                                        if (!name_1) return [3 /*break*/, 10];
                                        // Create contact if it has an address book name from the phone
                                        return [4 /*yield*/, client_1.db.insert(contactsTable).values({
                                                companyId: account.companyId,
                                                name: name_1,
                                                phoneNumber: formattedPhone,
                                                whatsappJid: rawJid,
                                                source: 'phone_address_book',
                                                metadata: { isSavedOnPhone: true, phoneBookName: name_1 },
                                            })];
                                    case 9:
                                        // Create contact if it has an address book name from the phone
                                        _a.sent();
                                        _a.label = 10;
                                    case 10:
                                        _i++;
                                        return [3 /*break*/, 5];
                                    case 11: return [3 /*break*/, 13];
                                    case 12:
                                        syncErr_1 = _a.sent();
                                        logger_1.logger.debug({ accountId: accId, err: syncErr_1 }, 'Error syncing address book contacts');
                                        return [3 /*break*/, 13];
                                    case 13: return [2 /*return*/];
                                }
                            });
                        }); });
                        this.sessions.set(accountId, provider);
                        // Update database status
                        return [4 /*yield*/, client_1.db
                                .update(index_1.whatsappAccounts)
                                .set({ status: 'initializing', updatedAt: new Date() })
                                .where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, accountId))];
                    case 5:
                        // Update database status
                        _a.sent();
                        // Start connection
                        return [4 /*yield*/, provider.connect()];
                    case 6:
                        // Start connection
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        this.connectingLocks.delete(accountId);
                        return [7 /*endfinally*/];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Disconnect a WhatsApp account (keeps auth state for reconnect).
     */
    WhatsAppSessionManager.prototype.disconnectAccount = function (accountId) {
        return __awaiter(this, void 0, void 0, function () {
            var provider;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        provider = this.sessions.get(accountId);
                        if (!provider) {
                            logger_1.logger.warn({ accountId: accountId }, 'No active session to disconnect');
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, provider.disconnect()];
                    case 1:
                        _a.sent();
                        this.sessions.delete(accountId);
                        return [4 /*yield*/, client_1.db
                                .update(index_1.whatsappAccounts)
                                .set({ status: 'disconnected', updatedAt: new Date() })
                                .where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, accountId))];
                    case 2:
                        _a.sent();
                        logger_1.logger.info({ accountId: accountId }, 'WhatsApp account disconnected');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Logout a WhatsApp account (clears auth state, requires new QR scan).
     */
    WhatsAppSessionManager.prototype.logoutAccount = function (accountId) {
        return __awaiter(this, void 0, void 0, function () {
            var provider, err_5, path, fs, sessionDir, err_6, _a, authKeysTable, sessionsTable, err_7;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        provider = this.sessions.get(accountId);
                        if (!provider) return [3 /*break*/, 5];
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, provider.logout()];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_5 = _b.sent();
                        logger_1.logger.warn({ accountId: accountId, err: err_5 }, 'Error during provider.logout()');
                        return [3 /*break*/, 4];
                    case 4:
                        this.sessions.delete(accountId);
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 9, , 10]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('path'); })];
                    case 6:
                        path = _b.sent();
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('fs/promises'); })];
                    case 7:
                        fs = _b.sent();
                        sessionDir = path.join(process.cwd(), 'storage', 'whatsapp_sessions', accountId);
                        return [4 /*yield*/, fs.rm(sessionDir, { recursive: true, force: true })];
                    case 8:
                        _b.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        err_6 = _b.sent();
                        logger_1.logger.warn({ accountId: accountId, err: err_6 }, 'Failed to remove local session dir');
                        return [3 /*break*/, 10];
                    case 10:
                        _b.trys.push([10, 14, , 15]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('../../database/schema/index'); })];
                    case 11:
                        _a = _b.sent(), authKeysTable = _a.whatsappAuthKeys, sessionsTable = _a.whatsappSessions;
                        return [4 /*yield*/, client_1.db.delete(authKeysTable).where((0, drizzle_orm_1.eq)(authKeysTable.accountId, accountId))];
                    case 12:
                        _b.sent();
                        return [4 /*yield*/, client_1.db
                                .update(sessionsTable)
                                .set({
                                encryptedAuthState: null,
                                qrCode: null,
                                updatedAt: new Date(),
                            })
                                .where((0, drizzle_orm_1.eq)(sessionsTable.accountId, accountId))];
                    case 13:
                        _b.sent();
                        return [3 /*break*/, 15];
                    case 14:
                        err_7 = _b.sent();
                        logger_1.logger.warn({ accountId: accountId, err: err_7 }, 'Failed to clear auth tables in PostgreSQL');
                        return [3 /*break*/, 15];
                    case 15: return [4 /*yield*/, client_1.db
                            .update(index_1.whatsappAccounts)
                            .set({
                            status: 'disconnected',
                            phoneNumber: null,
                            jid: null,
                            deviceName: null,
                            connectedAt: null,
                            updatedAt: new Date(),
                        })
                            .where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, accountId))];
                    case 16:
                        _b.sent();
                        ws_hub_1.wsHub.broadcast('whatsapp.status', {
                            accountId: accountId,
                            status: 'disconnected',
                        });
                        logger_1.logger.info({ accountId: accountId }, 'WhatsApp account logged out and auth state wiped');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Reset an account: complete wipe and clean re-initialization
     */
    WhatsAppSessionManager.prototype.resetAccount = function (accountId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.logoutAccount(accountId)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.connectAccount(accountId)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Reconnect a disconnected account.
     */
    WhatsAppSessionManager.prototype.reconnectAccount = function (accountId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.disconnectAccount(accountId)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.connectAccount(accountId)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Restart an account completely (alias for reconnect).
     */
    WhatsAppSessionManager.prototype.restartAccount = function (accountId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.reconnectAccount(accountId)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Request pairing code for an account using phone number.
     */
    WhatsAppSessionManager.prototype.requestPairingCode = function (accountId, phoneNumber) {
        return __awaiter(this, void 0, void 0, function () {
            var provider;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        provider = this.sessions.get(accountId);
                        if (!!provider) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.connectAccount(accountId)];
                    case 1:
                        _a.sent();
                        provider = this.sessions.get(accountId);
                        _a.label = 2;
                    case 2:
                        if (!provider) {
                            throw new Error('Failed to create or find session for account ' + accountId);
                        }
                        return [4 /*yield*/, provider.requestPairingCode(phoneNumber)];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Get the current pairing code for an account.
     */
    WhatsAppSessionManager.prototype.getPairingCode = function (accountId) {
        return __awaiter(this, void 0, void 0, function () {
            var provider;
            return __generator(this, function (_a) {
                provider = this.sessions.get(accountId);
                if (provider) {
                    return [2 /*return*/, provider.getPairingCode()];
                }
                return [2 /*return*/, null];
            });
        });
    };
    /**
     * Get the current connection status for an account.
     */
    WhatsAppSessionManager.prototype.getAccountStatus = function (accountId) {
        return __awaiter(this, void 0, void 0, function () {
            var provider;
            return __generator(this, function (_a) {
                provider = this.sessions.get(accountId);
                if (provider) {
                    return [2 /*return*/, provider.getStatus()];
                }
                return [2 /*return*/, { status: 'disconnected' }];
            });
        });
    };
    /**
     * Delete a WhatsApp account permanently (logout + DB erase).
     */
    WhatsAppSessionManager.prototype.deleteAccount = function (accountId) {
        return __awaiter(this, void 0, void 0, function () {
            var e_1, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logger_1.logger.info({ accountId: accountId }, 'WhatsAppSessionManager: Deleting account permanently');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.logoutAccount(accountId)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        logger_1.logger.warn({ accountId: accountId, e: e_1 }, 'Logout failed during delete, forcing deletion anyway');
                        return [3 /*break*/, 4];
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, client_1.db.delete(index_1.whatsappAccounts).where((0, drizzle_orm_1.eq)(index_1.whatsappAccounts.id, accountId))];
                    case 5:
                        _a.sent();
                        logger_1.logger.info({ accountId: accountId }, 'Account deleted from postgres');
                        return [3 /*break*/, 7];
                    case 6:
                        e_2 = _a.sent();
                        logger_1.logger.error({ accountId: accountId, e: e_2 }, 'Failed to delete account from postgres');
                        throw e_2;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get the current QR code for an account.
     */
    WhatsAppSessionManager.prototype.getQRCode = function (accountId) {
        return __awaiter(this, void 0, void 0, function () {
            var provider;
            return __generator(this, function (_a) {
                provider = this.sessions.get(accountId);
                if (provider) {
                    return [2 /*return*/, provider.getQRCode()];
                }
                return [2 /*return*/, null];
            });
        });
    };
    /**
     * Get the BaileysProvider instance for sending messages.
     */
    WhatsAppSessionManager.prototype.getProvider = function (accountId) {
        return this.sessions.get(accountId);
    };
    /**
     * Get all active sessions.
     */
    WhatsAppSessionManager.prototype.getActiveSessions = function () {
        return this.sessions;
    };
    /**
     * Graceful shutdown — disconnect all active sessions cleanly.
     */
    WhatsAppSessionManager.prototype.shutdown = function () {
        return __awaiter(this, void 0, void 0, function () {
            var promises, _loop_1, _i, _a, _b, accountId, provider;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        logger_1.logger.info({ activeSessions: this.sessions.size }, 'WhatsAppSessionManager: Shutting down...');
                        promises = [];
                        _loop_1 = function (accountId, provider) {
                            promises.push(provider.disconnect().catch(function (err) {
                                logger_1.logger.error({ accountId: accountId, err: err }, 'Error disconnecting session during shutdown');
                            }));
                        };
                        for (_i = 0, _a = this.sessions; _i < _a.length; _i++) {
                            _b = _a[_i], accountId = _b[0], provider = _b[1];
                            _loop_1(accountId, provider);
                        }
                        return [4 /*yield*/, Promise.allSettled(promises)];
                    case 1:
                        _c.sent();
                        this.sessions.clear();
                        logger_1.logger.info('WhatsAppSessionManager: All sessions disconnected');
                        return [2 /*return*/];
                }
            });
        });
    };
    return WhatsAppSessionManager;
}());
exports.sessionManager = WhatsAppSessionManager.getInstance();
