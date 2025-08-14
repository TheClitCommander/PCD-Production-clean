import { Router } from "express";
import { storage } from "../storage";
const router = Router();

// GET /api/leads/count - Quick count check from Postgres
router.get("/count", async (req, res) => {
  try {
    const result = await storage.query('SELECT COUNT(*) as total FROM leads');
    const total = result.rows[0]?.total || 0;
    
    res.json({ 
      total: Number(total), 
      source: 'postgres',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to count leads:', error);
    res.status(500).json({ error: 'Failed to count leads', details: error.message });
  }
});

// GET /api/leads?query=&website_status=&city=
router.get("/", async (req, res) => {
  try {
    const { query, website_status, city } = req.query as any;
    const where: string[] = [];
    const params: any[] = [];

    if (query) {
      params.push(`%${query}%`);
      where.push(`(lower(name) LIKE lower($${params.length}) OR lower(address_raw) LIKE lower($${params.length}))`);
    }
    if (website_status && website_status !== 'all') {
      params.push(website_status);
      where.push(`website_status = $${params.length}`);
    }
    if (city) {
      params.push(`%${city}%`);
      where.push(`lower(city) LIKE lower($${params.length})`);
    }

    const sql = `
      SELECT 
        id, name, category, source, phone_raw, phone_normalized, 
        email_raw, email_normalized, address_raw, address_line1, 
        city, region, postal_code, country, lat, lng,
        website_url, website_status, website_confidence, 
        website_last_checked_at, social_urls, contact_emails, 
        has_contact_form, verification_evidence, created_at, updated_at
      FROM leads 
      ${where.length ? `WHERE ${where.join(' AND ')}` : ""} 
      ORDER BY updated_at DESC 
      LIMIT 500
    `;
    
    const result = await storage.query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// PATCH /api/leads/:id (archive, notes, etc.)
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const patch = req.body || {};
    patch.updated_at = new Date();
    
    // Build dynamic UPDATE query
    const fields = Object.keys(patch).filter(k => k !== 'id');
    const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
    const values = [id, ...fields.map(field => patch[field])];
    
    const sql = `
      UPDATE leads 
      SET ${setClause}
      WHERE id = $1 
      RETURNING *
    `;
    
    const result = await storage.query(sql, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE /api/leads/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await storage.query('DELETE FROM leads WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

export default router;

