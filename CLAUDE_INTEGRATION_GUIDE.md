# Claude Integration Guide for WebsiteWizard

## System Overview
Your local lead automation system with webhook-powered backend:
- Squarespace form → `/api/new-lead` webhook → Python bot enrichment → React dashboard → Professional outreach

## Key Improvements Made

### 1. ✅ Professional Message Templates
**Location**: `WebsiteWizard/server/outreach.ts`

#### Current Templates:
- **SMS**: Creates curiosity with "quick mockup I made for you"
- **Email**: Personalized, mentions research, emphasizes affordability
- **Follow-ups**: Added for non-responders

#### How to customize with Claude:
```
"Here's my current SMS template: [paste template]
Make it more [casual/professional/urgent] while keeping it under 160 characters.
Emphasize [local service/quick turnaround/no contracts]."
```

### 2. ✅ Smart Demo Site Mapping
**Location**: `WebsiteWizard/server/outreach.ts`

#### Current mapping includes:
- 40+ business categories
- Industry-specific demo URLs
- Taglines for each industry

#### How to expand with Claude:
```
"I need demo site categories for these Maine businesses:
- Lobster pound
- Blueberry farm
- Tourist charter
Suggest URLs and taglines that appeal to Maine locals."
```

### 3. ✅ Intelligent Name Detection
**Location**: `WebsiteWizard/server/outreach.ts` - `extractContactName()`

#### Current logic (in priority order):
1. Notes patterns: "Owner: John", "spoke with Sarah"
2. Email parsing: john.smith@ → "John"
3. Business name: "John's Plumbing" → "John"
4. Industry fallbacks: restaurant → "chef"

#### How to improve with Claude:
```
"Here's my name extraction function: [paste code]
Add detection for:
- LinkedIn URLs in notes
- Business registration names
- Social media handles"
```

### 4. ✅ Automatic Outreach Triggers
**Location**: `WebsiteWizard/server/routes.ts`

#### Current triggers:
- After enrichment if score > 80
- After Squarespace webhook if hot lead
- Manual trigger from dashboard

#### How to customize with Claude:
```
"I want to trigger outreach when:
- Lead has no website AND has good reviews
- It's been 24 hours since enrichment
- Business type is in my target list
Show me the code changes needed."
```

## Practical Examples

### Example 1: Rewrite Templates for Specific Industry
```
Claude prompt: "Rewrite this outreach template specifically for restaurants:
'Hi {name}, I noticed {business_name} doesn't have a website yet...'
Make it mention online ordering and menu visibility."
```

### Example 2: Add New Business Categories
```
Claude prompt: "Add these Maine-specific businesses to my demo mapping:
- Antique shops
- Art galleries  
- Bed & breakfasts
Include appropriate demo URLs and taglines."
```

### Example 3: Improve Lead Scoring
```
Claude prompt: "Here's my current scoring logic in bot-integration.ts.
How can I boost scores for:
- Businesses open > 5 years
- Those with Facebook but no website
- Service businesses vs retail"
```

### Example 4: Add Weather-Based Messaging
```
Claude prompt: "How can I customize my outreach based on season?
Winter: 'prepare for tourist season'
Summer: 'capture tourist traffic'
Show me how to implement this."
```

## Quick Commands for Claude

### Message Testing
```
"Generate 5 variations of this SMS template for A/B testing:
[paste template]
Keep same length and tone."
```

### Industry Research
```
"What are the top 10 small business types in coastal Maine that typically lack websites?"
```

### Conversion Optimization
```
"Review this email template and suggest improvements for higher open rates:
Subject: [paste]
Body: [paste]"
```

### Technical Implementation
```
"Show me how to add a 'last_contacted' check to prevent messaging the same lead twice in 7 days."
```

## Testing Your Changes

### 1. Test Templates
```bash
# Test single outreach
curl -X POST http://localhost:5173/api/bot/outreach/1

# Check the mock output
```

### 2. Test Name Extraction
```javascript
// Add test cases to outreach.ts
const testCases = [
  { email: "mary.jones@salon.com", expected: "Mary" },
  { notes: "Owner: Bob Smith", expected: "Bob" },
  { name: "Sally's Flowers", expected: "Sally" }
];
```

### 3. Test Auto-Triggers
```bash
# Create high-scoring lead
curl -X POST http://localhost:5173/api/businesses \
  -d '{"name": "Test Plumber", "score": 85, ...}'

# Watch logs for auto-outreach
```

## Common Customizations

### Regional Adjustments
- Maine: Emphasize seasonal business, tourist readiness
- Urban: Focus on competition, standing out
- Rural: Stress reaching wider customer base

### Industry-Specific Hooks
- Restaurants: "Let customers see your menu before they arrive"
- Services: "Let clients book appointments online"
- Retail: "Showcase products 24/7"

### Urgency Levels
- Soft: "When you have a moment..."
- Medium: "Many of your competitors..."
- Strong: "Limited spots available this month..."

## Monitoring & Optimization

### Track What Works
```sql
-- Activities showing successful patterns
SELECT * FROM activities 
WHERE type = 'outreach_sent' 
AND description LIKE '%responded%';
```

### A/B Test Templates
1. Create variations in `outreach.ts`
2. Randomly assign in `launchOutreachForLead()`
3. Track response rates by template version

### Refine Scoring
Monitor which scores convert:
- Score 80-90: What % respond?
- Score 90-100: Worth immediate call?
- Score 60-80: Need nurturing first?

## Next Steps

1. **Run test outreach**: `./test-outreach.sh`
2. **Review mock messages** in console
3. **Customize templates** based on your style
4. **Add your real demo links**
5. **Set up Twilio/SendGrid** when ready
6. **Monitor and iterate** based on responses

Remember: The goal is conversations, not immediate sales. Keep it human, helpful, and humble! 