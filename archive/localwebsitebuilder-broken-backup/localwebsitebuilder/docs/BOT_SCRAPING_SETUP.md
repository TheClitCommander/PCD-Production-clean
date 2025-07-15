# 🤖 Bot Scraping & Data Flow Configuration

## Overview
This system connects your Python scraping bot to the WebsiteWizard UI, automatically identifying businesses without websites and scoring them for outreach.

## 🎯 Key Features

### 1. **Lead Scoring Algorithm**
The bot automatically scores leads based on:
- **No Website = +30 points** (YOUR TARGET MARKET!)
- Has email = +10 points
- Has business hours = +5 points
- Has social media = +5 points
- High reviews (4+ stars) = +10 points
- Target industries (plumbing, electrical, HVAC, etc.) = +10 points

### 2. **Automatic Tagging**
Every scraped business gets tagged:
- `no-website` - Your primary targets
- `has-website` - Lower priority
- `high-rated` - 4+ star reviews
- `midcoast-maine` - Local businesses
- `small-business` - < 10 employees

### 3. **Data Flow**
```
Python Bot → Bot CLI → Node.js API → Database → React UI
```

## 🔧 Bot Integration Setup

### Environment Variables
Create a `.env` file in your project root:
```env
# Python Bot Configuration
PYTHON_PATH=/usr/bin/python3
BOT_SCRIPT_PATH=/path/to/your/bot_cli.py

# Bot API Configuration
BOT_API_KEY=your-api-key-here
BOT_WEBHOOK_SECRET=your-webhook-secret

# Database
DATABASE_URL=sqlite:websitewizard.db
```

### Bot CLI Script Requirements
Your Python `bot_cli.py` should handle these commands:

1. **Enrich Lead**
```bash
python3 bot_cli.py enrich --name "Business Name" --phone "555-1234"
```

Expected JSON response:
```json
{
  "name": "Business Name",
  "address": "123 Main St",
  "city": "Brunswick",
  "state": "ME",
  "website": null,  // null = no website found!
  "businessType": "plumbing",
  "score": 85,
  "tags": ["no-website", "high-value"],
  "reviews": {
    "count": 45,
    "rating": 4.5
  }
}
```

2. **Import from Google Sheets**
```bash
python3 bot_cli.py import-sheets --sheet-id "YOUR_SHEET_ID"
```

3. **Bulk Outreach**
```bash
python3 bot_cli.py outreach --leads '[{"id":1,"name":"Test","phone":"555-1234"}]'
```

## 📊 Database Schema

The bot populates these key fields:

```typescript
interface Business {
  // Basic Info (from scraping)
  name: string
  phone: string
  email?: string
  address: string
  city: string
  state: string
  
  // Bot Enrichment Data
  website?: string      // NULL = no website (high value!)
  businessType: string  // plumbing, electrical, etc.
  score: number        // 0-100 (higher = better lead)
  priority: string     // high/medium/low
  tags: string[]       // ["no-website", "high-rated", etc.]
  
  // Pipeline Stage
  stage: string        // scraped → scheduled → contacted → sold
  
  // Notes (includes all bot data)
  notes: string        // JSON enrichment data stored here
}
```

## 🚀 API Endpoints

### 1. Enrich Single Lead
```typescript
POST /api/bot/enrich/:id
```
- Triggers Python bot to gather additional data
- Updates lead score and tags
- Auto-launches outreach if score > 80

### 2. Import from Google Sheets
```typescript
POST /api/import/google-sheets
Body: { "sheetId": "YOUR_GOOGLE_SHEET_ID" }
```
- Imports all leads from sheet
- Auto-enriches each lead
- Filters to show only no-website leads

### 3. Launch Bulk Outreach
```typescript
POST /api/bot/launch-outreach
Body: { "businessIds": [1, 2, 3] }
```
- Sends SMS/email to selected leads
- Updates stage to "contacted"
- Logs all activities

## 📱 UI Data Flow

### Dashboard Stats
Shows real-time metrics:
- Total leads scraped
- Leads without websites (your targets!)
- Conversion rates
- Revenue projections

### Pipeline Board
Drag-and-drop interface showing:
1. **Scraped** - Fresh leads from bot
2. **Scheduled** - Appointments booked
3. **Contacted** - Outreach sent
4. **Interested** - Responded positively
5. **Sold** - Signed contracts
6. **Delivered** - Websites live

### Lead Scoring Display
Each lead card shows:
- Score badge (0-100)
- "No Website" tag (if applicable)
- Business type
- Last contact date

## 🔍 Testing the Bot Connection

### 1. Test Enrichment
```bash
curl -X POST http://localhost:5173/api/bot/enrich/1
```

Expected response:
```json
{
  "success": true,
  "business": {
    "id": 1,
    "name": "Test Business",
    "score": 85,
    "tags": ["no-website", "high-value"],
    "website": null
  }
}
```

### 2. Test Google Sheets Import
```bash
curl -X POST http://localhost:5173/api/import/google-sheets \
  -H "Content-Type: application/json" \
  -d '{"sheetId": "YOUR_SHEET_ID"}'
```

### 3. Verify No-Website Detection
Check the database:
```sql
SELECT name, score, tags, website 
FROM businesses 
WHERE website IS NULL 
ORDER BY score DESC;
```

## 🎯 Key Success Metrics

1. **Lead Quality Score**
   - 80+ = Hot lead (no website, good reviews)
   - 60-79 = Warm lead (maybe has basic site)
   - < 60 = Cold lead (has website or low quality)

2. **Conversion Funnel**
   - Scraped → Scheduled: 20% target
   - Scheduled → Sold: 30% target
   - Sold → Delivered: 95% target

3. **Auto-Outreach Triggers**
   - Score > 80 = Immediate SMS
   - No website + High reviews = Priority outreach
   - Local (Midcoast Maine) = Personalized message

## 🛠️ Troubleshooting

### Bot Not Enriching Data
1. Check Python path: `which python3`
2. Verify bot_cli.py is executable
3. Check logs: `tail -f server.log`

### Scores Not Calculating
1. Ensure website field is NULL (not empty string)
2. Check businessType is properly set
3. Verify enrichment data in notes field

### Google Sheets Import Issues
1. Verify sheet is publicly readable
2. Check column headers match expected format
3. Test with small batch first (10 rows)

## 🚦 Ready to Go Live?

1. ✅ Bot enrichment working
2. ✅ No-website detection accurate
3. ✅ Scoring algorithm tuned
4. ✅ Google Sheets import tested
5. ✅ Outreach messages personalized

Your bot scraping system is ready to identify high-value leads without websites! 