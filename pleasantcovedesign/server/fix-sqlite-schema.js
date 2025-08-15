// Script to fix SQLite schema issues
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Path to the SQLite database
const dbPath = path.resolve(process.cwd(), 'scrapers/scraper_results.db');

// Check if the database file exists
if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database file not found at: ${dbPath}`);
  process.exit(1);
}

console.log(`🔍 Opening database at: ${dbPath}`);
const db = new sqlite3.Database(dbPath);

// Fix the businesses table schema
function fixSchema() {
  return new Promise((resolve, reject) => {
    // First, check the current schema
    db.all("PRAGMA table_info(businesses)", [], (err, columns) => {
      if (err) {
        return reject(err);
      }
      
      console.log('📊 Current schema:', columns.map(c => c.name));
      
      // Check if data_source column exists
      const hasDataSource = columns.some(c => c.name === 'data_source');
      const hasGooglePlaceId = columns.some(c => c.name === 'google_place_id');
      
      const missingColumns = [];
      if (!hasDataSource) missingColumns.push('data_source');
      if (!hasGooglePlaceId) missingColumns.push('google_place_id');
      
      if (missingColumns.length === 0) {
        console.log('✅ Schema is already up to date');
        return resolve();
      }
      
      console.log(`🔧 Adding missing columns: ${missingColumns.join(', ')}`);
      
      // Add missing columns in a transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Add data_source column if missing
        if (!hasDataSource) {
          db.run('ALTER TABLE businesses ADD COLUMN data_source TEXT', (err) => {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }
            console.log('✅ Added data_source column');
          });
        }
        
        // Add google_place_id column if missing
        if (!hasGooglePlaceId) {
          db.run('ALTER TABLE businesses ADD COLUMN google_place_id TEXT', (err) => {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }
            console.log('✅ Added google_place_id column');
          });
        }
        
        db.run('COMMIT', (err) => {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }
          console.log('✅ Schema update committed');
          resolve();
        });
      });
    });
  });
}

// Add some sample data
function addSampleData() {
  return new Promise((resolve, reject) => {
    console.log('🔧 Adding sample data...');
    
    const businesses = [
      {
        business_name: 'Brunswick Plumbing Experts',
        business_type: 'plumber',
        phone: '207-555-1234',
        address: '123 Main St',
        location: 'Brunswick, ME',
        website: 'https://brunswickplumbing.example.com',
        has_website: 1,
        rating: 4.8,
        reviews: 45,
        maps_url: 'https://maps.google.com/place?id=123',
        data_source: 'script',
        google_place_id: 'place_id_123'
      },
      {
        business_name: 'Maine Plumbing Solutions',
        business_type: 'plumber',
        phone: '207-555-5678',
        address: '456 Water St',
        location: 'Brunswick, ME',
        website: 'https://maineplumbing.example.com',
        has_website: 1,
        rating: 4.5,
        reviews: 32,
        maps_url: 'https://maps.google.com/place?id=456',
        data_source: 'script',
        google_place_id: 'place_id_456'
      }
    ];
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      const stmt = db.prepare(`
        INSERT INTO businesses (
          business_name, business_type, phone, address, location,
          website, has_website, rating, reviews, maps_url,
          data_source, google_place_id, scraped_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      
      businesses.forEach(business => {
        stmt.run(
          business.business_name,
          business.business_type,
          business.phone,
          business.address,
          business.location,
          business.website,
          business.has_website,
          business.rating,
          business.reviews,
          business.maps_url,
          business.data_source,
          business.google_place_id
        );
      });
      
      stmt.finalize();
      
      db.run('COMMIT', (err) => {
        if (err) {
          db.run('ROLLBACK');
          return reject(err);
        }
        console.log(`✅ Added ${businesses.length} sample businesses`);
        resolve();
      });
    });
  });
}

// Count businesses
function countBusinesses() {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM businesses', [], (err, row) => {
      if (err) {
        return reject(err);
      }
      console.log(`📊 Total businesses: ${row.count}`);
      resolve(row.count);
    });
  });
}

// Run the script
async function main() {
  try {
    await fixSchema();
    const count = await countBusinesses();
    
    // Add sample data if there are fewer than 5 businesses
    if (count < 5) {
      await addSampleData();
      await countBusinesses();
    }
    
    console.log('✅ Database schema fixed and sample data added');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    db.close();
  }
}

main();
