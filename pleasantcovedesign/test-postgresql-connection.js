#!/usr/bin/env node

/**
 * PostgreSQL Connection Test for Pleasant Cove Design
 * Tests the Railway database connection
 */

const { Pool } = require('pg');

// Your Railway PostgreSQL URL
const DATABASE_URL = 'postgresql://postgres:RLAZQQsBDjQqbeXtjCnfXSpnqnsjccfE@postgres-xtke.railway.internal:5432/railway';

async function testPostgreSQLConnection() {
  console.log('🐘 Testing PostgreSQL connection to Railway...');
  console.log('📍 Host: postgres-xtke.railway.internal:5432');
  console.log('📊 Database: railway');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Railway requires SSL
  });

  try {
    // Test basic connection
    console.log('\n🔗 Testing connection...');
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL!');
    
    // Test query
    console.log('\n📊 Testing query...');
    const result = await client.query('SELECT version() as version, current_database() as database, current_user as user');
    console.log('✅ Query successful!');
    console.log('📄 Database info:', {
      version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1],
      database: result.rows[0].database,
      user: result.rows[0].user
    });
    
    // Test table creation (what your app will do)
    console.log('\n🏗️  Testing table operations...');
    
    // Check if companies table exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'companies'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('📝 Companies table does not exist - your app will create it automatically');
    } else {
      console.log('✅ Companies table already exists');
      
      // Count existing data
      const countResult = await client.query('SELECT COUNT(*) as count FROM companies');
      console.log(`📊 Existing companies: ${countResult.rows[0].count}`);
    }
    
    client.release();
    
    console.log('\n🎉 PostgreSQL connection test SUCCESSFUL!');
    console.log('🚀 Your app is ready to use PostgreSQL in production!');
    
  } catch (error) {
    console.error('\n❌ PostgreSQL connection test FAILED:');
    console.error('Error:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Verify the DATABASE_URL is correct');
    console.error('2. Check Railway database is running');
    console.error('3. Ensure SSL connection is allowed');
  } finally {
    await pool.end();
  }
}

// Environment variable check
function checkEnvironmentSetup() {
  console.log('🔧 Environment Setup Check:');
  console.log('DATABASE_URL configured:', !!DATABASE_URL);
  
  if (process.env.DATABASE_URL) {
    console.log('✅ DATABASE_URL found in environment');
    console.log('🔄 Your app will automatically use PostgreSQL');
  } else {
    console.log('⚠️  DATABASE_URL not in environment');
    console.log('📝 Add to Railway environment variables:');
    console.log('   DATABASE_URL=' + DATABASE_URL);
  }
  console.log('');
}

checkEnvironmentSetup();
testPostgreSQLConnection();