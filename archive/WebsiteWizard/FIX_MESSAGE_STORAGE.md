# Backend Fix Required for Message Persistence

## The Problem
Messages are being stored without proper `businessId` association. This breaks filtering and member-specific conversations.

## The Fix Needed on Railway Backend

In your Railway server, when handling `client:message` events, ensure messages are stored with:

```javascript
// In your socket handler
socket.on('client:message', async (data) => {
    // CRITICAL: Extract and validate businessId
    const businessId = parseInt(data.businessId) || 1;
    
    // Store message with PROPER associations
    const message = {
        content: data.message,
        senderName: data.senderName,
        senderId: data.senderId,  // Unique user ID
        senderType: 'client',
        businessId: businessId,    // MUST be a number, not string
        projectToken: data.projectToken,
        timestamp: new Date().toISOString()
    };
    
    // Save to database
    await saveMessage(message);
    
    // Broadcast to admin
    io.to('admin').emit('new:message', {
        ...message,
        businessId: businessId  // Ensure it's included
    });
});
```

## Database Schema Fix

Your messages table needs these columns:
- `businessId` (INTEGER) - NOT NULL
- `senderId` (TEXT) - User's unique ID  
- `senderName` (TEXT) - Display name
- `senderType` (TEXT) - 'client' or 'admin'
- `content` (TEXT) - Message text
- `timestamp` (DATETIME) - When sent

## API Endpoint Fix

When retrieving messages:
```javascript
app.get('/api/messages', (req, res) => {
    const { businessId, userId } = req.query;
    
    // Filter by business AND/OR user
    let query = 'SELECT * FROM messages WHERE 1=1';
    const params = [];
    
    if (businessId) {
        query += ' AND businessId = ?';
        params.push(parseInt(businessId));
    }
    
    if (userId) {
        query += ' AND (senderId = ? OR senderName = ?)';
        params.push(userId, userId);
    }
    
    query += ' ORDER BY timestamp ASC';
    
    const messages = db.all(query, params);
    res.json(messages);
});
```

## Testing the Fix

1. Send a test message with proper data:
```javascript
{
    businessId: 1,
    message: "Test message",
    senderName: "John Doe",
    senderId: "user_123456",
    projectToken: "mc516tr5_CSU4OUADdSIHB3AXxZPpbw"
}
```

2. Verify it's stored with `businessId = 1` not `businessId = null`

3. Retrieve messages:
```
GET /api/messages?businessId=1&userId=user_123456
```

Should return only messages for that business/user combination. 