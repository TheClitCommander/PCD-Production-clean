import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function normalizePhone(p?: string) { 
  return (p || "").replace(/\D/g,""); 
}

function extractDomain(u?: string) {
  try { 
    return (new URL(u!)).hostname.toLowerCase(); 
  } catch { 
    return ""; 
  }
}

export type UpsertInput = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string; 
  state?: string; 
  postal?: string;
  website_url?: string;
  website_status?: "HAS_SITE"|"NO_SITE"|"SOCIAL_ONLY"|"UNSURE";
  website_confidence?: number;
  raw?: any;
};

export async function upsertLead(input: UpsertInput) {
  const phoneKey = normalizePhone(input.phone);
  const domainKey = extractDomain(input.website_url || "");
  const bestUrl = input.website_url || null;

  console.log(`📝 Upserting lead: ${input.name} (phone: ${phoneKey}, domain: ${domainKey})`);

  const q = `
    INSERT INTO leads (name, phone, email, address, city, state, postal,
                       website_url, website_status, website_confidence, raw)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (COALESCE(NULLIF(regexp_replace(phone, '\\D','','g'),''), split_part(lower(COALESCE(website_url,'')), '/', 3)))
    DO UPDATE SET
      name = COALESCE(EXCLUDED.name, leads.name),
      email = COALESCE(EXCLUDED.email, leads.email),
      address = COALESCE(EXCLUDED.address, leads.address),
      city = COALESCE(EXCLUDED.city, leads.city),
      state = COALESCE(EXCLUDED.state, leads.state),
      postal = COALESCE(EXCLUDED.postal, leads.postal),
      website_url = COALESCE(EXCLUDED.website_url, leads.website_url),
      website_status = EXCLUDED.website_status,
      website_confidence = EXCLUDED.website_confidence,
      raw = EXCLUDED.raw,
      updated_at = now()
    RETURNING *;
  `;
  
  const vals = [
    input.name ?? null,
    input.phone ?? null,
    input.email ?? null,
    input.address ?? null,
    input.city ?? null,
    input.state ?? null,
    input.postal ?? null,
    bestUrl,
    input.website_status ?? null,
    input.website_confidence ?? null,
    input.raw ?? null,
  ];
  
  try {
    const { rows } = await pool.query(q, vals);
    console.log(`✅ Upserted lead: ${input.name} → ID: ${rows[0].id}`);
    return rows[0];
  } catch (error) {
    console.error(`❌ Failed to upsert lead ${input.name}:`, error);
    throw error;
  }
}

/**
 * Initialize the leads table in Postgres with proper schema
 */
export async function initializeLeadsTable(): Promise<void> {
  try {
    console.log('🔧 Initializing leads table in Postgres...');
    
    // Enable UUID extension
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    
    // Create the leads table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        postal TEXT,
        website_url TEXT,
        website_status TEXT CHECK (website_status IN ('HAS_SITE','NO_SITE','SOCIAL_ONLY','UNSURE')),
        website_confidence DOUBLE PRECISION,
        website_last_checked_at TIMESTAMPTZ,
        social_urls JSONB,
        contact_emails JSONB,
        has_contact_form BOOLEAN,
        raw JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    
    // Create helpful indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (website_status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS leads_city_idx ON leads (city);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS leads_name_idx ON leads (lower(name));`);
    
    // Best-effort dedupe: one row per phone (normalized) else per domain
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS leads_unique_key_idx ON leads (
        COALESCE(NULLIF(regexp_replace(phone, '\\D','','g'),''), split_part(lower(COALESCE(website_url,'')), '/', 3))
      )
    `);
    
    console.log('✅ Leads table initialized successfully in Postgres');
  } catch (error) {
    console.error('❌ Failed to initialize leads table:', error);
    throw error;
  }
}
