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
      appReady = null; // allow retry on next request
      throw err;
    });
  }
  return appReady;
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  try {
    // Ensure socket exists for Fastify's IP detection
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

    // Restore original path from Vercel's x-matched-path header
    const rawUrl = req.url ?? '/';
    const qsStart = rawUrl.indexOf('?');
    const qs = qsStart >= 0 ? rawUrl.slice(qsStart) : '';
    const xMatched = req.headers['x-matched-path'] as string | undefined;
    if (xMatched && xMatched.startsWith('/api/') && !rawUrl.startsWith(xMatched.replace(qs, ''))) {
      req.url = xMatched + qs;
    }

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
          stack: process.env.NODE_ENV !== 'production' ? err?.stack : undefined,
        })
      );
    }
  }
}
