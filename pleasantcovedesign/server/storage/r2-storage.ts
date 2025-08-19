import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface R2Config {
  bucket: string;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class R2Storage {
  private client: S3Client;
  private bucket: string;

  constructor(cfg: R2Config) {
    this.bucket = cfg.bucket;
    this.client = new S3Client({
      region: cfg.region || 'auto',
      endpoint: cfg.endpoint,          // Cloudflare R2 S3 endpoint
      forcePathStyle: true,            // REQUIRED for R2
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
  }

  private keyFor(filename: string) {
    // Standardize all objects under "uploads/"
    return filename.startsWith('uploads/')
      ? filename
      : `uploads/${filename}`;
  }

  async putBuffer(filename: string, buf: Buffer, contentType?: string) {
    const Key = this.keyFor(filename);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key,
        Body: buf,
        ContentType: contentType,
      })
    );
    return Key;
  }

  async head(filename: string): Promise<boolean> {
    try {
      const Key = this.keyFor(filename);
      await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key,
      }));
      return true;
    } catch {
      return false;
    }
  }

  async getFileUrl(filename: string, ttlSeconds = 300): Promise<string> {
    const Key = this.keyFor(filename);
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key,
    });
    return getSignedUrl(this.client, cmd, { expiresIn: ttlSeconds });
  }

  async getFileUrlRawKey(rawKey: string, ttlSeconds = 300): Promise<string> {
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: rawKey,
    });
    return getSignedUrl(this.client, cmd, { expiresIn: ttlSeconds });
  }
}

export function createR2Storage() {
  const cfg: Partial<R2Config> = {
    bucket: process.env.R2_BUCKET,
    endpoint: process.env.R2_ENDPOINT,
    region: process.env.R2_REGION || 'auto',
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  };

  if (!cfg.bucket || !cfg.endpoint || !cfg.accessKeyId || !cfg.secretAccessKey) {
    console.log('⚠️ R2 storage not configured, falling back to local storage');
    return null;
  }
  return new R2Storage(cfg as R2Config);
} 