# Message Persistence Fix for Squarespace Widget

## Problem
When refreshing the Squarespace widget, all conversation history was lost and messages reverted to old test data ("yo yo" from 12:30 5:31 PM).

## Root Causes
1. **Wrong Backend URL**: Widget was using `localhost:3000` instead of Railway production URL
2. **Missing Business ID**: Messages weren't properly associated with business IDs
3. **No Client Persistence**: Client identity wasn't maintained across sessions

## Solution

### 1. Use Production Railway Backend
```javascript
// BEFORE (Wrong)
backendUrl: 'http://localhost:3000'

// AFTER (Correct)
backendUrl: 'https://pleasantcovedesign-production.up.railway.app'
```

### 2. Proper Message Association
The widget now:
- Associates all messages with a specific `businessId`
- Includes `projectToken` for filtering
- Maintains `clientId` across sessions

### 3. Persistent Client Identity
```javascript
// Generate and store persistent client ID
getOrCreateClientId() {
    let clientId = localStorage.getItem('pcd_client_id');
    if (!clientId) {
        clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('pcd_client_id', clientId);
    }
    return clientId;
}
```

### 4. Smart Message Filtering
When loading history, messages are filtered by:
- Business ID match
- Client name match
- Project token match

## Implementation

### Updated Widget File
Use the production widget at: `WebsiteWizard/docs/SQUARESPACE_WIDGET_PRODUCTION.html`

### Key Features
- ✅ Connects to Railway production server
- ✅ Persists client identity across sessions
- ✅ Properly filters messages by business
- ✅ Maintains conversation history on refresh
- ✅ Real-time message sync via Socket.IO
- ✅ File attachment support
- ✅ Mobile responsive

### Testing
1. Open the widget
2. Send some messages
3. Refresh the page
4. Messages should persist and reload

## Deployment

### For Squarespace
1. Copy the entire contents of `SQUARESPACE_WIDGET_PRODUCTION.html`
2. Add to Squarespace as a Code Block
3. Ensure it's on a members-only page

### Configuration
```javascript
this.config = {
    railwayUrl: 'https://pleasantcovedesign-production.up.railway.app',
    projectToken: 'mc516tr5_CSU4OUADdSIHB3AXxZPpbw',
    businessId: 1, // Change this for different businesses
};
```

## Troubleshooting

### Messages Not Persisting?
1. Check browser console for errors
2. Verify Railway server is running
3. Check localStorage isn't blocked
4. Ensure correct `businessId` is set

### Connection Issues?
1. Check CORS settings on Railway
2. Verify WebSocket support
3. Check for firewall/proxy issues

### Wrong Messages Showing?
1. Clear localStorage
2. Check `businessId` configuration
3. Verify `projectToken` matches

## Future Improvements
1. Add user authentication
2. Implement read receipts
3. Add typing indicators
4. Support multiple file uploads
5. Add message search 