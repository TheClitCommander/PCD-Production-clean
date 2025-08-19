import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import { createR2Storage } from './storage/r2-storage';

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

// Unified upload endpoint (works for widget + admin)
router.post(['/api/upload', '/api/public/project/:token/upload'], upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });

    const original = req.file.originalname.replace(/\s+/g, '_');
    const filename = `${Date.now()}-${original}`;
    const contentType = req.file.mimetype || mime.lookup(original) || 'application/octet-stream';

    if (r2) {
      // Primary path: R2
      await r2.putBuffer(filename, req.file.buffer, contentType as string);
      // Always serve via the image proxy
      return res.json({ ok: true, filename, url: `/api/image-proxy/${filename}` });
    }

    // Fallback: local uploads (dev)
    const uploadsDir = path.join(process.cwd(), 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const diskPath = path.join(uploadsDir, filename);
    fs.writeFileSync(diskPath, req.file.buffer);
    return res.json({ ok: true, filename, url: `/api/image-proxy/${filename}` });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router; 