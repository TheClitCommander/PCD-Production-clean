# Member Canvas Viewer Setup Guide

## Overview

The Member Canvas Viewer allows your clients to view their project designs in real-time and communicate with you through an integrated chat interface. This widget is specifically designed for Squarespace member areas, ensuring each client only sees their own project.

## Features

- **Member Authentication**: Automatically detects logged-in Squarespace members
- **Project-Specific Access**: Each member only sees their own project
- **Real-time Canvas Updates**: Clients see design changes as you make them
- **Integrated Messaging**: Two-way communication directly in the widget
- **Responsive Design**: Works on desktop and mobile devices

## Setup Instructions

### 1. Server Configuration

Make sure your Pleasant Cove Design server is properly configured:

1. Ensure your server is running and accessible from the internet
2. Verify CORS settings allow your Squarespace domain:

```javascript
// In server/routes.ts
app.use(cors({
  origin: [
    'https://your-squarespace-site.squarespace.com',
    'https://yourdomain.com' // Your custom domain
  ],
  credentials: true
}));
```

### 2. Configure the Embed Code

1. Open `canvas-embed-member.html` in a text editor
2. Replace the placeholder server URL with your actual server URL:

```javascript
const config = {
  serverUrl: 'https://your-actual-server.com', // Replace with your server URL
  containerSelector: '#pcd-canvas-viewer-container'
};
```

### 3. Add to Squarespace Member Area

1. In your Squarespace admin, go to Pages
2. Create a new page (or edit an existing one) in your Member Area section
3. Add a "Code" block
4. Paste your configured embed code
5. Save and publish the page

### 4. Set Page Permissions

1. Go to the page settings
2. Under "Page" tab, find "Permissions"
3. Select "Members Only"
4. (Optional) Choose specific member groups who should have access

## How It Works

1. When a member visits the page, the widget detects their Squarespace member account
2. The widget authenticates with your server using the member's email address
3. Your server creates or retrieves a project specific to that member
4. The widget loads the canvas data and establishes a real-time connection
5. The member can view the canvas and send messages

## Troubleshooting

### Widget Not Loading

- Check that your server is running and accessible
- Verify your Squarespace domain is allowed in CORS settings
- Check browser console for errors

### Authentication Issues

- Make sure the member is properly logged in to Squarespace
- Check server logs for authentication errors
- Verify the `/api/token` endpoint is working correctly

### Canvas Not Showing

- Check if the project has any canvas data
- Verify the socket connection is established
- Check server logs for canvas data loading errors

## Need Help?

If you encounter any issues, please contact support at support@pleasantcovedesign.com