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
    // Normalization: if req.url starts with /v1 without /api, prepend /api
    if (req.url && !req.url.startsWith('/api') && req.url.startsWith('/v1')) {
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
