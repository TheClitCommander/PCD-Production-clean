import { Router } from "express";
import { startScrapeRun } from "../services/scrape-service";
const router = Router();

// POST /api/scrape-runs
router.post("/", async (req, res) => {
  try {
    const { city, category, limit } = req.body || {};
    const run = await startScrapeRun({ 
      city, 
      category, 
      limit: Number(limit) || 100 
    });
    res.json(run); // { runId, status: 'started' }
  } catch (error) {
    console.error('Failed to start scrape run:', error);
    res.status(500).json({ error: 'Failed to start scrape run' });
  }
});

export default router;

