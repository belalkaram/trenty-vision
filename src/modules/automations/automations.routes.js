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
exports.automationsRoutes = void 0;
var client_1 = require("../../database/client");
var schema = require("../../database/schema/index");
var drizzle_orm_1 = require("drizzle-orm");
var auth_middleware_1 = require("../../middleware/auth.middleware");
var zod_1 = require("zod");
var logger_1 = require("../../utils/logger");
var ws_hub_1 = require("../../websocket/ws.hub");
var business_hours_converter_1 = require("../../utils/business-hours.converter");
var automationsRoutes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    /**
     * Helper to safely resolve an assigned user ID from either a user ID or employee ID,
     * falling back to the requesting user ID to prevent FK constraint violations.
     */
    function resolveAssignedUserId(rawId, fallbackUserId) {
        return __awaiter(this, void 0, void 0, function () {
            var cleanId, existingUser, employee;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!rawId || typeof rawId !== 'string' || rawId.trim() === '') {
                            return [2 /*return*/, fallbackUserId];
                        }
                        cleanId = rawId.trim();
                        return [4 /*yield*/, client_1.db
                                .select({ id: schema.users.id })
                                .from(schema.users)
                                .where((0, drizzle_orm_1.eq)(schema.users.id, cleanId))
                                .limit(1)];
                    case 1:
                        existingUser = (_a.sent())[0];
                        if (existingUser) {
                            return [2 /*return*/, existingUser.id];
                        }
                        return [4 /*yield*/, client_1.db
                                .select({ userId: schema.employees.userId })
                                .from(schema.employees)
                                .where((0, drizzle_orm_1.eq)(schema.employees.id, cleanId))
                                .limit(1)];
                    case 2:
                        employee = (_a.sent())[0];
                        if (employee && employee.userId) {
                            return [2 /*return*/, employee.userId];
                        }
                        return [2 /*return*/, fallbackUserId];
                }
            });
        });
    }
    var getSettingsHandler, updateSettingsHandler, updateRuleHandler;
    return __generator(this, function (_a) {
        // Apply auth middleware to all automation endpoints
        app.addHook('preHandler', auth_middleware_1.authenticate);
        getSettingsHandler = function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var allSettings, settingsMap, _i, allSettings_1, s, welcomeEnabled, welcomeTmpl, oohEnabled, oohTmpl, assignMode, rawBHours, bHoursObj, payload;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
            return __generator(this, function (_p) {
                switch (_p.label) {
                    case 0: return [4 /*yield*/, client_1.db.query.settings.findMany()];
                    case 1:
                        allSettings = _p.sent();
                        settingsMap = {};
                        for (_i = 0, allSettings_1 = allSettings; _i < allSettings_1.length; _i++) {
                            s = allSettings_1[_i];
                            settingsMap[s.key] = s.value;
                        }
                        welcomeEnabled = (_a = settingsMap['welcome_message_enabled']) !== null && _a !== void 0 ? _a : true;
                        welcomeTmpl = (_b = settingsMap['welcome_message_template']) !== null && _b !== void 0 ? _b : 'مرحباً بك في ترينتي فيجن (Trenty Vision) للخدمات والرعاية الصحية! يسعدنا تواصلك معنا، سيقوم أحد أخصائيي الرعاية بالرد عليك ومساعدتك في أقرب وقت.';
                        oohEnabled = (_f = (_e = (_d = (_c = settingsMap['out_of_hours_message_enabled']) !== null && _c !== void 0 ? _c : settingsMap['outOfHoursMessageEnabled']) !== null && _d !== void 0 ? _d : settingsMap['outOfOfficeBotEnabled']) !== null && _e !== void 0 ? _e : settingsMap['outOfOfficeEnabled']) !== null && _f !== void 0 ? _f : false;
                        oohTmpl = (_j = (_h = (_g = settingsMap['out_of_hours_message_template']) !== null && _g !== void 0 ? _g : settingsMap['outOfHoursMessageTemplate']) !== null && _h !== void 0 ? _h : settingsMap['outOfOfficeMessage']) !== null && _j !== void 0 ? _j : 'شكراً لتواصلك مع ترينتي فيجن (Trenty Vision) للرعاية الصحية! نحن حالياً خارج أوقات العمل الرسمية. سنقوم بالرد عليك وتقديم الرعاية المطلوبة فور بدء ساعات العمل القادمة.';
                        assignMode = (_k = settingsMap['assignment_mode']) !== null && _k !== void 0 ? _k : 'round_robin';
                        rawBHours = (_l = settingsMap['business_hours']) !== null && _l !== void 0 ? _l : settingsMap['businessHours'];
                        bHoursObj = (0, business_hours_converter_1.unifyBusinessHours)(rawBHours);
                        payload = {
                            automationEnabled: (_m = settingsMap['automation_enabled']) !== null && _m !== void 0 ? _m : true,
                            assignmentEnabled: (_o = settingsMap['assignment_enabled']) !== null && _o !== void 0 ? _o : true,
                            assignmentMode: assignMode,
                            routingStrategy: assignMode,
                            welcomeMessageEnabled: welcomeEnabled,
                            greetingBotEnabled: welcomeEnabled,
                            welcomeMessageTemplate: welcomeTmpl,
                            greetingMessage: welcomeTmpl,
                            outOfHoursMessageEnabled: oohEnabled,
                            outOfOfficeBotEnabled: oohEnabled,
                            outOfOfficeEnabled: oohEnabled,
                            outOfHoursMessageTemplate: oohTmpl,
                            outOfOfficeMessage: oohTmpl,
                            businessHours: bHoursObj,
                            businessHoursStart: bHoursObj.start || '09:00',
                            businessHoursEnd: bHoursObj.end || '18:00',
                            activeDays: bHoursObj.workDays || [0, 1, 2, 3, 4, 6],
                        };
                        return [2 /*return*/, reply.send({
                                success: true,
                                data: payload,
                            })];
                }
            });
        }); };
        /**
         * GET /api/v1/automations/settings & GET /api/v1/automations
         */
        app.get('/settings', getSettingsHandler);
        app.get('/', getSettingsHandler);
        updateSettingsHandler = function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var raw, updates, autoEnabled, assignEnabled, assignMode, welcomeEnabled, welcomeTmpl, oohEnabled, oohTmpl, bHours, existingBHours, current, _i, updates_1, item, existing;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
            return __generator(this, function (_p) {
                switch (_p.label) {
                    case 0:
                        raw = request.body || {};
                        updates = [];
                        autoEnabled = raw.automationEnabled;
                        if (autoEnabled !== undefined) {
                            updates.push({ key: 'automation_enabled', value: autoEnabled, groupName: 'automation' });
                        }
                        assignEnabled = raw.assignmentEnabled;
                        if (assignEnabled !== undefined) {
                            updates.push({ key: 'assignment_enabled', value: assignEnabled, groupName: 'assignment' });
                        }
                        assignMode = raw.assignmentMode || raw.routingStrategy;
                        if (assignMode !== undefined) {
                            updates.push({ key: 'assignment_mode', value: assignMode, groupName: 'assignment' });
                        }
                        welcomeEnabled = (_a = raw.welcomeMessageEnabled) !== null && _a !== void 0 ? _a : raw.greetingBotEnabled;
                        if (welcomeEnabled !== undefined) {
                            updates.push({ key: 'welcome_message_enabled', value: welcomeEnabled, groupName: 'automation' });
                        }
                        welcomeTmpl = raw.welcomeMessageTemplate || raw.greetingMessage;
                        if (welcomeTmpl !== undefined) {
                            updates.push({ key: 'welcome_message_template', value: welcomeTmpl, groupName: 'automation' });
                        }
                        oohEnabled = (_c = (_b = raw.outOfHoursMessageEnabled) !== null && _b !== void 0 ? _b : raw.outOfOfficeBotEnabled) !== null && _c !== void 0 ? _c : raw.outOfOfficeEnabled;
                        if (oohEnabled !== undefined) {
                            updates.push({ key: 'out_of_hours_message_enabled', value: oohEnabled, groupName: 'automation' });
                            updates.push({ key: 'outOfHoursMessageEnabled', value: oohEnabled, groupName: 'automation' });
                            updates.push({ key: 'outOfOfficeBotEnabled', value: oohEnabled, groupName: 'automation' });
                            updates.push({ key: 'outOfOfficeEnabled', value: oohEnabled, groupName: 'automation' });
                        }
                        oohTmpl = raw.outOfHoursMessageTemplate || raw.outOfOfficeMessage;
                        if (oohTmpl !== undefined) {
                            updates.push({ key: 'out_of_hours_message_template', value: oohTmpl, groupName: 'automation' });
                            updates.push({ key: 'outOfHoursMessageTemplate', value: oohTmpl, groupName: 'automation' });
                            updates.push({ key: 'outOfOfficeMessage', value: oohTmpl, groupName: 'automation' });
                        }
                        bHours = (_d = raw.businessHours) !== null && _d !== void 0 ? _d : raw.business_hours;
                        if (!(raw.businessHoursStart !== undefined || raw.businessHoursEnd !== undefined || raw.activeDays !== undefined)) return [3 /*break*/, 2];
                        return [4 /*yield*/, client_1.db.query.settings.findFirst({
                                where: (0, drizzle_orm_1.eq)(schema.settings.key, 'business_hours'),
                            })];
                    case 1:
                        existingBHours = _p.sent();
                        current = (existingBHours === null || existingBHours === void 0 ? void 0 : existingBHours.value) || {
                            enabled: true,
                            timezone: 'Asia/Kuwait',
                            start: '09:00',
                            end: '18:00',
                            workDays: [0, 1, 2, 3, 4, 6],
                        };
                        bHours = (0, business_hours_converter_1.unifyBusinessHours)(__assign(__assign({}, current), { start: (_f = (_e = raw.businessHoursStart) !== null && _e !== void 0 ? _e : current.start) !== null && _f !== void 0 ? _f : '09:00', end: (_h = (_g = raw.businessHoursEnd) !== null && _g !== void 0 ? _g : current.end) !== null && _h !== void 0 ? _h : '18:00', workDays: (_k = (_j = raw.activeDays) !== null && _j !== void 0 ? _j : current.workDays) !== null && _k !== void 0 ? _k : [0, 1, 2, 3, 4, 6], activeDays: (_m = (_l = raw.activeDays) !== null && _l !== void 0 ? _l : current.workDays) !== null && _m !== void 0 ? _m : [0, 1, 2, 3, 4, 6] }));
                        return [3 /*break*/, 3];
                    case 2:
                        if (bHours !== undefined) {
                            bHours = (0, business_hours_converter_1.unifyBusinessHours)(bHours);
                        }
                        _p.label = 3;
                    case 3:
                        if (bHours !== undefined) {
                            updates.push({ key: 'business_hours', value: bHours, groupName: 'operational' });
                            updates.push({ key: 'businessHours', value: bHours, groupName: 'operational' });
                        }
                        _i = 0, updates_1 = updates;
                        _p.label = 4;
                    case 4:
                        if (!(_i < updates_1.length)) return [3 /*break*/, 10];
                        item = updates_1[_i];
                        return [4 /*yield*/, client_1.db.query.settings.findFirst({
                                where: (0, drizzle_orm_1.eq)(schema.settings.key, item.key),
                            })];
                    case 5:
                        existing = _p.sent();
                        if (!existing) return [3 /*break*/, 7];
                        return [4 /*yield*/, client_1.db
                                .update(schema.settings)
                                .set({ value: item.value, updatedAt: new Date() })
                                .where((0, drizzle_orm_1.eq)(schema.settings.key, item.key))];
                    case 6:
                        _p.sent();
                        return [3 /*break*/, 9];
                    case 7: return [4 /*yield*/, client_1.db.insert(schema.settings).values({
                            key: item.key,
                            value: item.value,
                            groupName: item.groupName,
                        })];
                    case 8:
                        _p.sent();
                        _p.label = 9;
                    case 9:
                        _i++;
                        return [3 /*break*/, 4];
                    case 10:
                        logger_1.logger.info({ userId: (_o = request.user) === null || _o === void 0 ? void 0 : _o.id }, 'Automation settings updated');
                        return [2 /*return*/, reply.send({ success: true, message: 'Settings updated successfully' })];
                }
            });
        }); };
        app.put('/settings', updateSettingsHandler);
        app.put('/', updateSettingsHandler);
        /**
         * GET /api/v1/automations/rules
         * List all keyword and routing rules
         */
        app.get('/rules', function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var rules;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, client_1.db.query.automationRules.findMany({
                            orderBy: [schema.automationRules.priority, (0, drizzle_orm_1.desc)(schema.automationRules.createdAt)],
                        })];
                    case 1:
                        rules = _a.sent();
                        return [2 /*return*/, reply.send({ success: true, data: rules })];
                }
            });
        }); });
        /**
         * POST /api/v1/automations/rules
         * Create a new automation rule
         */
        app.post('/rules', function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var ruleValidator, data, rule;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        ruleValidator = zod_1.z.object({
                            name: zod_1.z.string().min(1),
                            triggerType: zod_1.z.string().default('keyword'),
                            conditions: zod_1.z.record(zod_1.z.any()).default({}),
                            actions: zod_1.z.array(zod_1.z.record(zod_1.z.any())).default([]),
                            priority: zod_1.z.number().default(0),
                            enabled: zod_1.z.boolean().default(true),
                            scope: zod_1.z.string().default('global'),
                        });
                        data = ruleValidator.parse(request.body);
                        return [4 /*yield*/, client_1.db
                                .insert(schema.automationRules)
                                .values({
                                name: data.name,
                                triggerType: data.triggerType,
                                conditions: data.conditions,
                                actions: data.actions,
                                priority: data.priority,
                                enabled: data.enabled,
                                scope: data.scope,
                            })
                                .returning()];
                    case 1:
                        rule = (_a.sent())[0];
                        return [2 /*return*/, reply.status(201).send({ success: true, data: rule })];
                }
            });
        }); });
        updateRuleHandler = function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var id, ruleValidator, data, updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        id = request.params.id;
                        ruleValidator = zod_1.z.object({
                            name: zod_1.z.string().optional(),
                            triggerType: zod_1.z.string().optional(),
                            conditions: zod_1.z.record(zod_1.z.any()).optional(),
                            actions: zod_1.z.array(zod_1.z.record(zod_1.z.any())).optional(),
                            priority: zod_1.z.number().optional(),
                            enabled: zod_1.z.boolean().optional(),
                            scope: zod_1.z.string().optional(),
                        });
                        data = ruleValidator.parse(request.body);
                        return [4 /*yield*/, client_1.db
                                .update(schema.automationRules)
                                .set(__assign(__assign({}, data), { updatedAt: new Date() }))
                                .where((0, drizzle_orm_1.eq)(schema.automationRules.id, id))
                                .returning()];
                    case 1:
                        updated = (_a.sent())[0];
                        if (!updated) {
                            return [2 /*return*/, reply.status(404).send({ success: false, message: 'Rule not found' })];
                        }
                        return [2 /*return*/, reply.send({ success: true, data: updated })];
                }
            });
        }); };
        app.patch('/rules/:id', updateRuleHandler);
        app.put('/rules/:id', updateRuleHandler);
        /**
         * DELETE /api/v1/automations/rules/:id
         * Delete an automation rule
         */
        app.delete('/rules/:id', function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var id;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        id = request.params.id;
                        return [4 /*yield*/, client_1.db.delete(schema.automationRules).where((0, drizzle_orm_1.eq)(schema.automationRules.id, id))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, reply.send({ success: true, message: 'Rule deleted' })];
                }
            });
        }); });
        /**
         * GET /api/v1/automations/reminders
         * Get reminders with optional status/conversation filtering and user details
         */
        app.get('/reminders', function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var user, query, conditions, isAdmin, whereClause, list;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        user = request.user;
                        query = request.query;
                        conditions = [];
                        isAdmin = user.roleName === 'adminstrator' || user.roleName === 'admin' || user.roleName === 'super_admin';
                        if (!isAdmin || query.all !== 'true') {
                            conditions.push((0, drizzle_orm_1.eq)(schema.reminders.assignedUserId, user.id));
                        }
                        if (query.status && query.status !== 'all') {
                            conditions.push((0, drizzle_orm_1.eq)(schema.reminders.status, query.status));
                        }
                        if (query.conversationId) {
                            conditions.push((0, drizzle_orm_1.eq)(schema.reminders.conversationId, query.conversationId));
                        }
                        whereClause = conditions.length > 0 ? drizzle_orm_1.and.apply(void 0, conditions) : undefined;
                        return [4 /*yield*/, client_1.db
                                .select({
                                id: schema.reminders.id,
                                title: schema.reminders.title,
                                note: schema.reminders.note,
                                dueAt: schema.reminders.dueAt,
                                status: schema.reminders.status,
                                completedAt: schema.reminders.completedAt,
                                createdAt: schema.reminders.createdAt,
                                updatedAt: schema.reminders.updatedAt,
                                conversationId: schema.reminders.conversationId,
                                leadId: schema.reminders.leadId,
                                assignedUserId: schema.reminders.assignedUserId,
                                assignedUserName: schema.users.name,
                                assignedUserEmail: schema.users.email,
                                contactName: schema.contacts.name,
                                contactPhone: schema.contacts.phoneNumber,
                            })
                                .from(schema.reminders)
                                .leftJoin(schema.users, (0, drizzle_orm_1.eq)(schema.reminders.assignedUserId, schema.users.id))
                                .leftJoin(schema.conversations, (0, drizzle_orm_1.eq)(schema.reminders.conversationId, schema.conversations.id))
                                .leftJoin(schema.contacts, (0, drizzle_orm_1.eq)(schema.conversations.contactId, schema.contacts.id))
                                .where(whereClause)
                                .orderBy((0, drizzle_orm_1.desc)(schema.reminders.dueAt))];
                    case 1:
                        list = _a.sent();
                        return [2 /*return*/, reply.send({ success: true, data: list })];
                }
            });
        }); });
        /**
         * POST /api/v1/automations/reminders
         * Create a follow-up reminder
         */
        app.post('/reminders', function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var user, validator, data, assignedUserId, created;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        user = request.user;
                        validator = zod_1.z.object({
                            conversationId: zod_1.z.string().uuid().optional().nullable(),
                            leadId: zod_1.z.string().uuid().optional().nullable(),
                            assignedUserId: zod_1.z.string().optional().nullable(),
                            title: zod_1.z.string().min(1),
                            note: zod_1.z.string().optional().nullable(),
                            dueAt: zod_1.z.string().datetime(),
                        });
                        data = validator.parse(request.body);
                        return [4 /*yield*/, resolveAssignedUserId(data.assignedUserId, user.id)];
                    case 1:
                        assignedUserId = _a.sent();
                        return [4 /*yield*/, client_1.db
                                .insert(schema.reminders)
                                .values({
                                assignedUserId: assignedUserId,
                                conversationId: data.conversationId || null,
                                leadId: data.leadId || null,
                                title: data.title,
                                note: data.note || null,
                                dueAt: new Date(data.dueAt),
                                status: 'pending',
                            })
                                .returning()];
                    case 2:
                        created = (_a.sent())[0];
                        // Broadcast reminder creation to UI
                        ws_hub_1.wsHub.broadcast('reminder.created', created);
                        return [2 /*return*/, reply.status(201).send({ success: true, data: created })];
                }
            });
        }); });
        /**
         * PATCH /api/v1/automations/reminders/:id/status
         * Quick status toggle (pending / completed / cancelled)
         */
        app.patch('/reminders/:id/status', function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var id, status, updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        id = request.params.id;
                        status = zod_1.z
                            .object({
                            status: zod_1.z.enum(['pending', 'completed', 'cancelled']),
                        })
                            .parse(request.body).status;
                        return [4 /*yield*/, client_1.db
                                .update(schema.reminders)
                                .set({
                                status: status,
                                completedAt: status === 'completed' ? new Date() : null,
                                updatedAt: new Date(),
                            })
                                .where((0, drizzle_orm_1.eq)(schema.reminders.id, id))
                                .returning()];
                    case 1:
                        updated = (_a.sent())[0];
                        if (!updated) {
                            return [2 /*return*/, reply.status(404).send({ success: false, message: 'Reminder not found' })];
                        }
                        ws_hub_1.wsHub.broadcast('reminder.updated', updated);
                        return [2 /*return*/, reply.send({ success: true, data: updated })];
                }
            });
        }); });
        /**
         * PATCH /api/v1/automations/reminders/:id
         * Update reminder fields (dueAt, title, note, assignedUserId)
         */
        app.patch('/reminders/:id', function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var user, id, validator, data, updates, _a, updated;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        user = request.user;
                        id = request.params.id;
                        validator = zod_1.z.object({
                            title: zod_1.z.string().min(1).optional(),
                            note: zod_1.z.string().optional().nullable(),
                            dueAt: zod_1.z.string().datetime().optional(),
                            status: zod_1.z.enum(['pending', 'completed', 'cancelled', 'overdue']).optional(),
                            assignedUserId: zod_1.z.string().optional().nullable(),
                        });
                        data = validator.parse(request.body);
                        updates = { updatedAt: new Date() };
                        if (data.title !== undefined)
                            updates.title = data.title;
                        if (data.note !== undefined)
                            updates.note = data.note;
                        if (data.dueAt !== undefined)
                            updates.dueAt = new Date(data.dueAt);
                        if (!(data.assignedUserId !== undefined)) return [3 /*break*/, 2];
                        _a = updates;
                        return [4 /*yield*/, resolveAssignedUserId(data.assignedUserId, user.id)];
                    case 1:
                        _a.assignedUserId = _b.sent();
                        _b.label = 2;
                    case 2:
                        if (data.status !== undefined) {
                            updates.status = data.status;
                            if (data.status === 'completed')
                                updates.completedAt = new Date();
                            if (data.status === 'pending')
                                updates.completedAt = null;
                        }
                        return [4 /*yield*/, client_1.db
                                .update(schema.reminders)
                                .set(updates)
                                .where((0, drizzle_orm_1.eq)(schema.reminders.id, id))
                                .returning()];
                    case 3:
                        updated = (_b.sent())[0];
                        if (!updated) {
                            return [2 /*return*/, reply.status(404).send({ success: false, message: 'Reminder not found' })];
                        }
                        ws_hub_1.wsHub.broadcast('reminder.updated', updated);
                        return [2 /*return*/, reply.send({ success: true, data: updated })];
                }
            });
        }); });
        /**
         * DELETE /api/v1/automations/reminders/:id
         * Delete a reminder
         */
        app.delete('/reminders/:id', function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var id, deleted;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        id = request.params.id;
                        return [4 /*yield*/, client_1.db
                                .delete(schema.reminders)
                                .where((0, drizzle_orm_1.eq)(schema.reminders.id, id))
                                .returning()];
                    case 1:
                        deleted = (_a.sent())[0];
                        if (!deleted) {
                            return [2 /*return*/, reply.status(404).send({ success: false, message: 'Reminder not found' })];
                        }
                        ws_hub_1.wsHub.broadcast('reminder.deleted', { id: id });
                        return [2 /*return*/, reply.send({ success: true, message: 'Reminder deleted successfully' })];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.automationsRoutes = automationsRoutes;
