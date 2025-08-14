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
      // Railway/Heroku often require SSL in prod
      ssl: /railway|amazonaws|render|heroku/i.test(cn)
        ? { rejectUnauthorized: false }
        : undefined,
      // useful defaults
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  : null;

export async function assertDb(): Promise<boolean> {
  if (!pool) return false;
  try {
    const r = await pool.query("select 1");
    return r?.rowCount === 1;
  } catch (error) {
    console.error('❌ Database connection check failed:', error);
    return false;
  }
}
