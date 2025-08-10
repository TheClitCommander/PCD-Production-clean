# Pleasant Cove Design - Client Widget

This directory contains client-facing widgets that can be embedded in Squarespace or other websites.

## Canvas Viewer Widget

The Canvas Viewer Widget allows clients to view their project's canvas and communicate with the design team in real-time.

### Files

- `canvas-viewer.html` - The main widget HTML file
- `canvas-embed-member.html` - The embed code for Squarespace member areas
- `debug-canvas.html` - A debugging tool for the canvas viewer
- `SQUARESPACE_SETUP.md` - Detailed setup instructions

### Features

- **Canvas Viewing**: Clients can view their project's design canvas in real-time
- **Messaging**: Built-in messaging system for client-designer communication
- **Member Authentication**: Automatically detects Squarespace members
- **Project Isolation**: Each client only sees their own project
- **Responsive Design**: Works on desktop and mobile devices

### Integration Options

1. **Member Area Integration** (Recommended)
   - Add the embed code to a Member-Only page in Squarespace
   - The widget automatically detects the logged-in member and shows their project

2. **Direct Link Integration**
   - Use the embed code with a specific project token
   - Share the link directly with clients

3. **Manual Token Configuration**
   - Set a specific project token in the embed code
   - Useful for testing or when automatic detection isn't working

### Testing

Use the `debug-canvas.html` file for local testing:

1. Start the server: `cd server && npm run dev`
2. Open `http://localhost:3000/client-widget/debug-canvas.html`
3. Use the debug panel to check for errors and test functionality

### Troubleshooting

If you encounter issues:

1. Check the browser console for errors
2. Verify the server URL is correct and the server is running
3. Make sure CORS is properly configured for your domain
4. Try adding `?email=test@example.com` to the URL for testing

For detailed setup instructions, see [SQUARESPACE_SETUP.md](./SQUARESPACE_SETUP.md).