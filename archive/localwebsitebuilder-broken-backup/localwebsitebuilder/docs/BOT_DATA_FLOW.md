# 🔄 Bot Data Flow Architecture

## Complete Data Flow Diagram

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   Python Bot CLI    │     │    Node.js Server    │     │    React UI         │
│                     │     │                      │     │                     │
│ • Google Sheets     │────▶│ • /api/bot/enrich    │────▶│ • Pipeline Board    │
│ • Web Scraping      │     │ • /api/bot/score     │     │ • Lead Cards        │
│ • Data Enrichment   │     │ • /api/bot/outreach  │     │ • Scheduling        │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
          │                             │                             │
          │                             ▼                             │
          │                    ┌────────────────┐                    │
          │                    │   SQLite DB    │                    │
          │                    │                │                    │
          └───────────────────▶│ • businesses   │◀───────────────────┘
                               │ • activities   │
                               │ • blocked_dates│
                               └────────────────┘
```

## 🎯 Key Data Points for No-Website Detection

### 1. **Initial Scrape**
When your bot scrapes a new lead:
```json
{
  "name": "Joe's Plumbing",
  "phone": "207-555-1234",
  "businessType": "plumbing",
  "website": null  // ← THIS IS GOLD! No website = your target
}
```

### 2. **Enrichment Process**
Bot enrichment adds:
- Google My Business data
- Review count & rating
- Business hours
- Social media presence
- **Website verification** (double-checks if they really have no site)

### 3. **Scoring Algorithm**
```javascript
// From bot-integration.ts
let score = 50; // Base score

// MAJOR BOOST for no website
if (!data.website) score += 30;  // 80 points already!

// Additional scoring
if (data.reviews?.rating >= 4) score += 10;
if (targetIndustries.includes(data.businessType)) score += 10;
// Final score: 80-100 for prime targets
```

### 4. **Auto-Tagging System**
Every lead gets tagged automatically:
```javascript
tags = [
  "no-website",      // Your money maker!
  "high-rated",      // 4+ stars
  "plumbing",        // Business type
  "midcoast-maine",  // Location
  "hot-lead"         // Score 80+
]
```

## 📊 UI Display Components

### Pipeline Board Shows:
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  SCRAPED    │  │ SCHEDULED   │  │ CONTACTED   │  │   SOLD      │
│             │  │             │  │             │  │             │
│ Joe's Plumb │─▶│ Bob's HVAC  │─▶│ Sue's Elec  │─▶│ Tim's Auto  │
│ Score: 85   │  │ Appt: 8:30  │  │ SMS Sent    │  │ $2,999      │
│ 🚫 No Site  │  │ Tomorrow    │  │ Interested  │  │ Signed!     │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

### Lead Card Features:
- **Score Badge**: Color-coded (80+ = green, 60-79 = yellow)
- **No Website Tag**: Red badge showing "NO WEBSITE"
- **Quick Actions**: Schedule, Enrich, Send SMS
- **Activity Timeline**: Shows all bot actions

## 🔗 Critical Connection Points

### 1. **Bot → Server Connection**
```typescript
// server/bot-integration.ts
runPythonCLI(command: string, args: string[]): Promise<any>
```
- Spawns Python process
- Passes arguments as JSON
- Returns enriched data

### 2. **Server → Database Flow**
```typescript
// When bot returns data
await storage.updateBusiness(id, {
  website: enrichmentData.website,  // null = no website
  score: calculatedScore,
  tags: generatedTags,
  priority: score >= 80 ? "high" : "medium"
});
```

### 3. **Database → UI Updates**
```typescript
// React Query auto-refreshes
useQuery(['businesses'], fetchBusinesses, {
  refetchInterval: 5000  // Updates every 5 seconds
});
```

## 🚨 Critical Success Factors

### 1. **Website Detection Accuracy**
- Bot must return `null` for no website (not empty string!)
- Double-check with Google My Business API
- Verify against domain registrars

### 2. **Lead Quality Signals**
```javascript
highQualityLead = {
  website: null,           // No website
  reviews: { rating: 4.5 }, // Good reputation
  businessType: "plumbing", // Target industry
  location: "Brunswick, ME" // Local area
}
// Score: 90+ = IMMEDIATE OUTREACH
```

### 3. **Automation Triggers**
- Score 80+ → Auto SMS within 5 minutes
- No website + High reviews → Priority queue
- Local + No website → Personalized outreach

## 🔧 Testing Your Connection

### 1. **Test Scrape → Enrichment**
```bash
# Manually trigger enrichment
curl -X POST http://localhost:5173/api/bot/enrich/1

# Check the score
curl http://localhost:5173/api/businesses/1
```

### 2. **Verify No-Website Detection**
```sql
-- In SQLite
SELECT name, website, score, tags 
FROM businesses 
WHERE website IS NULL 
ORDER BY score DESC;
```

### 3. **Monitor Auto-Actions**
```bash
# Watch activity log
tail -f server.log | grep "no-website"
```

## 📈 Performance Metrics

### Ideal Flow Times:
1. **Scrape → Database**: < 1 second
2. **Enrichment Request**: < 5 seconds
3. **Score Calculation**: Instant
4. **UI Update**: < 100ms
5. **Auto-Outreach**: < 5 minutes

### Success Metrics:
- 95% accurate no-website detection
- 80% of no-website leads scored 70+
- 50% response rate on auto-outreach
- 30% close rate on scheduled meetings

Your bot connection is the engine that feeds high-quality, no-website leads into your sales pipeline! 