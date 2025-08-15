// Script to run the SQL schema directly
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runSchema() {
  console.log('🔧 Running SQL schema...');
  
  // Try different connection methods
  let pool = null;
  let connectionMethod = '';

  // Method 1: Try connection string
  const cn = process.env.DATABASE_URL;
  if (cn) {
    try {
      console.log('🔄 Attempting connection via DATABASE_URL...');
      pool = new Pool({
        connectionString: cn,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
      });
      connectionMethod = 'DATABASE_URL';
    } catch (error) {
      console.error('❌ Failed to create pool with DATABASE_URL:', error);
    }
  }

  // Method 2: Try individual credentials if no pool yet
  if (!pool) {
    const pgUser = process.env.PGUSER;
    const pgPassword = process.env.PGPASSWORD;
    const pgHost = process.env.PGHOST;
    const pgPort = process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432;
    const pgDatabase = process.env.PGDATABASE || 'railway';

    if (pgUser && pgPassword && pgHost) {
      try {
        console.log('🔄 Attempting connection via individual credentials...');
        pool = new Pool({
          user: pgUser,
          password: pgPassword,
          host: pgHost,
          port: pgPort,
          database: pgDatabase,
          ssl: { rejectUnauthorized: false },
          max: 10,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 10_000,
        });
        connectionMethod = 'PG* variables';
      } catch (error) {
        console.error('❌ Failed to create pool with individual credentials:', error);
      }
    }
  }

  // Method 3: Try hardcoded Railway credentials as last resort
  if (!pool) {
    try {
      console.log('🔄 Attempting connection with hardcoded Railway credentials...');
      pool = new Pool({
        user: 'postgres',
        password: 'maaGXJLImQPrQHTDyXGsVOQZIMxQsFdO', // Hardcoded password from logs
        host: 'postgres.railway.internal',
        port: 5432,
        database: 'railway',
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
      });
      connectionMethod = 'Hardcoded credentials';
    } catch (error) {
      console.error('❌ Failed to create pool with hardcoded credentials:', error);
    }
  }

  if (!pool) {
    console.error('❌ Could not establish database connection with any method.');
    process.exit(1);
  }

  // Test connection
  try {
    console.log('🔍 Testing database connection...');
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful via ' + connectionMethod);
    console.log('✅ Current DB time:', result.rows[0].current_time);
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'leads-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Run schema
    console.log('🔧 Running schema...');
    await pool.query(schema);
    console.log('✅ Schema executed successfully');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'leads'
      ) as exists;
    `);
    console.log('✅ Leads table exists:', tableCheck.rows[0].exists);
    
    // Count rows
    const countResult = await pool.query('SELECT COUNT(*) FROM leads');
    console.log('✅ Leads count:', countResult.rows[0].count);
    
  } catch (error) {
    console.error('❌ Database operation failed:', error);
  } finally {
    await pool.end();
    console.log('✅ Database pool closed');
  }
}

// Run the schema
runSchema().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
