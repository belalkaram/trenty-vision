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
exports.updateEmployeeStatusSchema = exports.updateEmployeeSchema = exports.createEmployeeSchema = void 0;
var zod_1 = require("zod");
var phone_validator_1 = require("../../utils/phone.validator");
var emptyToNull = function (val) { return (val === '' || val === undefined ? null : val); };
var emptyToUndefined = function (val) { return (val === '' || val === null ? undefined : val); };
exports.createEmployeeSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(150).optional(),
    fullName: zod_1.z.string().min(2).max(150).optional(),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6).optional().default('Password123!'),
    roleId: zod_1.z.preprocess(emptyToUndefined, zod_1.z.string().uuid().optional()),
    departmentId: zod_1.z.preprocess(emptyToNull, zod_1.z.string().uuid().nullable().optional()),
    stationId: zod_1.z.preprocess(emptyToNull, zod_1.z.string().uuid().nullable().optional()),
    stationIds: zod_1.z.array(zod_1.z.string()).optional(),
    supervisorId: zod_1.z.preprocess(emptyToNull, zod_1.z.string().uuid().nullable().optional()),
    whatsappNumber: zod_1.z.string().max(50).nullable().optional(),
    phone: zod_1.z.string().max(50).nullable().optional(),
    status: zod_1.z.enum(['active', 'inactive', 'away', 'offline']).default('active'),
}).transform(function (data) {
    var finalName = (data.name || data.fullName || '').trim();
    var rawPhone = (data.whatsappNumber || data.phone || '').trim();
    var normalizedPhone = null;
    if (rawPhone) {
        var val = (0, phone_validator_1.validateAndFormatPhone)(rawPhone);
        normalizedPhone = val.isValid ? val.formatted : rawPhone;
    }
    var finalStationId = data.stationId || (data.stationIds && data.stationIds.length > 0 ? data.stationIds[0] : null);
    return __assign(__assign({}, data), { name: finalName, whatsappNumber: normalizedPhone, phone: normalizedPhone, stationId: finalStationId });
});
exports.updateEmployeeSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(150).optional(),
    fullName: zod_1.z.string().min(2).max(150).optional(),
    email: zod_1.z.string().email().optional(),
    roleId: zod_1.z.preprocess(emptyToUndefined, zod_1.z.string().uuid().optional()),
    departmentId: zod_1.z.preprocess(emptyToNull, zod_1.z.string().uuid().nullable().optional()),
    stationId: zod_1.z.preprocess(emptyToNull, zod_1.z.string().uuid().nullable().optional()),
    stationIds: zod_1.z.array(zod_1.z.string()).optional(),
    supervisorId: zod_1.z.preprocess(emptyToNull, zod_1.z.string().uuid().nullable().optional()),
    whatsappNumber: zod_1.z.string().max(50).nullable().optional(),
    phone: zod_1.z.string().max(50).nullable().optional(),
    status: zod_1.z.enum(['active', 'inactive', 'away', 'offline']).optional(),
}).transform(function (data) {
    var transformed = __assign({}, data);
    if (data.name || data.fullName) {
        transformed.name = (data.name || data.fullName || '').trim();
    }
    if (data.whatsappNumber !== undefined || data.phone !== undefined) {
        var raw = (data.whatsappNumber !== undefined ? data.whatsappNumber : data.phone) || '';
        if (raw && typeof raw === 'string' && raw.trim()) {
            var val = (0, phone_validator_1.validateAndFormatPhone)(raw.trim());
            transformed.whatsappNumber = val.isValid ? val.formatted : raw.trim();
            transformed.phone = transformed.whatsappNumber;
        }
        else {
            transformed.whatsappNumber = null;
            transformed.phone = null;
        }
    }
    if (data.stationId !== undefined || (data.stationIds && data.stationIds.length > 0)) {
        transformed.stationId = data.stationId || (data.stationIds && data.stationIds.length > 0 ? data.stationIds[0] : null);
    }
    return transformed;
});
exports.updateEmployeeStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['active', 'inactive', 'away', 'offline']),
});
