# 🐍 Python Bot CLI Interface Specification

## Overview
Your Python bot (`bot_cli.py`) needs to implement these commands to integrate with WebsiteWizard.

## Required Commands

### 1. **Enrich Command**
Gather additional data about a business.

```bash
python3 bot_cli.py enrich --name "Business Name" --phone "207-555-1234" --email "email@example.com" --business-type "plumbing"
```

**Expected JSON Output:**
```json
{
  "name": "Business Name",
  "address": "123 Main St",
  "city": "Brunswick", 
  "state": "ME",
  "website": null,  // null if no website found (your target!)
  "businessType": "plumbing",
  "businessHours": "Mon-Fri 8-5",
  "socialMedia": {
    "facebook": "facebook.com/businessname",
    "instagram": null
  },
  "reviews": {
    "count": 45,
    "rating": 4.5,
    "source": "Google"
  },
  "employeeCount": 5,
  "yearEstablished": 2010,
  "score": 85,  // Bot can pre-calculate if desired
  "tags": ["no-website", "high-rated", "small-business"]
}
```

### 2. **Import Google Sheets Command**
Import leads from a Google Sheet.

```bash
python3 bot_cli.py import-sheets --sheet-id "YOUR_GOOGLE_SHEET_ID"
```

**Expected JSON Output:**
```json
[
  {
    "name": "Joe's Plumbing",
    "phone": "207-555-1234",
    "email": "joe@example.com",
    "address": "456 Oak St",
    "city": "Bath",
    "state": "ME",
    "businessType": "plumbing",
    "website": null  // Critical field!
  },
  {
    "name": "Bob's Electric",
    "phone": "207-555-5678",
    "email": null,
    "address": "789 Pine Ave",
    "city": "Brunswick",
    "state": "ME", 
    "businessType": "electrical",
    "website": "bobselectric.com"
  }
]
```

### 3. **Outreach Command**
Send SMS/email to multiple leads.

```bash
python3 bot_cli.py outreach --leads '[{"id":1,"name":"Test Business","phone":"207-555-1234","email":"test@example.com","score":85}]'
```

**Expected JSON Output:**
```json
{
  "successful": 3,
  "failed": 0,
  "results": [
    {
      "id": 1,
      "status": "sent",
      "channel": "sms",
      "message": "Hi! I noticed your business doesn't have a website..."
    }
  ]
}
```

## 🎯 Critical Implementation Details

### Website Detection Logic
Your bot MUST accurately detect if a business has a website:

```python
def detect_website(business_name, phone):
    """
    Returns None if no website found (your target market!)
    Returns URL string if website exists
    """
    # Check methods:
    # 1. Google search: "{business_name} {city} website"
    # 2. Google My Business API
    # 3. Facebook page check
    # 4. Domain variations: businessname.com, .net, .biz
    
    if no_website_found:
        return None  # This is GOLD! These are your customers
    else:
        return "https://example.com"  # Has website, lower priority
```

### Scoring Algorithm (Optional)
If your bot pre-calculates scores:

```python
def calculate_lead_score(business_data):
    score = 50  # Base score
    
    # MAJOR boost for no website
    if business_data.get('website') is None:
        score += 30  # Now at 80!
    
    # Additional factors
    if business_data.get('reviews', {}).get('rating', 0) >= 4:
        score += 10
    
    if business_data.get('businessType') in ['plumbing', 'electrical', 'hvac']:
        score += 10
    
    return min(100, score)
```

## 📋 Google Sheets Format
Expected column headers for import:

| Business Name | Phone | Email | Address | City | State | Type | Website |
|--------------|-------|-------|---------|------|-------|------|---------|
| Joe's Plumbing | 207-555-1234 | joe@email.com | 123 Main | Bath | ME | Plumbing | |
| Bob's HVAC | 207-555-5678 | | 456 Oak | Brunswick | ME | HVAC | bobshvac.com |

## 🔧 Error Handling
Always return valid JSON, even for errors:

```json
{
  "error": "Failed to connect to Google Sheets",
  "code": "SHEETS_CONNECTION_ERROR",
  "details": "Invalid credentials"
}
```

## 📡 Integration Testing

### Test Website Detection
```bash
# Should return website: null
python3 bot_cli.py enrich --name "Small Local Plumber" --phone "207-555-0000"

# Should return website: "example.com"  
python3 bot_cli.py enrich --name "Big Chain Store" --phone "800-555-1234"
```

### Test Batch Import
```bash
# Should import and identify no-website businesses
python3 bot_cli.py import-sheets --sheet-id "TEST_SHEET_ID" | jq '.[] | select(.website == null)'
```

## 🚀 Performance Requirements

- **Enrichment**: < 5 seconds per business
- **Batch Import**: < 1 second per row
- **Outreach**: < 2 seconds per message
- **JSON Output**: Always valid, parseable JSON
- **Exit Codes**: 0 for success, non-zero for errors

## 💡 Pro Tips

1. **Cache Results**: Store enrichment data to avoid duplicate API calls
2. **Rate Limiting**: Respect API limits (Google, social media)
3. **Fallback Data**: Return partial data rather than failing completely
4. **Logging**: Write detailed logs to stderr, JSON to stdout
5. **Website Validation**: Double-check websites actually work (not parked domains)

Your bot is the engine that identifies businesses without websites - your perfect customers! 