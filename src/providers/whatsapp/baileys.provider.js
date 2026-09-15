"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.BaileysProvider = void 0;
var baileys_1 = require("@whiskeysockets/baileys");
var QRCode = require("qrcode");
var events_1 = require("events");
var path_1 = require("path");
var promises_1 = require("fs/promises");
var logger_1 = require("../../utils/logger");
/**
 * BaileysProvider — Full WhatsApp provider implementation wrapping Baileys.
 * Uses high-performance local multi-file auth state (storage/whatsapp_sessions/<id>)
 * for zero-latency cryptographic key operations and rock-solid connection stability.
 */
var BaileysProvider = /** @class */ (function (_super) {
    __extends(BaileysProvider, _super);
    function BaileysProvider(accountId) {
        var _this = _super.call(this) || this;
        _this.sock = null;
        _this.state = { status: 'disconnected' };
        _this.reconnectAttempt = 0;
        _this.maxReconnectAttempts = 3;
        _this.saveCreds = null;
        _this.clearAuthState = null;
        _this.isReconnecting = false;
        _this.isShuttingDown = false;
        _this.accountId = accountId;
        _this.sessionDir = path_1.default.join(process.cwd(), 'storage', 'whatsapp_sessions', accountId);
        return _this;
    }
    Object.defineProperty(BaileysProvider.prototype, "connectionState", {
        get: function () {
            return __assign({}, this.state);
        },
        enumerable: false,
        configurable: true
    });
    BaileysProvider.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, authState, saveCreds, version, err_1;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (this.sock && this.state.status === 'connected') {
                            logger_1.logger.warn({ accountId: this.accountId }, 'Already connected, skipping connect()');
                            return [2 /*return*/];
                        }
                        this.isShuttingDown = false;
                        this.updateState({ status: 'initializing', error: undefined });
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 5, , 6]);
                        // Ensure local session storage directory exists
                        return [4 /*yield*/, promises_1.default.mkdir(this.sessionDir, { recursive: true })];
                    case 2:
                        // Ensure local session storage directory exists
                        _b.sent();
                        return [4 /*yield*/, (0, baileys_1.useMultiFileAuthState)(this.sessionDir)];
                    case 3:
                        _a = _b.sent(), authState = _a.state, saveCreds = _a.saveCreds;
                        this.saveCreds = saveCreds;
                        this.clearAuthState = function () { return __awaiter(_this, void 0, void 0, function () {
                            var err_2;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, promises_1.default.rm(this.sessionDir, { recursive: true, force: true })];
                                    case 1:
                                        _a.sent();
                                        logger_1.logger.info({ accountId: this.accountId }, 'Local session files purged');
                                        return [3 /*break*/, 3];
                                    case 2:
                                        err_2 = _a.sent();
                                        logger_1.logger.warn({ accountId: this.accountId, err: err_2 }, 'Failed to clear local session files');
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); };
                        return [4 /*yield*/, (0, baileys_1.fetchLatestBaileysVersion)()];
                    case 4:
                        version = (_b.sent()).version;
                        logger_1.logger.info({ accountId: this.accountId, version: version }, 'Fetched latest Baileys version');
                        this.sock = (0, baileys_1.default)({
                            version: version,
                            auth: {
                                creds: authState.creds,
                                keys: (0, baileys_1.makeCacheableSignalKeyStore)(authState.keys, logger_1.logger),
                            },
                            printQRInTerminal: false,
                            generateHighQualityLinkPreview: false,
                            logger: logger_1.logger,
                            markOnlineOnConnect: true,
                            syncFullHistory: false,
                            browser: ['Trenty Vision CRM', 'Chrome', '1.0.0'],
                        });
                        this.registerEventHandlers(this.sock.ev);
                        return [3 /*break*/, 6];
                    case 5:
                        err_1 = _b.sent();
                        logger_1.logger.error({ accountId: this.accountId, err: err_1 }, 'Failed to initialize Baileys socket');
                        this.updateState({ status: 'error', error: err_1.message });
                        throw err_1;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    BaileysProvider.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.isShuttingDown = true;
                if (this.sock) {
                    try {
                        this.sock.end(undefined);
                        this.sock = null;
                    }
                    catch (err) {
                        logger_1.logger.warn({ accountId: this.accountId, err: err }, 'Error during disconnect');
                    }
                }
                this.updateState({ status: 'disconnected' });
                this.reconnectAttempt = 0;
                return [2 /*return*/];
            });
        });
    };
    BaileysProvider.prototype.logout = function () {
        return __awaiter(this, void 0, void 0, function () {
            var err_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.isShuttingDown = true;
                        if (!this.sock) return [3 /*break*/, 5];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.sock.logout()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_3 = _a.sent();
                        logger_1.logger.warn({ accountId: this.accountId, err: err_3 }, 'Error during logout');
                        return [3 /*break*/, 4];
                    case 4:
                        this.sock = null;
                        _a.label = 5;
                    case 5:
                        if (!this.clearAuthState) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.clearAuthState()];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7:
                        this.updateState({ status: 'logged_out', error: undefined });
                        this.reconnectAttempt = 0;
                        return [2 /*return*/];
                }
            });
        });
    };
    BaileysProvider.prototype.getStatus = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.connectionState];
            });
        });
    };
    BaileysProvider.prototype.getQRCode = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.state.qrCode || null];
            });
        });
    };
    BaileysProvider.prototype.getPairingCode = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.state.pairingCode || null];
            });
        });
    };
    /**
     * Request an 8-character pairing code to link phone via phone number
     */
    BaileysProvider.prototype.requestPairingCode = function (phoneNumber) {
        return __awaiter(this, void 0, void 0, function () {
            var cleanNumber, isSocketOpen, code, err_4, activeSock, code, retryErr_1;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (this.state.status === 'connected') {
                            throw new Error('حساب WhatsApp متصل ومقترن بالفعل. إذا كنت ترغب في ربط رقم جديد، يرجى تسجيل الخروج أولاً.');
                        }
                        cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
                        // Strip leading zero if typed after common country codes (e.g. 96605... -> 9665..., 2001... -> 201...)
                        cleanNumber = cleanNumber.replace(/^(966|965|971|974|968|973|962|20)0+/, '$1');
                        if (!cleanNumber || cleanNumber.length < 8) {
                            throw new Error('رقم الهاتف غير صالح لطلب كود الاقتران. يرجى إدخال الرقم مع رمز الدولة (مثل: 9665XXXXXXXX أو 201XXXXXXXXX)');
                        }
                        isSocketOpen = (_b = (_a = this.sock) === null || _a === void 0 ? void 0 : _a.ws) === null || _b === void 0 ? void 0 : _b.isOpen;
                        if (!(!this.sock || !isSocketOpen)) return [3 /*break*/, 2];
                        logger_1.logger.info({ accountId: this.accountId }, 'Socket not currently open for pairing code, preparing fresh connection...');
                        if (this.sock) {
                            try {
                                this.sock.end(undefined);
                            }
                            catch ( /* ignore */_d) { /* ignore */ }
                            this.sock = null;
                        }
                        return [4 /*yield*/, this.connect()];
                    case 1:
                        _c.sent();
                        _c.label = 2;
                    case 2:
                        if (!this.sock) {
                            throw new Error('تعذر تهيئة مقبس WhatsApp');
                        }
                        _c.label = 3;
                    case 3:
                        _c.trys.push([3, 8, , 17]);
                        if (!(typeof this.sock.waitForSocketOpen === 'function')) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.sock.waitForSocketOpen()];
                    case 4:
                        _c.sent();
                        _c.label = 5;
                    case 5: return [4 /*yield*/, (0, baileys_1.delay)(1500)];
                    case 6:
                        _c.sent();
                        return [4 /*yield*/, this.sock.requestPairingCode(cleanNumber)];
                    case 7:
                        code = _c.sent();
                        this.updateState({ status: 'qr_required', pairingCode: code });
                        logger_1.logger.info({ accountId: this.accountId, code: code, cleanNumber: cleanNumber }, 'Pairing code generated successfully');
                        return [2 /*return*/, code];
                    case 8:
                        err_4 = _c.sent();
                        logger_1.logger.warn({ accountId: this.accountId, err: err_4 === null || err_4 === void 0 ? void 0 : err_4.message }, 'First pairing code attempt failed, retrying with fresh socket...');
                        _c.label = 9;
                    case 9:
                        _c.trys.push([9, 15, , 16]);
                        if (this.sock) {
                            try {
                                this.sock.end(undefined);
                            }
                            catch ( /* ignore */_e) { /* ignore */ }
                            this.sock = null;
                        }
                        return [4 /*yield*/, this.connect()];
                    case 10:
                        _c.sent();
                        if (!(typeof this.sock.waitForSocketOpen === 'function')) return [3 /*break*/, 12];
                        return [4 /*yield*/, this.sock.waitForSocketOpen()];
                    case 11:
                        _c.sent();
                        _c.label = 12;
                    case 12: return [4 /*yield*/, (0, baileys_1.delay)(2000)];
                    case 13:
                        _c.sent();
                        activeSock = this.sock;
                        if (!activeSock) {
                            throw new Error('تعذر إعادة تهيئة مقبس WhatsApp');
                        }
                        return [4 /*yield*/, activeSock.requestPairingCode(cleanNumber)];
                    case 14:
                        code = _c.sent();
                        this.updateState({ status: 'qr_required', pairingCode: code });
                        logger_1.logger.info({ accountId: this.accountId, code: code, cleanNumber: cleanNumber }, 'Pairing code generated on retry');
                        return [2 /*return*/, code];
                    case 15:
                        retryErr_1 = _c.sent();
                        logger_1.logger.error({ accountId: this.accountId, retryErr: retryErr_1 }, 'Failed to request pairing code from Baileys after retry');
                        throw new Error((retryErr_1 === null || retryErr_1 === void 0 ? void 0 : retryErr_1.message) || 'فشل طلب رمز الاقتران من خوادم WhatsApp. تأكد من أن الرقم صحيح وغير مقترن بجهاز آخر.');
                    case 16: return [3 /*break*/, 17];
                    case 17: return [2 /*return*/];
                }
            });
        });
    };
    // ─── Messaging Methods ─────────────────────────────────
    BaileysProvider.prototype.sendText = function (toJid, text, options) {
        return __awaiter(this, void 0, void 0, function () {
            var content, result;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.ensureConnected();
                        content = { text: text };
                        if (options === null || options === void 0 ? void 0 : options.quotedMessageId) {
                            // Quote is handled at a higher level if needed
                        }
                        return [4 /*yield*/, this.sock.sendMessage(toJid, content)];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, {
                                id: ((_a = result === null || result === void 0 ? void 0 : result.key) === null || _a === void 0 ? void 0 : _a.id) || "msg_".concat(Date.now()),
                                timestamp: new Date(((result === null || result === void 0 ? void 0 : result.messageTimestamp) || Math.floor(Date.now() / 1000)) * 1000),
                            }];
                }
            });
        });
    };
    BaileysProvider.prototype.sendImage = function (toJid, buffer, mimeType, options) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.ensureConnected();
                        return [4 /*yield*/, this.sock.sendMessage(toJid, {
                                image: buffer,
                                mimetype: mimeType,
                                caption: options === null || options === void 0 ? void 0 : options.caption,
                            })];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, {
                                id: ((_a = result === null || result === void 0 ? void 0 : result.key) === null || _a === void 0 ? void 0 : _a.id) || "img_".concat(Date.now()),
                                timestamp: new Date(((result === null || result === void 0 ? void 0 : result.messageTimestamp) || Math.floor(Date.now() / 1000)) * 1000),
                            }];
                }
            });
        });
    };
    BaileysProvider.prototype.sendVideo = function (toJid, buffer, mimeType, options) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.ensureConnected();
                        return [4 /*yield*/, this.sock.sendMessage(toJid, {
                                video: buffer,
                                mimetype: mimeType,
                                caption: options === null || options === void 0 ? void 0 : options.caption,
                            })];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, {
                                id: ((_a = result === null || result === void 0 ? void 0 : result.key) === null || _a === void 0 ? void 0 : _a.id) || "vid_".concat(Date.now()),
                                timestamp: new Date(((result === null || result === void 0 ? void 0 : result.messageTimestamp) || Math.floor(Date.now() / 1000)) * 1000),
                            }];
                }
            });
        });
    };
    BaileysProvider.prototype.sendAudio = function (toJid_1, buffer_1) {
        return __awaiter(this, arguments, void 0, function (toJid, buffer, isVoiceNote, options) {
            var result;
            var _a;
            if (isVoiceNote === void 0) { isVoiceNote = false; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.ensureConnected();
                        return [4 /*yield*/, this.sock.sendMessage(toJid, {
                                audio: buffer,
                                mimetype: 'audio/ogg; codecs=opus',
                                ptt: isVoiceNote,
                            })];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, {
                                id: ((_a = result === null || result === void 0 ? void 0 : result.key) === null || _a === void 0 ? void 0 : _a.id) || "aud_".concat(Date.now()),
                                timestamp: new Date(((result === null || result === void 0 ? void 0 : result.messageTimestamp) || Math.floor(Date.now() / 1000)) * 1000),
                            }];
                }
            });
        });
    };
    BaileysProvider.prototype.sendDocument = function (toJid, buffer, fileName, mimeType, options) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.ensureConnected();
                        return [4 /*yield*/, this.sock.sendMessage(toJid, {
                                document: buffer,
                                mimetype: mimeType,
                                fileName: fileName,
                                caption: options === null || options === void 0 ? void 0 : options.caption,
                            })];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, {
                                id: ((_a = result === null || result === void 0 ? void 0 : result.key) === null || _a === void 0 ? void 0 : _a.id) || "doc_".concat(Date.now()),
                                timestamp: new Date(((result === null || result === void 0 ? void 0 : result.messageTimestamp) || Math.floor(Date.now() / 1000)) * 1000),
                            }];
                }
            });
        });
    };
    BaileysProvider.prototype.sendLocation = function (toJid, latitude, longitude, name, address) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.ensureConnected();
                        return [4 /*yield*/, this.sock.sendMessage(toJid, {
                                location: {
                                    degreesLatitude: latitude,
                                    degreesLongitude: longitude,
                                    name: name,
                                    address: address,
                                },
                            })];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, {
                                id: ((_a = result === null || result === void 0 ? void 0 : result.key) === null || _a === void 0 ? void 0 : _a.id) || "loc_".concat(Date.now()),
                                timestamp: new Date(((result === null || result === void 0 ? void 0 : result.messageTimestamp) || Math.floor(Date.now() / 1000)) * 1000),
                            }];
                }
            });
        });
    };
    BaileysProvider.prototype.sendContact = function (toJid, contactJid, displayName) {
        return __awaiter(this, void 0, void 0, function () {
            var vcard, result;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.ensureConnected();
                        vcard = "BEGIN:VCARD\nVERSION:3.0\nFN:".concat(displayName, "\nTEL;type=CELL;type=VOICE;waid=").concat(contactJid.split('@')[0], ":+").concat(contactJid.split('@')[0], "\nEND:VCARD");
                        return [4 /*yield*/, this.sock.sendMessage(toJid, {
                                contacts: {
                                    displayName: displayName,
                                    contacts: [{ vcard: vcard }],
                                },
                            })];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, {
                                id: ((_a = result === null || result === void 0 ? void 0 : result.key) === null || _a === void 0 ? void 0 : _a.id) || "cnt_".concat(Date.now()),
                                timestamp: new Date(((result === null || result === void 0 ? void 0 : result.messageTimestamp) || Math.floor(Date.now() / 1000)) * 1000),
                            }];
                }
            });
        });
    };
    BaileysProvider.prototype.sendReaction = function (toJid, messageId, emoji) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.ensureConnected();
                        return [4 /*yield*/, this.sock.sendMessage(toJid, {
                                react: { text: emoji, key: { remoteJid: toJid, id: messageId } },
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    BaileysProvider.prototype.markRead = function (jid, messageIds) {
        return __awaiter(this, void 0, void 0, function () {
            var keys;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.ensureConnected();
                        keys = messageIds.map(function (id) { return ({
                            remoteJid: jid,
                            id: id,
                        }); });
                        return [4 /*yield*/, this.sock.readMessages(keys)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    BaileysProvider.prototype.sendTyping = function (jid, isTyping) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.ensureConnected();
                        return [4 /*yield*/, this.sock.sendPresenceUpdate(isTyping ? 'composing' : 'paused', jid)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Resolves a WhatsApp LID (e.g. 6073184461040) to its real phone number
     */
    BaileysProvider.prototype.getPhoneNumberForLid = function (lid) {
        return __awaiter(this, void 0, void 0, function () {
            var cleanLid, reverseFilePath, fileContent, parsed, _a, signalRepo, pn, err_5;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 7, , 8]);
                        cleanLid = lid.replace(/[^0-9]/g, '');
                        if (!cleanLid)
                            return [2 /*return*/, null];
                        reverseFilePath = path_1.default.join(this.sessionDir, "lid-mapping-".concat(cleanLid, "_reverse.json"));
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, promises_1.default.readFile(reverseFilePath, 'utf-8')];
                    case 2:
                        fileContent = _d.sent();
                        parsed = JSON.parse(fileContent.trim());
                        if (parsed && typeof parsed === 'string') {
                            return [2 /*return*/, parsed.replace(/\D/g, '')];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _d.sent();
                        return [3 /*break*/, 4];
                    case 4:
                        signalRepo = (_b = this.sock) === null || _b === void 0 ? void 0 : _b.signalRepository;
                        if (!((_c = signalRepo === null || signalRepo === void 0 ? void 0 : signalRepo.lidMapping) === null || _c === void 0 ? void 0 : _c.getPNForLID)) return [3 /*break*/, 6];
                        return [4 /*yield*/, signalRepo.lidMapping.getPNForLID(cleanLid)];
                    case 5:
                        pn = _d.sent();
                        if (pn)
                            return [2 /*return*/, String(pn).replace(/\D/g, '')];
                        _d.label = 6;
                    case 6: return [2 /*return*/, null];
                    case 7:
                        err_5 = _d.sent();
                        logger_1.logger.debug({ accountId: this.accountId, lid: lid, err: err_5 }, 'Failed to resolve LID to PN');
                        return [2 /*return*/, null];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    // ─── Private Methods ───────────────────────────────────
    BaileysProvider.prototype.ensureConnected = function () {
        if (!this.sock || this.state.status !== 'connected') {
            throw new Error("WhatsApp account ".concat(this.accountId, " is not connected"));
        }
    };
    BaileysProvider.prototype.updateState = function (partial) {
        this.state = __assign(__assign({}, this.state), partial);
        this.emit('status', this.accountId, this.connectionState);
    };
    BaileysProvider.prototype.registerEventHandlers = function (ev) {
        var _this = this;
        // Credentials update
        ev.on('creds.update', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.saveCreds) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.saveCreds()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        }); });
        // Connection update
        ev.on('connection.update', function (update) { return __awaiter(_this, void 0, void 0, function () {
            var connection, lastDisconnect, qr, qrDataUrl, err_6, statusCode, isLoggedOut, shouldReconnect, errorMsg, phoneNumber, jid, deviceName;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            return __generator(this, function (_o) {
                switch (_o.label) {
                    case 0:
                        connection = update.connection, lastDisconnect = update.lastDisconnect, qr = update.qr;
                        if (!qr) return [3 /*break*/, 4];
                        _o.label = 1;
                    case 1:
                        _o.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, QRCode.toDataURL(qr, {
                                width: 300,
                                margin: 2,
                                color: { dark: '#000000', light: '#FFFFFF' },
                            })];
                    case 2:
                        qrDataUrl = _o.sent();
                        this.updateState({ status: 'qr_required', qrCode: qrDataUrl });
                        this.emit('qr', this.accountId, qrDataUrl);
                        logger_1.logger.info({ accountId: this.accountId }, 'QR code generated, waiting for scan');
                        return [3 /*break*/, 4];
                    case 3:
                        err_6 = _o.sent();
                        logger_1.logger.error({ accountId: this.accountId, err: err_6 }, 'Failed to generate QR code');
                        return [3 /*break*/, 4];
                    case 4:
                        if (!(connection === 'close')) return [3 /*break*/, 8];
                        statusCode = (_b = (_a = lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode;
                        isLoggedOut = statusCode === baileys_1.DisconnectReason.loggedOut;
                        shouldReconnect = !isLoggedOut && statusCode !== 403;
                        errorMsg = 'انقطع الاتصال بمقبس WhatsApp';
                        if (statusCode === baileys_1.DisconnectReason.loggedOut) {
                            errorMsg = 'تم تسجيل الخروج من تطبيق WhatsApp على هاتفك. يلزم مسح رمز QR جديد للاتصال.';
                        }
                        else if (statusCode === baileys_1.DisconnectReason.timedOut) {
                            errorMsg = 'انتهت صلاحية رمز الاستجابة السريعة (QR) أو انقطعت مهلة المقبس.';
                        }
                        else if (statusCode === baileys_1.DisconnectReason.connectionReplaced) {
                            errorMsg = 'تم تسجيل الدخول إلى هذا الحساب من جهاز أو متصفح آخر.';
                        }
                        else if (statusCode === baileys_1.DisconnectReason.restartRequired) {
                            errorMsg = 'جاري إعادة تشغيل الجلسة لتطبيق المفاتيح المشفرة.';
                        }
                        logger_1.logger.info({ accountId: this.accountId, statusCode: statusCode, shouldReconnect: shouldReconnect, errorMsg: errorMsg }, 'WhatsApp connection closed');
                        if (!isLoggedOut) return [3 /*break*/, 7];
                        // Logged out — clear auth state, do NOT reconnect
                        this.updateState({ status: 'logged_out', error: errorMsg });
                        if (!this.clearAuthState) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.clearAuthState()];
                    case 5:
                        _o.sent();
                        _o.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        if (shouldReconnect && !this.isShuttingDown) {
                            // Auto-reconnect with exponential backoff (max 3 times)
                            this.scheduleReconnect();
                        }
                        else {
                            this.updateState({ status: 'disconnected', error: errorMsg });
                        }
                        _o.label = 8;
                    case 8:
                        if (connection === 'open') {
                            phoneNumber = ((_e = (_d = (_c = this.sock) === null || _c === void 0 ? void 0 : _c.user) === null || _d === void 0 ? void 0 : _d.id) === null || _e === void 0 ? void 0 : _e.split(':')[0]) || ((_h = (_g = (_f = this.sock) === null || _f === void 0 ? void 0 : _f.user) === null || _g === void 0 ? void 0 : _g.id) === null || _h === void 0 ? void 0 : _h.split('@')[0]) || '';
                            jid = ((_k = (_j = this.sock) === null || _j === void 0 ? void 0 : _j.user) === null || _k === void 0 ? void 0 : _k.id) || '';
                            deviceName = ((_m = (_l = this.sock) === null || _l === void 0 ? void 0 : _l.user) === null || _m === void 0 ? void 0 : _m.name) || 'Unknown';
                            this.reconnectAttempt = 0;
                            this.isReconnecting = false;
                            this.updateState({
                                status: 'connected',
                                qrCode: undefined,
                                phoneNumber: "+".concat(phoneNumber),
                                jid: jid,
                                deviceName: deviceName,
                                lastSeenAt: new Date(),
                                error: undefined,
                            });
                            logger_1.logger.info({ accountId: this.accountId, phoneNumber: phoneNumber, jid: jid, deviceName: deviceName }, 'WhatsApp connected successfully');
                        }
                        return [2 /*return*/];
                }
            });
        }); });
        // Inbound & synced messages
        ev.on('messages.upsert', function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var _i, msgs_1, msg;
            var msgs = _b.messages, type = _b.type;
            return __generator(this, function (_c) {
                for (_i = 0, msgs_1 = msgs; _i < msgs_1.length; _i++) {
                    msg = msgs_1[_i];
                    if (!msg.key.remoteJid)
                        continue;
                    if (msg.key.remoteJid === 'status@broadcast')
                        continue;
                    this.emit('message', this.accountId, msg);
                    logger_1.logger.debug({ accountId: this.accountId, from: msg.key.remoteJid, messageId: msg.key.id, type: type }, 'WhatsApp message received / upserted');
                }
                return [2 /*return*/];
            });
        }); });
        // Message status updates (delivered, read, etc.)
        ev.on('messages.update', function (updates) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.emit('message.update', this.accountId, updates);
                return [2 /*return*/];
            });
        }); });
        // Synced contacts from phone address book
        ev.on('contacts.upsert', function (newContacts) {
            _this.emit('contacts.sync', _this.accountId, newContacts);
        });
        ev.on('contacts.set', function (_a) {
            var setContacts = _a.contacts;
            _this.emit('contacts.sync', _this.accountId, setContacts);
        });
        ev.on('contacts.update', function (updatedContacts) {
            _this.emit('contacts.sync', _this.accountId, updatedContacts);
        });
    };
    BaileysProvider.prototype.scheduleReconnect = function () {
        var _this = this;
        if (this.isReconnecting || this.isShuttingDown)
            return;
        if (this.reconnectAttempt >= this.maxReconnectAttempts) {
            logger_1.logger.warn({ accountId: this.accountId }, 'Max reconnect attempts reached, stopping retry loop');
            this.updateState({
                status: 'error',
                error: 'تعذر إعادة الاتصال تلقائياً بعد عدة محاولات. يرجى الضغط على "إعادة ضبط نظيفة" لإعادة تهيئة المقبس.',
            });
            return;
        }
        this.isReconnecting = true;
        this.reconnectAttempt++;
        var backoffMs = Math.min(1500 * Math.pow(2, this.reconnectAttempt - 1), 15000);
        logger_1.logger.info({ accountId: this.accountId, attempt: this.reconnectAttempt, backoffMs: backoffMs }, 'Scheduling reconnect');
        this.updateState({ status: 'connecting' });
        setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
            var err_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.isReconnecting = false;
                        if (!!this.isShuttingDown) return [3 /*break*/, 4];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.connect()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_7 = _a.sent();
                        logger_1.logger.error({ accountId: this.accountId, err: err_7 }, 'Reconnect failed');
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); }, backoffMs);
    };
    return BaileysProvider;
}(events_1.EventEmitter));
exports.BaileysProvider = BaileysProvider;
