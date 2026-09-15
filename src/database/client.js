"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.pool = void 0;
var node_postgres_1 = require("drizzle-orm/node-postgres");
var pg_1 = require("pg");
var index_1 = require("../config/index");
var schema = require("./schema/index");
var logger_1 = require("../utils/logger");
var Pool = pg_1.default.Pool;
// Sanitize DATABASE_URL: node-postgres (pg) does not support channel_binding
var sanitizedDatabaseUrl = index_1.config.DATABASE_URL.replace(/[?&]channel_binding=[^&]+/g, function (match) {
    return match.startsWith('?') ? '?' : '';
}).replace(/\?$/, '');
exports.pool = new Pool({
    connectionString: sanitizedDatabaseUrl,
    ssl: sanitizedDatabaseUrl.includes('neon.tech') ||
        sanitizedDatabaseUrl.includes('supabase.co') ||
        sanitizedDatabaseUrl.includes('supabase.com') ||
        sanitizedDatabaseUrl.includes('sslmode=require') ||
        sanitizedDatabaseUrl.includes('ssl=true') ||
        (process.env.NODE_ENV === 'production' && !sanitizedDatabaseUrl.includes('localhost'))
        ? { rejectUnauthorized: false }
        : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
});
exports.pool.on('error', function (err) {
    logger_1.logger.error({ err: err }, 'Unexpected PostgreSQL pool error');
});
exports.db = (0, node_postgres_1.drizzle)(exports.pool, { schema: schema });
