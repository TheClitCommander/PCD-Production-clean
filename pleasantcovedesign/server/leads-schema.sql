-- PostgreSQL schema for leads table
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
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (website_status);
CREATE INDEX IF NOT EXISTS leads_city_idx ON leads (city);
CREATE INDEX IF NOT EXISTS leads_name_idx ON leads (lower(name));

-- Create a unique index for deduplication based on phone or domain
CREATE UNIQUE INDEX IF NOT EXISTS leads_unique_key_idx ON leads (
  COALESCE(NULLIF(regexp_replace(phone, '\D','','g'),''), split_part(lower(COALESCE(website_url,'')), '/', 3))
);

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;
