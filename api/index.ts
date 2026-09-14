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
    // 0. Ensure socket and remoteAddress exist for serverless environments
    if (!req.socket) {
      req.socket = { remoteAddress: '127.0.0.1' };
    } else if (!req.socket.remoteAddress) {
      req.socket.remoteAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || '127.0.0.1';
    }

    // 1. If Vercel rewrote /api/(.*) to /api, recover original path from headers and preserve query string
    const urlParts = (req.url || '').split('?');
    const queryString = urlParts.length > 1 ? `?${urlParts.slice(1).join('?')}` : '';
    const xMatched = req.headers['x-matched-path'];
    const xRouteMatches = req.headers['x-now-route-matches'];

    if (typeof xMatched === 'string' && xMatched.startsWith('/api/')) {
      req.url = xMatched + queryString;
    } else if ((req.url === '/api' || req.url?.startsWith('/api?') || req.url === '/api/') && typeof xRouteMatches === 'string') {
      const match = xRouteMatches.match(/1=([^&]+)/);
      if (match && match[1]) {
        req.url = '/api/' + decodeURIComponent(match[1]) + queryString;
      }
    } else if (req.url && !req.url.startsWith('/api') && req.url.startsWith('/v1')) {
      req.url = '/api' + req.url;
    }

    const app = await getApp();

    return new Promise<void>((resolve, reject) => {
      res.on('finish', resolve);
      res.on('close', resolve);
      res.on('error', reject);
      app.server.emit('request', req, res);
    });
  } catch (err: any) {
    console.error('Serverless Handler Error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, message: 'Internal Server Error', error: err?.message || String(err) }));
    }
  }
}
