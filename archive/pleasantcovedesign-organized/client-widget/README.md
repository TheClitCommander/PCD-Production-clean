# Pleasant Cove Design - Messaging Widget

This folder contains the Squarespace messaging widget for Pleasant Cove Design. The widget provides real-time, Facebook Messenger-style communication between business owners and their clients/members.

## Quick Start

1. Copy the contents of `messaging-widget.html`
2. Paste into a Squarespace Code Block in a Member Area page
3. Save and publish your Squarespace site

## Features

- **Real-time messaging** - Socket.IO-powered instant message delivery
- **File sharing** - Support for images and documents
- **Member detection** - Automatic Squarespace member authentication
- **Persistent storage** - Messages saved to database
- **Cross-platform** - Works on desktop, tablet, and mobile

## Testing

### Local Testing

1. Start the backend server:
   ```bash
   cd ../server
   npm run dev
   ```

2. Open the widget in a browser:
   ```bash
   cd client-widget
   npx serve -p 8080
   ```

3. Navigate to `http://localhost:8080/messaging-widget.html`

### Testing with Squarespace

1. Ensure the backend is running and accessible (either local with ngrok or production)
2. Add the widget to a Squarespace page using a Code Block
3. Log in as a member to test the authentication flow
4. Send messages and files to test the functionality

## Backend URL Detection

The widget automatically detects which backend to use based on the environment:

- **Development**: Uses `http://localhost:3000` when accessed from localhost
- **Production**: Uses `https://pleasantcovedesign-production.up.railway.app` when accessed from Squarespace
- **Custom**: You can override the backend URL by setting the `data-backend-url` attribute on the widget element

### Using Custom ngrok URLs

For testing with Squarespace but a local backend, you can use ngrok:

1. Start ngrok pointing to your local server:
   ```bash
   ngrok http 3000
   ```

2. Set the ngrok URL in your browser console:
   ```javascript
   updateNgrokUrl('https://your-ngrok-url.ngrok-free.app');
   ```

3. Reload the page to use the new URL

## Troubleshooting

### Common Issues

1. **Socket Connection Failures**:
   - Check CORS settings on the server
   - Ensure the backend is running
   - Verify the backend URL is correct

2. **Authentication Issues**:
   - Ensure you're logged in as a Squarespace member
   - Check the browser console for detection method results

3. **File Upload Problems**:
   - Verify the R2 storage is configured correctly
   - Check file size limits (10MB maximum)

### Debug Mode

The widget includes debug mode by default. Check the browser console for detailed logging of:
- Member detection attempts
- Socket connection status
- Message flow
- Backend URL detection 