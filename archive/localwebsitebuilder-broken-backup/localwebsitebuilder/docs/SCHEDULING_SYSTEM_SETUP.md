# Consultation Scheduling System Setup Guide

## Overview
This system provides a custom booking widget for Squarespace that integrates with your WebsiteWizard backend, allowing qualified leads to self-schedule consultations.

## Key Features
- ✅ Two fixed daily slots: 8:30 AM and 9:00 AM
- ✅ Available 7 days a week
- ✅ Automatically updates pipeline stage to "scheduled"
- ✅ Includes scheduling links in outreach messages
- ✅ Pre-fills lead information on booking page

## Setup Instructions

### 1. Backend Configuration

The system is already configured with your schedule:
- First slot: 8:30 AM
- Second slot: 9:00 AM
- Max 2 consultations per day
- Available: Every day of the week

### 2. Squarespace Setup

1. **Create a new page** on your Squarespace site called `/schedule`

2. **Add a Code Block** to the page

3. **Copy the HTML code** from `docs/squarespace-booking-widget.html`

4. **Update the API URL** in the code:
   ```javascript
   // Replace this line:
   const API_BASE = 'https://your-ngrok-url.ngrok.io/api';
   
   // With your actual ngrok URL:
   const API_BASE = 'https://xxxxx.ngrok.io/api';
   ```

5. **Enable CORS** (if needed) - Your ngrok URL automatically handles this

### 3. Testing the Widget

1. **Test with a sample lead**: 
   ```
   https://www.pleasantcovedesign.com/schedule?lead_id=1
   ```

2. **Verify the flow**:
   - Lead name appears
   - Calendar shows available dates
   - Only 8:30 AM and 9:00 AM slots appear
   - Booking updates the system

### 4. Outreach Integration

Your SMS and email templates now automatically include scheduling links:

**SMS Example**:
```
Hi John, I noticed Coastal Plumbing doesn't have a website yet. 
I help local businesses get online affordably. Mind if I show 
you what's possible? No obligation - just a quick mockup I made 
for you. If you'd like to chat, here's my calendar: 
https://www.pleasantcovedesign.com/schedule?lead_id=123
```

**Email Signature**:
```
Ben Dickinson
Pleasant Cove Design
Local web designer in Camden
207-555-0100
https://www.pleasantcovedesign.com
```

### 5. Inbox Actions

When viewing messages in your Inbox, you can:
- Click "Insert Scheduling Link" to add the custom URL
- System automatically generates the correct link for that lead
- Lead pipeline updates to "scheduled" when they book

### 6. Webhook Notifications (Optional)

To get notified when someone books:

1. **Telegram Bot**:
   ```bash
   # Set environment variable
   export TELEGRAM_BOT_TOKEN="your-bot-token"
   export TELEGRAM_CHAT_ID="your-chat-id"
   ```

2. **SMS via Twilio**:
   ```bash
   # Set environment variables
   export TWILIO_ACCOUNT_SID="your-sid"
   export TWILIO_AUTH_TOKEN="your-token"
   export TWILIO_PHONE_NUMBER="+1234567890"
   ```

### 7. Analytics Dashboard

View booking performance at:
```
http://localhost:5173/scheduling
```

Metrics include:
- Total scheduled consultations
- Show rate
- Most popular time slots
- Average time from outreach to booking

## Common Issues & Solutions

### Widget not loading?
- Check ngrok is running: `./start-webhook-server.sh`
- Verify API URL is correct in the widget code
- Check browser console for errors

### Slots not showing?
- Ensure slots aren't already booked (max 2/day)
- Verify server is running

### Booking not updating system?
- Check network tab for API errors
- Ensure lead_id is valid
- Verify CORS is enabled

## API Endpoints Reference

| Endpoint | Purpose | Example |
|----------|---------|---------|
| GET `/api/businesses/:id` | Get lead info | `/api/businesses/123` |
| GET `/api/scheduling/slots` | Get available times | `/api/scheduling/slots?date=2025-06-03&businessId=123` |
| POST `/api/scheduling/book` | Book appointment | `{ businessId: 123, datetime: "2025-06-03T08:30:00Z" }` |
| GET `/api/scheduling/analytics` | View stats | `/api/scheduling/analytics` |

## Reminder System (Coming Soon)

Future enhancement will include:
- 24-hour reminder SMS/email
- 1-hour reminder
- No-show follow-up with rescheduling link

## Support

For issues or questions about the scheduling system:
1. Check server logs: `npm run dev`
2. View ngrok requests: Check ngrok web interface
3. Database issues: Check SQLite data in `storage.ts`

---

**Remember**: Keep your ngrok URL updated in the Squarespace widget code whenever you restart the tunnel! 