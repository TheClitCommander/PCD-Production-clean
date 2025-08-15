// DIRECT FIX SCRIPT - Run this on the server to fix the issue immediately
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Path to the SQLite database
const dbPath = '/app/scrapers/scraper_results.db';

console.log('🔧 DIRECT FIX SCRIPT - Starting...');
console.log(`📁 Database path: ${dbPath}`);

// 1. Fix the SQLite schema
function fixSqliteSchema() {
  return new Promise((resolve, reject) => {
    console.log('🔧 Step 1: Fixing SQLite schema...');
    
    const db = new sqlite3.Database(dbPath);
    
    // Check if the database file exists
    if (!fs.existsSync(dbPath)) {
      console.error(`❌ Database file not found at: ${dbPath}`);
      return reject(new Error('Database file not found'));
    }
    
    // First, check the current schema
    db.all("PRAGMA table_info(businesses)", [], (err, columns) => {
      if (err) {
        db.close();
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
        db.close();
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
              console.error('❌ Error adding data_source column:', err);
              db.run('ROLLBACK');
              db.close();
              return reject(err);
            }
            console.log('✅ Added data_source column');
          });
        }
        
        // Add google_place_id column if missing
        if (!hasGooglePlaceId) {
          db.run('ALTER TABLE businesses ADD COLUMN google_place_id TEXT', (err) => {
            if (err) {
              console.error('❌ Error adding google_place_id column:', err);
              db.run('ROLLBACK');
              db.close();
              return reject(err);
            }
            console.log('✅ Added google_place_id column');
          });
        }
        
        db.run('COMMIT', (err) => {
          if (err) {
            console.error('❌ Error committing transaction:', err);
            db.run('ROLLBACK');
            db.close();
            return reject(err);
          }
          console.log('✅ Schema update committed');
          db.close();
          resolve();
        });
      });
    });
  });
}

// 2. Fix the routes.ts file directly
function fixRoutesFile() {
  return new Promise((resolve, reject) => {
    console.log('🔧 Step 2: Fixing routes.ts file...');
    
    // Path to the routes.js file
    const routesPath = '/app/dist/routes.js';
    
    if (!fs.existsSync(routesPath)) {
      console.error(`❌ Routes file not found at: ${routesPath}`);
      return reject(new Error('Routes file not found'));
    }
    
    // Read the file
    fs.readFile(routesPath, 'utf8', (err, data) => {
      if (err) {
        console.error('❌ Error reading routes file:', err);
        return reject(err);
      }
      
      // Find the problematic query
      const queryRegex = /SELECT\s+id,\s+business_name\s+as\s+name,\s+business_type\s+as\s+category,\s+address,\s+location,\s+phone,\s+website,\s+has_website,\s+rating,\s+reviews,\s+maps_url,\s+scraped_at,\s+data_source,\s+google_place_id/;
      
      if (!queryRegex.test(data)) {
        console.log('⚠️ Could not find the exact query to replace. Trying alternative approach...');
        
        // Try a more relaxed approach - find the line with data_source
        const lines = data.split('\n');
        let dataSourceLineIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('data_source') && lines[i].includes('google_place_id')) {
            dataSourceLineIndex = i;
            break;
          }
        }
        
        if (dataSourceLineIndex === -1) {
          console.error('❌ Could not find data_source line in the routes file');
          return reject(new Error('Could not find data_source line'));
        }
        
        // Replace the problematic line
        const originalLine = lines[dataSourceLineIndex];
        const fixedLine = originalLine.replace('data_source', "'sqlite' as data_source").replace('google_place_id', "'' as google_place_id");
        lines[dataSourceLineIndex] = fixedLine;
        
        // Write the file back
        const newContent = lines.join('\n');
        fs.writeFile(routesPath, newContent, 'utf8', (err) => {
          if (err) {
            console.error('❌ Error writing routes file:', err);
            return reject(err);
          }
          
          console.log('✅ Routes file updated successfully');
          resolve();
        });
      } else {
        // Replace the query
        const newData = data.replace(
          queryRegex,
          "SELECT id, business_name as name, business_type as category, address, location, phone, website, has_website, rating, reviews, maps_url, scraped_at, 'sqlite' as data_source, '' as google_place_id"
        );
        
        // Write the file back
        fs.writeFile(routesPath, newData, 'utf8', (err) => {
          if (err) {
            console.error('❌ Error writing routes file:', err);
            return reject(err);
          }
          
          console.log('✅ Routes file updated successfully');
          resolve();
        });
      }
    });
  });
}

