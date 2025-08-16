/**
 * SQLite Schema Migration for Development
 * This ensures the SQLite database has all required columns when used in dev mode
 */
import fs from 'fs';
import path from 'path';

/**
 * Ensures the SQLite businesses table has all required columns
 * Only runs when USE_SQLITE_RESULTS=true and NODE_ENV !== 'production'
 */
export async function ensureSqliteBusinessesSchema(dbFile?: string): Promise<void> {
  const sqlite3 = require('sqlite3').verbose();
  const defaultPath = path.join(process.cwd(), 'scrapers', 'scraper_results.db');
  const dbPath = dbFile || defaultPath;
  
  // Check if database file exists
  if (!fs.existsSync(dbPath)) {
    console.log(`📂 [SQLite] Database not found at ${dbPath}, will be created on first scrape`);
    return;
  }
  
  return new Promise((resolve) => {
    const db = new sqlite3.Database(dbPath, (err: any) => {
      if (err) {
        console.error('❌ [SQLite] Failed to open database:', err.message);
        resolve();
        return;
      }
      
      // Check if businesses table exists
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='businesses'", (err: any, row: any) => {
        if (err) {
          console.error('❌ [SQLite] Failed to check table existence:', err.message);
          db.close();
          resolve();
          return;
        }
        
        if (!row) {
          console.log('📂 [SQLite] Businesses table does not exist, will be created on first scrape');
          db.close();
          resolve();
          return;
        }
        
        // Get current columns
        db.all("PRAGMA table_info('businesses')", (err: any, cols: any[]) => {
          if (err) {
            console.error('❌ [SQLite] Failed to get table info:', err.message);
            db.close();
            resolve();
            return;
          }
          
          const existingColumns = new Set(cols.map((c: any) => c.name));
          
          // Define required columns and their types
          const requiredColumns: Record<string, string> = {
            data_source: "TEXT DEFAULT 'sqlite'",
            google_place_id: "TEXT DEFAULT ''",
            has_website: "INTEGER DEFAULT 0",
            rating: "REAL",
            reviews: "TEXT",
            scraped_at: "TEXT DEFAULT CURRENT_TIMESTAMP",
            maps_url: "TEXT",
            search_session_id: "TEXT"
          };
          
          // Add missing columns
          let columnsAdded = 0;
          let columnsToAdd = [];
          
          for (const [columnName, columnType] of Object.entries(requiredColumns)) {
            if (!existingColumns.has(columnName)) {
              columnsToAdd.push({ name: columnName, type: columnType });
            }
          }
          
          if (columnsToAdd.length === 0) {
            console.log('✅ [SQLite] Schema is up to date');
            db.close();
            resolve();
            return;
          }
          
          // Add columns one by one
          const addNextColumn = (index: number) => {
            if (index >= columnsToAdd.length) {
              console.log(`✅ [SQLite] Schema migration complete: added ${columnsAdded} columns`);
              db.close();
              resolve();
              return;
            }
            
            const column = columnsToAdd[index];
            db.run(`ALTER TABLE businesses ADD COLUMN ${column.name} ${column.type}`, (err: any) => {
              if (err) {
                if (!err.message.includes('duplicate column')) {
                  console.warn(`⚠️ [SQLite] Could not add column ${column.name}: ${err.message}`);
                }
              } else {
                console.log(`✅ [SQLite] Added column: ${column.name}`);
                columnsAdded++;
              }
              addNextColumn(index + 1);
            });
          };
          
          addNextColumn(0);
        });
      });
    });
  });
}

/**
 * Run the migration if conditions are met
 */
export async function runSqliteMigrationIfNeeded() {
  const shouldUseSqlite = process.env.USE_SQLITE_RESULTS === 'true' && 
                          process.env.NODE_ENV !== 'production';
  
  if (shouldUseSqlite) {
    console.log('🔧 [SQLite] Running schema migration for development...');
    await ensureSqliteBusinessesSchema();
  }
}
