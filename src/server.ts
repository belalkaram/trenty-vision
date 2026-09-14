import { buildApp } from './app';
import { config } from './config/index';
import { logger } from './utils/logger';
import { pool } from './database/client';
import { sessionManager } from './modules/whatsapp/session.manager';
import { wsHub } from './websocket/ws.hub';
import { ReminderScheduler } from './modules/automations/reminder.scheduler';
import { CleanupService } from './services/cleanup.service';

async function start() {
  const app = await buildApp();

  // Graceful shutdown handling
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    try {
      if (config.DEPLOYMENT_MODE === 'local') {
        // Shutdown Reminder Scheduler
        ReminderScheduler.stop();
        // Shutdown WhatsApp sessions first
        await sessionManager.shutdown();
      }
      // Shutdown WebSocket Hub
      wsHub.shutdown();
      await app.close();
      await pool.end();
      logger.info('Closed HTTP server, WhatsApp sessions, and PostgreSQL pool successfully.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  try {
    const address = await app.listen({
      port: config.PORT,
      host: config.HOST,
    });
    logger.info(`Trenty Vision WhatsApp CRM Server listening on ${address}`);
    logger.info(`Environment: ${config.NODE_ENV} | Deployment Mode: ${config.DEPLOYMENT_MODE}`);
    logger.info(`Database connected via Neon PostgreSQL pool`);

    if (config.DEPLOYMENT_MODE === 'local') {
      // Initialize WhatsApp Session Manager — restore previously connected sessions
      await sessionManager.initialize();
      logger.info('WhatsApp Session Manager initialized');

      // Start background Reminder Scheduler
      ReminderScheduler.start(30000);
      logger.info('Reminder Scheduler started (30s interval)');

      // Start background File Cleanup Service
      CleanupService.init();
    } else {
      logger.info('Running in ONLINE mode (Baileys socket managed externally via Baileys Bridge)');
    }

  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

start();
