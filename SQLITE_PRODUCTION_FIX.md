# SQLite Production Fix for Railway Deployment

## Problem Summary
The `/api/leads` and other endpoints were trying to read from a bundled SQLite file (`/app/scrapers/scraper_results.db`) in production on Railway, causing:
- `SQLITE_ERROR: no such column: data_source` 
- Empty/missing data in the Admin UI
- Ephemeral storage issues (SQLite resets on each deploy)

## Solution Implemented

### 1. Environment-Based SQLite Guards
All SQLite reads now check for environment variables before attempting to access SQLite:
```typescript
const useSqlite = process.env.USE_SQLITE_RESULTS === 'true' && process.env.NODE_ENV !== 'production';
```

### 2. Files Updated
- **`/server/routes.ts`** - Added environment guards to `/api/scrape-runs/:id` endpoint
- **`/server/lib/sqlite-migrate.ts`** - New file for dev-only SQLite schema migrations
- **`/server/index.ts`** - Runs SQLite migration on startup (dev only)

### 3. Postgres-First Approach
In production, all endpoints now:
1. Read from Postgres `leads` table
2. Never attempt SQLite access
3. Return proper error responses if data is missing

## Railway Deployment

### 1. Set Environment Variables
In Railway dashboard, add these variables:
```env
USE_SQLITE_RESULTS=false
NODE_ENV=production
DATABASE_URL=postgresql://...  # Your Postgres connection string
```

### 2. Deploy Changes
```bash
# Commit the changes
git add -A
git commit -m "Fix: Disable SQLite in production, use Postgres for all leads data"
git push origin main
```

Railway will automatically deploy from your GitHub repo.

### 3. Verify the Fix
After deployment:
```bash
# Check health
curl https://your-app.railway.app/healthz

# Check /api/leads now works
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-app.railway.app/api/leads

# Check scrape status endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-app.railway.app/api/scrape-runs/test-id
```

## Local Development

### Enable SQLite for Dev (Optional)
If you want to use SQLite locally for testing:

1. Set environment variables:
```bash
export USE_SQLITE_RESULTS=true
export NODE_ENV=development
```

2. The server will automatically:
   - Run schema migrations on startup
   - Add missing columns to SQLite tables
   - Use SQLite for scraper results

3. To disable and use Postgres only:
```bash
export USE_SQLITE_RESULTS=false
```

## What Changed

### Before (Broken)
```typescript
// Always tried to read SQLite
const db = new sqlite3.Database(dbPath);
db.all('SELECT ... data_source, google_place_id ...', ...);
```

### After (Fixed)
```typescript
// Check environment first
if (useSqlite) {
  // Dev only - with error handling
  db.all('SELECT ...', (err, rows) => {
    if (err) resolve({ count: 0, latest: [] });
    // ...
  });
} else {
  // Production - always use Postgres
  const result = await storage.query('SELECT ... FROM leads ...');
}
```

## Key Points

1. **SQLite is NEVER used in production** - Railway's ephemeral storage makes SQLite unsuitable
2. **Postgres is the source of truth** - All production data lives in Postgres
3. **SQLite is dev-only** - And only when explicitly enabled via `USE_SQLITE_RESULTS=true`
4. **Schema migrations are automatic** - If using SQLite in dev, missing columns are added on startup

## Troubleshooting

### Still seeing SQLite errors?
1. Ensure `USE_SQLITE_RESULTS=false` in Railway
2. Redeploy after setting the variable
3. Check that `NODE_ENV=production`

### Admin UI shows no data?
1. Data needs to be in Postgres `leads` table
2. Run a scrape to populate data
3. Check `source='scraper'` rows exist: 
   ```sql
   SELECT COUNT(*) FROM leads WHERE source='scraper';
   ```

### Want real scraper data?
The scraper service should write directly to Postgres:
```typescript
// In scraper-service.ts or scrape-service.ts
await storage.query(
  'INSERT INTO leads (name, category, source, ...) VALUES ($1, $2, $3, ...)',
  [business.name, business.type, 'scraper', ...]
);
```

## Long-term Recommendation
1. **Remove all SQLite code** from production paths
2. **Use Postgres exclusively** for all data storage
3. **Migrate existing SQLite data** to Postgres if needed:
   ```bash
   # Export from SQLite
   sqlite3 scraper_results.db .dump > data.sql
   
   # Transform and import to Postgres
   psql $DATABASE_URL < transformed_data.sql
   ```

## Summary
✅ Production now uses Postgres exclusively  
✅ SQLite errors are eliminated  
✅ Dev can optionally use SQLite with `USE_SQLITE_RESULTS=true`  
✅ Schema migrations handle missing columns automatically