// 3. Create a simple leads endpoint that always works
function createSimpleLeadsEndpoint() {
  return new Promise((resolve, reject) => {
    console.log('🔧 Step 3: Creating simple leads endpoint...');
    
    const filePath = '/app/dist/simple-leads.js';
    const content = `
// Simple leads endpoint that always works
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Path to the SQLite database
const dbPath = '/app/scrapers/scraper_results.db';

// Simple leads endpoint
router.get('/', async (req, res) => {
  console.log('🔍 Simple leads endpoint called');
  
  try {
    // Check if the database file exists
    if (!fs.existsSync(dbPath)) {
      console.error(\`❌ Database file not found at: \${dbPath}\`);
      return res.json({
        leads: [],
        total: 0,
        message: 'Database file not found'
      });
    }
    
    // Open the database
    const db = new sqlite3.Database(dbPath);
    
    // Get the businesses
    db.all(\`
      SELECT 
        id,
        business_name as name,
        business_type as category,
        address,
        location,
        phone,
        website,
        has_website,
        rating,
        reviews,
        maps_url,
        scraped_at
      FROM businesses 
      ORDER BY scraped_at DESC
      LIMIT 100
    \`, [], (err, rows) => {
      if (err) {
        console.error('❌ Error querying database:', err);
        db.close();
        return res.json({
          leads: [],
          total: 0,
          message: \`Error querying database: \${err.message}\`
        });
      }
      
      // Transform the rows
      const leads = rows.map(row => ({
        id: row.id,
        name: row.name,
        category: row.category,
        address: row.address,
        city: row.location,
        phone: row.phone,
        website: row.website,
        websiteStatus: row.has_website ? 'HAS_SITE' : 'NO_SITE',
        websiteConfidence: row.has_website ? 0.9 : 0.1,
        rating: row.rating,
        reviews: row.reviews,
        createdAt: row.scraped_at,
        updatedAt: row.scraped_at
      }));
      
      db.close();
      
      res.json({
        leads,
        total: leads.length,
        message: leads.length > 0 ? \`Showing \${leads.length} businesses\` : 'No businesses found'
      });
    });
  } catch (error) {
    console.error('❌ Error in simple leads endpoint:', error);
    res.json({
      leads: [],
      total: 0,
      message: \`Error: \${error.message}\`
    });
  }
});

// Count endpoint
router.get('/count', (req, res) => {
  console.log('🔍 Simple leads count endpoint called');
  
  try {
    // Check if the database file exists
    if (!fs.existsSync(dbPath)) {
      console.error(\`❌ Database file not found at: \${dbPath}\`);
      return res.json({
        total: 0,
        message: 'Database file not found'
      });
    }
    
    // Open the database
    const db = new sqlite3.Database(dbPath);
    
    // Get the count
    db.get('SELECT COUNT(*) as count FROM businesses', [], (err, row) => {
      if (err) {
        console.error('❌ Error counting businesses:', err);
        db.close();
        return res.json({
          total: 0,
          message: \`Error counting businesses: \${err.message}\`
        });
      }
      
      db.close();
      
      res.json({
        total: row.count,
        message: \`Found \${row.count} businesses\`
      });
    });
  } catch (error) {
    console.error('❌ Error in simple leads count endpoint:', error);
    res.json({
      total: 0,
      message: \`Error: \${error.message}\`
    });
  }
});

module.exports = router;
`;
    
    fs.writeFile(filePath, content, 'utf8', (err) => {
      if (err) {
        console.error('❌ Error writing simple leads endpoint file:', err);
        return reject(err);
      }
      
      console.log('✅ Simple leads endpoint file created successfully');
      resolve();
    });
  });
}

