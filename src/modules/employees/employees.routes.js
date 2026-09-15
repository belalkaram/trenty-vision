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
exports.employeesRoutes = employeesRoutes;
var employees_service_1 = require("./employees.service");
var employees_schema_1 = require("./employees.schema");
var auth_middleware_1 = require("../../middleware/auth.middleware");
var rbac_middleware_1 = require("../../middleware/rbac.middleware");
var api_response_1 = require("../../utils/api-response");
function employeesRoutes(fastify) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            fastify.addHook('preHandler', auth_middleware_1.authenticate);
            // List employees
            fastify.get('/', { preHandler: [(0, rbac_middleware_1.requirePermission)('manage_employees')] }, function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var query, list;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            query = request.query;
                            return [4 /*yield*/, employees_service_1.EmployeesService.list(query)];
                        case 1:
                            list = _a.sent();
                            return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, list, 'Employees retrieved')];
                    }
                });
            }); });
            // Get supervisors list for dropdowns
            fastify.get('/supervisors', { preHandler: [(0, rbac_middleware_1.requirePermission)('manage_employees')] }, function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var supervisors;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, employees_service_1.EmployeesService.getSupervisors()];
                        case 1:
                            supervisors = _a.sent();
                            return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, supervisors, 'Supervisors retrieved')];
                    }
                });
            }); });
            // Get single employee
            fastify.get('/:id', { preHandler: [(0, rbac_middleware_1.requirePermission)('manage_employees')] }, function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, employee;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            return [4 /*yield*/, employees_service_1.EmployeesService.getById(id)];
                        case 1:
                            employee = _a.sent();
                            return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, employee, 'Employee details')];
                    }
                });
            }); });
            // Create new employee
            fastify.post('/', { preHandler: [(0, rbac_middleware_1.requirePermission)('manage_employees')] }, function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var input, employee;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            input = employees_schema_1.createEmployeeSchema.parse(request.body);
                            return [4 /*yield*/, employees_service_1.EmployeesService.create(input, (_a = request.user) === null || _a === void 0 ? void 0 : _a.id)];
                        case 1:
                            employee = _b.sent();
                            return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, employee, 'Employee created successfully', 201)];
                    }
                });
            }); });
            // Update employee
            fastify.put('/:id', { preHandler: [(0, rbac_middleware_1.requirePermission)('manage_employees')] }, function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, input, employee;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            id = request.params.id;
                            input = employees_schema_1.updateEmployeeSchema.parse(request.body);
                            return [4 /*yield*/, employees_service_1.EmployeesService.update(id, input, (_a = request.user) === null || _a === void 0 ? void 0 : _a.id)];
                        case 1:
                            employee = _b.sent();
                            return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, employee, 'Employee updated successfully')];
                    }
                });
            }); });
            // Update status (e.g. active, away, offline)
            fastify.patch('/:id/status', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, status, employee;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = request.params.id;
                            status = employees_schema_1.updateEmployeeStatusSchema.parse(request.body).status;
                            return [4 /*yield*/, employees_service_1.EmployeesService.updateStatus(id, status)];
                        case 1:
                            employee = _a.sent();
                            return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, employee, 'Status updated')];
                    }
                });
            }); });
            // Delete employee
            fastify.delete('/:id', { preHandler: [(0, rbac_middleware_1.requirePermission)('manage_employees')] }, function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var id, result;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            id = request.params.id;
                            return [4 /*yield*/, employees_service_1.EmployeesService.delete(id, (_a = request.user) === null || _a === void 0 ? void 0 : _a.id)];
                        case 1:
                            result = _b.sent();
                            return [2 /*return*/, (0, api_response_1.sendSuccess)(reply, result, 'Employee deleted successfully')];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
