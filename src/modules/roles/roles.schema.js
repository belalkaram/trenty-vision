"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRoleSchema = exports.createRoleSchema = void 0;
var zod_1 = require("zod");
exports.createRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(50).regex(/^[a-z0-9_]+$/, 'Name must be lowercase alphanumeric with underscores'),
    displayName: zod_1.z.string().min(2).max(100),
    description: zod_1.z.string().optional(),
    permissions: zod_1.z.array(zod_1.z.string()).min(1, 'At least one permission must be assigned'),
});
exports.updateRoleSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(2).max(100).optional(),
    description: zod_1.z.string().optional(),
    permissions: zod_1.z.array(zod_1.z.string()).optional(),
});
