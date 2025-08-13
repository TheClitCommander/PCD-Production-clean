import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';

const execAsync = promisify(exec);

interface ScrapingJob {
  id: string;
  businessType: string;
  location: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  totalFound: number;
  primeProspects: number;
  errorMessage?: string;
}

interface ScrapedBusiness {
  id: number;
  business_name: string;
  business_type: string;
  address: string;
  location: string;
  phone: string;
  website: string;
  has_website: boolean;
  rating: number;
  reviews: string;
  maps_url: string;
  scraped_at: string;
  search_session_id: string;
  data_source?: string;
}

class ScraperService {
  private jobs: Map<string, ScrapingJob> = new Map();
  private scraperDbPath: string;

  constructor() {
    // Compute paths relative to the built server (works in Docker/Railway)
    const DIST_DIR = __dirname; // .../pleasantcovedesign/server/dist
    const APP_DIR = path.resolve(DIST_DIR, ".."); // .../pleasantcovedesign/server
    const ROOT_DIR = path.resolve(APP_DIR, ".."); // .../pleasantcovedesign
    
    // Use a DB file at repo root so Python & Node agree on one location
    this.scraperDbPath = path.join(ROOT_DIR, "..", "scraper_results.db");
  }

  async startScraping(businessType: string, location: string): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: ScrapingJob = {
      id: jobId,
      businessType,
      location,
      status: 'pending',
      progress: 0,
      startedAt: new Date(),
      totalFound: 0,
      primeProspects: 0
    };

    this.jobs.set(jobId, job);

    // Start scraping in background
    this.runScraper(jobId, businessType, location).catch(error => {
      console.error(`Scraping job ${jobId} failed:`, error);
      const failedJob = this.jobs.get(jobId);
      if (failedJob) {
        failedJob.status = 'failed';
        failedJob.errorMessage = error.message;
        failedJob.completedAt = new Date();
      }
    });

