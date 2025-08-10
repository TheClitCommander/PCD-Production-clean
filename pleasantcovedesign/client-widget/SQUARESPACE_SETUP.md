# Canvas Viewer - Squarespace Setup Guide

## Quick Setup

1. **Copy the embed code** from `canvas-embed-member.html`
2. **Replace `YOUR_SERVER_URL`** with your actual server URL (e.g., `https://api.pleasantcovedesign.com`)
3. **Add to Squarespace** in a Code block on a Member-restricted page

## Detailed Instructions

### Step 1: Prepare Your Server

Make sure your Pleasant Cove Design server is properly configured:

1. Ensure your server is running and accessible from the internet
2. Verify CORS settings in `server/routes.ts` allow your Squarespace domain:

```javascript
app.use(cors({
  origin: [
    'https://your-squarespace-site.squarespace.com',
    'https://yourdomain.com' // Your custom domain
  ],
  credentials: true
}));
```

### Step 2: Configure the Embed Code

1. Open `canvas-embed-member.html`
2. Copy the entire contents
3. Replace `YOUR_SERVER_URL` with your actual server URL:

```javascript
const config = {
  serverUrl: 'https://api.pleasantcovedesign.com', // Replace with your actual URL
  containerSelector: '#pcd-canvas-viewer-container',
  height: '800px' // You can adjust this if needed
};
```

### Step 3: Add to Squarespace Member Area

1. In your Squarespace admin, go to **Pages**
2. Create a new page (or edit an existing one) in your Member Area section
3. Add a **Code** block
4. Paste your configured embed code
5. Save and publish the page

### Step 4: Set Page Permissions

1. Go to the page settings
2. Under "Page" tab, find "Permissions"
3. Select "Members Only"
4. (Optional) Choose specific member groups who should have access

## Testing

1. Log in to your Squarespace site as a member
2. Visit the page with the canvas viewer
3. You should see the canvas load and be able to send messages

If you encounter any issues:
- Check browser console for errors
- Verify your server URL is correct and the server is running
- Make sure CORS is properly configured for your domain

## Customization

You can adjust the height of the canvas viewer by changing the `height` value in the config:

```javascript
const config = {
  serverUrl: 'YOUR_SERVER_URL',
  containerSelector: '#pcd-canvas-viewer-container',
  height: '600px' // Change to your preferred height
};
```

## Need Help?

If you encounter any issues, please contact support at support@pleasantcovedesign.com