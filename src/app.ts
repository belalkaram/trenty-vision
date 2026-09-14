import fastify, { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyFormbody from '@fastify/formbody';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import fastifyWebSocket from '@fastify/websocket';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { config } from './config/index';
import { logger } from './utils/logger';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { errorHandler } from './middleware/error-handler';

// Route modules
import { authRoutes } from './modules/auth/auth.routes';
import { rolesRoutes } from './modules/roles/roles.routes';
import { departmentsRoutes } from './modules/departments/departments.routes';
import { stationsRoutes } from './modules/stations/stations.routes';
import { employeesRoutes } from './modules/employees/employees.routes';
import { auditRoutes } from './modules/audit/audit.routes';
import { settingsRoutes } from './modules/settings/settings.routes';
import { healthRoutes } from './modules/health/health.routes';
import { whatsappRoutes } from './modules/whatsapp/whatsapp.routes';
import { conversationsRoutes } from './modules/conversations/conversations.routes';
import { messagesRoutes } from './modules/messages/messages.routes';
import { contactsRoutes } from './modules/contacts/contacts.routes';
import { leadsRoutes } from './modules/leads/leads.routes';
import { quickRepliesRoutes } from './modules/quick-replies/quick-replies.routes';
import { mediaRoutes } from './modules/media/media.routes';
import { automationsRoutes } from './modules/automations/automations.routes';
import { reportsRoutes } from './modules/reports/reports.routes';
import { superAdminRoutes } from './modules/superadmin/superadmin.routes';
import { bridgeRoutes } from './modules/bridge/bridge.routes';
import { wsHub } from './websocket/ws.hub';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: false, // Using our custom Pino logger
    trustProxy: true,
  });

  // Request ID
  app.addHook('onRequest', requestIdMiddleware);

  // Plugins
  await app.register(fastifyCookie, {
    secret: config.COOKIE_SECRET,
  });

  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  await app.register(fastifyFormbody);

  // Allow empty JSON bodies and handle serverless pre-parsed bodies
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body: string, done) => {
    if (!body || body.trim() === '') {
      if ((req.raw as any)?.body && typeof (req.raw as any).body === 'object') {
        done(null, (req.raw as any).body);
        return;
      }
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(body));
    } catch (err: any) {
      if ((req.raw as any)?.body && typeof (req.raw as any).body === 'object') {
        done(null, (req.raw as any).body);
        return;
      }
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  // Rate Limiting (only in local persistent server mode, Vercel Edge handles serverless rate limiting)
  if (!process.env.VERCEL) {
    await app.register(fastifyRateLimit, {
      max: 100,
      timeWindow: '1 minute',
      keyGenerator: (req) => {
        const xff = req.headers['x-forwarded-for'];
        if (typeof xff === 'string') return xff.split(',')[0].trim();
        return (req.raw?.socket?.remoteAddress) || req.ip || '127.0.0.1';
      },
    });
  }

  // WebSocket support (only in persistent server mode, not in Vercel Serverless)
  if (!process.env.VERCEL) {
    await app.register(fastifyWebSocket);
  }

  const clientDistDir = path.resolve(__dirname, '../dist/client');

  // Serve static assets from public/ (only in local persistent server mode)
  if (!process.env.VERCEL) {
    const publicDir = path.resolve(__dirname, '../public');
    try {
      if (fs.existsSync(publicDir)) {
        await app.register(fastifyStatic, {
          root: publicDir,
          prefix: '/public/',
          decorateReply: true,
        });
      }
    } catch (_e) {
      // Graceful fallback in read-only environments
    }

    if (fs.existsSync(clientDistDir)) {
      await app.register(fastifyStatic, {
        root: clientDistDir,
        prefix: '/',
        decorateReply: false,
      });
    }
  }

  // Error Handler
  app.setErrorHandler(errorHandler);

  // Register API v1 routes
  await app.register(healthRoutes, { prefix: '/health' });

  await app.register(
    async (v1) => {
      await v1.register(authRoutes, { prefix: '/auth' });
      await v1.register(rolesRoutes, { prefix: '/roles' });
      await v1.register(departmentsRoutes, { prefix: '/departments' });
      await v1.register(stationsRoutes, { prefix: '/stations' });
      await v1.register(employeesRoutes, { prefix: '/employees' });
      await v1.register(auditRoutes, { prefix: '/audit' });
      await v1.register(settingsRoutes, { prefix: '/settings' });
      await v1.register(whatsappRoutes, { prefix: '/whatsapp' });
      await v1.register(conversationsRoutes, { prefix: '/conversations' });
      await v1.register(messagesRoutes, { prefix: '/conversations' });
      await v1.register(contactsRoutes, { prefix: '/contacts' });
      await v1.register(leadsRoutes, { prefix: '/leads' });
      await v1.register(quickRepliesRoutes, { prefix: '/quick-replies' });
      await v1.register(mediaRoutes, { prefix: '/media' });
      await v1.register(automationsRoutes, { prefix: '/automations' });
      await v1.register(reportsRoutes, { prefix: '/reports' });
      await v1.register(superAdminRoutes, { prefix: '/superadmin' });
      await v1.register(bridgeRoutes, { prefix: '/bridge' });
    },
    { prefix: '/api/v1' }
  );

  // Register WebSocket Hub (only in persistent server mode)
  if (!process.env.VERCEL) {
    wsHub.registerRoutes(app);
  }

  // Frontend Views Delivery (Modern React SPA with graceful fallback)
  const viewsDir = path.resolve(__dirname, '../views');
  const spaIndexHtml = path.join(clientDistDir, 'index.html');

  const serveSpaOrHtml = (fallbackRelativePath: string) => {
    return async (request: any, reply: any) => {
      if (fs.existsSync(spaIndexHtml)) {
        reply.type('text/html');
        return fs.createReadStream(spaIndexHtml);
      }
      const legacyPath = path.join(viewsDir, fallbackRelativePath);
      if (fs.existsSync(legacyPath)) {
        reply.type('text/html');
        return fs.createReadStream(legacyPath);
      }
      return reply.redirect('/login');
    };
  };

  app.get('/', serveSpaOrHtml('dashboard/index.html'));
  app.get('/login', serveSpaOrHtml('auth/login.html'));
  app.get('/employees', serveSpaOrHtml('employees/index.html'));
  app.get('/stations', serveSpaOrHtml('stations/index.html'));
  app.get('/departments', async (_req, reply) => reply.redirect('/'));
  app.get('/settings', serveSpaOrHtml('settings/index.html'));
  app.get('/audit', serveSpaOrHtml('audit/index.html'));
  app.get('/whatsapp', serveSpaOrHtml('whatsapp/index.html'));
  app.get('/inbox', serveSpaOrHtml('inbox/index.html'));
  app.get('/automations', serveSpaOrHtml('automations/index.html'));
  app.get('/reports', serveSpaOrHtml('reports/index.html'));
  app.get('/contacts', serveSpaOrHtml('contacts/index.html'));

  // Fallback 404 for SPA client-side deep routing
  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith('/api/') || request.url.startsWith('/ws')) {
      reply.code(404).send({ success: false, message: 'API Route Not Found' });
      return;
    }
    if (fs.existsSync(spaIndexHtml)) {
      reply.type('text/html');
      return fs.createReadStream(spaIndexHtml);
    }
    reply.code(404).send('Page Not Found');
  });

  return app;
}
