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
exports.LocalStorageProvider = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var index_1 = require("../../config/index");
var LocalStorageProvider = /** @class */ (function () {
    function LocalStorageProvider() {
        this.basePath = path_1.default.resolve(index_1.config.STORAGE_LOCAL_PATH);
        if (!fs_1.default.existsSync(this.basePath)) {
            fs_1.default.mkdirSync(this.basePath, { recursive: true });
        }
    }
    LocalStorageProvider.prototype.upload = function (fileBuffer, options) {
        return __awaiter(this, void 0, void 0, function () {
            var dir, uniqueName, filePath, storageKey;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        dir = options.directory ? path_1.default.join(this.basePath, options.directory) : this.basePath;
                        if (!fs_1.default.existsSync(dir)) {
                            fs_1.default.mkdirSync(dir, { recursive: true });
                        }
                        uniqueName = "".concat(Date.now(), "_").concat(options.fileName.replace(/[^a-zA-Z0-9.-]/g, '_'));
                        filePath = path_1.default.join(dir, uniqueName);
                        return [4 /*yield*/, fs_1.default.promises.writeFile(filePath, fileBuffer)];
                    case 1:
                        _a.sent();
                        storageKey = options.directory ? "".concat(options.directory, "/").concat(uniqueName) : uniqueName;
                        return [2 /*return*/, {
                                storageKey: storageKey,
                                size: fileBuffer.length,
                            }];
                }
            });
        });
    };
    LocalStorageProvider.prototype.download = function (storageKey) {
        return __awaiter(this, void 0, void 0, function () {
            var safeKey, filePath;
            return __generator(this, function (_a) {
                safeKey = path_1.default.normalize(storageKey).replace(/^(\.\.[\/\\])+/, '');
                filePath = path_1.default.join(this.basePath, safeKey);
                return [2 /*return*/, fs_1.default.promises.readFile(filePath)];
            });
        });
    };
    LocalStorageProvider.prototype.delete = function (storageKey) {
        return __awaiter(this, void 0, void 0, function () {
            var safeKey, filePath;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        safeKey = path_1.default.normalize(storageKey).replace(/^(\.\.[\/\\])+/, '');
                        filePath = path_1.default.join(this.basePath, safeKey);
                        if (!fs_1.default.existsSync(filePath)) return [3 /*break*/, 2];
                        return [4 /*yield*/, fs_1.default.promises.unlink(filePath)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    LocalStorageProvider.prototype.getSignedUrl = function (storageKey_1) {
        return __awaiter(this, arguments, void 0, function (storageKey, expiresInSeconds) {
            if (expiresInSeconds === void 0) { expiresInSeconds = 3600; }
            return __generator(this, function (_a) {
                // Return authenticated download path
                return [2 /*return*/, "".concat(index_1.config.APP_URL, "/api/v1/media/download?key=").concat(encodeURIComponent(storageKey))];
            });
        });
    };
    return LocalStorageProvider;
}());
exports.LocalStorageProvider = LocalStorageProvider;
