# Messaging Widget Test Checklist

Run through this checklist after ANY changes to verify nothing is broken:

## Basic Functionality
- [ ] Widget loads without errors
- [ ] Member detection works (shows correct email)
- [ ] Can send text messages
- [ ] Messages appear in real-time
- [ ] Can receive admin replies in real-time

## File Uploads
- [ ] Can attach and send photos
- [ ] Can attach and send documents (PDF, etc)
- [ ] File preview shows before sending
- [ ] Files send successfully
- [ ] No "undefined" text appears with files

## Session Management
- [ ] Login as User A - see User A's messages
- [ ] Logout and login as User B - see ONLY User B's messages (not User A's)
- [ ] Refresh page - still see correct user's messages
- [ ] Close browser, reopen - session restored correctly

## Persistence
- [ ] Send a message, refresh page - message still there
- [ ] Send a photo, refresh page - photo still visible (not "undefined")
- [ ] Receive message while offline, login later - message appears

## Edge Cases
- [ ] Send file without text - no "undefined" appears
- [ ] Send multiple files at once - all appear correctly
- [ ] Very long messages - display correctly
- [ ] Special characters in messages - display correctly

## If ANY test fails:
1. STOP making changes
2. Run: `./EMERGENCY_RESTORE_WIDGET.sh`
3. Figure out what broke before proceeding

## Working Configuration (DO NOT CHANGE):
- Backend URL: http://localhost:3000
- Widget uses `/api/token` for auth
- Widget uses `/api/public/project/{token}/messages` for messages
- FormData for file uploads
- localStorage keys: `pcd_project_token`, `pcd_user_email`, `pcd_user_name` 