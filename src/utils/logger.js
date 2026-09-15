"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
var pino_1 = require("pino");
var index_1 = require("../config/index");
exports.logger = (0, pino_1.default)({
    level: index_1.config.LOG_LEVEL,
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'password',
            'password_hash',
            'token',
            'refreshToken',
            'totp_secret',
            '*.password',
            '*.token',
        ],
        remove: true,
    },
    transport: index_1.config.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
});
