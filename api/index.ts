import type { FastifyInstance } from 'fastify';

// Force online mode and production on Vercel Serverless automatically
if (process.env.VERCEL) {
  process.env.DEPLOYMENT_MODE = 'online';
  process.env.NODE_ENV = 'production';
} else {
  process.env.DEPLOYMENT_MODE = process.env.DEPLOYMENT_MODE || 'online';
}

import { buildApp } from '../src/app';

let appInstance: FastifyInstance | null = null;

/**
 * Lazy initialization of the Fastify application for Vercel Serverless.
 * This runs without the background Baileys socket process.
 */
async function getApp(): Promise<FastifyInstance> {
  if (!appInstance) {
    appInstance = await buildApp();
    await appInstance.ready();
  }
  return appInstance;
}

export default async function handler(req: any, res: any) {
  try {
    // 1. If Vercel rewrote /api/(.*) to /api, recover original path from headers
    const xMatched = req.headers['x-matched-path'];
    const xRouteMatches = req.headers['x-now-route-matches'];

    if (typeof xMatched === 'string' && xMatched.startsWith('/api/')) {
      req.url = xMatched;
    } else if ((req.url === '/api' || req.url === '/api/') && typeof xRouteMatches === 'string') {
      const match = xRouteMatches.match(/1=([^&]+)/);
      if (match && match[1]) {
        req.url = '/api/' + decodeURIComponent(match[1]);
      }
    } else if (req.url && !req.url.startsWith('/api') && req.url.startsWith('/v1')) {
      req.url = '/api' + req.url;
    }

    const app = await getApp();
    app.server.emit('request', req, res);
  } catch (err: any) {
    console.error('Serverless Handler Error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, message: 'Internal Server Error', error: err?.message }));
    }
  }
}
