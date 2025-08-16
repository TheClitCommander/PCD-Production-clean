-- PostgreSQL schema for leads table
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  name TEXT,
  business_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal TEXT,
  website_url TEXT,
  website_status TEXT,
  website_confidence NUMERIC,
  category TEXT,
  raw JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance and deduplication
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_website_url ON leads(website_url);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);

-- Create a unique index for deduplication based on phone or domain
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_dedupe ON leads(
  COALESCE(
    NULLIF(regexp_replace(phone, '\D', '', 'g'), ''),
    split_part(lower(COALESCE(website_url, '')), '/', 3)
  )
) WHERE (
  NULLIF(regexp_replace(phone, '\D', '', 'g'), '') IS NOT NULL OR
  split_part(lower(COALESCE(website_url, '')), '/', 3) IS NOT NULL
);
