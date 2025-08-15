# Force Railway Rebuild

This file exists solely to force Railway to rebuild and redeploy the application.

## Changes to deploy

1. Mount Postgres router at `/leads` for UI compatibility
2. Add `/bot/scrape` endpoint for UI compatibility
3. Fix SSL settings for PostgreSQL connection
4. Add health check endpoints

Timestamp: ${new Date().toISOString()}
