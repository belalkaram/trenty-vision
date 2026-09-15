"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rolePermissions = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var roles_1 = require("./roles");
var permissions_1 = require("./permissions");
exports.rolePermissions = (0, pg_core_1.pgTable)('role_permissions', {
    roleId: (0, pg_core_1.uuid)('role_id')
        .references(function () { return roles_1.roles.id; }, { onDelete: 'cascade' })
        .notNull(),
    permissionId: (0, pg_core_1.uuid)('permission_id')
        .references(function () { return permissions_1.permissions.id; }, { onDelete: 'cascade' })
        .notNull(),
}, function (table) { return [
    (0, pg_core_1.primaryKey)({ columns: [table.roleId, table.permissionId] }),
]; });
