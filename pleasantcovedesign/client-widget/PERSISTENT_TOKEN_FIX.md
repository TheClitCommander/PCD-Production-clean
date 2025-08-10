# Project Token Consistency Fix

## Problem Identified

The main issue causing test conversations to not appear in the UI inbox is inconsistent project tokens. Each time you test the messaging widget, it might be creating a new project token instead of reusing an existing one. This results in your test conversations being scattered across multiple projects, making them appear "missing" in the admin UI.

## Solution

1. **Use Consistent Project Tokens**: Modify the widget to always use the same project token for the same member email.
2. **Local Storage Persistence**: Store project tokens in localStorage with a consistent naming scheme.
3. **Cross-Domain Fix**: Ensure tokens are reused even when testing across different domains/subdomains.

## Implementation

1. Add this to the messaging widget (`messaging-widget-unified.html`) to ensure token consistency:

```javascript
// In the authenticateUser method:
// Before making the API call, check if we already have a token for this email
const storageKey = `pcd_member_token_${this.normalizeEmail(member.email)}`;
const existingToken = localStorage.getItem(storageKey);

if (existingToken) {
    console.log(`✅ [AUTH] Reusing existing token for ${member.email}: ${existingToken.substring(0, 8)}...`);
    
    // Validate token before reusing
    const isValid = await this.validateTokenWithBackend(existingToken);
    if (isValid) {
        // Use existing token instead of creating a new one
        this.projectToken = existingToken;
        this.userName = member.name;
        this.userEmail = member.email;
        
        // Update standard storage keys
        localStorage.setItem('pcd_user_email', member.email);
        localStorage.setItem('pcd_user_name', member.name);
        localStorage.setItem('pcd_project_token', existingToken);
        
        // Skip the API call for new token
        console.log(`✅ [AUTH] Reused existing token successfully!`);
        this.updateDebugInfo(`Reused existing token for ${member.email}`, 'success');
        this.showUserInterface();
        return;
    } else {
        console.log(`⚠️ [AUTH] Existing token is invalid, requesting new one...`);
    }
}
```

2. Add this helper method to normalize email addresses:

```javascript
normalizeEmail(email) {
    if (!email) return 'anonymous';
    return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}
```

3. After successful token creation, add:

```javascript
// After successful authentication, store token with email-specific key
const storageKey = `pcd_member_token_${this.normalizeEmail(member.email)}`;
localStorage.setItem(storageKey, data.token);
```

## Testing

1. Clear local storage in your browser
2. Open the messaging widget and enter test mode
3. Send a test message
4. Check the admin UI inbox - your message should appear
5. Send another message - it should appear in the same conversation

## Fixing Existing Data

If you have existing data with multiple tokens for the same email, use the provided database repair script:

```
cd pleasantcovedesign/server && node fix-database.js
```

This will consolidate conversations for the same member across multiple projects.
