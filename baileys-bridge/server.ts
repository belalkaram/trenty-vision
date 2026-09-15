import fastify from 'fastify';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { bridgeConfig } from './config';
import { DbTransport } from './transport/db.transport';
import { OutboundWorker } from './workers/outbound.worker';
import { CommandWorker } from './workers/command.worker';
import { HeartbeatWorker } from './workers/heartbeat.worker';
import { sessionManager } from '../src/modules/whatsapp/session.manager';
import { logger } from '../src/utils/logger';
import { db } from '../src/database/client';
import { whatsappAccounts } from '../src/database/schema/index';
import { eq } from 'drizzle-orm';

let currentDir = process.cwd();
try {
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    currentDir = path.dirname(fileURLToPath(import.meta.url));
  } else if (typeof __dirname !== 'undefined') {
    currentDir = __dirname;
  }
} catch (_) {}

async function startBridge() {
  logger.info('Starting Baileys WhatsApp Bridge Server...');

  // 1. Initialize Transport
  const transport = new DbTransport();
  let companyId = bridgeConfig.COMPANY_ID;
  if (!companyId) {
    companyId = await transport.resolveCompanyId();
    logger.info({ companyId }, 'Auto-resolved company ID for Bridge');
  }

  // 2. Initialize Session Manager (Restores active WhatsApp sockets)
  await sessionManager.initialize();
  logger.info('Baileys Session Manager initialized in Bridge');

  // 3. Start Background Workers
  const outboundWorker = new OutboundWorker(transport, bridgeConfig.OUTBOUND_POLL_INTERVAL_MS, companyId);
  outboundWorker.start();

  const commandWorker = new CommandWorker(transport, bridgeConfig.COMMAND_POLL_INTERVAL_MS, companyId);
  commandWorker.start();

  const heartbeatWorker = new HeartbeatWorker(transport, bridgeConfig.BRIDGE_ID, companyId, bridgeConfig.HEARTBEAT_INTERVAL_MS);
  heartbeatWorker.start();

  // 4. Create HTTP Server for Local Dashboard & Local Management
  const app = fastify({ logger: false });

  // Serve Dashboard HTML
  let dashboardHtml = '<!DOCTYPE html><html><body><h1>WhatsApp Bridge Running</h1><p>Open /api/status for status</p></body></html>';
  try {
    const candidates = [
      path.join(currentDir, 'dashboard', 'index.html'),
      path.join(process.cwd(), 'baileys-bridge', 'dashboard', 'index.html'),
      path.join(process.cwd(), 'dashboard', 'index.html'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        dashboardHtml = fs.readFileSync(p, 'utf8');
        break;
      }
    }
  } catch (_) {}

  app.get('/', async (_req, reply) => {
    reply.type('text/html').send(dashboardHtml);
  });

  // Local Bridge Status API
  const startTime = Date.now();
  app.get('/api/status', async (_req, reply) => {
    const accounts = await db.select().from(whatsappAccounts);
    const enriched = await Promise.all(
      accounts.map(async (acc) => {
        const live = await sessionManager.getAccountStatus(acc.id);
        return {
          id: acc.id,
          displayName: acc.displayName,
          phoneNumber: live.phoneNumber || acc.phoneNumber,
          status: live.status,
        };
      })
    );

    return reply.send({
      success: true,
      bridgeId: bridgeConfig.BRIDGE_ID,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      accounts: enriched,
    });
  });

  // Local Connect
  app.post('/api/accounts/:id/connect', async (req: any, reply) => {
    const { id } = req.params;
    await sessionManager.connectAccount(id);
    return reply.send({ success: true, message: 'Connection initiated' });
  });

  // Local Disconnect
  app.post('/api/accounts/:id/disconnect', async (req: any, reply) => {
    const { id } = req.params;
    await sessionManager.disconnectAccount(id);
    return reply.send({ success: true, message: 'Disconnected' });
  });

  // Local Reset
  app.post('/api/accounts/:id/reset', async (req: any, reply) => {
    const { id } = req.params;
    await sessionManager.resetAccount(id);
    return reply.send({ success: true, message: 'Account session reset' });
  });

  // Local Pairing Code
  app.post('/api/accounts/:id/pairing-code', async (req: any, reply) => {
    const { id } = req.params;
    const { phoneNumber } = req.body || {};
    if (!phoneNumber) {
      return reply.status(400).send({ success: false, error: 'Phone number required' });
    }
    try {
      const code = await sessionManager.requestPairingCode(id, phoneNumber);
      return reply.send({
        success: true,
        pairingCode: code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code,
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err?.message || 'Failed to generate code' });
    }
  });

  // Local QR Code
  app.get('/api/accounts/:id/qr', async (req: any, reply) => {
    const { id } = req.params;
    const qrCode = await sessionManager.getQRCode(id);
    if (!qrCode) {
      return reply.status(404).send({ success: false, error: 'No QR code available' });
    }
    return reply.send({ success: true, qrCode });
  });

  // 5. Start HTTP Listener
  try {
    const address = await app.listen({
      port: bridgeConfig.BRIDGE_PORT,
      host: bridgeConfig.BRIDGE_HOST,
    });
    logger.info(`⚡ Baileys Bridge Server running at: ${address}`);
    logger.info(`⚡ Local Dashboard available at: http://localhost:${bridgeConfig.BRIDGE_PORT}`);
  } catch (err) {
    logger.fatal({ err }, 'Failed to start Bridge HTTP server');
    process.exit(1);
  }

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Bridge received ${signal}, shutting down...`);
    outboundWorker.stop();
    commandWorker.stop();
    heartbeatWorker.stop();
    await sessionManager.shutdown();
    await app.close();
    logger.info('Baileys Bridge shut down successfully');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startBridge().catch((err) => {
  logger.fatal({ err }, 'Fatal error starting Baileys Bridge');
  process.exit(1);
});
