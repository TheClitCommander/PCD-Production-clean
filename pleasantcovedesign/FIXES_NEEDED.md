# 🔧 Fixes Needed for Messaging System

## Issues Identified

### 1. ❌ Images Not Displaying
**Problem**: Images are trying to load from `mockcdn.com` which doesn't exist
**Location**: Messages contain URLs like `https://mockcdn.com/uploads/ChatGPT Image May 27, 2025, 04_38_15 PM.png`
**Fix**: Need to update the image URLs to use the actual Railway server URL

### 2. ❌ Conversation Disappearing on Refresh
**Problem**: When the Squarespace widget page is refreshed, the conversation history disappears
**Current Behavior**: The widget properly stores session data in localStorage but may not be restoring it correctly
**Fix**: Ensure the widget properly restores the projectToken and loads messages on page refresh

### 3. ❌ Client Name Shows Token
**Problem**: In the admin UI conversation list, it shows the projectToken instead of the client's name
**Example**: Shows `mc516tr5_CSU4OUADdSIHB3AXxZPpbw` instead of "Garth"
**Fix**: Update the conversation title parsing to properly extract the customer name

## Quick Fixes

### Fix 1: Update Image URLs in Database
The old test messages have hardcoded `mockcdn.com` URLs. These need to be updated to use the actual server.

### Fix 2: Widget Session Restoration
```javascript
// In the widget's init() method, check for existing session
const storedToken = localStorage.getItem('pcd_project_token');
const storedEmail = localStorage.getItem('pcd_user_email');
const storedName = localStorage.getItem('pcd_user_name');

if (storedToken && storedEmail && storedName) {
    // Restore session
    this.projectToken = storedToken;
    this.userEmail = storedEmail;
    this.userName = storedName;
    
    // Skip authentication and go straight to messaging
    this.showUserInterface();
    return;
}
```

### Fix 3: Parse Customer Name Correctly
In `admin-ui/src/pages/Inbox.tsx`, line ~731:
```typescript
// Current (incorrect):
const customerName = project.projectTitle.split(' - ')[0] || 'Unknown Customer';

// Should be:
const customerName = project.customerName || project.projectTitle.split(' - ')[0] || 'Unknown Customer';
```

## Implementation Steps

1. **For Images**: 
   - Update the server to replace `mockcdn.com` URLs with actual server URLs
   - Or update the admin UI to handle these URLs gracefully

2. **For Session Persistence**:
   - Update the widget to check localStorage on init
   - If valid session exists, skip authentication
   - Load messages immediately

3. **For Customer Names**:
   - Update the API response to include proper customer names
   - Or update the frontend parsing logic 