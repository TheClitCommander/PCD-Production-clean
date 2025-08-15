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

    // Parse query parameters
    const search = req.query.query as string || '';
    const websiteStatus = req.query.website_status as string || '';
    const city = req.query.city as string || '';
    const limit = parseInt(req.query.limit as string || '50', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);

    // Build WHERE clause
    const conditions = ['1=1']; // Always true condition to start
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR phone LIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (websiteStatus) {
      conditions.push(`website_status = $${paramIndex}`);
      params.push(websiteStatus);
      paramIndex++;
    }

    if (city) {
      conditions.push(`city ILIKE $${paramIndex}`);
      params.push(`%${city}%`);
      paramIndex++;
    }

    // Build the query
    const whereClause = conditions.join(' AND ');
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM leads WHERE ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get leads with pagination
    const query = `
      SELECT 
        id,
        name,
        phone,
        email,
        address,
        city,
        state,
        postal,
        website_url,
        website_status,
        website_confidence,
        social_urls,
        contact_emails,
        has_contact_form,
        created_at,
        updated_at
      FROM leads 
      WHERE ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    const result = await pool.query(query, params);

    return res.json({
      leads: result.rows,
      total,
      source: 'postgres'
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return res.status(500).json({
      error: 'Database error',
      message: 'An error occurred while fetching leads',
      leads: [],
      total: 0
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

    const query = 'SELECT COUNT(*) as total FROM leads';
    const result = await pool.query(query);
    const total = parseInt(result.rows[0].total, 10);

    return res.json({
      total,
      source: 'postgres',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error counting leads:', error);
    return res.status(500).json({
      error: 'Database error',
      message: 'An error occurred while counting leads',
      total: 0,
      source: 'error'
    });
  }
});

export default r;