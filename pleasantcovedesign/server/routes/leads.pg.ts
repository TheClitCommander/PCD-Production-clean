import { Router } from "express";
import { pool } from "../lib/db";

const r = Router();

// GET /api/leads?query=&website_status=&city=&limit=&offset=
r.get("/", async (req, res) => {
  try {
    // Check if Postgres is available
    if (!pool) {
      const devMemoryOK = process.env.ALLOW_NO_DB === "true" && process.env.NODE_ENV !== "production";
      if (!devMemoryOK) {
        return res.status(503).json({ 
          error: 'Database not available', 
          message: 'Database connection required for this operation',
          leads: [],
          total: 0
        });
      }
      // In development with ALLOW_NO_DB=true, we can return mock data
      console.warn('⚠️ Using mock data in development mode (ALLOW_NO_DB=true)');
      return res.json({
        leads: [],
        total: 0,
        message: 'No database connection - using mock data (development only)'
      });
    }

    const { query, website_status, city, limit = "200", offset = "0" } = req.query as any;
    const where: string[] = [];
    const params: any[] = [];

    if (query) {
      params.push(`%${query}%`);
      where.push(`(lower(name) LIKE lower($${params.length}) OR lower(address) LIKE lower($${params.length}))`);
    }
    if (website_status && website_status !== 'all') {
      params.push(website_status);
      where.push(`website_status = $${params.length}`);
    }
    if (city) {
      params.push(`%${city}%`);
      where.push(`lower(COALESCE(city,'')) LIKE lower($${params.length})`);
    }
    params.push(Number(limit));
    params.push(Number(offset));
    
    const sql = `
      SELECT 
        id, name, phone, email, address, city, state, postal,
        website_url, website_status, website_confidence, 
        website_last_checked_at, social_urls, contact_emails, 
        has_contact_form, raw, created_at, updated_at
      FROM leads
      ${where.length ? `WHERE ${where.join(' AND ')}` : ""}
      ORDER BY updated_at DESC
      LIMIT $${params.length-1} OFFSET $${params.length}
    `;
    
    console.log(`🔍 Postgres query: ${sql.replace(/\s+/g, ' ')}`);
    console.log(`📊 Params: [${params.join(', ')}]`);
    
    const { rows } = await pool.query(sql, params);
    
    // Transform to match UI expectations
    const leads = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      category: 'business', // Default category
      source: 'scraper',
      phoneNormalized: row.phone,
      city: row.city,
      region: row.state || 'Maine',
      websiteUrl: row.website_url,
      websiteStatus: row.website_status || 'UNSURE',
      websiteConfidence: row.website_confidence || 0,
      mapsRating: 4.2 + Math.random() * 0.8, // Placeholder
      mapsReviews: Math.floor(Math.random() * 50) + 10, // Placeholder
      mapsUrl: `https://maps.google.com/?cid=${Math.floor(Math.random() * 999999)}`,
      tags: row.website_status === 'HAS_SITE' ? ['has_website', 'has_phone', 'scraped'] : ['no_website', 'has_phone', 'scraped'],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    console.log(`✅ Found ${leads.length} leads in Postgres`);
    res.json({ 
      leads, 
      total: leads.length,
      message: `Showing ${leads.length} leads from Postgres`
    });
  } catch (error) {
    console.error('❌ Postgres leads query failed:', error);
    res.status(500).json({ 
      error: 'Failed to fetch leads from Postgres', 
      details: error.message 
    });
  }
});

// GET /api/leads/count
r.get("/count", async (_req, res) => {
  try {
    if (!pool) {
      const devMemoryOK = process.env.ALLOW_NO_DB === "true" && process.env.NODE_ENV !== "production";
      if (!devMemoryOK) {
        return res.status(503).json({ 
          error: 'Database not available', 
          message: 'Database connection required for this operation',
          total: 0,
          source: 'error'
        });
      }
      // In development with ALLOW_NO_DB=true, we can return mock data
      console.warn('⚠️ Using mock data in development mode (ALLOW_NO_DB=true)');
      return res.json({
        total: 0,
        source: 'mock',
        timestamp: new Date().toISOString()
      });
    }

    const { rows } = await pool.query(`SELECT COUNT(*)::int AS total FROM leads`);
    console.log(`📊 Postgres leads count: ${rows[0].total}`);
    res.json({ 
      total: rows[0].total,
      source: 'postgres',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Postgres count query failed:', error);
    res.status(500).json({ 
      error: 'Failed to count leads in Postgres', 
      details: error.message 
    });
  }
});

export default r;
