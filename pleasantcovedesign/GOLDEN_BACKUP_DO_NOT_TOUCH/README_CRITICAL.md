# 🚨 CRITICAL: DO NOT MODIFY ANYTHING IN THIS DIRECTORY 🚨

## This is the GOLDEN BACKUP of the WORKING messaging widget

### What's Working:
✅ Private member conversations (each member has their own conversation)
✅ File uploads (photos, documents)
✅ Files persist after refresh (no more "undefined")
✅ Offline messages received when logging in
✅ Real-time messaging
✅ Session management (different users don't see each other's messages)

### Critical Files:
- `WORKING_WIDGET_*.html` - The complete working messaging widget
- DO NOT EDIT, MOVE, OR DELETE THESE FILES

### If Something Breaks:
1. STOP immediately
2. Copy the latest WORKING_WIDGET file back to `client-widget/messaging-widget-unified.html`
3. Restart the server

### Key Features That Must Be Preserved:
1. **Session Detection Logic** (lines 755-830) - Detects current member BEFORE restoring session
2. **File Upload Handling** (line 2352) - Uses `message || ''` to prevent "undefined"
3. **Message Display** (line 2238) - Checks for "undefined" string and hides empty content
4. **LoadMessages** (line 2110) - Uses `addMessageToUI` not `displayMessage`

### Working Endpoints:
- Authentication: `/api/token`
- Messages: `/api/public/project/{token}/messages`
- File uploads: FormData to same endpoint

### DO NOT:
- Change the authentication flow
- Modify session storage keys
- Alter the message display logic
- Touch the file upload handling
- Switch between `displayMessage` and `addMessageToUI`

Created: $(date)
Last Working Test: January 15, 2025 