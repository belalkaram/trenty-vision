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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function sendSuccess(reply, data, message, statusCode, meta) {
    if (message === void 0) { message = 'Success'; }
    if (statusCode === void 0) { statusCode = 200; }
    if (meta === void 0) { meta = {}; }
    var requestId = reply.request.id;
    var response = {
        success: true,
        data: data,
        message: message,
        errors: null,
        meta: __assign({ requestId: requestId }, meta),
    };
    return reply.status(statusCode).send(response);
}
function sendError(reply, message, statusCode, errors, meta) {
    if (statusCode === void 0) { statusCode = 500; }
    if (errors === void 0) { errors = null; }
    if (meta === void 0) { meta = {}; }
    var requestId = reply.request.id;
    var response = {
        success: false,
        data: null,
        message: message,
        errors: errors,
        meta: __assign({ requestId: requestId }, meta),
    };
    return reply.status(statusCode).send(response);
}
