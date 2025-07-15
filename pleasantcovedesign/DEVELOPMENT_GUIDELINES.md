# Development Guidelines - MUST READ

## 🚨 CRITICAL: The messaging widget is currently WORKING PERFECTLY

### Before Making ANY Changes:

1. **Run the test checklist** (`WIDGET_TEST_CHECKLIST.md`)
2. **Create a backup**: `cp client-widget/messaging-widget-unified.html backups/backup_$(date +%Y%m%d_%H%M%S).html`
3. **Understand what you're changing** - read the code comments

### Protected Areas (DO NOT MODIFY):

1. **Session Detection Logic** (init function)
   - Member detection MUST happen before session restoration
   - Session validation MUST check if stored email matches current member

2. **File Upload Handling**
   - FormData must use `message || ''` not just `message`
   - Keep the current endpoint structure

3. **Message Display**
   - Must check for "undefined" string
   - Must use `addMessageToUI` not `displayMessage` in loadMessages

4. **Authentication Flow**
   - Don't change the `/api/token` endpoint
   - Don't change how tokens are stored in localStorage

### Safe Areas for Development:

- Admin UI (separate from widget)
- Server-side business logic (as long as API contracts don't change)
- Styling (as long as class names remain the same)
- Adding new features that don't touch existing functionality

### If You Break Something:

1. **STOP** - Don't try to fix it by making more changes
2. **Run**: `./EMERGENCY_RESTORE_WIDGET.sh`
3. **Review** what you changed and why it broke
4. **Test** thoroughly before committing

### Testing Protocol:

After ANY change:
1. Test with multiple users
2. Test file uploads
3. Refresh the page
4. Check for "undefined" text
5. Verify messages persist

### Remember:
- This widget is used in production
- Real users depend on it working
- "It works on my machine" is not enough
- Test like a user would use it

Last confirmed working: January 15, 2025 