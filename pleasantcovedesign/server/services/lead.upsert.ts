import { pool } from "../lib/db";

interface UpsertInput {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postal?: string;
  website_url?: string;
  website_status?: 'HAS_SITE' | 'NO_SITE' | 'SOCIAL_ONLY' | 'UNSURE';
  website_confidence?: number;
  social_urls?: Record<string, string>;
  contact_emails?: string[];
  has_contact_form?: boolean;
  raw?: Record<string, any>;
}

export async function upsertLead(input: UpsertInput) {
  try {
    if (!pool) {
      const devMemoryOK = process.env.ALLOW_NO_DB === "true" && process.env.NODE_ENV !== "production";
      if (!devMemoryOK) {
        console.error('❌ Cannot upsert lead: Database not available');
        throw new Error('Database not available');
      }
      console.warn('⚠️ No Postgres connection available - skipping upsert (dev mode)');
      return null;
    }

    // Normalize phone by removing non-digits
    const phone = input.phone ? input.phone.replace(/\D/g, '') : null;
    
    // Extract domain from website URL if present
    const websiteUrl = input.website_url || null;
    
    // Prepare values for insertion
    const values = [
      input.name || null,
      phone,
      input.email || null,
      input.address || null,
      input.city || null,
      input.state || null,
      input.postal || null,
      websiteUrl,
      input.website_status || 'UNSURE',
      input.website_confidence || 0,
      JSON.stringify(input.social_urls || {}),
      JSON.stringify(input.contact_emails || []),
      input.has_contact_form || false,
      JSON.stringify(input.raw || {})
    ];

    // Upsert query using the unique index on phone or domain
    const result = await pool.query(`
      INSERT INTO leads (
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
        raw
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT ON CONSTRAINT leads_unique_key_idx
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
        social_urls = EXCLUDED.social_urls,
        contact_emails = EXCLUDED.contact_emails,
        has_contact_form = EXCLUDED.has_contact_form,
        raw = EXCLUDED.raw,
        updated_at = NOW()
      RETURNING id
    `, values);

    return result.rows[0]?.id;
  } catch (error) {
    console.error('❌ Error upserting lead:', error);
    throw error;
  }
}

export async function initializeLeadsTable(): Promise<void> {
  try {
    console.log('🔧 Initializing leads table in Postgres...');
    if (!pool) {
      const devMemoryOK = process.env.ALLOW_NO_DB === "true" && process.env.NODE_ENV !== "production";
      if (!devMemoryOK) {
        console.error('❌ Cannot initialize leads table: Database not available');
        throw new Error('Database not available');
      }
      console.warn('⚠️ No Postgres connection available - skipping table initialization (dev mode)');
      return;
    }

    // Create UUID extension
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    // Create leads table
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

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (website_status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS leads_city_idx ON leads (city);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS leads_name_idx ON leads (lower(name));`);
    
    // Create unique index for deduplication
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS leads_unique_key_idx ON leads (
        COALESCE(NULLIF(regexp_replace(phone, '\\D','','g'),''), split_part(lower(COALESCE(website_url,'')), '/', 3))
      )
    `);

    console.log('✅ Leads table initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing leads table:', error);
    throw error;
  }
}