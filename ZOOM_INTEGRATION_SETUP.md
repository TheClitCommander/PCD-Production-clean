# 🎥 Zoom Integration Setup Guide

## Overview

This guide will help you set up Zoom integration for Pleasant Cove Design, allowing automatic meeting creation when appointments are booked.

## Prerequisites

- Zoom Pro, Business, or Enterprise account
- Admin access to your Zoom account
- Access to Pleasant Cove Design backend environment variables

## Step 1: Create a Server-to-Server OAuth App

1. **Log in to Zoom App Marketplace**
   - Go to [marketplace.zoom.us](https://marketplace.zoom.us)
   - Sign in with your Zoom admin account

2. **Create New App**
   - Click "Develop" → "Build App"
   - Choose "Server-to-Server OAuth" app type
   - Name your app: "Pleasant Cove Design Integration"

3. **Configure App**
   - Fill in basic information:
     - App Name: Pleasant Cove Design Integration
     - Short Description: Automated meeting creation for appointments
     - Company Name: Pleasant Cove Design

## Step 2: Get OAuth Credentials

1. **App Credentials**
   - After creating the app, go to the "App Credentials" tab
   - You'll need these values:
     - Account ID
     - Client ID  
     - Client Secret

2. **Add Required Scopes**
   - Go to the "Scopes" tab
   - Add these scopes:
     - `meeting:write:admin` - Create meetings
     - `meeting:read:admin` - Read meeting details
     - `user:read:admin` - Read user information

3. **Activate the App**
   - Review all settings
   - Click "Activate" to enable the app

## Step 3: Configure Environment Variables

Add these to your `.env` file or environment configuration:

```bash
# Zoom OAuth Credentials
ZOOM_ACCOUNT_ID=your_account_id_here
ZOOM_CLIENT_ID=your_client_id_here
ZOOM_CLIENT_SECRET=your_client_secret_here
```

## Step 4: Meeting Types Configuration

The system supports these meeting types:

### 📹 Zoom Video Meetings
- Automatically creates Zoom meetings
- Generates unique meeting links
- Sets up password protection
- Enables join before host

### 📞 Phone Meetings
- Stores your business phone number
- Provides dial-in instructions
- No automatic meeting creation needed

### 📱 FaceTime
- Stores FaceTime contact (phone/email)
- Client receives instructions to call
- iOS/macOS only

### 🏢 In-Person
- Stores meeting location/address
- No virtual meeting needed

## Step 5: Test the Integration

1. **Book a Test Appointment**
   - Use your appointment booking widget
   - Select "Zoom" as meeting type
   - Complete the booking

2. **Verify Meeting Creation**
   - Check your Zoom account for the new meeting
   - Verify meeting details match appointment
   - Test the join link

3. **Check Error Handling**
   - The system gracefully handles Zoom API failures
   - Appointments are still created even if Zoom fails
   - Check server logs for any errors

## Meeting Settings

Default Zoom meeting settings:
- **Duration**: 30 minutes
- **Video**: Host and participant video on
- **Audio**: Computer and phone audio
- **Join Before Host**: Enabled
- **Waiting Room**: Disabled
- **Recording**: Disabled by default

## Troubleshooting

### "Zoom integration not configured"
- Ensure all environment variables are set
- Restart your server after adding variables

### "Zoom authentication failed"
- Verify your credentials are correct
- Check that your app is activated
- Ensure scopes are properly configured

### "Failed to create Zoom meeting"
- Check your Zoom account limits
- Verify you have available licenses
- Check server logs for specific errors

## Client Experience

When a client books with Zoom:
1. They receive confirmation email with meeting link
2. Meeting details are stored in the system
3. Admin can view meeting info in appointment details
4. Client can join directly from email link

## Security Considerations

- Store Zoom credentials securely
- Use environment variables, never commit credentials
- Regularly rotate Client Secret
- Monitor Zoom app usage in marketplace

## Additional Features (Future)

Consider implementing:
- Recurring meetings for regular clients
- Webinar integration for group sessions
- Recording management
- Calendar integration (Google/Outlook)

## Support

For Zoom API issues:
- [Zoom Developer Forum](https://devforum.zoom.us)
- [API Documentation](https://marketplace.zoom.us/docs/api-reference)

For Pleasant Cove Design issues:
- Check server logs: `npm run dev`
- Review error messages in browser console
- Contact support with error details 