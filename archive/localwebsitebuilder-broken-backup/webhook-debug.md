# Webhook Debugging Guide

## Current Issue
Your Squarespace appointment booking isn't showing up in the system.

## Webhook Configuration

### 1. Squarespace Form Webhook
- **Endpoint**: `/api/new-lead`
- **Full URL (Local)**: `http://localhost:5173/api/new-lead`
- **Full URL (Railway)**: `https://YOUR-RAILWAY-URL.railway.app/api/new-lead`

### 2. What to Check in Squarespace

1. **Form Settings**:
   - Go to your Squarespace form
   - Look for "Storage" or "Integrations" settings
   - Add a webhook with your Railway URL

2. **Required Form Fields**:
   Your form should have these fields (exact names matter):
   - `name` or `business_name`
   - `email`
   - `phone`
   - `message`
   - For appointments: `appointment_date` and `appointment_time` (or `datetime`)

3. **Webhook Format**:
   Squarespace sends data in this format:
   ```json
   {
     "formId": "your-form-id",
     "submissionId": "unique-id",
     "data": {
       "name": "Client Name",
       "email": "client@example.com",
       "phone": "207-555-0123",
       "appointment_date": "2024-01-20",
       "appointment_time": "2:00 PM"
     }
   }
   ```

## Quick Test

Test if your webhook is working:

```bash
# Test locally
curl -X POST http://localhost:5173/api/new-lead \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "test-form",
    "submissionId": "test-123",
    "data": {
      "name": "Test Business",
      "email": "test@example.com",
      "phone": "207-555-0123",
      "appointment_date": "2024-01-20",
      "appointment_time": "2:00 PM"
    }
  }'

# Test Railway deployment
curl -X POST https://YOUR-RAILWAY-URL.railway.app/api/new-lead \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "test-form",
    "submissionId": "test-123",
    "data": {
      "name": "Test Business",
      "email": "test@example.com",
      "phone": "207-555-0123",
      "appointment_date": "2024-01-20",
      "appointment_time": "2:00 PM"
    }
  }'
```

## Common Issues

1. **Webhook URL not configured**: Make sure you've added the webhook URL in Squarespace
2. **Wrong field names**: Field names must match exactly what the code expects
3. **Authentication**: The webhook endpoint is public and doesn't require auth
4. **HTTPS required**: Railway provides HTTPS, which Squarespace requires

## Verifying It's Working

Check the database:
```bash
sqlite3 websitewizard.db "SELECT id, name, source, stage, scheduled_time FROM businesses WHERE source='squarespace' ORDER BY id DESC LIMIT 5;"
```

Check appointments:
```bash
sqlite3 websitewizard.db "SELECT * FROM appointments ORDER BY id DESC LIMIT 5;"
``` 