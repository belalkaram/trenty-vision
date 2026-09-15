import type { IncomingMessage, ServerResponse } from 'http';

// ─── Set environment before any imports ────────────────────────────────────
process.env.DEPLOYMENT_MODE = 'online';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// ─── Lazy singleton ─────────────────────────────────────────────────────────
let appReady: Promise<import('fastify').FastifyInstance> | null = null;

async function initApp(): Promise<import('fastify').FastifyInstance> {
  const { buildApp } = await import('../src/app');
  const app = await buildApp();
  await app.ready();
  return app;
}

function getApp(): Promise<import('fastify').FastifyInstance> {
  if (!appReady) {
    appReady = initApp().catch((err) => {
      appReady = null;
      throw err;
    });
  }
  return appReady;
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  try {
    // 1. Ensure socket exists for Fastify's IP detection
    if (!(req as any).socket) {
      (req as any).socket = {
        remoteAddress:
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? '127.0.0.1',
        remotePort: 0,
        encrypted: true,
      };
    } else if (!(req as any).socket.remoteAddress) {
      (req as any).socket.remoteAddress =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? '127.0.0.1';
    }

    // 2. URL reconstruction for catch-all api/[...path].js
    let url = req.url ?? '/';
    const qsIdx = url.indexOf('?');
    const qs = qsIdx >= 0 ? url.slice(qsIdx) : '';

    if (url.includes('[') || url === '/api' || url === '/api/') {
      const routeMatches = req.headers['x-now-route-matches'] as string | undefined;
      const fwdUrl = req.headers['x-forwarded-url'] as string | undefined;
      if (routeMatches) {
        const params = new URLSearchParams(routeMatches);
        const matchedPath = params.get('path') || params.get('1') || '';
        if (matchedPath) {
          url = '/api/' + decodeURIComponent(matchedPath) + qs;
        }
      } else if (fwdUrl && !fwdUrl.includes('[')) {
        url = fwdUrl;
      } else if (url === '/api' || url === '/api/') {
        url = '/api' + qs;
      }
    }
    req.url = url;
    console.log(`[Vercel Handler] ${req.method} ${req.url}`);

    const app = await getApp();

    await new Promise<void>((resolve, reject) => {
      res.on('finish', resolve);
      res.on('close', resolve);
      res.on('error', reject);
      app.server.emit('request', req, res);
    });
  } catch (err: any) {
    console.error('[Vercel Handler] Fatal error:', err?.message ?? err);
    console.error('[Vercel Handler] Stack:', err?.stack);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: false,
          error: 'Internal Server Error',
          message: err?.message ?? String(err),
        })
      );
    }
  }
}
