# Manual SMS Sending with Preview - Inbox Feature

## Overview
This feature allows you to send pre-filled SMS messages to leads directly from the Inbox conversation view, with a preview step before sending.

## How It Works

### 1. **Automatic Message Suggestion**
When you open a conversation in the Inbox, the system automatically generates a suggested message based on:
- Lead score (≥ 70 shows scheduling invitation)
- Lead stage (contacted, scraped, interested)
- Business name for personalization

### 2. **Message Templates**

**For High-Scoring Leads (Score ≥ 70):**
```
Hey [FirstName], it's Ben from Pleasant Cove Design. I'd love to chat about your website — you can book a free consultation at a time that works for you here: https://www.pleasantcovedesign.com/schedule?lead_id=123
```

**For Interested Leads:**
```
Hi [FirstName], just following up on our conversation. Ready to move forward with your website? Let me know if you have any questions or want to schedule a quick call: https://www.pleasantcovedesign.com/schedule?lead_id=123
```

**Default Message:**
```
Hi [FirstName], it's Ben from Pleasant Cove Design. How can I help you today?
```

### 3. **Using the Feature**

1. **Open a Conversation**: Click on any business in the Inbox sidebar
2. **View Messages Tab**: The suggested message panel appears below the message input
3. **Show/Hide Preview**: Click the "Show" button to expand the message preview
4. **Review the Message**: The auto-generated message appears in a read-only textarea
5. **Send the Message**: Click "Send This Message" to deliver the SMS

### 4. **Visual Indicators**
- ⚡ Lightning bolt icon indicates an auto-generated suggestion
- ✅ Green checkmark shows the recipient phone number
- 🔄 Loading spinner appears while sending

### 5. **After Sending**
- Success toast notification appears
- Activity logged: "Manual SMS sent via Inbox UI"
- Last contact date updated in the database
- Conversation refreshes automatically

## Technical Details

### API Endpoint
`POST /api/messages/send`

**Request Body:**
```json
{
  "leadId": 123,
  "channel": "sms",
  "body": "Your message text here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "timestamp": "2025-06-01T12:30:00.000Z"
}
```

### Activity Logging
Each sent message creates an activity entry:
- Type: `sms_sent`
- Description: `Manual SMS sent via Inbox UI: "[First 50 chars of message]..."`

## Future Enhancements
- [ ] Add "Customize Message" option to edit before sending
- [ ] Include message variants dropdown (follow-up, reminder, etc.)
- [ ] Enable email sending alongside SMS
- [ ] Track delivery status with webhook callbacks
- [ ] Add message history to conversation thread

## Integration Notes
- Currently simulates SMS sending (logs to console)
- Production requires Twilio integration in `sendSMS()` function
- Scheduling links automatically include the correct lead_id parameter 