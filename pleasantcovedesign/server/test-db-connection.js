// Simple script to test PostgreSQL connection
const { Pool } = require('pg');

// Get the connection string from environment or use the one from Railway
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:maaGXJLImQPrQHTDyXGsVOQZIMxQsFdO@postgres.railway.internal:5432/railway';

console.log('🔌 Testing connection to PostgreSQL...');
console.log(`🔑 Using connection string: ${connectionString.replace(/postgres:\/\/[^:]+:([^@]+)@/, 'postgres://[USER]:[PASSWORD]@')}`);

// Create a new pool with SSL enabled
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function testConnection() {
  try {
    console.log('🔍 Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL!');
    
    const result = await client.query('SELECT current_database() as db, current_user as user, version() as version');
    console.log('📊 Database info:', result.rows[0]);
    
    // Test if the leads table exists
    try {
      const tablesResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'leads'
        ) as table_exists
      `);
      
      if (tablesResult.rows[0].table_exists) {
        console.log('✅ The "leads" table exists');
        
        // Count rows in the leads table
        const countResult = await client.query('SELECT COUNT(*) as count FROM leads');
        console.log(`📊 The "leads" table has ${countResult.rows[0].count} rows`);
      } else {
        console.log('⚠️ The "leads" table does not exist yet');
        console.log('ℹ️ You may need to run the schema creation SQL');
      }
    } catch (tableError) {
      console.error('❌ Error checking tables:', tableError.message);
    }
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.code === '28P01') {
      console.error('🔑 Authentication failed. Check your DATABASE_URL password.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 Host not found. Check your DATABASE_URL hostname.');
      console.error('ℹ️ If using Railway, make sure the PostgreSQL service is linked to your app.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Connection refused. Check if PostgreSQL is running and accessible.');
    }
    
    process.exit(1);
  }
}

testConnection();
