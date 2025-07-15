import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer with cross-platform compatibility
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate safe filename for all platforms
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `upload-${timestamp}-${randomId}${ext}`;
    cb(null, safeName);
  }
});

// File filter with mobile-friendly MIME types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic', // iOS
    'image/heif', // iOS
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-rar',
    // Mobile camera
    'image/*'
  ];

  // Check file extension as fallback
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.pdf', '.doc', '.docx', '.txt', '.zip', '.rar'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) || allowedMimes.includes('image/*') || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not supported: ${file.mimetype} (${ext})`));
  }
};

// Configure multer with size limits
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB for all files
  }
});

// Handle file upload response
export const handleFileUpload = (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  
  res.json({
    success: true,
    url: fileUrl,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
};

// Serve files with proper headers for cross-platform
export const serveFile = (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Get file stats
  const stat = fs.statSync(filePath);
  const ext = path.extname(filename).toLowerCase();
  
  // Set appropriate headers for cross-platform compatibility
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Set content type based on extension
  const contentTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed'
  };
  
  const contentType = contentTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  
  // For images, allow inline display
  if (contentType.startsWith('image/')) {
    res.setHeader('Content-Disposition', 'inline');
  } else {
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filename)}"`);
  }
  
  // Stream the file
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
};

// Clean up old files (optional, for production)
export const cleanupOldFiles = () => {
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  
  fs.readdir(uploadsDir, (err, files) => {
    if (err) return;
    
    files.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      fs.stat(filePath, (err, stat) => {
        if (err) return;
        
        const now = Date.now();
        const fileAge = now - stat.mtimeMs;
        
        if (fileAge > maxAge) {
          fs.unlink(filePath, err => {
            if (!err) console.log(`Cleaned up old file: ${file}`);
          });
        }
      });
    });
  });
}; 