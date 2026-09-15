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
exports.MockWhatsAppProvider = void 0;
/**
 * MockWhatsAppProvider for automated unit & integration testing (Requirement 67 & 68)
 */
var MockWhatsAppProvider = /** @class */ (function () {
    function MockWhatsAppProvider() {
        this.state = { status: 'disconnected' };
    }
    MockWhatsAppProvider.prototype.connect = function (accountId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.state = { status: 'connected', phoneNumber: '+96512345678', jid: '96512345678@s.whatsapp.net', deviceName: 'Mock Device' };
                return [2 /*return*/];
            });
        });
    };
    MockWhatsAppProvider.prototype.disconnect = function (accountId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.state = { status: 'disconnected' };
                return [2 /*return*/];
            });
        });
    };
    MockWhatsAppProvider.prototype.logout = function (accountId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.state = { status: 'logged_out' };
                return [2 /*return*/];
            });
        });
    };
    MockWhatsAppProvider.prototype.getStatus = function (accountId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.state];
            });
        });
    };
    MockWhatsAppProvider.prototype.getQRCode = function (accountId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, 'mock_qr_string_data'];
            });
        });
    };
    MockWhatsAppProvider.prototype.sendText = function (toJid, text) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, { id: "mock_msg_".concat(Date.now()), timestamp: new Date() }];
            });
        });
    };
    MockWhatsAppProvider.prototype.sendImage = function (toJid, buffer, mimeType) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, { id: "mock_img_".concat(Date.now()), timestamp: new Date() }];
            });
        });
    };
    MockWhatsAppProvider.prototype.sendVideo = function (toJid, buffer, mimeType) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, { id: "mock_vid_".concat(Date.now()), timestamp: new Date() }];
            });
        });
    };
    MockWhatsAppProvider.prototype.sendAudio = function (toJid, buffer, isVoiceNote) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, { id: "mock_aud_".concat(Date.now()), timestamp: new Date() }];
            });
        });
    };
    MockWhatsAppProvider.prototype.sendDocument = function (toJid, buffer, fileName, mimeType) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, { id: "mock_doc_".concat(Date.now()), timestamp: new Date() }];
            });
        });
    };
    MockWhatsAppProvider.prototype.sendLocation = function (toJid, lat, lng) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, { id: "mock_loc_".concat(Date.now()), timestamp: new Date() }];
            });
        });
    };
    MockWhatsAppProvider.prototype.sendContact = function (toJid, contactJid, name) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, { id: "mock_cnt_".concat(Date.now()), timestamp: new Date() }];
            });
        });
    };
    MockWhatsAppProvider.prototype.sendReaction = function (toJid, messageId, emoji) {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); });
    };
    MockWhatsAppProvider.prototype.markRead = function (jid, messageIds) {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); });
    };
    MockWhatsAppProvider.prototype.sendTyping = function (jid, isTyping) {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); });
    };
    return MockWhatsAppProvider;
}());
exports.MockWhatsAppProvider = MockWhatsAppProvider;
