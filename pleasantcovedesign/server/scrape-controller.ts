import { Request, Response } from 'express';
import { LeadService } from './lead-service';
import { ScrapeRun, startScrapeSchema } from './shared/schema';
import { Pool } from 'pg';
import { Server as SocketIOServer } from 'socket.io';
import { QueueService } from './queue-service';
import { v4 as uuidv4 } from 'uuid';

export class ScrapeController {
  private leadService: LeadService;
  private queueService: QueueService;

  constructor(private db: Pool, private io: SocketIOServer, redisUrl?: string) {
    this.leadService = new LeadService(db);
    this.queueService = new QueueService(db, io, redisUrl);
  }

  // POST /api/scrape-runs - Start a new scrape (with job queue)
  async startScrape(req: Request, res: Response) {
    try {
      // Validate input
      const validation = startScrapeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid input',
          details: validation.error.errors
        });
      }

      const { city, category, limit } = validation.data;
      
      // Check daily limits
      const dailyLeadsUsed = await this.getDailyLeadsCount();
      const maxDailyLeads = parseInt(process.env.MAX_DAILY_LEADS || '1000');
      
      if (dailyLeadsUsed + limit > maxDailyLeads) {
        return res.status(429).json({
          error: 'Daily limit exceeded',
          message: `Would exceed daily limit of ${maxDailyLeads} leads. Used: ${dailyLeadsUsed}, Requested: ${limit}`
        });
      }

      // Generate run ID and create database record
      const runId = uuidv4();
      const scrapeRun = await this.createScrapeRun({ city, category, limit, runId });
      
      console.log(`🔍 Enqueueing scrape job: ${city} ${category} (limit: ${limit})`);

      // Enqueue the scraping job
      const job = await this.queueService.enqueueScrapeJob({
        runId,
        city,
        category,
        limit
      });

      res.json({
        runId: scrapeRun.id,
        jobId: job.id,
        status: 'queued',
        city,
        category,
        limit,
        position: await job.opts.delay ? 0 : await this.queueService.getQueueStatus().then(s => s.waiting)
      });

    } catch (error) {
      console.error('Failed to start scrape:', error);
      res.status(500).json({ error: 'Failed to start scrape' });
    }
  }

  // GET /api/scrape-runs/:id - Get scrape run status
  async getScrapeRun(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const scrapeRun = await this.getScrapeRunById(id);
      
      if (!scrapeRun) {
        return res.status(404).json({ error: 'Scrape run not found' });
      }

      res.json(scrapeRun);
    } catch (error) {
      console.error('Failed to get scrape run:', error);
      res.status(500).json({ error: 'Failed to get scrape run' });
    }
  }

  // GET /api/leads - Get leads with filters
  async getLeads(req: Request, res: Response) {
    try {
      const {
        websiteStatus,
        city,
        query,
        limit = '50',
        offset = '0'
      } = req.query;

      const filters = {
        websiteStatus: websiteStatus as string,
        city: city as string,
        query: query as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      const result = await this.leadService.getLeads(filters);
      
      res.json({
        leads: result.leads,
        total: result.total,
        limit: filters.limit,
        offset: filters.offset
      });
    } catch (error) {
      console.error('Failed to get leads:', error);
      res.status(500).json({ error: 'Failed to get leads' });
    }
  }

  // POST /api/leads/:id/verify-website - Re-verify a lead's website (with job queue)
  async verifyLeadWebsite(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Enqueue verification job
      const job = await this.queueService.enqueueVerifyJob({ leadId: id });
      
      res.json({
        message: 'Verification queued',
        jobId: job.id,
        leadId: id
      });
    } catch (error) {
      console.error('Failed to verify website:', error);
      if (error instanceof Error && error.message === 'Lead not found') {
        res.status(404).json({ error: 'Lead not found' });
      } else {
        res.status(500).json({ error: 'Failed to verify website' });
      }
    }
  }

  // Helper method to check daily leads usage
  private async getDailyLeadsCount(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.db.query(
      'SELECT COUNT(*) FROM leads WHERE DATE(created_at) = $1',
      [today]
    );
    return parseInt(result.rows[0].count);
  }

  private async createScrapeRun(params: { city: string; category: string; limit: number; runId?: string }): Promise<ScrapeRun> {
    const query = `
      INSERT INTO scrape_runs (city, category, limit_requested, status)
      VALUES ($1, $2, $3, 'running')
      RETURNING *
    `;
    
    const result = await this.db.query(query, [params.city, params.category, params.limit]);
    const row = result.rows[0];
    
    return {
      id: row.id,
      city: row.city,
      category: row.category,
      limitRequested: row.limit_requested,
      status: row.status,
      leadsFound: row.leads_found,
      leadsProcessed: row.leads_processed,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      errorMessage: row.error_message
    };
  }

  private async getScrapeRunById(id: string): Promise<ScrapeRun | null> {
    const result = await this.db.query('SELECT * FROM scrape_runs WHERE id = $1', [id]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      city: row.city,
      category: row.category,
      limitRequested: row.limit_requested,
      status: row.status,
      leadsFound: row.leads_found,
      leadsProcessed: row.leads_processed,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      errorMessage: row.error_message
    };
  }

  private async updateScrapeRun(id: string, updates: Partial<ScrapeRun>): Promise<void> {
    const setClause = [];
    const values = [id];
    let paramIndex = 2;

    if (updates.status !== undefined) {
      setClause.push(`status = $${paramIndex}`);
      values.push(updates.status);
      paramIndex++;
    }

    if (updates.leadsFound !== undefined) {
      setClause.push(`leads_found = $${paramIndex}`);
      values.push(updates.leadsFound.toString());
      paramIndex++;
    }

    if (updates.leadsProcessed !== undefined) {
      setClause.push(`leads_processed = $${paramIndex}`);
      values.push(updates.leadsProcessed.toString());
      paramIndex++;
    }

    if (updates.completedAt !== undefined) {
      setClause.push(`completed_at = $${paramIndex}`);
      values.push(updates.completedAt.toISOString());
      paramIndex++;
    }

    if (updates.errorMessage !== undefined) {
      setClause.push(`error_message = $${paramIndex}`);
      values.push(updates.errorMessage);
      paramIndex++;
    }

    if (setClause.length === 0) return;

    const query = `UPDATE scrape_runs SET ${setClause.join(', ')} WHERE id = $1`;
    await this.db.query(query, values);
  }

}
