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

    // ── URL normalization ──────────────────────────────────────────────────
    // With catch-all api/[...path].js, Vercel preserves the full original URL in req.url.
    // x-matched-path contains the PATTERN (e.g. /api/[...path]) — NOT the real URL.
    // We must NOT overwrite req.url with the pattern.
    // Only fix the URL if it's somehow empty or missing the /api prefix.
    const rawUrl = req.url ?? '/';
    if (!rawUrl || rawUrl === '/api/[...path]' || rawUrl === '/api') {
      // Fallback: try to read actual path from x-matched-path only if it's a concrete path
      const xMatched = req.headers['x-matched-path'] as string | undefined;
      if (xMatched && !xMatched.includes('[') && !xMatched.includes('*')) {
        const qsStart = rawUrl.indexOf('?');
        const qs = qsStart >= 0 ? rawUrl.slice(qsStart) : '';
        req.url = xMatched + qs;
      }
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
