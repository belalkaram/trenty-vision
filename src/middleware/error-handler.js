"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
var zod_1 = require("zod");
var errors_1 = require("../utils/errors");
var api_response_1 = require("../utils/api-response");
var logger_1 = require("../utils/logger");
function errorHandler(error, request, reply) {
    var _a;
    logger_1.logger.error({
        err: error,
        url: request.url,
        method: request.method,
        requestId: request.id,
        userId: (_a = request.user) === null || _a === void 0 ? void 0 : _a.id,
    }, 'Request error occurred');
    // Zod Validation Error
    if (error instanceof zod_1.ZodError) {
        var formattedErrors = {};
        for (var _i = 0, _b = error.issues; _i < _b.length; _i++) {
            var issue = _b[_i];
            var field = issue.path.join('.') || 'body';
            if (!formattedErrors[field]) {
                formattedErrors[field] = [];
            }
            formattedErrors[field].push(issue.message);
        }
        return (0, api_response_1.sendError)(reply, 'Validation error', 422, formattedErrors);
    }
    // Application Custom Error
    if (error instanceof errors_1.AppError) {
        return (0, api_response_1.sendError)(reply, error.message, error.statusCode, error.errors);
    }
    // Fastify Rate Limit Error
    if (error.statusCode === 429) {
        return (0, api_response_1.sendError)(reply, 'Too many requests, please slow down.', 429);
    }
    // Fastify standard 404
    if (error.statusCode === 404) {
        return (0, api_response_1.sendError)(reply, 'Route not found', 404);
    }
    // Default Internal Server Error
    var message = process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message;
    return (0, api_response_1.sendError)(reply, message, error.statusCode || 500);
}
