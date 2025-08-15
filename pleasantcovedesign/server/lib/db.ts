// Alternative database connection strategy
import { Pool } from "pg";

const isProd = process.env.NODE_ENV === "production";
const allowNoDb = process.env.ALLOW_NO_DB === "true" && !isProd; // opt-in dev only

// Try different connection methods
let pool: Pool | null = null;

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
    } catch (error) {
      console.error('❌ Failed to create pool with individual credentials:', error);
    }
  }
}

// Method 3: Try hardcoded Railway credentials as last resort
if (!pool && isProd) {
  try {
    console.log('🔄 Attempting connection with hardcoded Railway credentials...');
    pool = new Pool({
      user: 'postgres',
      password: 'maaGXJLImQPrQHTDyXGsVOQZIMxQsFdO',
      host: 'postgres.railway.internal',
      port: 5432,
      database: 'railway',
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  } catch (error) {
    console.error('❌ Failed to create pool with hardcoded credentials:', error);
  }
}

// Final check
if (!pool && !allowNoDb) {
  // Fail fast in prod if no DB
  throw new Error(
    "Could not establish database connection. Set ALLOW_NO_DB=true for local dev only."
  );
}

export { pool };

export async function assertDb(): Promise<boolean> {
  if (!pool) {
    console.warn('⚠️ No database pool available');
    return false;
  }
  
  try {
    console.log('🔍 Testing database connection...');
    const r = await pool.query("select 1");
    console.log('✅ Database connection successful');
    return r?.rowCount === 1;
  } catch (error: any) {
    console.error('❌ Database connection check failed:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    
    // Log additional info for specific errors
    if (error.code === '28P01') {
      console.error('🔑 Authentication failed. Check your database credentials.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 Host not found. Check your database hostname.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Connection refused. Check if PostgreSQL is running and accessible.');
    }
    
    return false;
  }
}
