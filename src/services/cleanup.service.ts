import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { logger } from '../utils/logger';

const UPLOADS_DIR = path.resolve(process.cwd(), 'storage/uploads');
const RETENTION_DAYS = 30; // 30 days default

export class CleanupService {
  /**
   * Initializes the cron job to clean up old media files every night at 3:00 AM.
   */
  static init() {
    // Run daily at 3:00 AM
    cron.schedule('0 3 * * *', () => {
      logger.info('Starting scheduled cleanup of old media files...');
      this.cleanOldUploads(RETENTION_DAYS);
    });
    logger.info('CleanupService initialized (Daily at 03:00 AM)');
  }

  /**
   * Cleans files older than specified days in the uploads directory
   */
  static async cleanOldUploads(daysToKeep: number = RETENTION_DAYS) {
    if (!fs.existsSync(UPLOADS_DIR)) {
      return;
    }

    const now = Date.now();
    const maxAgeMs = daysToKeep * 24 * 60 * 60 * 1000;
    let deletedCount = 0;
    let failedCount = 0;

    try {
      const files = fs.readdirSync(UPLOADS_DIR);
      
      for (const file of files) {
        // Skip hidden files like .gitkeep
        if (file.startsWith('.')) continue;

        const filePath = path.join(UPLOADS_DIR, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            const ageMs = now - stats.mtimeMs;
            if (ageMs > maxAgeMs) {
              fs.unlinkSync(filePath);
              deletedCount++;
            }
          }
        } catch (fileErr) {
          failedCount++;
          logger.warn({ file, err: (fileErr as Error).message }, 'Failed to delete old media file');
        }
      }

      logger.info({ deletedCount, failedCount, maxAgeDays: daysToKeep }, 'Completed media cleanup');
    } catch (err) {
      logger.error({ err }, 'Error during media cleanup process');
    }
  }
}
