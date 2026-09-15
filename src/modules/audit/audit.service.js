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
exports.AuditService = void 0;
var client_1 = require("../../database/client");
var index_1 = require("../../database/schema/index");
var drizzle_orm_1 = require("drizzle-orm");
var logger_1 = require("../../utils/logger");
var AuditService = /** @class */ (function () {
    function AuditService() {
    }
    /**
     * Append an audit log entry.
     * Audit logs are strictly append-only.
     */
    AuditService.log = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, client_1.db.insert(index_1.auditLogs).values({
                                actorId: params.actorId || null,
                                action: params.action,
                                entityType: params.entityType,
                                entityId: params.entityId || null,
                                ipAddress: params.ipAddress || null,
                                userAgent: params.userAgent || null,
                                oldValues: params.oldValues || null,
                                newValues: params.newValues || null,
                                metadata: params.metadata || {},
                            })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        // Audit logging should never crash the main transaction, but we log errors
                        logger_1.logger.error({ error: error_1, params: params }, 'Failed to write audit log');
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * List audit logs with pagination and optional filters
     */
    AuditService.list = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var page, limit, offset, conditions, whereClause, _a, items, totalResult;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        page = Math.max(1, options.page || 1);
                        limit = Math.min(100, Math.max(1, options.limit || 20));
                        offset = (page - 1) * limit;
                        conditions = [];
                        if (options.entityType) {
                            conditions.push((0, drizzle_orm_1.eq)(index_1.auditLogs.entityType, options.entityType));
                        }
                        if (options.actorId) {
                            conditions.push((0, drizzle_orm_1.eq)(index_1.auditLogs.actorId, options.actorId));
                        }
                        whereClause = conditions.length > 0 ? drizzle_orm_1.and.apply(void 0, conditions) : undefined;
                        return [4 /*yield*/, Promise.all([
                                client_1.db
                                    .select()
                                    .from(index_1.auditLogs)
                                    .where(whereClause)
                                    .orderBy((0, drizzle_orm_1.desc)(index_1.auditLogs.createdAt))
                                    .limit(limit)
                                    .offset(offset),
                                client_1.db
                                    .select({ count: index_1.auditLogs.id })
                                    .from(index_1.auditLogs)
                                    .where(whereClause),
                            ])];
                    case 1:
                        _a = _b.sent(), items = _a[0], totalResult = _a[1];
                        return [2 /*return*/, {
                                items: items,
                                pagination: {
                                    page: page,
                                    limit: limit,
                                    total: totalResult.length,
                                    totalPages: Math.ceil(totalResult.length / limit),
                                },
                            }];
                }
            });
        });
    };
    return AuditService;
}());
exports.AuditService = AuditService;
