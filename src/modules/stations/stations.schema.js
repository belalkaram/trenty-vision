"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStationSchema = exports.createStationSchema = void 0;
var zod_1 = require("zod");
var emptyToNull = function (val) { return (val === '' || val === undefined ? null : val); };
exports.createStationSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(150),
    departmentId: zod_1.z.preprocess(emptyToNull, zod_1.z.string().uuid().nullable().optional()),
    description: zod_1.z.preprocess(emptyToNull, zod_1.z.string().nullable().optional()),
    code: zod_1.z.preprocess(emptyToNull, zod_1.z.string().nullable().optional()),
    color: zod_1.z.string().optional().default('#1c9770'),
    maxCapacity: zod_1.z.preprocess(emptyToNull, zod_1.z.coerce.number().min(1).max(1000).nullable().optional()),
    routingWeight: zod_1.z.coerce.number().min(1).max(50).optional().default(1),
    active: zod_1.z.boolean().default(true),
    status: zod_1.z.enum(['active', 'inactive']).optional(),
    employeeIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
}).transform(function (data) {
    if (data.status !== undefined) {
        data.active = data.status === 'active';
    }
    return data;
});
exports.updateStationSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(150).optional(),
    departmentId: zod_1.z.preprocess(emptyToNull, zod_1.z.string().uuid().nullable().optional()),
    description: zod_1.z.preprocess(emptyToNull, zod_1.z.string().nullable().optional()),
    code: zod_1.z.preprocess(emptyToNull, zod_1.z.string().nullable().optional()),
    color: zod_1.z.string().optional(),
    maxCapacity: zod_1.z.preprocess(emptyToNull, zod_1.z.coerce.number().min(1).max(1000).nullable().optional()),
    routingWeight: zod_1.z.coerce.number().min(1).max(50).optional(),
    active: zod_1.z.boolean().optional(),
    status: zod_1.z.enum(['active', 'inactive']).optional(),
    employeeIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
}).transform(function (data) {
    if (data.status !== undefined && data.active === undefined) {
        data.active = data.status === 'active';
    }
    return data;
});
