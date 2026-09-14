import fs from 'fs';
import path from 'path';
import { config } from '../../config/index';

export interface UploadOptions {
  fileName: string;
  mimeType: string;
  directory?: string;
}

export interface StorageProvider {
  upload(fileBuffer: Buffer, options: UploadOptions): Promise<{ storageKey: string; size: number }>;
  download(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
  getSignedUrl(storageKey: string, expiresInSeconds?: number): Promise<string>;
}

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor() {
    this.basePath = path.resolve(config.STORAGE_LOCAL_PATH);
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async upload(fileBuffer: Buffer, options: UploadOptions): Promise<{ storageKey: string; size: number }> {
    const dir = options.directory ? path.join(this.basePath, options.directory) : this.basePath;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const uniqueName = `${Date.now()}_${options.fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(dir, uniqueName);

    await fs.promises.writeFile(filePath, fileBuffer);

    const storageKey = options.directory ? `${options.directory}/${uniqueName}` : uniqueName;
    return {
      storageKey,
      size: fileBuffer.length,
    };
  }

  async download(storageKey: string): Promise<Buffer> {
    const safeKey = path.normalize(storageKey).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(this.basePath, safeKey);
    return fs.promises.readFile(filePath);
  }

  async delete(storageKey: string): Promise<void> {
    const safeKey = path.normalize(storageKey).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(this.basePath, safeKey);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  async getSignedUrl(storageKey: string, expiresInSeconds = 3600): Promise<string> {
    // Return authenticated download path
    return `${config.APP_URL}/api/v1/media/download?key=${encodeURIComponent(storageKey)}`;
  }
}
