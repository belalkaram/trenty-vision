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
exports.quickRepliesRoutes = quickRepliesRoutes;
var drizzle_orm_1 = require("drizzle-orm");
var zod_1 = require("zod");
var client_1 = require("../../database/client");
var index_1 = require("../../database/schema/index");
var auth_middleware_1 = require("../../middleware/auth.middleware");
var createQuickReplySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'يرجى إدخال اسم للرد').max(150),
    shortcut: zod_1.z
        .string()
        .min(1, 'يرجى إدخال اختصار للرد')
        .max(50)
        .transform(function (val) { return (val.startsWith('/') ? val : "/".concat(val)); })
        .refine(function (val) { return /^\/[a-zA-Z0-9_\u0600-\u06FF-]+$/.test(val); }, {
        message: 'يجب ألا يحتوي الاختصار على مسافات أو رموز غير مدعومة',
    }),
    body: zod_1.z.string().min(1, 'يرجى إدخال محتوى الرد'),
    departmentId: zod_1.z.string().uuid().nullable().optional(),
});
function quickRepliesRoutes(app) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            app.addHook('preHandler', auth_middleware_1.authenticate);
            /**
             * GET /api/v1/quick-replies — List all active quick replies
             */
            app.get('/', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var rows;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, client_1.db
                                .select({
                                id: index_1.quickReplies.id,
                                name: index_1.quickReplies.name,
                                shortcut: index_1.quickReplies.shortcut,
                                body: index_1.quickReplies.body,
                                departmentId: index_1.quickReplies.departmentId,
                                departmentName: index_1.departments.name,
                                active: index_1.quickReplies.active,
                                createdAt: index_1.quickReplies.createdAt,
                            })
                                .from(index_1.quickReplies)
                                .leftJoin(index_1.departments, (0, drizzle_orm_1.eq)(index_1.quickReplies.departmentId, index_1.departments.id))
                                .where((0, drizzle_orm_1.eq)(index_1.quickReplies.active, true))
                                .orderBy((0, drizzle_orm_1.desc)(index_1.quickReplies.createdAt))];
                        case 1:
                            rows = _a.sent();
                            return [2 /*return*/, reply.send({ success: true, data: rows })];
                    }
                });
            }); });
            /**
             * POST /api/v1/quick-replies — Create canned reply
             */
            app.post('/', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var parsed, created;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            parsed = createQuickReplySchema.safeParse(request.body);
                            if (!parsed.success) {
                                return [2 /*return*/, reply.status(400).send({ success: false, error: 'Invalid quick reply payload', details: parsed.error.format() })];
                            }
                            return [4 /*yield*/, client_1.db
                                    .insert(index_1.quickReplies)
                                    .values({
                                    name: parsed.data.name,
                                    shortcut: parsed.data.shortcut.startsWith('/') ? parsed.data.shortcut : "/".concat(parsed.data.shortcut),
                                    body: parsed.data.body,
                                    departmentId: parsed.data.departmentId || null,
                                    active: true,
                                })
                                    .returning()];
                        case 1:
                            created = (_a.sent())[0];
                            return [2 /*return*/, reply.status(201).send({ success: true, data: created })];
                    }
                });
            }); });
            /**
             * DELETE /api/v1/quick-replies/:id — Delete canned reply
             */
            app.delete('/:id', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, deleted;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            return [4 /*yield*/, client_1.db
                                    .delete(index_1.quickReplies)
                                    .where((0, drizzle_orm_1.eq)(index_1.quickReplies.id, id))
                                    .returning()];
                        case 1:
                            deleted = (_a.sent())[0];
                            if (!deleted) {
                                return [2 /*return*/, reply.status(404).send({ success: false, error: 'Quick reply not found' })];
                            }
                            return [2 /*return*/, reply.send({ success: true, message: 'Quick reply deleted' })];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