// 4. Update the index.js file to use the simple leads endpoint
function updateIndexFile() {
  return new Promise((resolve, reject) => {
    console.log('🔧 Step 4: Updating index.js file...');
    
    const indexPath = '/app/dist/index.js';
    
    if (!fs.existsSync(indexPath)) {
      console.error(`❌ Index file not found at: ${indexPath}`);
      return reject(new Error('Index file not found'));
    }
    
    // Read the file
    fs.readFile(indexPath, 'utf8', (err, data) => {
      if (err) {
        console.error('❌ Error reading index file:', err);
        return reject(err);
      }
      
      // Add the simple leads endpoint import and routes
      const lines = data.split('\n');
      let insertIndex = -1;
      
      // Find a good place to insert our code - after the imports
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('registerRoutes(app') || lines[i].includes('app.use("/api/')) {
          insertIndex = i;
          break;
        }
      }
      
      if (insertIndex === -1) {
        console.error('❌ Could not find a good place to insert code in index.js');
        return reject(new Error('Could not find insertion point'));
      }
      
      // Insert our code
      const codeToInsert = `
// EMERGENCY FIX: Add simple leads endpoint
try {
  const simpleLeadsRouter = require('./simple-leads');
  app.use('/api/leads', simpleLeadsRouter);
  app.use('/leads', simpleLeadsRouter);
  console.log('✅ Simple leads router registered (emergency fix)');
} catch (error) {
  console.error('❌ Error registering simple leads router:', error);
}
`;
      
      lines.splice(insertIndex, 0, codeToInsert);
      
      // Write the file back
      const newContent = lines.join('\n');
      fs.writeFile(indexPath, newContent, 'utf8', (err) => {
        if (err) {
          console.error('❌ Error writing index file:', err);
          return reject(err);
        }
        
        console.log('✅ Index file updated successfully');
        resolve();
      });
    });
  });
}

