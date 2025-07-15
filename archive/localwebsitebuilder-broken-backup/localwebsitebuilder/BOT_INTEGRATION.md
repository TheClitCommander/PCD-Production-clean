# Bot Integration Guide

This document explains how the WebsiteWizard UI integrates with your existing Python bot system for automated lead enrichment and outreach.

## Overview

The integration connects the React/TypeScript frontend with your Python bot backend through a Node.js middleware layer. This allows seamless automation of:

- Lead enrichment from various data sources
- Lead scoring and prioritization
- Automated outreach campaigns
- Google Sheets integration

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React UI      │────▶│  Express Server  │────▶│   Python Bot    │
│  (TypeScript)   │◀────│   (Node.js)      │◀────│   (main.py)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  PostgreSQL  │
                        │   Database   │
                        └──────────────┘
```

## Key Features

### 1. Lead Management UI
- **Location**: `client/src/pages/leads.tsx`
- Visual lead scoring with color-coded indicators
- Bulk selection for automated processing
- Tag-based categorization
- Priority indicators (high/medium/low)

### 2. Bot Integration Service
- **Location**: `server/bot-integration.ts`
- Bridges Node.js server with Python bot
- Handles lead enrichment requests
- Manages outreach campaigns
- Imports from Google Sheets

### 3. API Endpoints

#### New Lead Webhook
```
POST /api/new-lead
```
Receives form submissions from Squarespace or other sources.

#### Bot Enrichment
```
POST /api/bot/enrich/:id
```
Triggers Python bot to enrich a specific lead with additional data.

#### Launch Outreach
```
POST /api/bot/launch-outreach
```
Initiates automated outreach for selected leads.

#### Google Sheets Import
```
POST /api/import/google-sheets
```
Imports leads from a Google Sheets document.

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the WebsiteWizard directory:

```env
# Python bot configuration
PYTHON_PATH=/path/to/your/python/venv/bin/python
BOT_SCRIPT_PATH=/path/to/your/main.py

# Database configuration
DATABASE_URL=postgresql://user:password@localhost:5432/websitewizard

# Optional: Google Sheets API credentials
GOOGLE_SHEETS_API_KEY=your-api-key
```

### 2. Database Schema Updates

The schema has been updated to include:
- `email` field for businesses
- `score` (integer) for lead scoring
- `priority` (text) for lead prioritization
- `tags` (array) for categorization

Run database migrations:
```bash
npm run db:push
```

### 3. Python Bot Integration

Your Python bot (`main.py`) needs to support these command-line interfaces:

#### Enrichment
```bash
python main.py enrich --name "Business Name" --phone "123-456-7890" --email "email@example.com"
```

Expected JSON output:
```json
{
  "address": "123 Main St",
  "city": "Portland",
  "state": "ME",
  "website": "https://example.com",
  "businessType": "plumbing",
  "reviews": {
    "count": 45,
    "rating": 4.5
  },
  "socialMedia": {
    "facebook": "https://facebook.com/example"
  }
}
```

#### Outreach
```bash
python main.py outreach --leads '[{"id": 1, "name": "Business", "email": "email@example.com"}]'
```

#### Google Sheets Import
```bash
python main.py import-sheets --sheet-id "sheet-id-here"
```

Expected JSON output:
```json
[
  {
    "name": "Business Name",
    "email": "email@example.com",
    "phone": "123-456-7890",
    "address": "123 Main St",
    "city": "Portland",
    "state": "ME"
  }
]
```

## Usage Workflow

1. **Receiving Leads**
   - Squarespace forms submit to `/api/new-lead`
   - Leads appear in the UI with "scraped" status

2. **Enrichment**
   - Select leads in the UI
   - Click "Launch Bot" button
   - Bot enriches data and calculates scores
   - Leads move to "contacted" status

3. **Lead Scoring**
   - Automatic scoring based on:
     - Website presence
     - Email availability
     - Business reviews
     - Business type
     - Social media presence

4. **Automated Outreach**
   - High-score leads prioritized
   - Bot sends personalized messages
   - Tracks responses and engagement

## Customization

### Lead Scoring Algorithm
Edit `server/bot-integration.ts` `calculateLeadScore()` method to adjust scoring criteria.

### Tag Generation
Modify `generateTags()` method to add custom tags based on your criteria.

### UI Customization
- Colors and styling in `client/src/pages/leads.tsx`
- Add custom columns or filters as needed

## Troubleshooting

### Bot Not Responding
1. Check Python path in environment variables
2. Verify main.py supports required CLI commands
3. Check server logs for error messages

### Database Issues
1. Ensure PostgreSQL is running
2. Verify DATABASE_URL is correct
3. Run `npm run db:push` to update schema

### Import Failures
1. Verify Google Sheets API credentials
2. Check sheet permissions
3. Ensure data format matches expected structure

## Next Steps

1. **Add Authentication**: Implement user login to protect the dashboard
2. **Real-time Updates**: Add WebSocket support for live lead updates
3. **Advanced Analytics**: Create detailed conversion funnel visualization
4. **Email Templates**: Build template editor for outreach messages
5. **Webhook Management**: UI for configuring form webhooks

## Support

For issues or questions:
1. Check server logs: `npm run dev`
2. Review Python bot output
3. Verify all environment variables are set correctly 