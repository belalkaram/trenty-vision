import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { LocalStorageProvider } from '../../providers/storage/storage.provider';
import { authenticate } from '../../middleware/auth.middleware';
import { logger } from '../../utils/logger';

const storage = new LocalStorageProvider();

const uploadSchema = z.object({
  dataUrl: z.string().min(10), // data:[<mediatype>];base64,<data>
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
});

export async function mediaRoutes(app: FastifyInstance): Promise<void> {

  /**
   * POST /api/v1/media/upload — Upload media from base64 data URL
   */
  app.post('/upload', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = uploadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'Invalid media payload', details: parsed.error.format() });
    }

    const { dataUrl, fileName, mimeType } = parsed.data;

    try {
      // Strip metadata prefix if present
      const base64Data = dataUrl.includes(';base64,') ? dataUrl.split(';base64,')[1] : dataUrl;
      const buffer = Buffer.from(base64Data, 'base64');

      const { storageKey, size } = await storage.upload(buffer, {
        fileName,
        mimeType,
        directory: 'uploads',
      });

      const url = `/api/v1/media/${encodeURIComponent(storageKey)}`;

      logger.info({ fileName, storageKey, size }, 'Media uploaded successfully');

      return reply.status(201).send({
        success: true,
        data: {
          storageKey,
          url,
          size,
          mimeType,
          fileName,
        },
      });
    } catch (err: any) {
      logger.error({ err }, 'Failed to process media upload');
      return reply.status(500).send({ success: false, error: 'Failed to upload media file' });
    }
  });

  /**
   * GET /api/v1/media/:key — Serve media file
   */
  app.get('/:key', async (request: FastifyRequest<{ Params: { key: string } }>, reply: FastifyReply) => {
    const key = decodeURIComponent(request.params.key);

    try {
      const buffer = await storage.download(key);

      // Deduce content type from extension
      const ext = key.split('.').pop()?.toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
      else if (ext === 'png') contentType = 'image/png';
      else if (ext === 'webp') contentType = 'image/webp';
      else if (ext === 'mp4') contentType = 'video/mp4';
      else if (ext === 'ogg' || ext === 'oga' || ext === 'opus') contentType = 'audio/ogg';
      else if (ext === 'mp3') contentType = 'audio/mpeg';
      else if (ext === 'pdf') contentType = 'application/pdf';

      reply.type(contentType);
      return reply.send(buffer);
    } catch (err: any) {
      return reply.status(404).send({ success: false, error: 'Media file not found' });
    }
  });
}
