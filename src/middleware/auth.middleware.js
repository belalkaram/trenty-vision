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
exports.authenticate = authenticate;
var jsonwebtoken_1 = require("jsonwebtoken");
var index_1 = require("../config/index");
var errors_1 = require("../utils/errors");
var client_1 = require("../database/client");
var index_2 = require("../database/schema/index");
var drizzle_orm_1 = require("drizzle-orm");
function authenticate(request, reply) {
    return __awaiter(this, void 0, void 0, function () {
        var token, authHeader, decoded, user, userRole, assignedPerms, permNames, err_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    authHeader = request.headers.authorization;
                    if (authHeader && authHeader.startsWith('Bearer ')) {
                        token = authHeader.substring(7);
                    }
                    // 2. Check HTTP-only cookie if no header
                    if (!token && ((_a = request.cookies) === null || _a === void 0 ? void 0 : _a.access_token)) {
                        token = request.cookies.access_token;
                    }
                    // 3. Check query param token (e.g. for CSV export direct downloads)
                    if (!token && ((_b = request.query) === null || _b === void 0 ? void 0 : _b.token)) {
                        token = request.query.token;
                    }
                    if (!token) {
                        throw new errors_1.UnauthorizedError('Authentication required. Please log in.');
                    }
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 5, , 6]);
                    decoded = jsonwebtoken_1.default.verify(token, index_1.config.JWT_ACCESS_SECRET);
                    return [4 /*yield*/, client_1.db.query.users.findFirst({
                            where: (0, drizzle_orm_1.eq)(index_2.users.id, decoded.userId),
                        })];
                case 2:
                    user = _c.sent();
                    if (!user || user.status !== 'active') {
                        throw new errors_1.UnauthorizedError('User account is inactive or not found.');
                    }
                    return [4 /*yield*/, client_1.db.query.roles.findFirst({
                            where: (0, drizzle_orm_1.eq)(index_2.roles.id, user.roleId),
                        })];
                case 3:
                    userRole = _c.sent();
                    if (!userRole) {
                        throw new errors_1.UnauthorizedError('User role not found.');
                    }
                    return [4 /*yield*/, client_1.db
                            .select({ name: index_2.permissions.name })
                            .from(index_2.rolePermissions)
                            .innerJoin(index_2.permissions, (0, drizzle_orm_1.eq)(index_2.rolePermissions.permissionId, index_2.permissions.id))
                            .where((0, drizzle_orm_1.eq)(index_2.rolePermissions.roleId, user.roleId))];
                case 4:
                    assignedPerms = _c.sent();
                    permNames = assignedPerms.map(function (p) { return p.name; });
                    request.user = {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        roleId: user.roleId,
                        roleName: userRole.name,
                        permissions: permNames,
                    };
                    return [3 /*break*/, 6];
                case 5:
                    err_1 = _c.sent();
                    if (err_1 instanceof errors_1.UnauthorizedError) {
                        throw err_1;
                    }
                    throw new errors_1.UnauthorizedError('Invalid or expired token.');
                case 6: return [2 /*return*/];
            }
        });
    });
}
