import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import IORedis from 'ioredis';
import { LeadService } from './lead-service';
import { spawn } from 'child_process';
import { Server as SocketIOServer } from 'socket.io';
import { Pool } from 'pg';

// Job Types
export interface ScrapeJobData {
  runId: string;
  city: string;
  category: string;
  limit: number;
}

export interface VerifyJobData {
  leadId: string;
  rawData?: any;
}

export class QueueService {
  private connection: IORedis;
  private leadsQueue: Queue;
  private queueEvents: QueueEvents;
  private worker: Worker;
  private leadService: LeadService;

  constructor(
    private db: Pool,
    private io: SocketIOServer,
    redisUrl?: string
  ) {
    // Redis connection
    this.connection = redisUrl 
      ? new IORedis(redisUrl)
      : new IORedis({
          host: 'localhost',
          port: 6379,
          maxRetriesPerRequest: 3
        });

    // Initialize queue and events
    this.leadsQueue = new Queue('pcd-leads', { 
      connection: this.connection,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 20,
        attempts: parseInt(process.env.JOB_ATTEMPTS || '2'),
        backoff: {
          type: 'exponential',
          delay: parseInt(process.env.JOB_BACKOFF_MS || '30000')
        }
      }
    });

    this.queueEvents = new QueueEvents('pcd-leads', { 
      connection: this.connection 
    });

    this.leadService = new LeadService(db);

    this.setupWorker();
    this.setupEventListeners();
  }

  private setupWorker() {
    this.worker = new Worker('pcd-leads', async (job: Job) => {
      console.log(`🔄 Processing job: ${job.name} (${job.id})`);
      
      switch (job.name) {
        case 'scrape:run':
          return this.processScrapeJob(job.data as ScrapeJobData);
        case 'verify:lead':
          return this.processVerifyJob(job.data as VerifyJobData);
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    }, {
      connection: this.connection,
      concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '3'),
      limiter: {
        max: parseInt(process.env.MAX_CONCURRENT_FETCHES || '4'),
        duration: 60000 // per minute
      }
    });
  }

  private setupEventListeners() {
    this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
      console.log(`✅ Job completed: ${jobId}`);
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      console.error(`❌ Job failed: ${jobId} - ${failedReason}`);
    });

    this.queueEvents.on('progress', ({ jobId, data }) => {
      console.log(`📊 Job progress: ${jobId} - ${JSON.stringify(data)}`);
    });
  }

  // Process scraping job
  private async processScrapeJob(data: ScrapeJobData): Promise<any> {
    const { runId, city, category, limit } = data;
    
    console.log(`🔍 Starting scrape: ${city} ${category} (limit: ${limit})`);

    return new Promise((resolve, reject) => {
      // Spawn Python scraper
      const pythonScript = spawn('python3', [
        'scrapers/google_maps_scraper.py',
        '--city', city,
        '--category', category,
        '--limit', limit.toString(),
        '--output-format', 'jsonl'
      ], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let leadsProcessed = 0;
      let buffer = '';
      const results = {
        leadsProcessed: 0,
        leadsFound: 0,
        errors: [] as string[]
      };

      // Process stdout line by line
      pythonScript.stdout.setEncoding('utf8');
      pythonScript.stdout.on('data', async (chunk: string) => {
        buffer += chunk;
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const leadData = JSON.parse(line);
            
            // Process lead through verification pipeline
            const lead = await this.leadService.upsertLeadWithVerification(leadData);
            leadsProcessed++;
            results.leadsProcessed = leadsProcessed;
            results.leadsFound = leadsProcessed;
            
            // Emit real-time updates
            this.io.emit('lead:upserted', { 
              runId, 
              lead,
              progress: leadsProcessed 
            });
            
            this.io.emit('scrape:progress', { 
              runId, 
              leadsProcessed,
              leadsFound: leadsProcessed
            });
            
            console.log(`✅ Processed lead: ${lead.name} (${lead.websiteStatus})`);
            
          } catch (parseError) {
            console.error('Failed to parse scraper output:', line, parseError);
            results.errors.push(`Parse error: ${parseError}`);
          }
        }
      });

      // Handle errors
      pythonScript.stderr.on('data', (data: Buffer) => {
        const error = data.toString();
        console.error('Scraper error:', error);
        results.errors.push(error);
      });

      // Handle completion
      pythonScript.on('close', (code: number) => {
        console.log(`🏁 Scrape completed with code: ${code}, processed: ${leadsProcessed}`);
        
        // Emit completion event
        this.io.emit('scrape:completed', {
          runId,
          status: code === 0 ? 'completed' : 'failed',
          leadsProcessed,
          errorMessage: code !== 0 ? `Scraper exited with code ${code}` : undefined
        });
        
        if (code === 0) {
          resolve(results);
        } else {
          reject(new Error(`Scraper failed with code ${code}`));
        }
      });

      // Handle process errors
      pythonScript.on('error', (error: Error) => {
        console.error('Failed to start scraper:', error);
        this.io.emit('scrape:failed', {
          runId,
          error: error.message
        });
        reject(error);
      });
    });
  }

  // Process lead verification job
  private async processVerifyJob(data: VerifyJobData): Promise<any> {
    const { leadId, rawData } = data;
    
    console.log(`🔍 Verifying lead: ${leadId}`);

    if (rawData) {
      // New lead verification
      const lead = await this.leadService.upsertLeadWithVerification(rawData);
      
      this.io.emit('lead:upserted', { lead });
      
      return { leadId: lead.id, status: 'processed' };
    } else {
      // Re-verify existing lead
      const updatedLead = await this.leadService.reverifyWebsite(leadId);
      
      this.io.emit('lead:updated', { lead: updatedLead });
      
      return { leadId, status: 'reverified' };
    }
  }

  // Public methods for enqueueing jobs
  async enqueueScrapeJob(data: ScrapeJobData): Promise<Job> {
    return this.leadsQueue.add('scrape:run', data, {
      priority: 1, // High priority for user-initiated scrapes
      delay: 0
    });
  }

  async enqueueVerifyJob(data: VerifyJobData): Promise<Job> {
    return this.leadsQueue.add('verify:lead', data, {
      priority: 5 // Lower priority for re-verification
    });
  }

  // Queue management
  async getQueueStatus() {
    const waiting = await this.leadsQueue.getWaiting();
    const active = await this.leadsQueue.getActive();
    const completed = await this.leadsQueue.getCompleted();
    const failed = await this.leadsQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    };
  }

  async pauseQueue() {
    await this.leadsQueue.pause();
  }

  async resumeQueue() {
    await this.leadsQueue.resume();
  }

  // Cleanup
  async close() {
    await this.worker.close();
    await this.leadsQueue.close();
    await this.queueEvents.close();
    await this.connection.disconnect();
  }
}