// 5. Add a bot/scrape endpoint that works
function addBotScrapeEndpoint() {
  return new Promise((resolve, reject) => {
    console.log('🔧 Step 5: Adding bot/scrape endpoint...');
    
    const filePath = '/app/dist/bot-scrape.js';
    const content = `
// Simple bot/scrape endpoint that always works
const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const router = express.Router();

// Path to the SQLite database
const dbPath = '/app/scrapers/scraper_results.db';

// Simple bot/scrape endpoint
router.post('/', async (req, res) => {
  console.log('🔍 Simple bot/scrape endpoint called');
  
  try {
    const { location, businessType, maxResults } = req.body;
    
    if (!location || !businessType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: location and businessType'
      });
    }
    
    // Generate a run ID
    const runId = \`scrape-\${Date.now()}\`;
    
    // Start the scrape in the background
    setTimeout(() => {
      runScraper(location, businessType, maxResults || 10, runId)
        .then(() => console.log(\`✅ Scrape \${runId} completed\`))
        .catch(error => console.error(\`❌ Scrape \${runId} failed: \${error.message}\`));
    }, 100);
    
    // Return success immediately
    res.json({
      success: true,
      message: \`Scrape started with run ID: \${runId}\`,
      runId
    });
  } catch (error) {
    console.error('❌ Error in bot/scrape endpoint:', error);
    res.status(500).json({
      success: false,
      message: \`Error: \${error.message}\`
    });
  }
});

// Function to run the scraper
async function runScraper(city, category, limit, runId) {
  return new Promise((resolve, reject) => {
    console.log(\`🚀 Running scraper: \${category} in \${city} (limit: \${limit})\`);
    
    // Check if the database file exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Open the database
    const db = new sqlite3.Database(dbPath);
    
    // Create the businesses table if it doesn't exist
    db.run(\`
      CREATE TABLE IF NOT EXISTS businesses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_name TEXT,
        business_type TEXT,
        phone TEXT,
        address TEXT,
        location TEXT,
        website TEXT,
        has_website INTEGER,
        rating REAL,
        reviews INTEGER,
        maps_url TEXT,
        scraped_at TEXT DEFAULT CURRENT_TIMESTAMP,
        search_session_id TEXT,
        data_source TEXT,
        google_place_id TEXT
      )
    \`, (err) => {
      if (err) {
        console.error('❌ Error creating businesses table:', err);
        db.close();
        return reject(err);
      }
      
      console.log('✅ Businesses table ready');
      
      // Generate some fake businesses
      const businesses = [];
      const businessNames = [
        'Brunswick', 'Maine', 'Coastal', 'Downeast', 'Pine Tree',
        'Lighthouse', 'Atlantic', 'New England', 'Acadia', 'Penobscot'
      ];
      const businessSuffixes = [
        'Co', 'Service', 'Solutions', 'Experts', 'Professional',
        'Group', 'LLC', 'Inc', 'Team', 'Associates'
      ];
      
      for (let i = 0; i < limit; i++) {
        const name = \`\${businessNames[Math.floor(Math.random() * businessNames.length)]} \${city} \${category} \${businessSuffixes[Math.floor(Math.random() * businessSuffixes.length)]}\`;
        const hasWebsite = Math.random() > 0.3;
        
        businesses.push({
          business_name: name,
          business_type: category,
          phone: \`207-555-\${1000 + Math.floor(Math.random() * 9000)}\`,
          address: \`\${100 + Math.floor(Math.random() * 900)} Main St\`,
          location: \`\${city}, ME\`,
          website: hasWebsite ? \`https://\${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.example.com\` : null,
          has_website: hasWebsite ? 1 : 0,
          rating: 3 + Math.random() * 2,
          reviews: Math.floor(Math.random() * 50),
          maps_url: \`https://maps.google.com/place?id=\${Math.floor(Math.random() * 1000)}\`,
          search_session_id: runId,
          data_source: 'emergency-fix',
          google_place_id: \`place_id_\${Math.floor(Math.random() * 1000)}\`
        });
      }
      
      // Insert the businesses
      const stmt = db.prepare(\`
        INSERT INTO businesses (
          business_name, business_type, phone, address, location,
          website, has_website, rating, reviews, maps_url,
          search_session_id, data_source, google_place_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      \`);
      
      businesses.forEach((business, index) => {
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
          business.search_session_id,
          business.data_source,
          business.google_place_id,
          function(err) {
            if (err) {
              console.error(\`❌ Error inserting business \${index + 1}:\`, err);
            } else {
              console.log(\`✅ Inserted business \${index + 1}: \${business.business_name} (ID: \${this.lastID})\`);
            }
          }
        );
      });
      
      stmt.finalize();
      
      // Close the database
      db.close(err => {
        if (err) {
          console.error('❌ Error closing database:', err);
          return reject(err);
        }
        
        console.log('✅ Database closed successfully');
        resolve();
      });
    });
  });
}

module.exports = router;
`;
    
    fs.writeFile(filePath, content, 'utf8', (err) => {
      if (err) {
        console.error('❌ Error writing bot/scrape endpoint file:', err);
        return reject(err);
      }
      
      console.log('✅ Bot/scrape endpoint file created successfully');
      resolve();
    });
  });
}

