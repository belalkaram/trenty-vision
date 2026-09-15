"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
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
exports.AssignmentService = void 0;
var client_1 = require("../../database/client");
var schema = require("../../database/schema/index");
var drizzle_orm_1 = require("drizzle-orm");
var logger_1 = require("../../utils/logger");
var ws_hub_1 = require("../../websocket/ws.hub");
var outbound_queue_service_1 = require("../../services/outbound-queue.service");
var phone_validator_1 = require("../../utils/phone.validator");
var AssignmentService = /** @class */ (function () {
    function AssignmentService() {
    }
    /**
     * Helper to retrieve a setting by key
     */
    AssignmentService.getSetting = function (key, defaultValue) {
        return __awaiter(this, void 0, void 0, function () {
            var setting, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, client_1.db.query.settings.findFirst({
                                where: (0, drizzle_orm_1.eq)(schema.settings.key, key),
                            })];
                    case 1:
                        setting = _a.sent();
                        if (setting && setting.value !== undefined && setting.value !== null) {
                            return [2 /*return*/, setting.value];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        err_1 = _a.sent();
                        logger_1.logger.warn({ err: err_1, key: key }, 'Failed to fetch setting, using fallback default');
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/, defaultValue];
                }
            });
        });
    };
    /**
     * Find sticky agent who previously interacted with this contact.
     * Checks contact metadata (persistent assignment) first, then previous conversations.
     */
    AssignmentService.findStickyAgent = function (contactId) {
        return __awaiter(this, void 0, void 0, function () {
            var contact, metaAssignedEmp, emp, user_1, prevConv, employee, user;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, client_1.db
                            .select()
                            .from(schema.contacts)
                            .where((0, drizzle_orm_1.eq)(schema.contacts.id, contactId))
                            .limit(1)];
                    case 1:
                        contact = (_b.sent())[0];
                        metaAssignedEmp = (_a = contact === null || contact === void 0 ? void 0 : contact.metadata) === null || _a === void 0 ? void 0 : _a.assignedEmployeeId;
                        if (!metaAssignedEmp) return [3 /*break*/, 4];
                        return [4 /*yield*/, client_1.db.query.employees.findFirst({
                                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.employees.id, metaAssignedEmp), (0, drizzle_orm_1.ne)(schema.employees.status, 'inactive')),
                            })];
                    case 2:
                        emp = _b.sent();
                        if (!emp) return [3 /*break*/, 4];
                        return [4 /*yield*/, client_1.db.query.users.findFirst({
                                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.users.id, emp.userId), (0, drizzle_orm_1.eq)(schema.users.status, 'active')),
                            })];
                    case 3:
                        user_1 = _b.sent();
                        if (user_1) {
                            return [2 /*return*/, {
                                    employeeId: emp.id,
                                    stationId: emp.stationId || null,
                                }];
                        }
                        _b.label = 4;
                    case 4: return [4 /*yield*/, client_1.db.query.conversations.findFirst({
                            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.conversations.contactId, contactId), (0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["", " IS NOT NULL"], ["", " IS NOT NULL"])), schema.conversations.assignedEmployeeId)),
                            orderBy: [(0, drizzle_orm_1.desc)(schema.conversations.lastMessageAt), (0, drizzle_orm_1.desc)(schema.conversations.updatedAt)],
                        })];
                    case 5:
                        prevConv = _b.sent();
                        if (!prevConv || !prevConv.assignedEmployeeId) {
                            return [2 /*return*/, null];
                        }
                        return [4 /*yield*/, client_1.db.query.employees.findFirst({
                                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.employees.id, prevConv.assignedEmployeeId), (0, drizzle_orm_1.ne)(schema.employees.status, 'inactive')),
                            })];
                    case 6:
                        employee = _b.sent();
                        if (!employee) {
                            return [2 /*return*/, null];
                        }
                        return [4 /*yield*/, client_1.db.query.users.findFirst({
                                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.users.id, employee.userId), (0, drizzle_orm_1.eq)(schema.users.status, 'active')),
                            })];
                    case 7:
                        user = _b.sent();
                        if (!user) {
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/, {
                                employeeId: employee.id,
                                stationId: employee.stationId || prevConv.assignedStationId,
                            }];
                }
            });
        });
    };
    /**
     * Assign conversation using Round-Robin rotation among active employees.
     * If stationId provided, tries station first; falls back to all active company employees.
     */
    AssignmentService.assignRoundRobin = function (stationId_1) {
        return __awaiter(this, arguments, void 0, function (stationId, maxCapacity) {
            var stationResult, fallbackResult, anyEmployee;
            var _a, _b;
            if (maxCapacity === void 0) { maxCapacity = 10; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!stationId) return [3 /*break*/, 2];
                        return [4 /*yield*/, client_1.db.execute((0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n        SELECT e.id, COUNT(c.id) as open_chats\n        FROM employees e\n        INNER JOIN users u ON u.id = e.user_id\n        LEFT JOIN (\n          SELECT assigned_employee_id, MAX(assigned_at) as last_assigned_at\n          FROM conversations\n          WHERE assigned_employee_id IS NOT NULL\n          GROUP BY assigned_employee_id\n        ) conv ON conv.assigned_employee_id = e.id\n        LEFT JOIN conversations c ON c.assigned_employee_id = e.id AND c.status = 'open'\n        WHERE e.station_id = ", "\n          AND e.status != 'inactive'\n          AND u.status = 'active'\n        GROUP BY e.id, e.created_at, conv.last_assigned_at\n        HAVING COUNT(c.id) < ", "\n        ORDER BY conv.last_assigned_at ASC NULLS FIRST, e.created_at ASC\n        LIMIT 1\n      "], ["\n        SELECT e.id, COUNT(c.id) as open_chats\n        FROM employees e\n        INNER JOIN users u ON u.id = e.user_id\n        LEFT JOIN (\n          SELECT assigned_employee_id, MAX(assigned_at) as last_assigned_at\n          FROM conversations\n          WHERE assigned_employee_id IS NOT NULL\n          GROUP BY assigned_employee_id\n        ) conv ON conv.assigned_employee_id = e.id\n        LEFT JOIN conversations c ON c.assigned_employee_id = e.id AND c.status = 'open'\n        WHERE e.station_id = ", "\n          AND e.status != 'inactive'\n          AND u.status = 'active'\n        GROUP BY e.id, e.created_at, conv.last_assigned_at\n        HAVING COUNT(c.id) < ", "\n        ORDER BY conv.last_assigned_at ASC NULLS FIRST, e.created_at ASC\n        LIMIT 1\n      "])), stationId, maxCapacity))];
                    case 1:
                        stationResult = _c.sent();
                        if (stationResult.rows && stationResult.rows.length > 0) {
                            return [2 /*return*/, stationResult.rows[0].id];
                        }
                        _c.label = 2;
                    case 2: return [4 /*yield*/, client_1.db.execute((0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n      SELECT e.id, COUNT(c.id) as open_chats\n      FROM employees e\n      INNER JOIN users u ON u.id = e.user_id\n      LEFT JOIN (\n        SELECT assigned_employee_id, MAX(assigned_at) as last_assigned_at\n        FROM conversations\n        WHERE assigned_employee_id IS NOT NULL\n        GROUP BY assigned_employee_id\n      ) conv ON conv.assigned_employee_id = e.id\n      LEFT JOIN conversations c ON c.assigned_employee_id = e.id AND c.status = 'open'\n      WHERE e.status != 'inactive'\n        AND u.status = 'active'\n      GROUP BY e.id, e.created_at, conv.last_assigned_at\n      HAVING COUNT(c.id) < ", "\n      ORDER BY conv.last_assigned_at ASC NULLS FIRST, e.created_at ASC\n      LIMIT 1\n    "], ["\n      SELECT e.id, COUNT(c.id) as open_chats\n      FROM employees e\n      INNER JOIN users u ON u.id = e.user_id\n      LEFT JOIN (\n        SELECT assigned_employee_id, MAX(assigned_at) as last_assigned_at\n        FROM conversations\n        WHERE assigned_employee_id IS NOT NULL\n        GROUP BY assigned_employee_id\n      ) conv ON conv.assigned_employee_id = e.id\n      LEFT JOIN conversations c ON c.assigned_employee_id = e.id AND c.status = 'open'\n      WHERE e.status != 'inactive'\n        AND u.status = 'active'\n      GROUP BY e.id, e.created_at, conv.last_assigned_at\n      HAVING COUNT(c.id) < ", "\n      ORDER BY conv.last_assigned_at ASC NULLS FIRST, e.created_at ASC\n      LIMIT 1\n    "])), maxCapacity))];
                    case 3:
                        fallbackResult = _c.sent();
                        if (fallbackResult.rows && fallbackResult.rows.length > 0) {
                            return [2 /*return*/, fallbackResult.rows[0].id];
                        }
                        return [4 /*yield*/, client_1.db.execute((0, drizzle_orm_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["\n      SELECT e.id\n      FROM employees e\n      INNER JOIN users u ON u.id = e.user_id\n      WHERE e.status != 'inactive'\n        AND u.status = 'active'\n      ORDER BY e.created_at ASC\n      LIMIT 1\n    "], ["\n      SELECT e.id\n      FROM employees e\n      INNER JOIN users u ON u.id = e.user_id\n      WHERE e.status != 'inactive'\n        AND u.status = 'active'\n      ORDER BY e.created_at ASC\n      LIMIT 1\n    "]))))];
                    case 4:
                        anyEmployee = _c.sent();
                        return [2 /*return*/, ((_b = (_a = anyEmployee.rows) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.id) || null];
                }
            });
        });
    };
    /**
     * Assign conversation to the least busy active employee.
     * If stationId provided, tries station first; falls back to all active company employees.
     */
    AssignmentService.assignLeastBusy = function (stationId_1) {
        return __awaiter(this, arguments, void 0, function (stationId, maxCapacity) {
            var stationResult, fallbackResult;
            if (maxCapacity === void 0) { maxCapacity = 10; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!stationId) return [3 /*break*/, 2];
                        return [4 /*yield*/, client_1.db.execute((0, drizzle_orm_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject(["\n        SELECT e.id, COUNT(c.id) as open_chats\n        FROM employees e\n        INNER JOIN users u ON u.id = e.user_id\n        LEFT JOIN conversations c ON c.assigned_employee_id = e.id AND c.status = 'open'\n        WHERE e.station_id = ", "\n          AND e.status != 'inactive'\n          AND u.status = 'active'\n        GROUP BY e.id, e.created_at\n        HAVING COUNT(c.id) < ", "\n        ORDER BY open_chats ASC, e.created_at ASC\n        LIMIT 1\n      "], ["\n        SELECT e.id, COUNT(c.id) as open_chats\n        FROM employees e\n        INNER JOIN users u ON u.id = e.user_id\n        LEFT JOIN conversations c ON c.assigned_employee_id = e.id AND c.status = 'open'\n        WHERE e.station_id = ", "\n          AND e.status != 'inactive'\n          AND u.status = 'active'\n        GROUP BY e.id, e.created_at\n        HAVING COUNT(c.id) < ", "\n        ORDER BY open_chats ASC, e.created_at ASC\n        LIMIT 1\n      "])), stationId, maxCapacity))];
                    case 1:
                        stationResult = _a.sent();
                        if (stationResult.rows && stationResult.rows.length > 0) {
                            return [2 /*return*/, stationResult.rows[0].id];
                        }
                        _a.label = 2;
                    case 2: return [4 /*yield*/, client_1.db.execute((0, drizzle_orm_1.sql)(templateObject_6 || (templateObject_6 = __makeTemplateObject(["\n      SELECT e.id, COUNT(c.id) as open_chats\n      FROM employees e\n      INNER JOIN users u ON u.id = e.user_id\n      LEFT JOIN conversations c ON c.assigned_employee_id = e.id AND c.status = 'open'\n      WHERE e.status != 'inactive'\n        AND u.status = 'active'\n      GROUP BY e.id, e.created_at\n      HAVING COUNT(c.id) < ", "\n      ORDER BY open_chats ASC, e.created_at ASC\n      LIMIT 1\n    "], ["\n      SELECT e.id, COUNT(c.id) as open_chats\n      FROM employees e\n      INNER JOIN users u ON u.id = e.user_id\n      LEFT JOIN conversations c ON c.assigned_employee_id = e.id AND c.status = 'open'\n      WHERE e.status != 'inactive'\n        AND u.status = 'active'\n      GROUP BY e.id, e.created_at\n      HAVING COUNT(c.id) < ", "\n      ORDER BY open_chats ASC, e.created_at ASC\n      LIMIT 1\n    "])), maxCapacity))];
                    case 3:
                        fallbackResult = _a.sent();
                        if (fallbackResult.rows && fallbackResult.rows.length > 0) {
                            return [2 /*return*/, fallbackResult.rows[0].id];
                        }
                        // 3. Any active employee
                        return [2 /*return*/, this.assignRoundRobin(null, 999)];
                }
            });
        });
    };
    /**
     * Fallback to supervisor or administrator if no agents are available
     */
    AssignmentService.fallbackToSupervisor = function (stationId) {
        return __awaiter(this, void 0, void 0, function () {
            var stationResult, result;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!stationId) return [3 /*break*/, 2];
                        return [4 /*yield*/, client_1.db.execute((0, drizzle_orm_1.sql)(templateObject_7 || (templateObject_7 = __makeTemplateObject(["\n        SELECT e.id\n        FROM employees e\n        INNER JOIN users u ON u.id = e.user_id\n        INNER JOIN roles r ON r.id = u.role_id\n        WHERE e.station_id = ", "\n          AND (r.name = 'adminstrator' OR r.name = 'admin' OR r.name = 'super_admin' OR r.name = 'supervisor')\n          AND u.status = 'active'\n        LIMIT 1\n      "], ["\n        SELECT e.id\n        FROM employees e\n        INNER JOIN users u ON u.id = e.user_id\n        INNER JOIN roles r ON r.id = u.role_id\n        WHERE e.station_id = ", "\n          AND (r.name = 'adminstrator' OR r.name = 'admin' OR r.name = 'super_admin' OR r.name = 'supervisor')\n          AND u.status = 'active'\n        LIMIT 1\n      "])), stationId))];
                    case 1:
                        stationResult = _c.sent();
                        if (stationResult.rows && stationResult.rows.length > 0) {
                            return [2 /*return*/, stationResult.rows[0].id];
                        }
                        _c.label = 2;
                    case 2: return [4 /*yield*/, client_1.db.execute((0, drizzle_orm_1.sql)(templateObject_8 || (templateObject_8 = __makeTemplateObject(["\n      SELECT e.id\n      FROM employees e\n      INNER JOIN users u ON u.id = e.user_id\n      INNER JOIN roles r ON r.id = u.role_id\n      WHERE (r.name = 'adminstrator' OR r.name = 'admin' OR r.name = 'super_admin' OR r.name = 'supervisor')\n        AND u.status = 'active'\n      LIMIT 1\n    "], ["\n      SELECT e.id\n      FROM employees e\n      INNER JOIN users u ON u.id = e.user_id\n      INNER JOIN roles r ON r.id = u.role_id\n      WHERE (r.name = 'adminstrator' OR r.name = 'admin' OR r.name = 'super_admin' OR r.name = 'supervisor')\n        AND u.status = 'active'\n      LIMIT 1\n    "]))))];
                    case 3:
                        result = _c.sent();
                        return [2 /*return*/, ((_b = (_a = result.rows) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.id) || null];
                }
            });
        });
    };
    /**
     * Orchestrate full automated assignment for a conversation
     */
    AssignmentService.autoAssignConversation = function (conversationId, options) {
        return __awaiter(this, void 0, void 0, function () {
            var assignmentEnabled, _a, conversation, existingEmp, targetStationId, defaultStation, sticky, targetStation, cont, meta, eventPayload, strategy, _b, _c, maxCapacity, _d, chosenEmployeeId, source, supervisorId, emp, finalStationId, cont, meta, eventPayload;
            var _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0: return [4 /*yield*/, this.getSetting('assignment_enabled', null)];
                    case 1:
                        if (!((_e = (_f.sent())) !== null && _e !== void 0)) return [3 /*break*/, 2];
                        _a = _e;
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.getSetting('autoAssignmentEnabled', true)];
                    case 3:
                        _a = (_f.sent());
                        _f.label = 4;
                    case 4:
                        assignmentEnabled = _a;
                        if (!assignmentEnabled) {
                            return [2 /*return*/, {
                                    assignedEmployeeId: null,
                                    assignedStationId: (options === null || options === void 0 ? void 0 : options.preferredStationId) || null,
                                    assignmentSource: 'manual',
                                }];
                        }
                        return [4 /*yield*/, client_1.db.query.conversations.findFirst({
                                where: (0, drizzle_orm_1.eq)(schema.conversations.id, conversationId),
                            })];
                    case 5:
                        conversation = _f.sent();
                        if (!conversation) {
                            throw new Error("Conversation not found: ".concat(conversationId));
                        }
                        if (!conversation.assignedEmployeeId) return [3 /*break*/, 7];
                        return [4 /*yield*/, client_1.db.query.employees.findFirst({
                                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.employees.id, conversation.assignedEmployeeId), (0, drizzle_orm_1.ne)(schema.employees.status, 'inactive')),
                            })];
                    case 6:
                        existingEmp = _f.sent();
                        if (existingEmp) {
                            logger_1.logger.info({ conversationId: conversationId, employeeId: conversation.assignedEmployeeId }, 'Conversation already persistently assigned to active employee, keeping assignment');
                            return [2 /*return*/, {
                                    assignedEmployeeId: conversation.assignedEmployeeId,
                                    assignedStationId: (options === null || options === void 0 ? void 0 : options.preferredStationId) || conversation.assignedStationId,
                                    assignmentSource: conversation.assignmentSource,
                                }];
                        }
                        _f.label = 7;
                    case 7:
                        targetStationId = (options === null || options === void 0 ? void 0 : options.preferredStationId) || conversation.assignedStationId;
                        if (!!targetStationId) return [3 /*break*/, 9];
                        return [4 /*yield*/, client_1.db.query.stations.findFirst({
                                where: (0, drizzle_orm_1.eq)(schema.stations.active, true),
                            })];
                    case 8:
                        defaultStation = _f.sent();
                        targetStationId = (defaultStation === null || defaultStation === void 0 ? void 0 : defaultStation.id) || null;
                        _f.label = 9;
                    case 9: return [4 /*yield*/, this.findStickyAgent(conversation.contactId)];
                    case 10:
                        sticky = _f.sent();
                        if (!sticky) return [3 /*break*/, 15];
                        logger_1.logger.info({ conversationId: conversationId, employeeId: sticky.employeeId, contactId: conversation.contactId }, 'Assigned via Persistent Sticky Agent');
                        targetStation = sticky.stationId || targetStationId;
                        return [4 /*yield*/, client_1.db
                                .update(schema.conversations)
                                .set({
                                assignedEmployeeId: sticky.employeeId,
                                assignedStationId: targetStation,
                                assignmentSource: 'direct',
                                assignedAt: new Date(),
                                updatedAt: new Date(),
                            })
                                .where((0, drizzle_orm_1.eq)(schema.conversations.id, conversationId))];
                    case 11:
                        _f.sent();
                        return [4 /*yield*/, client_1.db
                                .select()
                                .from(schema.contacts)
                                .where((0, drizzle_orm_1.eq)(schema.contacts.id, conversation.contactId))
                                .limit(1)];
                    case 12:
                        cont = (_f.sent())[0];
                        if (!cont) return [3 /*break*/, 14];
                        meta = (cont.metadata || {});
                        if (!(meta.assignedEmployeeId !== sticky.employeeId)) return [3 /*break*/, 14];
                        meta.assignedEmployeeId = sticky.employeeId;
                        return [4 /*yield*/, client_1.db
                                .update(schema.contacts)
                                .set({ metadata: meta, updatedAt: new Date() })
                                .where((0, drizzle_orm_1.eq)(schema.contacts.id, cont.id))];
                    case 13:
                        _f.sent();
                        _f.label = 14;
                    case 14:
                        eventPayload = {
                            id: conversationId,
                            conversationId: conversationId,
                            assignedEmployeeId: sticky.employeeId,
                            assignedStationId: targetStation,
                            assignmentSource: 'direct',
                        };
                        ws_hub_1.wsHub.broadcast('conversation.updated', eventPayload);
                        ws_hub_1.wsHub.broadcast('conversation_update', eventPayload);
                        ws_hub_1.wsHub.broadcast('assigned', {
                            conversationId: conversationId,
                            assignedEmployeeId: sticky.employeeId,
                        });
                        // Dispatch WhatsApp alert to sticky employee if not skipped
                        if (!(options === null || options === void 0 ? void 0 : options.skipWhatsAppNotification)) {
                            AssignmentService.notifyEmployeeViaWhatsApp({
                                employeeId: sticky.employeeId,
                                contactId: conversation.contactId,
                                conversationId: conversationId,
                                lastMessageText: conversation.lastMessageText,
                                whatsappAccountId: conversation.whatsappAccountId,
                                sourceDescription: 'تم توجيه المحادثة لك تلقائياً بصفتك الموظف المتابع لهذا العميل',
                            }).catch(function (e) { return logger_1.logger.warn({ err: e === null || e === void 0 ? void 0 : e.message }, 'Failed sticky employee WhatsApp notification'); });
                        }
                        return [2 /*return*/, {
                                assignedEmployeeId: sticky.employeeId,
                                assignedStationId: targetStation,
                                assignmentSource: 'direct',
                            }];
                    case 15:
                        _c = (options === null || options === void 0 ? void 0 : options.forceMode);
                        if (_c) return [3 /*break*/, 17];
                        return [4 /*yield*/, this.getSetting('assignment_mode', null)];
                    case 16:
                        _c = (_f.sent());
                        _f.label = 17;
                    case 17:
                        _b = _c;
                        if (_b) return [3 /*break*/, 19];
                        return [4 /*yield*/, this.getSetting('routingStrategy', 'round_robin')];
                    case 18:
                        _b = (_f.sent());
                        _f.label = 19;
                    case 19:
                        strategy = _b;
                        _d = Number;
                        return [4 /*yield*/, this.getSetting('maxConcurrentChatsPerAgent', null)];
                    case 20:
                        maxCapacity = _d.apply(void 0, [(_f.sent()) || 10]);
                        if (!(strategy === 'manual')) return [3 /*break*/, 23];
                        if (!targetStationId) return [3 /*break*/, 22];
                        return [4 /*yield*/, client_1.db
                                .update(schema.conversations)
                                .set({
                                assignedStationId: targetStationId,
                                assignmentSource: 'manual',
                                updatedAt: new Date(),
                            })
                                .where((0, drizzle_orm_1.eq)(schema.conversations.id, conversationId))];
                    case 21:
                        _f.sent();
                        _f.label = 22;
                    case 22: return [2 /*return*/, {
                            assignedEmployeeId: null,
                            assignedStationId: targetStationId,
                            assignmentSource: 'manual',
                        }];
                    case 23:
                        chosenEmployeeId = null;
                        source = 'round_robin';
                        if (!(strategy === 'least_busy')) return [3 /*break*/, 25];
                        return [4 /*yield*/, this.assignLeastBusy(targetStationId, maxCapacity)];
                    case 24:
                        chosenEmployeeId = _f.sent();
                        source = 'least_busy';
                        return [3 /*break*/, 27];
                    case 25: return [4 /*yield*/, this.assignRoundRobin(targetStationId, maxCapacity)];
                    case 26:
                        chosenEmployeeId = _f.sent();
                        source = 'round_robin';
                        _f.label = 27;
                    case 27:
                        supervisorId = null;
                        if (!!chosenEmployeeId) return [3 /*break*/, 29];
                        return [4 /*yield*/, this.fallbackToSupervisor(targetStationId)];
                    case 28:
                        supervisorId = _f.sent();
                        if (supervisorId) {
                            chosenEmployeeId = supervisorId;
                            source = 'system';
                            logger_1.logger.info({ conversationId: conversationId, targetStationId: targetStationId, supervisorId: supervisorId }, 'No station agents found, fell back to supervisor');
                        }
                        _f.label = 29;
                    case 29:
                        if (!chosenEmployeeId) return [3 /*break*/, 35];
                        return [4 /*yield*/, client_1.db.query.employees.findFirst({
                                where: (0, drizzle_orm_1.eq)(schema.employees.id, chosenEmployeeId),
                            })];
                    case 30:
                        emp = _f.sent();
                        finalStationId = (emp === null || emp === void 0 ? void 0 : emp.stationId) || targetStationId;
                        return [4 /*yield*/, client_1.db
                                .update(schema.conversations)
                                .set({
                                assignedEmployeeId: chosenEmployeeId,
                                assignedStationId: finalStationId,
                                assignedSupervisorId: supervisorId,
                                assignmentSource: source,
                                assignedAt: new Date(),
                                updatedAt: new Date(),
                            })
                                .where((0, drizzle_orm_1.eq)(schema.conversations.id, conversationId))];
                    case 31:
                        _f.sent();
                        return [4 /*yield*/, client_1.db
                                .select()
                                .from(schema.contacts)
                                .where((0, drizzle_orm_1.eq)(schema.contacts.id, conversation.contactId))
                                .limit(1)];
                    case 32:
                        cont = (_f.sent())[0];
                        if (!cont) return [3 /*break*/, 34];
                        meta = (cont.metadata || {});
                        meta.assignedEmployeeId = chosenEmployeeId;
                        return [4 /*yield*/, client_1.db
                                .update(schema.contacts)
                                .set({ metadata: meta, updatedAt: new Date() })
                                .where((0, drizzle_orm_1.eq)(schema.contacts.id, cont.id))];
                    case 33:
                        _f.sent();
                        _f.label = 34;
                    case 34:
                        logger_1.logger.info({ conversationId: conversationId, chosenEmployeeId: chosenEmployeeId, finalStationId: finalStationId, source: source }, 'Conversation successfully auto-assigned to employee and permanently bound to contact');
                        eventPayload = {
                            id: conversationId,
                            conversationId: conversationId,
                            assignedEmployeeId: chosenEmployeeId,
                            assignedStationId: finalStationId,
                            assignmentSource: source,
                        };
                        ws_hub_1.wsHub.broadcast('conversation.updated', eventPayload);
                        ws_hub_1.wsHub.broadcast('conversation_update', eventPayload);
                        ws_hub_1.wsHub.broadcast('assigned', {
                            conversationId: conversationId,
                            assignedEmployeeId: chosenEmployeeId,
                        });
                        // Dispatch WhatsApp alert to employee on their personal number if not skipped
                        if (!(options === null || options === void 0 ? void 0 : options.skipWhatsAppNotification)) {
                            AssignmentService.notifyEmployeeViaWhatsApp({
                                employeeId: chosenEmployeeId,
                                contactId: conversation.contactId,
                                conversationId: conversationId,
                                lastMessageText: conversation.lastMessageText,
                                whatsappAccountId: conversation.whatsappAccountId,
                                sourceDescription: 'تم توزيع محادثة عميل جديدة إليك آلياً عبر نظام التوزيع',
                            }).catch(function (e) { return logger_1.logger.warn({ err: e === null || e === void 0 ? void 0 : e.message }, 'Failed auto-assigned employee WhatsApp notification'); });
                        }
                        return [2 /*return*/, {
                                assignedEmployeeId: chosenEmployeeId,
                                assignedStationId: finalStationId,
                                assignmentSource: source,
                            }];
                    case 35:
                        if (!targetStationId) return [3 /*break*/, 37];
                        return [4 /*yield*/, client_1.db
                                .update(schema.conversations)
                                .set({
                                assignedStationId: targetStationId,
                                assignmentSource: 'system',
                                updatedAt: new Date(),
                            })
                                .where((0, drizzle_orm_1.eq)(schema.conversations.id, conversationId))];
                    case 36:
                        _f.sent();
                        _f.label = 37;
                    case 37: return [2 /*return*/, {
                            assignedEmployeeId: null,
                            assignedStationId: targetStationId,
                            assignmentSource: 'system',
                        }];
                }
            });
        });
    };
    /**
     * Send an instant WhatsApp notification to the employee's personal phone number
     * alerting them of an assigned client, with a direct wa.me link.
     */
    AssignmentService.notifyEmployeeViaWhatsApp = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var emp, rawEmpPhone, phoneValidation, cleanEmpDigits, contact, contactName, contactPhone, cleanCustDigits, waLink, lastMsg, employeeName, alertMessage, accountId, defaultAcc, empJid, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, client_1.db
                                .select({
                                id: schema.employees.id,
                                companyId: schema.employees.companyId,
                                whatsappNumber: schema.employees.whatsappNumber,
                                name: schema.users.name,
                            })
                                .from(schema.employees)
                                .leftJoin(schema.users, (0, drizzle_orm_1.eq)(schema.employees.userId, schema.users.id))
                                .where((0, drizzle_orm_1.eq)(schema.employees.id, params.employeeId))
                                .limit(1)];
                    case 1:
                        emp = (_a.sent())[0];
                        rawEmpPhone = ((emp === null || emp === void 0 ? void 0 : emp.whatsappNumber) || '').trim();
                        if (!rawEmpPhone) {
                            logger_1.logger.info({ employeeId: params.employeeId }, 'Employee has no WhatsApp number configured, skipping alert');
                            return [2 /*return*/, false];
                        }
                        phoneValidation = (0, phone_validator_1.validateAndFormatPhone)(rawEmpPhone);
                        cleanEmpDigits = phoneValidation.digitsOnly || rawEmpPhone.replace(/\D/g, '');
                        if (!cleanEmpDigits || cleanEmpDigits.length < 8) {
                            logger_1.logger.warn({ employeeId: params.employeeId, raw: rawEmpPhone }, 'Invalid employee phone number for WhatsApp alert');
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, client_1.db
                                .select()
                                .from(schema.contacts)
                                .where((0, drizzle_orm_1.eq)(schema.contacts.id, params.contactId))
                                .limit(1)];
                    case 2:
                        contact = (_a.sent())[0];
                        contactName = (contact === null || contact === void 0 ? void 0 : contact.name) || (contact === null || contact === void 0 ? void 0 : contact.phoneNumber) || 'عميل جديد';
                        contactPhone = (contact === null || contact === void 0 ? void 0 : contact.phoneNumber) || '';
                        cleanCustDigits = contactPhone.replace(/\D/g, '');
                        waLink = cleanCustDigits ? "https://wa.me/".concat(cleanCustDigits) : '';
                        lastMsg = params.lastMessageText || 'محادثة عميل جديدة واردة على النظام';
                        employeeName = emp.name || 'الموظف المسند';
                        alertMessage = [
                            "\uD83D\uDD14 *\u0625\u0634\u0639\u0627\u0631 \u0625\u0633\u0646\u0627\u062F \u0639\u0645\u064A\u0644 \u062C\u062F\u064A\u062F*",
                            "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501",
                            "\u0645\u0631\u062D\u0628\u0627\u064B *".concat(employeeName, "*\u060C ").concat(params.sourceDescription || 'تم إسناد محادثة العميل التالية إليك', ":"),
                            "\uD83D\uDC64 *\u0627\u0644\u0639\u0645\u064A\u0644:* ".concat(contactName),
                            "\uD83D\uDCF1 *\u0631\u0642\u0645 \u0627\u0644\u0639\u0645\u064A\u0644:* ".concat(contactPhone),
                            lastMsg ? "\uD83D\uDCAC *\u0622\u062E\u0631 \u0631\u0633\u0627\u0644\u0629:* ".concat(lastMsg) : '',
                            waLink ? "\uD83D\uDC49 *\u0631\u0627\u0628\u0637 \u0645\u062D\u0627\u062F\u062B\u0629 \u0648\u0627\u062A\u0633\u0627\u0628 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 \u0644\u0644\u0639\u0645\u064A\u0644:* ".concat(waLink) : '',
                            "\u23F0 *\u0627\u0644\u0648\u0642\u062A:* ".concat(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })),
                            "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501",
                            "\u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0648\u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0639\u0645\u064A\u0644 \u0639\u0628\u0631 \u0644\u0648\u062D\u0629 \u062A\u062D\u0643\u0645 CRM."
                        ].filter(Boolean).join('\n');
                        accountId = params.whatsappAccountId;
                        if (!!accountId) return [3 /*break*/, 4];
                        return [4 /*yield*/, client_1.db.select().from(schema.whatsappAccounts).limit(1)];
                    case 3:
                        defaultAcc = (_a.sent())[0];
                        if (defaultAcc)
                            accountId = defaultAcc.id;
                        _a.label = 4;
                    case 4:
                        if (!accountId || !emp.companyId) {
                            logger_1.logger.warn({ employeeId: params.employeeId }, 'Cannot dispatch assignment WhatsApp alert: No WhatsApp account or company available');
                            return [2 /*return*/, false];
                        }
                        empJid = "".concat(cleanEmpDigits, "@s.whatsapp.net");
                        return [4 /*yield*/, outbound_queue_service_1.OutboundQueueService.sendMessage({
                                companyId: emp.companyId,
                                accountId: accountId,
                                conversationId: params.conversationId,
                                toJid: empJid,
                                type: 'text',
                                text: alertMessage,
                                priority: 1,
                            })];
                    case 5:
                        _a.sent();
                        logger_1.logger.info({ employeeId: emp.id, employeePhone: phoneValidation.formatted || rawEmpPhone, contactPhone: contactPhone }, 'Successfully dispatched WhatsApp assignment alert to employee personal number');
                        return [2 /*return*/, true];
                    case 6:
                        err_2 = _a.sent();
                        logger_1.logger.error({ err: err_2 === null || err_2 === void 0 ? void 0 : err_2.message, stack: err_2 === null || err_2 === void 0 ? void 0 : err_2.stack, employeeId: params.employeeId, conversationId: params.conversationId }, 'Failed to dispatch WhatsApp assignment alert to employee');
                        return [2 /*return*/, false];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    return AssignmentService;
}());
exports.AssignmentService = AssignmentService;
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8;
