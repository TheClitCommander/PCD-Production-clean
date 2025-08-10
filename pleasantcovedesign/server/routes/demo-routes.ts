import { Express, Request, Response } from 'express';
import { storage } from '../storage';
import path from 'path';
import fs from 'fs';

/**
 * Register demo website routes
 */
export function registerDemoRoutes(app: Express) {
  console.log('🖥️  Registering demo website routes');

  // Get all demos
  app.get('/api/demos', async (req: Request, res: Response) => {
    try {
      // Try to get real data from storage
      try {
        const demos = await storage.getDemos();
        if (Array.isArray(demos) && demos.length > 0) {
          return res.json(demos);
        }
      } catch (error) {
        console.log('No demos in storage, using fallback data');
      }

      // Fallback to mock data
      const mockDemos = [
        {
          id: 1,
          companyId: 42,
          companyName: "Maine Lobster Co.",
          businessType: "restaurant",
          demoUrl: "/demos/maine_lobster_co_20250722_224454.html",
          previewImage: "https://placehold.co/600x400/e8f4ff/0a2540?text=Maine+Lobster+Co.",
          views: 78,
          lastViewed: "2025-07-28T14:23:10Z",
          createdAt: "2025-07-22",
          status: "active",
          template: "seafood_restaurant",
          customizations: ["responsive", "online_ordering", "gallery"]
        },
        {
          id: 2,
          companyId: 45,
          companyName: "Portland Plumbing",
          businessType: "contractor",
          demoUrl: "/demos/portland_plumbing_20250720_105322.html",
          previewImage: "https://placehold.co/600x400/e8fff4/0a4025?text=Portland+Plumbing",
          views: 42,
          lastViewed: "2025-07-28T10:15:22Z",
          createdAt: "2025-07-20",
          status: "active",
          template: "service_business",
          customizations: ["responsive", "contact_forms", "testimonials"]
        },
        {
          id: 3,
          companyId: 51,
          companyName: "Coastal Bakery",
          businessType: "retail",
          demoUrl: "/demos/coastal_bakery_20250727_164205.html",
          previewImage: "https://placehold.co/600x400/fff8e8/402a0a?text=Coastal+Bakery",
          views: 15,
          lastViewed: "2025-07-27T16:42:05Z",
          createdAt: "2025-07-27",
          status: "active",
          template: "bakery_shop",
          customizations: ["responsive", "product_gallery", "online_ordering"]
        }
      ];

      res.json(mockDemos);
    } catch (error) {
      console.error('Error fetching demos:', error);
      res.status(500).json({ error: 'Failed to fetch demos' });
    }
  });

  // Get demo statistics
  app.get('/api/demos/stats', async (req: Request, res: Response) => {
    try {
      // Try to get real data from storage
      try {
        const stats = await storage.getDemoStats();
        if (stats) {
          return res.json(stats);
        }
      } catch (error) {
        console.log('No demo stats in storage, using fallback data');
      }

      // Fallback to mock data
      const mockStats = {
        totalDemos: 12,
        totalViews: 345,
        averageViewsPerDemo: 28.75,
        topPerformingDemo: "Maine Lobster Co.",
        recentActivity: [
          {
            demoId: 5,
            companyName: "Maine Lobster Co.",
            action: "viewed",
            timestamp: "2025-07-28T14:23:10Z"
          },
          {
            demoId: 3,
            companyName: "Portland Plumbing",
            action: "viewed",
            timestamp: "2025-07-28T10:15:22Z"
          },
          {
            demoId: 8,
            companyName: "Coastal Bakery",
            action: "generated",
            timestamp: "2025-07-27T16:42:05Z"
          }
        ]
      };

      res.json(mockStats);
    } catch (error) {
      console.error('Error fetching demo stats:', error);
      res.status(500).json({ error: 'Failed to fetch demo statistics' });
    }
  });

  // Generate a new demo
  app.post('/api/demos/generate', async (req: Request, res: Response) => {
    try {
      const { businessName, businessType, template, customizations } = req.body;
      
      // Validate required fields
      if (!businessName || !businessType) {
        return res.status(400).json({ error: 'Business name and type are required' });
      }

      // Try to generate with real storage
      try {
        const newDemo = await storage.generateDemo(req.body);
        if (newDemo) {
          return res.status(201).json(newDemo);
        }
      } catch (error) {
        console.log('Could not generate demo with storage, using mock response');
      }

      // Mock response
      res.status(201).json({
        id: Date.now(),
        companyName: businessName,
        businessType,
        demoUrl: `/demos/${businessName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.html`,
        previewImage: `https://placehold.co/600x400/e8f4ff/0a2540?text=${encodeURIComponent(businessName)}`,
        views: 0,
        createdAt: new Date().toISOString(),
        status: "active",
        template: template || "default",
        customizations: customizations || ["responsive"]
      });
    } catch (error) {
      console.error('Error generating demo:', error);
      res.status(500).json({ error: 'Failed to generate demo' });
    }
  });

  // Get specific demo
  app.get('/api/demos/:demoId', async (req: Request, res: Response) => {
    try {
      const { demoId } = req.params;
      
      // Try to get real data from storage
      try {
        const demo = await storage.getDemoById(parseInt(demoId));
        if (demo) {
          return res.json(demo);
        }
      } catch (error) {
        console.log(`No demo with ID ${demoId} in storage`);
      }

      // Return 404 if demo not found
      res.status(404).json({ error: 'Demo not found' });
    } catch (error) {
      console.error('Error fetching demo:', error);
      res.status(500).json({ error: 'Failed to fetch demo' });
    }
  });

  // Serve demo HTML files
  app.get('/demos/:filename', (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      
      // Validate filename to prevent directory traversal
      if (!filename || filename.includes('..') || !filename.match(/^[a-zA-Z0-9_]+[a-zA-Z0-9_\-.]*\.html$/)) {
        return res.status(400).json({ error: 'Invalid filename' });
      }
      
      // Get the demos directory path
      const demosDir = path.join(process.cwd(), '..', 'demos');
      const filePath = path.join(demosDir, filename);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Demo file not found' });
      }
      
      // Serve the file
      res.sendFile(filePath);
    } catch (error) {
      console.error('Error serving demo file:', error);
      res.status(500).json({ error: 'Failed to serve demo file' });
    }
  });

  console.log('✅ Demo website routes registered');
}