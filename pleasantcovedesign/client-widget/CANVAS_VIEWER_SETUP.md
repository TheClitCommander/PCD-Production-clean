# 🎨 Canvas Viewer Widget Setup Guide

## Overview

The Canvas Viewer Widget allows your clients to view their project designs in real-time and communicate with you through an integrated chat interface. This guide will help you set up the widget on your Squarespace site.

## Features

- **Real-time Canvas Updates**: Clients see design changes as you make them
- **Integrated Chat**: Two-way messaging directly in the widget
- **Responsive Design**: Works on desktop and mobile devices
- **Secure Access**: Each client has their own unique project token

## Prerequisites

- Pleasant Cove Design backend running
- Squarespace Business Plan or higher (for code injection)
- Project token for the client

## Setup Instructions

### 1. Get Your Project Token

Each project needs a unique token for secure access. You can get this from your admin dashboard:

1. Go to your Pleasant Cove Design admin dashboard
2. Navigate to Projects > [Select Project] > Settings
3. Copy the "Client Access Token" value

If no token exists, you can generate one:

1. Click "Generate New Token"
2. Copy the generated token

### 2. Configure the Embed Code

1. Open `canvas-embed-code.html` in a text editor
2. Replace the placeholder values:
   - `YOUR_PROJECT_TOKEN`: The token you copied in step 1
   - `Client Name`: Your client's name (used in chat)
   - `https://your-server-url.com`: Your backend server URL

Example:
```javascript
const config = {
  projectToken: 'pcd_47_mdnoyuoh_hxgn1o',
  clientName: 'Atlantic Consulting',
  serverUrl: 'https://api.pleasantcovedesign.com',
  containerSelector: '#pcd-canvas-viewer-container'
};
```

### 3. Add to Squarespace

1. In your Squarespace admin, go to Pages
2. Create a new page or edit an existing one
3. Add a "Code" block
4. Paste your configured embed code
5. Save and publish the page

### 4. Set Page Permissions (Optional)

For client-specific access:

1. Go to the page settings
2. Under "Page" tab, find "Permissions"
3. Select "Members Only"
4. Choose specific members who should have access

## Troubleshooting

### Widget Not Loading

- Check that your backend server is running
- Verify the project token is correct
- Check browser console for errors

### Connection Issues

- Ensure your server's CORS settings allow your Squarespace domain
- Check that Socket.io is properly configured on your server

### Chat Not Working

- Verify the project token has messaging permissions
- Check server logs for API errors

## Advanced Configuration

### Custom Styling

You can customize the widget appearance by adding CSS to your Squarespace site:

```css
#pcd-canvas-viewer-container iframe {
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}
```

### Responsive Height

The default height is 800px, but you can adjust this for different screen sizes:

```javascript
const style = document.createElement('style');
style.textContent = `
  @media (max-width: 768px) {
    #pcd-canvas-viewer-container iframe {
      height: 700px;
    }
  }
`;
document.head.appendChild(style);
```

## Security Considerations

- Each project token should be unique and only shared with the intended client
- The widget enforces read-only mode for clients
- All communication is secured through your backend authentication

## Need Help?

If you encounter any issues, please contact support at support@pleasantcovedesign.com