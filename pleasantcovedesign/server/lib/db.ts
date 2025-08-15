import { Pool } from "pg";

const isProd = process.env.NODE_ENV === "production";
const allowNoDb =
  process.env.ALLOW_NO_DB === "true" && !isProd; // opt-in dev only

const cn = process.env.DATABASE_URL;

if (!cn && !allowNoDb) {
  // Fail fast in prod if no DB
  throw new Error(
    "DATABASE_URL is missing. Set it or ALLOW_NO_DB=true for local dev only."
  );
}

export const pool: Pool | null = cn
  ? new Pool({
      connectionString: cn,
      // Always use SSL for Railway connections
      ssl: { rejectUnauthorized: false },
      // useful defaults
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  : null;

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
      console.error('🔑 Authentication failed. Check your DATABASE_URL password.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 Host not found. Check your DATABASE_URL hostname.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Connection refused. Check if PostgreSQL is running and accessible.');
    }
    
    return false;
  }
}