    return jobId;
  }

  private async runScraper(jobId: string, businessType: string, location: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'running';
      job.progress = 10;

      // Compute paths relative to the built server (so it works in Docker/Railway)
      const DIST_DIR = __dirname; // .../pleasantcovedesign/server/dist
      const APP_DIR = path.resolve(DIST_DIR, ".."); // .../pleasantcovedesign/server
      const ROOT_DIR = path.resolve(APP_DIR, ".."); // .../pleasantcovedesign
      const SCRAPERS_DIR = path.resolve(ROOT_DIR, "..", "scrapers"); // .../<repo>/scrapers

      // Drop the "source venv …" and call Python directly (works locally & in Docker)
      const python = process.env.PYTHON_BIN || "python3";
      const scraperPath = path.join(SCRAPERS_DIR, "real_business_scraper_clean.py");
      const args = [
        scraperPath,
        "-t", businessType.toLowerCase(),
        "-l", location,
        "--limit", String(Number(process.env.SCRAPE_LIMIT || 50)),
      ];

      const command = `${python} ${args.map(a => JSON.stringify(a)).join(" ")}`;
      
      console.log(`🔍 Running CLEAN scraper (no fake data): ${command}`);
      job.progress = 50;

      const { stdout, stderr } = await execAsync(command, {
        cwd: path.resolve(ROOT_DIR, ".."), 
        shell: "/bin/bash"
      });

      console.log('Scraper output:', stdout);
      if (stderr) console.warn('Scraper warnings:', stderr);

      job.progress = 80;

      // Get results from database
      const results = await this.getScrapingResults(jobId);
      job.totalFound = results.length;
      job.primeProspects = results.filter(b => !b.has_website && b.phone).length;
      job.progress = 100;
      job.status = 'completed';
      job.completedAt = new Date();

      console.log(`Scraping job ${jobId} completed: ${job.totalFound} businesses found`);

    } catch (error) {
      console.error(`Scraping job ${jobId} failed:`, error);
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
    }
  }

  async getJobStatus(jobId: string): Promise<ScrapingJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async getAllJobs(): Promise<ScrapingJob[]> {
    return Array.from(this.jobs.values());
  }

  async getScrapingResults(sessionId?: string): Promise<ScrapedBusiness[]> {
    return new Promise((resolve, reject) => {
      // Check if database exists first
      const fs = require('fs');
      if (!fs.existsSync(this.scraperDbPath)) {
        console.log(`Scraper database not found at ${this.scraperDbPath}, returning empty results`);
        resolve([]);
        return;
      }

      const db = new sqlite3.Database(this.scraperDbPath, (err) => {
        if (err) {
          console.warn(`Failed to open scraper database: ${err.message}`);
          resolve([]); // Return empty array instead of rejecting
          return;
        }

        let query = 'SELECT * FROM businesses ORDER BY rating DESC, reviews DESC';
        const params: any[] = [];

        if (sessionId) {
          query = 'SELECT * FROM businesses WHERE search_session_id LIKE ? ORDER BY rating DESC, reviews DESC';
          params.push(`%${sessionId}%`);
        }

        db.all(query, params, (err, rows: any[]) => {
          if (err) {
            reject(new Error(`Failed to query businesses: ${err.message}`));
            return;
          }

          db.close();
          resolve(rows as ScrapedBusiness[]);
        });
      });
    });
  }

  async getScrapingStats(): Promise<{
    totalBusinesses: number;
    businessesByType: Record<string, number>;
    primeProspects: number;
    averageRating: number;
    lastScrapedAt: string;
  }> {
    return new Promise((resolve, reject) => {
      // Check if database exists first
      const fs = require('fs');
      if (!fs.existsSync(this.scraperDbPath)) {
        console.log(`Scraper database not found, returning default stats`);
        resolve({
          totalBusinesses: 0,
          businessesByType: {},
          primeProspects: 0,
          averageRating: 0,
          lastScrapedAt: 'Never'
        });
        return;
      }

      const db = new sqlite3.Database(this.scraperDbPath, (err) => {
        if (err) {
          console.warn(`Failed to open scraper database: ${err.message}`);
          resolve({
            totalBusinesses: 0,
            businessesByType: {},
            primeProspects: 0,
            averageRating: 0,
            lastScrapedAt: 'Never'
          });
          return;
        }

        // Get all statistics in parallel
        const queries = [
          // Total businesses
          new Promise<number>((res, rej) => {
            db.get('SELECT COUNT(*) as count FROM businesses', (err, row: any) => {
              if (err) rej(err);
              else res(row?.count || 0);
            });
          }),

          // Businesses by type
          new Promise<Record<string, number>>((res, rej) => {
            db.all('SELECT business_type, COUNT(*) as count FROM businesses GROUP BY business_type', (err, rows: any[]) => {
              if (err) rej(err);
              else {
                const byType: Record<string, number> = {};
                rows.forEach(row => {
                  byType[row.business_type] = row.count;
                });
                res(byType);
              }
            });
          }),

          // Prime prospects
          new Promise<number>((res, rej) => {
            db.get('SELECT COUNT(*) as count FROM businesses WHERE has_website = 0 AND phone IS NOT NULL AND phone != ""', (err, row: any) => {
              if (err) rej(err);
              else res(row?.count || 0);
            });
          }),

          // Average rating
          new Promise<number>((res, rej) => {
            db.get('SELECT AVG(CAST(rating AS REAL)) as avg_rating FROM businesses WHERE rating IS NOT NULL', (err, row: any) => {
              if (err) rej(err);
              else res(row?.avg_rating || 0);
            });
          }),

          // Last scraped
          new Promise<string>((res, rej) => {
            db.get('SELECT MAX(scraped_at) as last_scraped FROM businesses', (err, row: any) => {
              if (err) rej(err);
              else res(row?.last_scraped || 'Never');
            });
          })
        ];

        Promise.all(queries)
          .then(([totalBusinesses, businessesByType, primeProspects, averageRating, lastScrapedAt]) => {
            db.close();
            resolve({
              totalBusinesses: totalBusinesses as number,
              businessesByType: businessesByType as Record<string, number>,
              primeProspects: primeProspects as number,
              averageRating: Math.round((averageRating as number) * 10) / 10,
              lastScrapedAt: lastScrapedAt as string
            });
          })
          .catch(reject);
      });
    });
  }

  async exportLeads(format: 'excel' | 'csv' = 'excel'): Promise<string> {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `leads_export_${timestamp}.${format === 'excel' ? 'xlsx' : 'csv'}`;
    const outputPath = path.join(process.cwd(), '../../', filename);

    const scraperPath = path.join(process.cwd(), '../../scrapers/real_business_scraper.py');
    const venvPath = path.join(process.cwd(), '../../venv/bin/activate');
    
    const command = `source ${venvPath} && python ${scraperPath} -t plumbers --export --output ${filename}`;
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: path.join(process.cwd(), '../..')
      });

      console.log('Export output:', stdout);
      if (stderr) console.warn('Export warnings:', stderr);

      // Check if file was created
      try {
        await fs.access(outputPath);
        return filename;
      } catch {
        throw new Error('Export file was not created');
      }
    } catch (error) {
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const scraperService = new ScraperService();