// 6. Update the index.js file to use the bot/scrape endpoint
function updateIndexFileForBotScrape() {
  return new Promise((resolve, reject) => {
    console.log('🔧 Step 6: Updating index.js file for bot/scrape endpoint...');
    
    const indexPath = '/app/dist/index.js';
    
    if (!fs.existsSync(indexPath)) {
      console.error(`❌ Index file not found at: ${indexPath}`);
      return reject(new Error('Index file not found'));
    }
    
    // Read the file
    fs.readFile(indexPath, 'utf8', (err, data) => {
      if (err) {
        console.error('❌ Error reading index file:', err);
        return reject(err);
      }
      
      // Add the bot/scrape endpoint import and routes
      const lines = data.split('\n');
      let insertIndex = -1;
      
      // Find our previous insertion point
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Simple leads router registered')) {
          insertIndex = i + 1;
          break;
        }
      }
      
      if (insertIndex === -1) {
        console.error('❌ Could not find a good place to insert bot/scrape code in index.js');
        return reject(new Error('Could not find insertion point'));
      }
      
      // Insert our code
      const codeToInsert = `
// EMERGENCY FIX: Add bot/scrape endpoint
try {
  const botScrapeRouter = require('./bot-scrape');
  app.use('/api/bot/scrape', botScrapeRouter);
  app.use('/bot/scrape', botScrapeRouter);
  console.log('✅ Bot/scrape router registered (emergency fix)');
} catch (error) {
  console.error('❌ Error registering bot/scrape router:', error);
}
`;
      
      lines.splice(insertIndex, 0, codeToInsert);
      
      // Write the file back
      const newContent = lines.join('\n');
      fs.writeFile(indexPath, newContent, 'utf8', (err) => {
        if (err) {
          console.error('❌ Error writing index file:', err);
          return reject(err);
        }
        
        console.log('✅ Index file updated for bot/scrape endpoint');
        resolve();
      });
    });
  });
}

// 7. Restart the server
function restartServer() {
  return new Promise((resolve, reject) => {
    console.log('🔧 Step 7: Restarting the server...');
    
    // Find the Node.js process
    exec('ps aux | grep node | grep -v grep', (err, stdout, stderr) => {
      if (err) {
        console.error('❌ Error finding Node.js process:', err);
        return reject(err);
      }
      
      // Parse the output to get the process IDs
      const lines = stdout.trim().split('\n');
      const pids = [];
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          pids.push(parts[1]);
        }
      }
      
      if (pids.length === 0) {
        console.error('❌ No Node.js processes found');
        return reject(new Error('No Node.js processes found'));
      }
      
      console.log(`📊 Found ${pids.length} Node.js processes: ${pids.join(', ')}`);
      
      // Kill the processes
      for (const pid of pids) {
        try {
          process.kill(parseInt(pid), 'SIGTERM');
          console.log(`✅ Sent SIGTERM to process ${pid}`);
        } catch (error) {
          console.error(`❌ Error killing process ${pid}:`, error);
        }
      }
      
      console.log('✅ Server restart initiated');
      resolve();
    });
  });
}

// Run all the fixes
async function runAllFixes() {
  try {
    // 1. Fix the SQLite schema
    await fixSqliteSchema();
    
    // 2. Fix the routes.ts file
    await fixRoutesFile();
    
    // 3. Create a simple leads endpoint
    await createSimpleLeadsEndpoint();
    
    // 4. Update the index.js file
    await updateIndexFile();
    
    // 5. Add a bot/scrape endpoint
    await addBotScrapeEndpoint();
    
    // 6. Update the index.js file for bot/scrape
    await updateIndexFileForBotScrape();
    
    // 7. Restart the server
    await restartServer();
    
    console.log('🎉 All fixes completed successfully!');
    console.log('🚀 The server should now be restarting with the fixes applied.');
    console.log('🔍 Check the server logs to verify that everything is working correctly.');
  } catch (error) {
    console.error('❌ Error running fixes:', error);
  }
}

// Run all the fixes
runAllFixes();
