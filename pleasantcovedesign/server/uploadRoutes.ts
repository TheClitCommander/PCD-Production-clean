import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import { createR2Storage } from './storage/r2-storage';
import { REQUIRE_R2, ALLOW_LOCAL_UPLOADS, isR2Configured } from './config/upload';

const router = express.Router();
const r2 = createR2Storage();

// Memory storage so we can push straight to R2
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = [
      '.jpeg','.jpg','.png','.gif','.webp','.svg',
      '.pdf','.txt','.doc','.docx','.csv','.xlsx','.json'
    ].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Unsupported file type'), ok);
  },
});

async function handleUpload(req: express.Request, res: express.Response) {
  try {
    if (REQUIRE_R2 && !isR2Configured()) {
      return res.status(503).json({ ok: false, error: 'r2_unavailable' });
    }

    if (!req.file) return res.status(400).json({ error: 'No file' });

    const original = req.file.originalname.replace(/\s+/g, '_');
    const filename = `${Date.now()}-${original}`;
    const contentType =
      (req.file.mimetype as string) || (mime.lookup(original) as string) || 'application/octet-stream';

    if (r2) {
      await r2.putBuffer(filename, req.file.buffer, contentType as string);
      return res.json({ ok: true, filename, url: `/api/image-proxy/${filename}` });
    }

    if (!ALLOW_LOCAL_UPLOADS) {
      return res.status(503).json({ ok: false, error: 'local_uploads_disabled' });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const diskPath = path.join(uploadsDir, filename);
    fs.writeFileSync(diskPath, req.file.buffer);
    return res.json({ ok: true, filename, url: `/api/image-proxy/${filename}` });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
}

// Deprecate legacy path; add clean R2 endpoint; project route shares handler
router.post('/api/upload', (_req, res) => {
  res.status(410).json({ error: 'deprecated_endpoint', use: '/api/r2-upload' });
});

router.post('/api/r2-upload', upload.single('file'), handleUpload);
router.post('/api/public/project/:token/upload', upload.single('file'), handleUpload);

export default router; 