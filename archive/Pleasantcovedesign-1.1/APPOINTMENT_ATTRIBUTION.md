# Appointment Attribution System

## Overview
The appointment system has been refactored to support multiple appointments per business with full historical tracking. Instead of storing a single `scheduledTime` on the businesses table, we now have a dedicated `appointments` table.

## Database Schema

### Appointments Table
```sql
CREATE TABLE appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  datetime DATETIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed' | 'completed' | 'no-show' | 'cancelled'
  notes TEXT,
  is_auto_scheduled INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Key Features
- **Multiple appointments per business**: Track full appointment history
- **Status tracking**: Track confirmed, completed, no-show, and cancelled appointments
- **Auto-scheduled flag**: Distinguish between manual drag-and-drop vs self-service bookings
- **Notes field**: Store appointment-specific notes
- **Timestamps**: Track when appointments were created and last updated

## API Endpoints

### Appointment CRUD Operations
- `GET /api/appointments` - Get all appointments (optionally filtered by businessId)
- `POST /api/appointments` - Create new appointment
- `PATCH /api/appointments/:id` - Update appointment (reschedule, change status, add notes)
- `DELETE /api/appointments/:id` - Cancel appointment (sets status to 'cancelled')
- `GET /api/businesses/:id/appointments` - Get all appointments for a specific business

### Data Flow

1. **Creating Appointments**
   - Drag lead to calendar → Creates appointment with `isAutoScheduled: false`
   - Self-service booking → Creates appointment with `isAutoScheduled: true`
   - Updates business stage to 'scheduled'

2. **Updating Status**
   - Mark as completed/no-show → Updates appointment status
   - No-show triggers auto-SMS with reschedule link
   - Logs activity in activities table

3. **Rescheduling**
   - Updates existing appointment datetime
   - Logs "appointment_rescheduled" activity

4. **Cancellation**
   - Sets appointment status to 'cancelled'
   - If no other active appointments, reverts business stage to 'contacted'

## Frontend Implementation

### Scheduling Page
- Fetches appointments from `/api/appointments` endpoint
- Displays appointments as calendar events
- Drag-and-drop creates new appointments
- Event drag updates appointment datetime

### Client Profile - Bookings Tab
- Shows all appointments for the business sorted by date
- Highlights upcoming appointments
- Action buttons for marking completed/no-show
- Shows appointment metadata (auto-scheduled, created date)

## Migration Guide

To migrate existing appointment data from the businesses table:

```bash
# Run the migration script
npx tsx scripts/migrate-appointments.ts
```

This will:
1. Find all businesses with `scheduledTime` set
2. Create corresponding appointments in the new table
3. Preserve appointment status and auto-scheduled indicators
4. Keep original data intact for verification

## Legacy Support

The system maintains backward compatibility:
- Old `/api/schedule` endpoints still work but create appointments in the new table
- `businesses.scheduledTime` field is preserved but no longer used
- Activities table continues logging all appointment-related events

## Best Practices

1. **Always use appointment IDs** for updates, not business IDs
2. **Check for conflicts** before creating appointments
3. **Log activities** for all appointment changes
4. **Handle status transitions** properly (e.g., no-show → auto-SMS)
5. **Maintain data integrity** by updating business stage based on appointment status

## Current Implementation

### Data Structure
Appointments are currently stored in the `businesses` table with these fields:
- `scheduledTime` - ISO timestamp of the appointment
- `appointmentStatus` - 'confirmed' | 'completed' | 'no-show'
- `stage` - Set to 'scheduled' when appointment exists

**Limitation**: Only ONE active appointment per business at a time.

### Appointment Display in Client Profile

#### 1. Current/Active Appointment
- Displayed prominently with blue background
- Shows date, time, and current status
- Includes action buttons:
  - **Complete** - Mark appointment as completed
  - **No-show** - Mark as no-show (triggers auto-reschedule SMS)
- Self-scheduled appointments show special badge

#### 2. Historical Appointments
- Shown from the `activities` table
- Tracks all appointment-related activities:
  - `meeting_scheduled` - Initial booking
  - `meeting_rescheduled` - Changed appointments
  - `appointment_status_updated` - Status changes
  - `no_show` - No-show events

#### 3. Features
- **Schedule New Appointment** button for easy booking
- Visual status badges (confirmed, completed, no-show)
- Activity timeline showing appointment history
- Automatic activity logging for all changes

## API Endpoints

### Get Appointments
```
GET /api/scheduling/appointments
```
Returns all businesses with scheduled appointments, including:
- `businessId` - Links to business record
- `datetime` - Appointment time
- `appointmentStatus` - Current status
- `isAutoScheduled` - Whether self-booked

### Update Appointment Status
```
PATCH /api/scheduling/appointments/:businessId/status
Body: { status: 'confirmed' | 'completed' | 'no-show' }
```

### Schedule New Appointment
```
POST /api/schedule
Body: { business_id: 123, datetime: "2025-06-05T08:30:00Z" }
```

## Automatic Actions

### No-Show Handling
When marked as no-show:
1. Status updated to 'no-show'
2. Activity logged
3. Auto-reschedule SMS sent with booking link
4. Original appointment preserved for history

### Activity Logging
Every appointment action creates an activity record:
- Links to `businessId`
- Timestamped
- Descriptive message
- Used for historical tracking

## Usage in UI

### Client Profile (/clients/:id)
- **Bookings Tab** shows:
  - Current appointment with actions
  - Historical appointments from activities
  - Quick scheduling button

### Scheduling Page
- Drag & drop to calendar
- Modal for time selection
- Automatic businessId linkage

### Dashboard/Analytics
- Appointment counts
- No-show tracking
- Conversion metrics

## Future Enhancements

### Recommended: Separate Appointments Table
Create dedicated `appointments` table:
```sql
CREATE TABLE appointments (
  id INTEGER PRIMARY KEY,
  businessId INTEGER REFERENCES businesses(id),
  datetime TEXT NOT NULL,
  status TEXT DEFAULT 'confirmed',
  method TEXT DEFAULT 'manual',
  duration INTEGER DEFAULT 30,
  notes TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

Benefits:
- Multiple appointments per business
- Complete appointment history
- Better reporting capabilities
- Recurring appointment support

### Additional Features
1. **Appointment Reminders**
   - SMS 24 hours before
   - Email confirmations

2. **Recurring Appointments**
   - Weekly/monthly scheduling
   - Automatic rebooking

3. **Appointment Types**
   - Initial consultation
   - Follow-up
   - Delivery/presentation

4. **Integration with Calendar Apps**
   - Google Calendar sync
   - iCal export

## Key Points

✅ Every appointment MUST have a `businessId`
✅ All status changes are logged as activities
✅ No-shows trigger automatic rescheduling
✅ Historical tracking via activities table
✅ UI shows both current and past appointments
✅ Easy access to schedule new appointments

The system ensures complete appointment attribution while maintaining simplicity and efficiency in the current single-appointment-per-business model. 