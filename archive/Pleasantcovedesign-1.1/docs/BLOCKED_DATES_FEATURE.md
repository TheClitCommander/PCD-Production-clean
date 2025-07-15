# Blocked Dates Feature

## Overview
The blocked dates feature allows you to block out specific dates and times when you don't want appointments scheduled. This is perfect for personal appointments, holidays, or any time you're unavailable.

## How to Use

### 1. **Blocking Dates**
From the Scheduling page, click the "Block Date" button in the top right:
- **Date**: Select the date you want to block
- **Time Option**: Choose between:
  - **Whole Day**: Blocks the entire day (no appointments)
  - **Specific Time**: Block only certain hours (e.g., 8:30-9:30)
- **Reason** (optional): Add a note for yourself about why it's blocked

### 2. **Visual Indicators**
Blocked times appear on the calendar with:
- 🚫 Red background
- Ban icon (🚫) in the event
- Listed in the "Blocked Times" sidebar

### 3. **Managing Blocks**
- **View all blocks**: See them in the "Blocked Times" card on the left
- **Remove a block**: Click the X button next to any blocked date
- **Blocks prevent scheduling**: Nobody can book or drag appointments to blocked times

## How It Works

### Blocking Logic
1. **Whole Day Blocks**: No appointments can be scheduled that day
2. **Time-Specific Blocks**: Only the specified hours are unavailable
3. **Automatic Prevention**: 
   - Self-service scheduler won't show blocked slots
   - Manual drag-and-drop is prevented
   - Clear error messages if someone tries

### Visual Calendar States
- **Blue Events**: Manual appointments
- **Gray Events**: Auto-scheduled appointments  
- **Red Events**: Blocked times
- **Light Blue Slots**: Available for booking
- **Red-tinted Slots**: Occupied or blocked

## Examples

### Block a Holiday
```
Date: July 4, 2025
Time: Whole Day
Reason: Independence Day
```

### Block a Personal Appointment
```
Date: June 15, 2025
Time: Specific (8:30 AM - 9:30 AM)
Reason: Doctor appointment
```

### Block Vacation Days
Create multiple whole-day blocks for each vacation day:
```
June 20-24, 2025: Summer vacation
```

## Technical Details

### Database Schema
```sql
blocked_dates (
  id: auto-increment
  date: "2025-06-15"
  startTime: "08:30" (nullable)
  endTime: "09:30" (nullable)
  reason: "Doctor appointment" (nullable)
)
```

### API Endpoints
- `GET /api/blocked-dates` - Fetch all blocked dates
- `POST /api/blocked-dates` - Create a new block
- `DELETE /api/blocked-dates/:id` - Remove a block

### Integration Points
1. **Scheduling Utils**: Checks blocks before allowing bookings
2. **Calendar View**: Displays blocks visually
3. **Self-Service Scheduler**: Filters out blocked slots
4. **Activity Log**: Records when dates are blocked/unblocked

## Best Practices
- Block dates as soon as you know you're unavailable
- Use descriptive reasons so you remember why it's blocked
- For recurring unavailability, consider adjusting your general availability settings instead
- Review and clean up old blocks periodically 