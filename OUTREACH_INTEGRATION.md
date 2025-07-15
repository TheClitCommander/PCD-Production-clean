# Professional Outreach Integration

## Overview
The WebsiteWizard system now includes professional SMS and email outreach capabilities with intelligent name extraction, demo site mapping, and mock mode for testing.

## Key Features

### 1. **Professional Message Templates**
- **SMS**: Friendly, local tone focusing on affordable websites
- **Email**: More detailed but still casual and non-pushy
- No explicit pricing mentioned
- Customizable signature and contact info

### 2. **Intelligent Name Extraction**
The system tries multiple methods to find contact names:
1. Extracts first name from email (e.g., `john.smith@` → "John")
2. Searches notes for "Contact:" or "Owner:" patterns
3. Falls back to "there" if no name found

### 3. **Demo Site Mapping**
Pre-made Canva demo links mapped to business types:
- Plumbing → `https://canva.com/demo-plumber`
- Cafe/Restaurant → `https://canva.com/demo-cafe`
- Landscaping → `https://canva.com/demo-landscaper`
- And more...

### 4. **Mock Mode (Default)**
Messages are logged but not sent - perfect for testing!

## API Endpoints

### Single Lead Outreach
```bash
POST /api/bot/outreach/:id
```

Example:
```bash
curl -X POST http://localhost:5173/api/bot/outreach/123
```

Response:
```json
{
  "success": true,
  "smsStatus": "mock_sent",
  "emailStatus": "mock_sent",
  "mockMode": true,
  "messages": {
    "sms": {
      "to": "(207) 555-0101",
      "body": "Hi John, I'm a local web designer..."
    },
    "email": {
      "to": "john@example.com",
      "subject": "Quick Website Idea for Coastal Plumbing",
      "body": "Hi John,\n\nI'm a local designer..."
    }
  }
}
```

### Bulk Outreach Campaign
```bash
POST /api/bot/launch-outreach
```

Example:
```bash
curl -X POST http://localhost:5173/api/bot/launch-outreach \
  -H "Content-Type: application/json" \
  -d '{
    "businessIds": [1, 2, 3],
    "campaignType": "plumbing"
  }'
```

Response:
```json
{
  "success": true,
  "campaign": {
    "id": 1,
    "name": "Automated Outreach - 5/29/2025",
    "status": "active",
    "totalContacts": 3,
    "sentCount": 2
  },
  "outreach": {
    "totalSent": 3,
    "successful": 2,
    "failed": 1,
    "results": {
      "1": { "success": true, "smsStatus": "mock_sent" },
      "2": { "success": true, "emailStatus": "mock_sent" },
      "3": { "success": false, "error": "No contact information" }
    }
  }
}
```

## Configuration

### Environment Variables
Add these to your `.env` file:

```bash
# Outreach Mode
OUTREACH_MOCK=true  # Set to false for real messages

# Twilio (for SMS)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+12075550100

# SendGrid (for Email)
SENDGRID_API_KEY=your-api-key
FROM_EMAIL=ben@pleasantcovedesign.com
```

### Custom Templates
Edit `WebsiteWizard/server/outreach.ts` to customize:
- Message templates
- Demo site mappings
- Contact extraction logic

## Testing

### Quick Test
```bash
./test-outreach.sh
```

This will:
1. Create test leads with various contact scenarios
2. Test single lead outreach
3. Test bulk campaign
4. Show activity logs

### Manual Testing
1. Create a lead:
```bash
curl -X POST http://localhost:5173/api/businesses \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Business",
    "email": "owner.name@test.com",
    "phone": "(207) 555-0199",
    "address": "123 Test St",
    "city": "Camden",
    "state": "ME",
    "businessType": "plumbing",
    "stage": "scraped"
  }'
```

2. Send outreach:
```bash
curl -X POST http://localhost:5173/api/bot/outreach/[LEAD_ID]
```

## Production Setup

### 1. Install Dependencies
```bash
cd WebsiteWizard
npm install twilio @sendgrid/mail
```

### 2. Set Environment Variables
```bash
# In .env file
OUTREACH_MOCK=false
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxx
TWILIO_PHONE_NUMBER=+12075550100
SENDGRID_API_KEY=SG.xxxxxxxxxx
FROM_EMAIL=your@email.com
```

### 3. Update Message Templates
Edit the templates in `outreach.ts` with your:
- Business name
- Contact info
- Preferred tone

### 4. Add Real Demo Links
Replace the placeholder Canva links with your actual demo sites.

## Workflow Integration

### Automatic Outreach After Enrichment
The system can automatically send outreach after a lead is enriched:

1. Lead comes in via Squarespace webhook
2. Bot enriches with additional data
3. If score > 80, trigger outreach automatically

### Manual Campaign Launch
From the dashboard:
1. Select leads (Hot/Warm)
2. Click "Launch Campaign"
3. Monitor results in Activities

## Best Practices

### Message Timing
- Space messages 1 second apart to avoid rate limits
- Best times: Tuesday-Thursday, 10am-2pm local time

### Follow-Up Strategy
- Initial outreach: SMS + Email
- No response in 3 days: Follow-up SMS
- No response in 7 days: Mark as "cold"

### Personalization Tips
- Always use the business name
- Reference their industry if possible
- Keep it local and friendly
- Mention "no pressure" to reduce friction

## Troubleshooting

### Messages Not Sending
1. Check `OUTREACH_MOCK` is set to `false`
2. Verify Twilio/SendGrid credentials
3. Check logs for specific errors

### Name Fallback Issues
- Add contact names to notes as "Contact: FirstName"
- Use professional email formats (firstname.lastname@)

### Demo Link Not Found
- Check business type matches mapping
- Add relevant tags to leads
- Falls back to general demo

## Analytics

Track outreach performance:
- **Activities Log**: All outreach attempts
- **Campaign Stats**: Success/failure rates
- **Stage Movement**: scraped → contacted → interested

## Next Steps

1. **Set up real credentials** for Twilio/SendGrid
2. **Create industry-specific demos** on Canva
3. **Test with a few real leads** in mock mode first
4. **Monitor and refine** message templates based on responses
5. **Build follow-up automation** for non-responders

---

Remember: The goal is to start conversations, not close deals immediately. Keep it friendly, local, and low-pressure! 