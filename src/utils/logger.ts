import pino from 'pino';
import { config } from '../config/index';

let stream: any = undefined;
if (config.NODE_ENV === 'development' || process.env.DEPLOYMENT_MODE === 'local') {
  try {
    const pretty = require('pino-pretty');
    stream = pretty({
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    });
  } catch (_) {
    stream = undefined;
  }
}

export const logger = pino(
  {
    level: config.LOG_LEVEL,
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
  },
  stream
);
