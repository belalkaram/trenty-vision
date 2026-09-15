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
exports.reportsRoutes = reportsRoutes;
var drizzle_orm_1 = require("drizzle-orm");
var client_1 = require("../../database/client");
var index_1 = require("../../database/schema/index");
var auth_middleware_1 = require("../../middleware/auth.middleware");
var logger_1 = require("../../utils/logger");
function escapeCsv(value) {
    if (value === null || value === undefined)
        return '';
    var str = String(value).replace(/"/g, '""');
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return "\"".concat(str, "\"");
    }
    return str;
}
function getPeriodDate(period) {
    if (!period || period === 'all')
        return null;
    var now = new Date();
    if (period === 'today') {
        var today = new Date(now);
        today.setHours(0, 0, 0, 0);
        return today;
    }
    if (period === '24h') {
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    if (period === '7d') {
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    if (period === '30d') {
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    if (period === 'this_month') {
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return null;
}
function reportsRoutes(app) {
    return __awaiter(this, void 0, void 0, function () {
        /**
         * Aggregated metrics for operations & dashboard
         */
        function getMetricsData(period) {
            return __awaiter(this, void 0, void 0, function () {
                var fromDate, convResult, convStats, msgResult, msgStats, contactResult, contactStats, leadResult, funnel, _i, _a, r, avgRespResult, avgResp, stationsResult, employeesResult, totalConvs, closedConvs, resolutionRate, employeeRows, stationRows;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            fromDate = getPeriodDate(period);
                            return [4 /*yield*/, client_1.db.execute((0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n      SELECT \n        COUNT(*) AS total,\n        COUNT(*) FILTER (WHERE status = 'open') AS open,\n        COUNT(*) FILTER (WHERE status = 'pending') AS pending,\n        COUNT(*) FILTER (WHERE status = 'waiting') AS waiting,\n        COUNT(*) FILTER (WHERE status = 'closed') AS closed\n      FROM conversations\n      ", "\n    "], ["\n      SELECT \n        COUNT(*) AS total,\n        COUNT(*) FILTER (WHERE status = 'open') AS open,\n        COUNT(*) FILTER (WHERE status = 'pending') AS pending,\n        COUNT(*) FILTER (WHERE status = 'waiting') AS waiting,\n        COUNT(*) FILTER (WHERE status = 'closed') AS closed\n      FROM conversations\n      ", "\n    "])), fromDate ? (0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["WHERE created_at >= ", ""], ["WHERE created_at >= ", ""])), fromDate) : (0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject([""], [""])))))];
                        case 1:
                            convResult = _b.sent();
                            convStats = convResult.rows[0];
                            return [4 /*yield*/, client_1.db.execute((0, drizzle_orm_1.sql)(templateObject_6 || (templateObject_6 = __makeTemplateObject(["\n      SELECT \n        COUNT(*) AS total,\n        COUNT(*) FILTER (WHERE direction = 'incoming') AS incoming,\n        COUNT(*) FILTER (WHERE direction = 'outgoing') AS outgoing\n      FROM messages\n      ", "\n    "], ["\n      SELECT \n        COUNT(*) AS total,\n        COUNT(*) FILTER (WHERE direction = 'incoming') AS incoming,\n        COUNT(*) FILTER (WHERE direction = 'outgoing') AS outgoing\n      FROM messages\n      ", "\n    "])), fromDate ? (0, drizzle_orm_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["WHERE created_at >= ", ""], ["WHERE created_at >= ", ""])), fromDate) : (0, drizzle_orm_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject([""], [""])))))];
                        case 2:
                            msgResult = _b.sent();
                            msgStats = msgResult.rows[0];
                            return [4 /*yield*/, client_1.db.execute((0, drizzle_orm_1.sql)(templateObject_9 || (templateObject_9 = __makeTemplateObject(["\n      SELECT COUNT(*) AS total\n      FROM contacts\n      ", "\n    "], ["\n      SELECT COUNT(*) AS total\n      FROM contacts\n      ", "\n    "])), fromDate ? (0, drizzle_orm_1.sql)(templateObject_7 || (templateObject_7 = __makeTemplateObject(["WHERE created_at >= ", ""], ["WHERE created_at >= ", ""])), fromDate) : (0, drizzle_orm_1.sql)(templateObject_8 || (templateObject_8 = __makeTemplateObject([""], [""])))))];
                        case 3:
                            contactResult = _b.sent();
                            contactStats = contactResult.rows[0];
                            return [4 /*yield*/, client_1.db.execute((0, drizzle_orm_1.sql)(templateObject_12 || (templateObject_12 = __makeTemplateObject(["\n      SELECT stage, COUNT(*) AS count\n      FROM leads\n      ", "\n      GROUP BY stage\n    "], ["\n      SELECT stage, COUNT(*) AS count\n      FROM leads\n      ", "\n      GROUP BY stage\n    "])), fromDate ? (0, drizzle_orm_1.sql)(templateObject_10 || (templateObject_10 = __makeTemplateObject(["WHERE created_at >= ", ""], ["WHERE created_at >= ", ""])), fromDate) : (0, drizzle_orm_1.sql)(templateObject_11 || (templateObject_11 = __makeTemplateObject([""], [""])))))];
                        case 4:
                            leadResult = _b.sent();
                            funnel = {
                                new: 0,
                                contacted: 0,
                                qualified: 0,
                                waiting: 0,
                                converted: 0,
                                lost: 0,
                            };
                            for (_i = 0, _a = leadResult.rows; _i < _a.length; _i++) {
                                r = _a[_i];
                                if (r.stage)
                                    funnel[r.stage] = Number(r.count || 0);
                            }
                            return [4 /*yield*/, client_1.db.execute((0, drizzle_orm_1.sql)(templateObject_15 || (templateObject_15 = __makeTemplateObject(["\n      WITH message_pairs AS (\n        SELECT \n          m_in.id,\n          m_in.conversation_id,\n          m_in.created_at AS in_time,\n          MIN(m_out.created_at) AS out_time\n        FROM messages m_in\n        INNER JOIN messages m_out \n          ON m_in.conversation_id = m_out.conversation_id\n          AND m_out.direction = 'outgoing'\n          AND m_out.created_at > m_in.created_at\n        WHERE m_in.direction = 'incoming' ", "\n        GROUP BY m_in.id, m_in.conversation_id, m_in.created_at\n      )\n      SELECT \n        COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (out_time - in_time)))), 0) AS avg_response_seconds\n      FROM message_pairs\n    "], ["\n      WITH message_pairs AS (\n        SELECT \n          m_in.id,\n          m_in.conversation_id,\n          m_in.created_at AS in_time,\n          MIN(m_out.created_at) AS out_time\n        FROM messages m_in\n        INNER JOIN messages m_out \n          ON m_in.conversation_id = m_out.conversation_id\n          AND m_out.direction = 'outgoing'\n          AND m_out.created_at > m_in.created_at\n        WHERE m_in.direction = 'incoming' ", "\n        GROUP BY m_in.id, m_in.conversation_id, m_in.created_at\n      )\n      SELECT \n        COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (out_time - in_time)))), 0) AS avg_response_seconds\n      FROM message_pairs\n    "])), fromDate ? (0, drizzle_orm_1.sql)(templateObject_13 || (templateObject_13 = __makeTemplateObject(["AND m_in.created_at >= ", ""], ["AND m_in.created_at >= ", ""])), fromDate) : (0, drizzle_orm_1.sql)(templateObject_14 || (templateObject_14 = __makeTemplateObject([""], [""])))))];
                        case 5:
                            avgRespResult = _b.sent();
                            avgResp = avgRespResult.rows[0];
                            return [4 /*yield*/, client_1.db.execute((0, drizzle_orm_1.sql)(templateObject_18 || (templateObject_18 = __makeTemplateObject(["\n      SELECT \n        s.id,\n        s.name,\n        s.color,\n        COUNT(c.id) AS total_conversations,\n        COUNT(c.id) FILTER (WHERE c.status = 'open') AS open_conversations\n      FROM stations s\n      LEFT JOIN conversations c ON s.id = c.assigned_station_id ", "\n      WHERE s.active = true OR s.active IS NULL\n      GROUP BY s.id, s.name, s.color\n      ORDER BY total_conversations DESC, s.name ASC\n    "], ["\n      SELECT \n        s.id,\n        s.name,\n        s.color,\n        COUNT(c.id) AS total_conversations,\n        COUNT(c.id) FILTER (WHERE c.status = 'open') AS open_conversations\n      FROM stations s\n      LEFT JOIN conversations c ON s.id = c.assigned_station_id ", "\n      WHERE s.active = true OR s.active IS NULL\n      GROUP BY s.id, s.name, s.color\n      ORDER BY total_conversations DESC, s.name ASC\n    "])), fromDate ? (0, drizzle_orm_1.sql)(templateObject_16 || (templateObject_16 = __makeTemplateObject(["AND c.created_at >= ", ""], ["AND c.created_at >= ", ""])), fromDate) : (0, drizzle_orm_1.sql)(templateObject_17 || (templateObject_17 = __makeTemplateObject([""], [""])))))];
                        case 6:
                            stationsResult = _b.sent();
                            return [4 /*yield*/, client_1.db.execute((0, drizzle_orm_1.sql)(templateObject_25 || (templateObject_25 = __makeTemplateObject(["\n      WITH employee_convs AS (\n        SELECT \n          assigned_employee_id,\n          COUNT(id) AS total_assigned,\n          COUNT(id) FILTER (WHERE status = 'closed') AS total_resolved\n        FROM conversations\n        ", "\n        GROUP BY assigned_employee_id\n      ),\n      employee_msgs AS (\n        SELECT \n          sender_user_id,\n          COUNT(id) AS outgoing_messages\n        FROM messages\n        WHERE direction = 'outgoing' ", "\n        GROUP BY sender_user_id\n      ),\n      employee_resp AS (\n        WITH emp_pairs AS (\n          SELECT \n            c.assigned_employee_id,\n            m_in.id,\n            m_in.created_at AS in_time,\n            MIN(m_out.created_at) AS out_time\n          FROM messages m_in\n          INNER JOIN conversations c ON m_in.conversation_id = c.id\n          INNER JOIN messages m_out \n            ON m_in.conversation_id = m_out.conversation_id\n            AND m_out.direction = 'outgoing'\n            AND m_out.created_at > m_in.created_at\n          WHERE m_in.direction = 'incoming' ", "\n          GROUP BY c.assigned_employee_id, m_in.id, m_in.created_at\n        )\n        SELECT \n          assigned_employee_id,\n          COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (out_time - in_time)))), 0) AS avg_seconds\n        FROM emp_pairs\n        GROUP BY assigned_employee_id\n      )\n      SELECT \n        e.id,\n        e.status,\n        u.name,\n        u.email,\n        s.name AS station_name,\n        COALESCE(ec.total_assigned, 0) AS total_assigned,\n        COALESCE(ec.total_resolved, 0) AS total_resolved,\n        COALESCE(em.outgoing_messages, 0) AS outgoing_messages,\n        COALESCE(er.avg_seconds, 0) AS avg_response_seconds\n      FROM employees e\n      INNER JOIN users u ON e.user_id = u.id\n      LEFT JOIN stations s ON e.station_id = s.id\n      LEFT JOIN employee_convs ec ON e.id = ec.assigned_employee_id\n      LEFT JOIN employee_msgs em ON u.id = em.sender_user_id\n      LEFT JOIN employee_resp er ON e.id = er.assigned_employee_id\n      ORDER BY total_assigned DESC, u.name ASC\n    "], ["\n      WITH employee_convs AS (\n        SELECT \n          assigned_employee_id,\n          COUNT(id) AS total_assigned,\n          COUNT(id) FILTER (WHERE status = 'closed') AS total_resolved\n        FROM conversations\n        ", "\n        GROUP BY assigned_employee_id\n      ),\n      employee_msgs AS (\n        SELECT \n          sender_user_id,\n          COUNT(id) AS outgoing_messages\n        FROM messages\n        WHERE direction = 'outgoing' ", "\n        GROUP BY sender_user_id\n      ),\n      employee_resp AS (\n        WITH emp_pairs AS (\n          SELECT \n            c.assigned_employee_id,\n            m_in.id,\n            m_in.created_at AS in_time,\n            MIN(m_out.created_at) AS out_time\n          FROM messages m_in\n          INNER JOIN conversations c ON m_in.conversation_id = c.id\n          INNER JOIN messages m_out \n            ON m_in.conversation_id = m_out.conversation_id\n            AND m_out.direction = 'outgoing'\n            AND m_out.created_at > m_in.created_at\n          WHERE m_in.direction = 'incoming' ", "\n          GROUP BY c.assigned_employee_id, m_in.id, m_in.created_at\n        )\n        SELECT \n          assigned_employee_id,\n          COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (out_time - in_time)))), 0) AS avg_seconds\n        FROM emp_pairs\n        GROUP BY assigned_employee_id\n      )\n      SELECT \n        e.id,\n        e.status,\n        u.name,\n        u.email,\n        s.name AS station_name,\n        COALESCE(ec.total_assigned, 0) AS total_assigned,\n        COALESCE(ec.total_resolved, 0) AS total_resolved,\n        COALESCE(em.outgoing_messages, 0) AS outgoing_messages,\n        COALESCE(er.avg_seconds, 0) AS avg_response_seconds\n      FROM employees e\n      INNER JOIN users u ON e.user_id = u.id\n      LEFT JOIN stations s ON e.station_id = s.id\n      LEFT JOIN employee_convs ec ON e.id = ec.assigned_employee_id\n      LEFT JOIN employee_msgs em ON u.id = em.sender_user_id\n      LEFT JOIN employee_resp er ON e.id = er.assigned_employee_id\n      ORDER BY total_assigned DESC, u.name ASC\n    "])), fromDate ? (0, drizzle_orm_1.sql)(templateObject_19 || (templateObject_19 = __makeTemplateObject(["WHERE created_at >= ", ""], ["WHERE created_at >= ", ""])), fromDate) : (0, drizzle_orm_1.sql)(templateObject_20 || (templateObject_20 = __makeTemplateObject([""], [""]))), fromDate ? (0, drizzle_orm_1.sql)(templateObject_21 || (templateObject_21 = __makeTemplateObject(["AND created_at >= ", ""], ["AND created_at >= ", ""])), fromDate) : (0, drizzle_orm_1.sql)(templateObject_22 || (templateObject_22 = __makeTemplateObject([""], [""]))), fromDate ? (0, drizzle_orm_1.sql)(templateObject_23 || (templateObject_23 = __makeTemplateObject(["AND m_in.created_at >= ", ""], ["AND m_in.created_at >= ", ""])), fromDate) : (0, drizzle_orm_1.sql)(templateObject_24 || (templateObject_24 = __makeTemplateObject([""], [""])))))];
                        case 7:
                            employeesResult = _b.sent();
                            totalConvs = Number((convStats === null || convStats === void 0 ? void 0 : convStats.total) || 0);
                            closedConvs = Number((convStats === null || convStats === void 0 ? void 0 : convStats.closed) || 0);
                            resolutionRate = totalConvs > 0 ? Math.round((closedConvs / totalConvs) * 100) : 0;
                            employeeRows = employeesResult.rows;
                            stationRows = stationsResult.rows;
                            return [2 /*return*/, {
                                    overview: {
                                        totalConversations: totalConvs,
                                        openConversations: Number((convStats === null || convStats === void 0 ? void 0 : convStats.open) || 0),
                                        pendingConversations: Number((convStats === null || convStats === void 0 ? void 0 : convStats.pending) || 0),
                                        waitingConversations: Number((convStats === null || convStats === void 0 ? void 0 : convStats.waiting) || 0),
                                        closedConversations: closedConvs,
                                        resolvedConversations: closedConvs,
                                        resolutionRate: resolutionRate,
                                        totalMessages: Number((msgStats === null || msgStats === void 0 ? void 0 : msgStats.total) || 0),
                                        totalMessagesSent: Number((msgStats === null || msgStats === void 0 ? void 0 : msgStats.outgoing) || 0),
                                        totalMessagesReceived: Number((msgStats === null || msgStats === void 0 ? void 0 : msgStats.incoming) || 0),
                                        incomingMessages: Number((msgStats === null || msgStats === void 0 ? void 0 : msgStats.incoming) || 0),
                                        outgoingMessages: Number((msgStats === null || msgStats === void 0 ? void 0 : msgStats.outgoing) || 0),
                                        totalContacts: Number((contactStats === null || contactStats === void 0 ? void 0 : contactStats.total) || 0),
                                        activeAgentsCount: employeeRows.filter(function (e) { return e.status === 'active'; }).length,
                                        avgResponseTimeSeconds: Number((avgResp === null || avgResp === void 0 ? void 0 : avgResp.avg_response_seconds) || 0),
                                    },
                                    leadsFunnel: funnel,
                                    stations: stationRows.map(function (s) { return ({
                                        id: s.id,
                                        stationId: s.id,
                                        name: s.name,
                                        stationName: s.name,
                                        color: s.color || '#1c9770',
                                        totalChats: Number(s.total_conversations || 0),
                                        activeChats: Number(s.open_conversations || 0),
                                        totalConversations: Number(s.total_conversations || 0),
                                        openConversations: Number(s.open_conversations || 0),
                                        conversationCount: Number(s.total_conversations || 0),
                                    }); }),
                                    employees: employeeRows.map(function (e) {
                                        var avgSecs = Number(e.avg_response_seconds || 0);
                                        return {
                                            id: e.id,
                                            agentId: e.id,
                                            name: e.name,
                                            agentName: e.name,
                                            email: e.email,
                                            status: e.status,
                                            stationName: e.station_name || 'غير مسند',
                                            totalAssigned: Number(e.total_assigned || 0),
                                            assignedConversations: Number(e.total_assigned || 0),
                                            totalResolved: Number(e.total_resolved || 0),
                                            closedConversations: Number(e.total_resolved || 0),
                                            resolvedConversations: Number(e.total_resolved || 0),
                                            outgoingMessages: Number(e.outgoing_messages || 0),
                                            avgResponseTimeSeconds: avgSecs,
                                            avgResponseMinutes: Math.round(avgSecs / 60),
                                            onlineHours: e.status === 'active' ? 8 : 0,
                                        };
                                    }),
                                }];
                    }
                });
            });
        }
        var _this = this;
        return __generator(this, function (_a) {
            app.addHook('preHandler', auth_middleware_1.authenticate);
            /**
             * GET /api/v1/reports/metrics — Aggregated metrics for operations & dashboard
             */
            app.get('/metrics', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var period, data, err_1;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            period = (_a = request.query) === null || _a === void 0 ? void 0 : _a.period;
                            return [4 /*yield*/, getMetricsData(period)];
                        case 1:
                            data = _b.sent();
                            return [2 /*return*/, reply.send({ success: true, data: data })];
                        case 2:
                            err_1 = _b.sent();
                            logger_1.logger.error({ err: err_1 }, 'Failed to fetch reports metrics');
                            return [2 /*return*/, reply.status(500).send({ success: false, error: 'Internal Server Error' })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            /**
             * GET /api/v1/reports/overview — Overview metrics
             */
            app.get('/overview', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var period, data, err_2;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            period = (_a = request.query) === null || _a === void 0 ? void 0 : _a.period;
                            return [4 /*yield*/, getMetricsData(period)];
                        case 1:
                            data = _b.sent();
                            return [2 /*return*/, reply.send({ success: true, data: data.overview })];
                        case 2:
                            err_2 = _b.sent();
                            logger_1.logger.error({ err: err_2 }, 'Failed to fetch overview metrics');
                            return [2 /*return*/, reply.status(500).send({ success: false, error: 'Internal Server Error' })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            /**
             * GET /api/v1/reports/agents — Agent performance metrics
             */
            app.get('/agents', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var period, data, err_3;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            period = (_a = request.query) === null || _a === void 0 ? void 0 : _a.period;
                            return [4 /*yield*/, getMetricsData(period)];
                        case 1:
                            data = _b.sent();
                            return [2 /*return*/, reply.send({ success: true, data: data.employees })];
                        case 2:
                            err_3 = _b.sent();
                            logger_1.logger.error({ err: err_3 }, 'Failed to fetch agent metrics');
                            return [2 /*return*/, reply.status(500).send({ success: false, error: 'Internal Server Error' })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            /**
             * GET /api/v1/reports/stations — Station volume metrics
             */
            app.get('/stations', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var period, data, err_4;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            period = (_a = request.query) === null || _a === void 0 ? void 0 : _a.period;
                            return [4 /*yield*/, getMetricsData(period)];
                        case 1:
                            data = _b.sent();
                            return [2 /*return*/, reply.send({ success: true, data: data.stations })];
                        case 2:
                            err_4 = _b.sent();
                            logger_1.logger.error({ err: err_4 }, 'Failed to fetch station metrics');
                            return [2 /*return*/, reply.status(500).send({ success: false, error: 'Internal Server Error' })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            /**
             * GET /api/v1/reports/conversations/export — Export conversations to CSV
             */
            app.get('/conversations/export', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var period, fromDate, query, rows, _a, headers, csvLines, _i, rows_1, r, line, csvContent, dateStr, err_5;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 5, , 6]);
                            period = (_b = request.query) === null || _b === void 0 ? void 0 : _b.period;
                            fromDate = getPeriodDate(period);
                            query = client_1.db
                                .select({
                                id: index_1.conversations.id,
                                status: index_1.conversations.status,
                                contactName: index_1.contacts.name,
                                contactPhone: index_1.contacts.phoneNumber,
                                stationName: index_1.stations.name,
                                employeeName: index_1.users.name,
                                unreadCount: index_1.conversations.unreadCount,
                                lastMessageText: index_1.conversations.lastMessageText,
                                createdAt: index_1.conversations.createdAt,
                                updatedAt: index_1.conversations.updatedAt,
                            })
                                .from(index_1.conversations)
                                .innerJoin(index_1.contacts, (0, drizzle_orm_1.eq)(index_1.conversations.contactId, index_1.contacts.id))
                                .leftJoin(index_1.stations, (0, drizzle_orm_1.eq)(index_1.conversations.assignedStationId, index_1.stations.id))
                                .leftJoin(index_1.employees, (0, drizzle_orm_1.eq)(index_1.conversations.assignedEmployeeId, index_1.employees.id))
                                .leftJoin(index_1.users, (0, drizzle_orm_1.eq)(index_1.employees.userId, index_1.users.id));
                            if (!fromDate) return [3 /*break*/, 2];
                            return [4 /*yield*/, query.where((0, drizzle_orm_1.gte)(index_1.conversations.createdAt, fromDate)).orderBy((0, drizzle_orm_1.desc)(index_1.conversations.createdAt))];
                        case 1:
                            _a = _c.sent();
                            return [3 /*break*/, 4];
                        case 2: return [4 /*yield*/, query.orderBy((0, drizzle_orm_1.desc)(index_1.conversations.createdAt))];
                        case 3:
                            _a = _c.sent();
                            _c.label = 4;
                        case 4:
                            rows = _a;
                            headers = [
                                'معرف المحادثة',
                                'اسم العميل',
                                'رقم الهاتف',
                                'المحطة',
                                'الموظف المسند',
                                'الحالة',
                                'غير مقروءة',
                                'آخر رسالة',
                                'تاريخ البدء',
                                'آخر تحديث',
                            ];
                            csvLines = [headers.map(escapeCsv).join(',')];
                            for (_i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
                                r = rows_1[_i];
                                line = [
                                    r.id,
                                    r.contactName,
                                    r.contactPhone,
                                    r.stationName || 'غير مسند',
                                    r.employeeName || 'غير مسند',
                                    r.status,
                                    r.unreadCount,
                                    r.lastMessageText || '',
                                    r.createdAt ? new Date(r.createdAt).toISOString() : '',
                                    r.updatedAt ? new Date(r.updatedAt).toISOString() : '',
                                ];
                                csvLines.push(line.map(escapeCsv).join(','));
                            }
                            csvContent = '\uFEFF' + csvLines.join('\r\n');
                            dateStr = new Date().toISOString().split('T')[0];
                            reply.header('Content-Type', 'text/csv; charset=utf-8');
                            reply.header('Content-Disposition', "attachment; filename=\"trenty_vision_conversations_".concat(dateStr, ".csv\""));
                            return [2 /*return*/, reply.send(csvContent)];
                        case 5:
                            err_5 = _c.sent();
                            logger_1.logger.error({ err: err_5 }, 'Failed to export conversations CSV');
                            return [2 /*return*/, reply.status(500).send({ success: false, error: 'Failed to export conversations' })];
                        case 6: return [2 /*return*/];
                    }
                });
            }); });
            /**
             * GET /api/v1/reports/contacts/export — Export contacts & leads to CSV
             */
            app.get('/contacts/export', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var period, fromDate, query, rows, _a, headers, csvLines, _i, rows_2, r, line, csvContent, dateStr, err_6;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 5, , 6]);
                            period = (_b = request.query) === null || _b === void 0 ? void 0 : _b.period;
                            fromDate = getPeriodDate(period);
                            query = client_1.db
                                .select({
                                id: index_1.contacts.id,
                                name: index_1.contacts.name,
                                phoneNumber: index_1.contacts.phoneNumber,
                                whatsappJid: index_1.contacts.whatsappJid,
                                source: index_1.contacts.source,
                                createdAt: index_1.contacts.createdAt,
                                leadStage: index_1.leads.stage,
                                campaign: index_1.leads.campaign,
                                destination: index_1.leads.destination,
                            })
                                .from(index_1.contacts)
                                .leftJoin(index_1.leads, (0, drizzle_orm_1.eq)(index_1.contacts.id, index_1.leads.contactId));
                            if (!fromDate) return [3 /*break*/, 2];
                            return [4 /*yield*/, query.where((0, drizzle_orm_1.gte)(index_1.contacts.createdAt, fromDate)).orderBy((0, drizzle_orm_1.desc)(index_1.contacts.createdAt))];
                        case 1:
                            _a = _c.sent();
                            return [3 /*break*/, 4];
                        case 2: return [4 /*yield*/, query.orderBy((0, drizzle_orm_1.desc)(index_1.contacts.createdAt))];
                        case 3:
                            _a = _c.sent();
                            _c.label = 4;
                        case 4:
                            rows = _a;
                            headers = [
                                'معرف العميل',
                                'اسم العميل',
                                'رقم الهاتف',
                                'معرف واتساب',
                                'المصدر',
                                'مرحلة العميل (Lead Stage)',
                                'الحملة التسويقية',
                                'الخدمة أو المنتج المطلوب',
                                'تاريخ التسجيل',
                            ];
                            csvLines = [headers.map(escapeCsv).join(',')];
                            for (_i = 0, rows_2 = rows; _i < rows_2.length; _i++) {
                                r = rows_2[_i];
                                line = [
                                    r.id,
                                    r.name,
                                    r.phoneNumber,
                                    r.whatsappJid || '',
                                    r.source || 'direct',
                                    r.leadStage || 'none',
                                    r.campaign || '',
                                    r.destination || '',
                                    r.createdAt ? new Date(r.createdAt).toISOString() : '',
                                ];
                                csvLines.push(line.map(escapeCsv).join(','));
                            }
                            csvContent = '\uFEFF' + csvLines.join('\r\n');
                            dateStr = new Date().toISOString().split('T')[0];
                            reply.header('Content-Type', 'text/csv; charset=utf-8');
                            reply.header('Content-Disposition', "attachment; filename=\"trenty_vision_contacts_leads_".concat(dateStr, ".csv\""));
                            return [2 /*return*/, reply.send(csvContent)];
                        case 5:
                            err_6 = _c.sent();
                            logger_1.logger.error({ err: err_6 }, 'Failed to export contacts CSV');
                            return [2 /*return*/, reply.status(500).send({ success: false, error: 'Failed to export contacts' })];
                        case 6: return [2 /*return*/];
                    }
                });
            }); });
            /**
             * GET /api/v1/reports/employee-whatsapp-performance — Track employees with linked WhatsApp numbers
             */
            app.get('/employee-whatsapp-performance', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var period, fromDate, employeesResult, employeeRows, data, err_7;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            period = (_a = request.query) === null || _a === void 0 ? void 0 : _a.period;
                            fromDate = getPeriodDate(period);
                            return [4 /*yield*/, client_1.db.execute((0, drizzle_orm_1.sql)(templateObject_34 || (templateObject_34 = __makeTemplateObject(["\n        WITH employee_convs AS (\n          SELECT \n            assigned_employee_id,\n            COUNT(id) AS total_assigned,\n            COUNT(id) FILTER (WHERE status = 'closed') AS total_resolved\n          FROM conversations\n          ", "\n          GROUP BY assigned_employee_id\n        ),\n        employee_msgs AS (\n          SELECT \n            sender_user_id,\n            COUNT(id) AS outgoing_messages\n          FROM messages\n          WHERE direction = 'outgoing' ", "\n          GROUP BY sender_user_id\n        ),\n        employee_replied_convs AS (\n          SELECT \n            sender_user_id,\n            COUNT(DISTINCT conversation_id) AS replied_convs_count\n          FROM messages\n          WHERE direction = 'outgoing' ", "\n          GROUP BY sender_user_id\n        ),\n        employee_resp AS (\n          WITH emp_pairs AS (\n            SELECT \n              c.assigned_employee_id,\n              m_in.id,\n              m_in.created_at AS in_time,\n              MIN(m_out.created_at) AS out_time\n            FROM messages m_in\n            INNER JOIN conversations c ON m_in.conversation_id = c.id\n            INNER JOIN messages m_out \n              ON m_in.conversation_id = m_out.conversation_id\n              AND m_out.direction = 'outgoing'\n              AND m_out.created_at > m_in.created_at\n            WHERE m_in.direction = 'incoming' ", "\n            GROUP BY c.assigned_employee_id, m_in.id, m_in.created_at\n          )\n          SELECT \n            assigned_employee_id,\n            COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (out_time - in_time)))), 0) AS avg_seconds\n          FROM emp_pairs\n          GROUP BY assigned_employee_id\n        )\n        SELECT \n          e.id,\n          e.status,\n          e.whatsapp_number,\n          u.name,\n          s.name AS station_name,\n          COALESCE(ec.total_assigned, 0) AS total_assigned,\n          COALESCE(em.outgoing_messages, 0) AS outgoing_messages,\n          COALESCE(erc.replied_convs_count, 0) AS replied_customers,\n          COALESCE(er.avg_seconds, 0) AS avg_response_seconds\n        FROM employees e\n        INNER JOIN users u ON e.user_id = u.id\n        LEFT JOIN stations s ON e.station_id = s.id\n        LEFT JOIN employee_convs ec ON e.id = ec.assigned_employee_id\n        LEFT JOIN employee_msgs em ON u.id = em.sender_user_id\n        LEFT JOIN employee_replied_convs erc ON u.id = erc.sender_user_id\n        LEFT JOIN employee_resp er ON e.id = er.assigned_employee_id\n        WHERE e.whatsapp_number IS NOT NULL AND e.whatsapp_number != ''\n        ORDER BY total_assigned DESC, u.name ASC\n      "], ["\n        WITH employee_convs AS (\n          SELECT \n            assigned_employee_id,\n            COUNT(id) AS total_assigned,\n            COUNT(id) FILTER (WHERE status = 'closed') AS total_resolved\n          FROM conversations\n          ", "\n          GROUP BY assigned_employee_id\n        ),\n        employee_msgs AS (\n          SELECT \n            sender_user_id,\n            COUNT(id) AS outgoing_messages\n          FROM messages\n          WHERE direction = 'outgoing' ", "\n          GROUP BY sender_user_id\n        ),\n        employee_replied_convs AS (\n          SELECT \n            sender_user_id,\n            COUNT(DISTINCT conversation_id) AS replied_convs_count\n          FROM messages\n          WHERE direction = 'outgoing' ", "\n          GROUP BY sender_user_id\n        ),\n        employee_resp AS (\n          WITH emp_pairs AS (\n            SELECT \n              c.assigned_employee_id,\n              m_in.id,\n              m_in.created_at AS in_time,\n              MIN(m_out.created_at) AS out_time\n            FROM messages m_in\n            INNER JOIN conversations c ON m_in.conversation_id = c.id\n            INNER JOIN messages m_out \n              ON m_in.conversation_id = m_out.conversation_id\n              AND m_out.direction = 'outgoing'\n              AND m_out.created_at > m_in.created_at\n            WHERE m_in.direction = 'incoming' ", "\n            GROUP BY c.assigned_employee_id, m_in.id, m_in.created_at\n          )\n          SELECT \n            assigned_employee_id,\n            COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (out_time - in_time)))), 0) AS avg_seconds\n          FROM emp_pairs\n          GROUP BY assigned_employee_id\n        )\n        SELECT \n          e.id,\n          e.status,\n          e.whatsapp_number,\n          u.name,\n          s.name AS station_name,\n          COALESCE(ec.total_assigned, 0) AS total_assigned,\n          COALESCE(em.outgoing_messages, 0) AS outgoing_messages,\n          COALESCE(erc.replied_convs_count, 0) AS replied_customers,\n          COALESCE(er.avg_seconds, 0) AS avg_response_seconds\n        FROM employees e\n        INNER JOIN users u ON e.user_id = u.id\n        LEFT JOIN stations s ON e.station_id = s.id\n        LEFT JOIN employee_convs ec ON e.id = ec.assigned_employee_id\n        LEFT JOIN employee_msgs em ON u.id = em.sender_user_id\n        LEFT JOIN employee_replied_convs erc ON u.id = erc.sender_user_id\n        LEFT JOIN employee_resp er ON e.id = er.assigned_employee_id\n        WHERE e.whatsapp_number IS NOT NULL AND e.whatsapp_number != ''\n        ORDER BY total_assigned DESC, u.name ASC\n      "])), fromDate ? (0, drizzle_orm_1.sql)(templateObject_26 || (templateObject_26 = __makeTemplateObject(["WHERE created_at >= ", ""], ["WHERE created_at >= ", ""])), fromDate) : (0, drizzle_orm_1.sql)(templateObject_27 || (templateObject_27 = __makeTemplateObject([""], [""]))), fromDate ? (0, drizzle_orm_1.sql)(templateObject_28 || (templateObject_28 = __makeTemplateObject(["AND created_at >= ", ""], ["AND created_at >= ", ""])), fromDate) : (0, drizzle_orm_1.sql)(templateObject_29 || (templateObject_29 = __makeTemplateObject([""], [""]))), fromDate ? (0, drizzle_orm_1.sql)(templateObject_30 || (templateObject_30 = __makeTemplateObject(["AND created_at >= ", ""], ["AND created_at >= ", ""])), fromDate) : (0, drizzle_orm_1.sql)(templateObject_31 || (templateObject_31 = __makeTemplateObject([""], [""]))), fromDate ? (0, drizzle_orm_1.sql)(templateObject_32 || (templateObject_32 = __makeTemplateObject(["AND m_in.created_at >= ", ""], ["AND m_in.created_at >= ", ""])), fromDate) : (0, drizzle_orm_1.sql)(templateObject_33 || (templateObject_33 = __makeTemplateObject([""], [""])))))];
                        case 1:
                            employeesResult = _b.sent();
                            employeeRows = employeesResult.rows;
                            data = employeeRows.map(function (e) {
                                var avgSecs = Number(e.avg_response_seconds || 0);
                                return {
                                    id: e.id,
                                    name: e.name,
                                    status: e.status,
                                    whatsappNumber: e.whatsapp_number,
                                    stationName: e.station_name || 'غير مسند',
                                    totalAssigned: Number(e.total_assigned || 0),
                                    totalRepliedToCustomers: Number(e.replied_customers || 0),
                                    totalOutgoingMessages: Number(e.outgoing_messages || 0),
                                    avgResponseTimeSeconds: avgSecs,
                                    avgResponseMinutes: Math.round(avgSecs / 60),
                                };
                            });
                            return [2 /*return*/, reply.send({ success: true, data: data })];
                        case 2:
                            err_7 = _b.sent();
                            logger_1.logger.error({ err: err_7 }, 'Failed to fetch employee whatsapp performance');
                            return [2 /*return*/, reply.status(500).send({ success: false, error: 'Internal Server Error' })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            /**
             * GET /api/v1/reports/auto-registered-customers — Track customers originating from primary dispatchers
             */
            app.get('/auto-registered-customers', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var period, fromDate, queryResult, rows, err_8;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            period = (_a = request.query) === null || _a === void 0 ? void 0 : _a.period;
                            fromDate = getPeriodDate(period);
                            return [4 /*yield*/, client_1.db.execute((0, drizzle_orm_1.sql)(templateObject_37 || (templateObject_37 = __makeTemplateObject(["\n        WITH first_conversations AS (\n          SELECT DISTINCT ON (contact_id)\n            id AS conversation_id,\n            contact_id,\n            assigned_employee_id,\n            whatsapp_account_id,\n            created_at\n          FROM conversations\n          ORDER BY contact_id, created_at ASC\n        )\n        SELECT \n          c.id,\n          c.name,\n          c.phone_number AS \"phoneNumber\",\n          c.created_at AS \"contactCreatedAt\",\n          fc.created_at AS \"conversationCreatedAt\",\n          u.name AS \"assignedEmployeeName\",\n          wa.display_name AS \"dispatcherName\"\n        FROM contacts c\n        INNER JOIN first_conversations fc ON c.id = fc.contact_id\n        LEFT JOIN employees e ON fc.assigned_employee_id = e.id\n        LEFT JOIN users u ON e.user_id = u.id\n        INNER JOIN whatsapp_accounts wa ON fc.whatsapp_account_id = wa.id\n        WHERE wa.is_primary_dispatcher = true\n        ", "\n        ORDER BY c.created_at DESC\n      "], ["\n        WITH first_conversations AS (\n          SELECT DISTINCT ON (contact_id)\n            id AS conversation_id,\n            contact_id,\n            assigned_employee_id,\n            whatsapp_account_id,\n            created_at\n          FROM conversations\n          ORDER BY contact_id, created_at ASC\n        )\n        SELECT \n          c.id,\n          c.name,\n          c.phone_number AS \"phoneNumber\",\n          c.created_at AS \"contactCreatedAt\",\n          fc.created_at AS \"conversationCreatedAt\",\n          u.name AS \"assignedEmployeeName\",\n          wa.display_name AS \"dispatcherName\"\n        FROM contacts c\n        INNER JOIN first_conversations fc ON c.id = fc.contact_id\n        LEFT JOIN employees e ON fc.assigned_employee_id = e.id\n        LEFT JOIN users u ON e.user_id = u.id\n        INNER JOIN whatsapp_accounts wa ON fc.whatsapp_account_id = wa.id\n        WHERE wa.is_primary_dispatcher = true\n        ", "\n        ORDER BY c.created_at DESC\n      "])), fromDate ? (0, drizzle_orm_1.sql)(templateObject_35 || (templateObject_35 = __makeTemplateObject(["AND c.created_at >= ", ""], ["AND c.created_at >= ", ""])), fromDate) : (0, drizzle_orm_1.sql)(templateObject_36 || (templateObject_36 = __makeTemplateObject([""], [""])))))];
                        case 1:
                            queryResult = _b.sent();
                            rows = queryResult.rows;
                            return [2 /*return*/, reply.send({ success: true, data: rows })];
                        case 2:
                            err_8 = _b.sent();
                            logger_1.logger.error({ err: err_8 }, 'Failed to fetch auto-registered customers');
                            return [2 /*return*/, reply.status(500).send({ success: false, error: 'Internal Server Error' })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10, templateObject_11, templateObject_12, templateObject_13, templateObject_14, templateObject_15, templateObject_16, templateObject_17, templateObject_18, templateObject_19, templateObject_20, templateObject_21, templateObject_22, templateObject_23, templateObject_24, templateObject_25, templateObject_26, templateObject_27, templateObject_28, templateObject_29, templateObject_30, templateObject_31, templateObject_32, templateObject_33, templateObject_34, templateObject_35, templateObject_36, templateObject_37;
