import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";

const dbPath = process.env.DATABASE_URL || "websitewizard.db";
const sqlite = new Database(dbPath);

// Ensure foreign keys are enforced
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Initialize tables to match shared/schema.ts exactly
const initQuery = `
CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  business_type TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'scraped',
  website TEXT,
  notes TEXT DEFAULT '',
  score INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'medium',
  tags TEXT,
  last_contact_date TEXT,
  scheduled_time TEXT,
  appointment_status TEXT DEFAULT 'confirmed',
  payment_status TEXT DEFAULT 'pending',
  total_amount INTEGER DEFAULT 0,
  paid_amount INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_payment_link_id TEXT,
  last_payment_date TEXT,
  payment_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  total_contacts INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  response_count INTEGER NOT NULL DEFAULT 0,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  description TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  preview_url TEXT,
  features TEXT
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  business_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE TABLE IF NOT EXISTS availability_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_of_week INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blocked_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  datetime TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  is_auto_scheduled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE TABLE IF NOT EXISTS progress_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  stage TEXT NOT NULL,
  image_url TEXT NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  publicly_visible INTEGER DEFAULT 1,
  payment_required INTEGER DEFAULT 0,
  payment_amount INTEGER,
  payment_status TEXT,
  payment_notes TEXT,
  stripe_link TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);
`;

try {
  sqlite.exec(initQuery);
  console.log("✅ SQLite database initialized at", dbPath);
} catch (error) {
  console.error("❌ Failed to initialize database:", error);
  throw error;
}

// For compatibility with existing code
export const pool = { query: () => { throw new Error('Use db instead of pool'); } };