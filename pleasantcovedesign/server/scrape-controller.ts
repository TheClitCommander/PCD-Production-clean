import { Request, Response } from 'express';
import { spawn } from 'child_process';
import { LeadService } from './lead-service';
import { ScrapeRun, startScrapeSchema } from './shared/schema';
import { Pool } from 'pg';
import { Server as SocketIOServer } from 'socket.io';

export class ScrapeController {
  private leadService: LeadService;

  constructor(private db: Pool, private io: SocketIOServer) {
    this.leadService = new LeadService(db);
  }

  // POST /api/scrape-runs - Start a new scrape
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

      // Create scrape run record
      const scrapeRun = await this.createScrapeRun({ city, category, limit });
      
      console.log(`🔍 Starting scrape: ${city} ${category} (limit: ${limit})`);

      // Start Python scraper process
      this.startScrapingProcess(scrapeRun, { city, category, limit });

      res.json({
        runId: scrapeRun.id,
        status: 'started',
        city,
        category,
        limit
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

  // POST /api/leads/:id/verify-website - Re-verify a lead's website
  async verifyLeadWebsite(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updatedLead = await this.leadService.reverifyWebsite(id);
      
      // Broadcast update to connected clients
      this.io.emit('lead:updated', { lead: updatedLead });
      
      res.json(updatedLead);
    } catch (error) {
      console.error('Failed to verify website:', error);
      if (error instanceof Error && error.message === 'Lead not found') {
        res.status(404).json({ error: 'Lead not found' });
      } else {
        res.status(500).json({ error: 'Failed to verify website' });
      }
    }
  }

  private async createScrapeRun(params: { city: string; category: string; limit: number }): Promise<ScrapeRun> {
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

  private startScrapingProcess(scrapeRun: ScrapeRun, params: { city: string; category: string; limit: number }) {
    const pythonScript = spawn('python3', [
      'scrapers/google_maps_scraper.py', // Adjust path as needed
      '--city', params.city,
      '--category', params.category,
      '--limit', params.limit.toString(),
      '--output-format', 'jsonl' // JSON Lines format for streaming
    ], {
      cwd: process.cwd(), // Set working directory
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let leadsProcessed = 0;
    let buffer = '';

    // Process stdout line by line
    pythonScript.stdout.setEncoding('utf8');
    pythonScript.stdout.on('data', async (chunk: string) => {
      buffer += chunk;
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const leadData = JSON.parse(line);
          
          // Process lead through our pipeline
          const lead = await this.leadService.upsertLeadWithVerification(leadData);
          leadsProcessed++;
          
          // Broadcast live updates
          this.io.emit('lead:upserted', { 
            runId: scrapeRun.id, 
            lead,
            progress: leadsProcessed 
          });
          
          // Update scrape run progress
          await this.updateScrapeRun(scrapeRun.id, { 
            leadsProcessed,
            leadsFound: leadsProcessed 
          });
          
          console.log(`✅ Processed lead: ${lead.name} (${lead.websiteStatus})`);
          
        } catch (parseError) {
          console.error('Failed to parse scraper output:', line, parseError);
        }
      }
    });

    // Handle errors
    pythonScript.stderr.on('data', (data: Buffer) => {
      console.error('Scraper error:', data.toString());
    });

    // Handle completion
    pythonScript.on('close', async (code: number) => {
      console.log(`🏁 Scrape completed with code: ${code}`);
      
      const status = code === 0 ? 'completed' : 'failed';
      const errorMessage = code !== 0 ? `Scraper exited with code ${code}` : undefined;
      
      await this.updateScrapeRun(scrapeRun.id, {
        status,
        completedAt: new Date(),
        errorMessage,
        leadsFound: leadsProcessed
      });
      
      // Broadcast completion
      this.io.emit('scrape:completed', {
        runId: scrapeRun.id,
        status,
        leadsProcessed,
        errorMessage
      });
    });

    // Handle process errors
    pythonScript.on('error', async (error: Error) => {
      console.error('Failed to start scraper:', error);
      
      await this.updateScrapeRun(scrapeRun.id, {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error.message
      });
      
      this.io.emit('scrape:failed', {
        runId: scrapeRun.id,
        error: error.message
      });
    });

    console.log(`🚀 Scraper process started (PID: ${pythonScript.pid})`);
  }
}
