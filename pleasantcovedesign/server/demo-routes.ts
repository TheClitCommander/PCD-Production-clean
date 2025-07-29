import express, { type Request, Response } from "express";
import path from 'path';
import fs from 'fs';

// CommonJS __dirname is available by default
const __dirname = path.dirname(__filename);

const router = express.Router();

// Serve demo HTML files
router.get('/demos/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    // Security: Only allow .html files and prevent directory traversal
    if (!filename.endsWith('.html') || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    // Look for demo file in demos directory (relative to project root)
    const demoPath = path.resolve(process.cwd(), 'demos', filename);
    
    // Check if file exists
    if (!fs.existsSync(demoPath)) {
      return res.status(404).json({ error: 'Demo not found' });
    }
    
    // Read and serve the HTML file
    const htmlContent = fs.readFileSync(demoPath, 'utf8');
    
    // Set proper headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Add CORS headers for cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
    res.send(htmlContent);
    
  } catch (error) {
    console.error('Error serving demo:', error);
    res.status(500).json({ error: 'Failed to serve demo' });
  }
});

// List available demos (for admin use)
router.get('/demos', (req: Request, res: Response) => {
  try {
    const demosDir = path.resolve(process.cwd(), 'demos');
    
    if (!fs.existsSync(demosDir)) {
      return res.json({ demos: [] });
    }
    
    const files = fs.readdirSync(demosDir)
      .filter(file => file.endsWith('.html'))
      .map(file => {
        const filePath = path.join(demosDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          url: `/api/demos/${file}`,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.modified.getTime() - a.modified.getTime()); // Newest first
    
    res.json({ demos: files });
    
  } catch (error) {
    console.error('Error listing demos:', error);
    res.status(500).json({ error: 'Failed to list demos' });
  }
});

export default router; 