# Production-Ready File Sharing System

## Overview

This document outlines the production-ready file sharing implementation for WebsiteWizard's messaging system. The system is designed to work seamlessly across all platforms (Mac, Windows, iOS, Android) with proper error handling and fallbacks.

## Architecture

### Components

1. **Backend File Handler** (`server/file-handler.ts`)
   - Cross-platform file storage using multer
   - Safe filename generation with timestamps
   - Support for all major file types including mobile formats (HEIC/HEIF)
   - Streaming file delivery with proper headers

2. **Mobile-Friendly Upload Component** (`client/src/components/mobile-file-upload.tsx`)
   - Native file picker integration
   - Camera access for mobile devices
   - File size validation
   - Progress indicators

3. **Express Routes** (`server/routes.ts`)
   - `/api/upload` - File upload endpoint
   - `/uploads/:filename` - File serving endpoint
   - Authentication via admin token

4. **Frontend Integration** (`client/src/pages/inbox.tsx`)
   - File attachment parsing with emoji indicators
   - Rich file preview with View/Download buttons
   - Inline image display with fallbacks
   - Cross-platform file handling

## File Upload Flow

1. **Selection**
   - User clicks 📎 for documents or 🖼️ for images
   - Native file picker opens (camera option on mobile)
   - File is validated for size and type

2. **Upload**
   - File sent via FormData to `/api/upload`
   - Server generates safe filename: `upload-{timestamp}-{randomId}.{ext}`
   - File saved to `uploads/` directory
   - Response includes file URL

3. **Message Format**
   - Text + file: `Hello\n\n📎 /uploads/upload-123456-abc.pdf`
   - File only: `🖼️ /uploads/upload-789012-xyz.jpg`

4. **Display**
   - Messages parsed for file attachments
   - Images shown inline with max height
   - Documents show with icon and filename
   - View/Download buttons for all files

## Cross-Platform Compatibility

### Mobile Support
- `capture="environment"` attribute for camera access
- Support for HEIC/HEIF formats (iOS photos)
- Touch-friendly buttons and interactions
- Responsive design for small screens

### Windows Support
- Standard file extensions (.jpg, .png, .pdf, etc.)
- Proper MIME type handling
- No platform-specific code

### File Type Support
```javascript
// Images
'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
'image/heic', 'image/heif' // iOS formats

// Documents  
'application/pdf', 'application/msword',
'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
'text/plain', 'application/zip', 'application/x-rar-compressed'
```

## Security Considerations

1. **File Size Limits**
   - 10MB maximum per file
   - Configurable in `file-handler.ts`

2. **File Type Validation**
   - Whitelist approach for allowed types
   - Both MIME type and extension checking
   - Prevents executable uploads

3. **Filename Sanitization**
   - Timestamps prevent collisions
   - Random IDs for uniqueness
   - Original names preserved in response

4. **Access Control**
   - Upload requires admin authentication
   - Files served publicly (for widget access)
   - Consider adding signed URLs for sensitive files

## Error Handling

1. **Upload Failures**
   - Network errors show toast notification
   - Fallback to mock URLs in development
   - Retry logic on frontend

2. **Missing Files**
   - 404 response with error message
   - Fallback image for broken images
   - Graceful degradation

3. **Invalid Files**
   - Size validation before upload
   - Type validation on selection
   - Clear error messages

## Production Deployment

### Railway Configuration

1. **Environment Variables**
   ```env
   NODE_ENV=production
   UPLOAD_DIR=/app/uploads
   MAX_FILE_SIZE=10485760
   ```

2. **Persistent Storage**
   - Configure volume for uploads directory
   - Or use cloud storage (S3, Cloudinary)

3. **CORS Settings**
   - Already configured for Squarespace
   - Add production domains as needed

### Performance Optimization

1. **File Streaming**
   - Files streamed rather than loaded into memory
   - Efficient for large files

2. **Caching Headers**
   - `Cache-Control: public, max-age=31536000`
   - Reduces bandwidth usage

3. **Cleanup Task**
   - Optional cleanup for files older than 30 days
   - Run as cron job or scheduled task

## Testing Checklist

- [ ] Upload image from Mac (Chrome/Safari)
- [ ] Upload document from Windows (Edge/Chrome)
- [ ] Upload photo from iOS (Safari)
- [ ] Upload file from Android (Chrome)
- [ ] View uploaded images inline
- [ ] Download documents
- [ ] Handle network failures
- [ ] Test file size limits
- [ ] Verify emoji parsing
- [ ] Check cross-domain access

## Future Enhancements

1. **Cloud Storage Integration**
   - Move to S3 or Cloudinary
   - Signed URLs for security
   - CDN for performance

2. **Image Processing**
   - Thumbnail generation
   - Format conversion (HEIC to JPEG)
   - Compression

3. **Advanced Features**
   - Progress bars for large uploads
   - Drag-and-drop support
   - Multiple file selection
   - File previews before sending

## Troubleshooting

### Common Issues

1. **"Cannot find module 'socket.io'"**
   - Run: `npm install socket.io @types/socket.io`

2. **404 errors on file URLs**
   - Check uploads directory exists
   - Verify Express static middleware
   - Ensure files have correct permissions

3. **Mobile upload not working**
   - Check HTTPS (required for camera)
   - Verify CORS headers
   - Test file input attributes

### Debug Commands

```bash
# Check uploads directory
ls -la uploads/

# Test file upload
curl -X POST -H "Authorization: Bearer pleasantcove2024admin" \
  -F "file=@test.txt" http://localhost:5173/api/upload

# View server logs
npm run dev

# Check file permissions
chmod -R 755 uploads/
```

## Integration with Existing Systems

The file sharing system integrates seamlessly with:

1. **Railway Messaging API**
   - Files sent as part of message content
   - Emoji indicators for file types
   - Backward compatible format

2. **Squarespace Widget**
   - Widget can display uploaded files
   - Click to view/download
   - Mobile-optimized interface

3. **WebsiteWizard Inbox**
   - Real-time file sharing
   - Rich preview interface
   - Conversation history with files

This production-ready implementation ensures reliable file sharing across all platforms while maintaining security and performance. 