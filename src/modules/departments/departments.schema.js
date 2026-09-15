"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDepartmentSchema = exports.createDepartmentSchema = void 0;
var zod_1 = require("zod");
exports.createDepartmentSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(150),
    code: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    active: zod_1.z.boolean().default(true),
});
exports.updateDepartmentSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(150).optional(),
    code: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    active: zod_1.z.boolean().optional(),
});
