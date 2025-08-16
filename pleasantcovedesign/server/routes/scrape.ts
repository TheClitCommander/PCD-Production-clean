import { Router } from "express";
import { scraperService } from "../scraper-service";
const router = Router();

// POST /api/scrape-runs - Start a new scraping run (maps to scraperService)
router.post("/", async (req, res) => {
  try {
    const { city, category, limit } = req.body || {};
    
    if (!city || !category) {
      return res.status(400).json({ error: 'city and category are required' });
    }
    
    console.log(`🚀 [SCRAPE-RUNS] Starting scrape: ${category} in ${city} (limit: ${limit})`);
    
    // Use the scraperService to start the job
    const jobId = await scraperService.startScraping(category, city);
    
    // Return the shape that StartScrapeModal expects
    res.json({ 
      runId: jobId, 
      status: 'started',
      message: `Started scraping ${category} in ${city}`
    });
  } catch (error) {
    console.error('Failed to start scrape run:', error);
    res.status(500).json({ error: 'Failed to start scrape run' });
  }
});

// GET /api/scrape-runs/:id - Get status of a scraping run (maps to scraperService job status)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 [SCRAPE-RUNS] Fetching status for run: ${id}`);
    
    const job = await scraperService.getJobStatus(id);
    
    if (!job) {
      return res.status(404).json({ error: 'Scrape run not found' });
    }
    
    // Transform job data to the shape that ScrapeProgressPanel expects
    const runData = {
      id: job.id,
      city: job.location,
      category: job.businessType,
      limitRequested: job.totalFound || 100, // Use totalFound or default to 100
      status: job.status === 'pending' ? 'running' : 
              job.status === 'running' ? 'running' :
              job.status === 'completed' ? 'completed' : 'failed',
      leadsFound: job.totalFound || 0,
      leadsProcessed: Math.round(((job.progress || 0) / 100) * (job.totalFound || 100)),
      startedAt: job.startedAt.toISOString(),
      completedAt: job.completedAt ? job.completedAt.toISOString() : undefined,
      errorMessage: job.errorMessage
    };
    
    res.json(runData);
  } catch (error) {
    console.error('Failed to get scrape run status:', error);
    res.status(500).json({ error: 'Failed to get scrape run status' });
  }
});

export default router;

