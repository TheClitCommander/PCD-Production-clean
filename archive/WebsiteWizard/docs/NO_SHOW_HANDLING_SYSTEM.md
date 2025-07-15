# No-Show Handling System

## Overview
Complete appointment lifecycle management with no-show tracking, auto-rescheduling, analytics, and double-booking prevention.

## ✅ Implemented Features

### 1. **No-Show Tracking**
Track appointment outcomes with status management:
- **Statuses**: `confirmed`, `completed`, `no-show`
- Visual indicators in calendar (colors)
- Activity logging for all status changes

**How to Use:**
1. Click any appointment in the calendar
2. Use "Mark Complete" or "Mark No-Show" buttons
3. System automatically logs the change

### 2. **Auto-Reschedule Messages**
When marking an appointment as no-show:
- Automatic SMS sent with reschedule link
- Message format: "Hey [Name], sorry we missed you! You can rebook here: [link]"
- Activity logged as "Auto-reschedule message sent"

### 3. **Daily Summary Notifications**
Script: `scripts/dailySummary.ts`

**Features:**
- Lists all appointments for the day
- Shows booking type (Auto/Manual)
- Excludes no-shows from summary
- Ready for Telegram/Email integration

**To Run:**
```bash
cd WebsiteWizard
tsx scripts/dailySummary.ts
```

**Schedule with CRON (7 AM daily):**
```bash
0 7 * * * cd /path/to/WebsiteWizard && tsx scripts/dailySummary.ts
```

### 4. **Booking Analytics Dashboard**
Access at: `/analytics`

**Visualizations:**
- **Pie Charts**: 
  - Manual vs Auto-scheduled bookings
  - Appointment outcomes (Confirmed/Completed/No-Show)
- **Bar Chart**: Time slot performance
- **Key Metrics**: 
  - Total bookings
  - Show rate %
  - No-show rate %
  - Average time to booking

**Insights & Recommendations:**
- Alerts for high no-show rates (>20%)
- Booking pattern analysis
- Performance trends

### 5. **Inbox Quick Schedule**
One-click scheduling from conversation view:
- "Quick Schedule" button in inbox header
- Automatically finds next available 8:30 AM slot
- Updates pipeline to "scheduled"
- Shows confirmation toast

### 6. **Double-Booking Prevention**
Backend enforcement at multiple levels:
- **Calendar UI**: Prevents dragging to occupied slots
- **API Level**: Returns 409 Conflict for double-bookings
- **Scheduling Utils**: Validates slot availability
- **Blocked Dates**: Respected in all booking flows

## Visual Calendar States

### Appointment Colors:
- 🔵 **Blue**: Manual appointments (confirmed)
- ⚫ **Gray**: Auto-scheduled appointments
- 🟢 **Green**: Completed appointments  
- 🔴 **Light Red**: No-show appointments
- 🔴 **Red**: Blocked times

### Status Badges:
- ⏰ **Confirmed**: Blue badge with clock icon
- ✅ **Completed**: Green badge with checkmark
- ❌ **No-Show**: Red badge with user-x icon

## API Endpoints

### Update Appointment Status
```http
PATCH /api/scheduling/appointments/:id/status
Body: { "status": "no-show" | "completed" | "confirmed" }
```

### Get Analytics
```http
GET /api/scheduling/analytics
Response: {
  totalBookings, autoScheduledCount, manualCount,
  noShowRate, showRate, avgTimeToBooking,
  mostPopularTime, appointmentBreakdown
}
```

### Quick Schedule
Uses existing endpoints:
- `GET /api/scheduling/slots` - Find available slots
- `POST /api/scheduling/book` - Create booking

## Activity Logging

All actions are tracked:
- `meeting_scheduled` - When appointment created
- `appointment_status_updated` - Status changes
- `no_show` - Specific no-show events
- `sms_sent` - Auto-reschedule messages
- `daily_summary_sent` - Daily briefing sent

## Best Practices

### Managing No-Shows:
1. Mark no-shows promptly after missed appointment
2. Auto-reschedule message goes out immediately
3. Review analytics weekly for patterns

### Preventing No-Shows:
- Send manual reminder messages day before
- Use Quick Schedule for immediate bookings
- Monitor show rates by time slot

### Daily Workflow:
1. Check daily summary at 7 AM
2. Prepare for scheduled consultations
3. Mark completed/no-shows after each slot
4. Review analytics weekly

## Configuration

### Environment Variables:
```env
# For Telegram daily summaries
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# For Email summaries (SendGrid)
SENDGRID_API_KEY=your_api_key
EMAIL_FROM=notifications@pleasantcovedesign.com
EMAIL_TO=ben@pleasantcovedesign.com
```

### Scheduling Rules:
- Slots: 8:30 AM and 9:00 AM only
- 7 days per week availability
- Max 2 consultations per day
- 30-minute appointment duration

## Future Enhancements
- [ ] SMS reminder integration (1 hour before)
- [ ] Automated follow-up sequences for no-shows
- [ ] Rescheduling rate tracking
- [ ] Lead quality correlation with show rates 