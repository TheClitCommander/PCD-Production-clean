# Visual Progress Tracker

## Overview
The Visual Progress Tracker is a gallery-style component that allows you to showcase project progress with images for each client. It's designed to be both internal (within the LocalBiz Pro app) and embeddable in external sites like Squarespace.

## Features

### 1. Image Gallery
- **Grid Layout**: 2 columns on desktop, 1 column on mobile
- **Image Cards**: Each card shows:
  - Progress image
  - Stage name overlaid on image
  - Date
  - Optional notes (with indicator icon)
- **Lightbox**: Click any image to view full-size with details

### 2. Client Profile Integration
- Located in the **Progress** tab of each client profile
- Replaces the previous checkbox-based milestone tracker
- Shows visual timeline of project development

### 3. Public Embed View
- Accessible at `/progress/public/:clientId`
- No authentication required
- Clean, minimal design suitable for embedding
- Can be embedded in Squarespace via iframe:
  ```html
  <iframe 
    src="https://yourdomain.com/progress/public/1" 
    width="100%" 
    height="800" 
    frameborder="0">
  </iframe>
  ```

## File Structure

```
client/src/
├── components/
│   └── ProgressGallery.tsx      # Main gallery component
├── lib/
│   └── mockProgress.ts          # Mock data for development
└── pages/
    ├── client-profile.tsx       # Updated with gallery
    └── progress-public.tsx      # Public embeddable view
```

## Usage

### Adding Progress Entries (Mock Data)
Edit `client/src/lib/mockProgress.ts`:

```typescript
export const mockProgress: Record<number, ProgressEntry[]> = {
  1: [ // Client ID
    {
      stage: "Design Phase",
      imageUrl: "https://example.com/image.jpg",
      date: "2025-06-01",
      notes: "Initial concepts approved"
    }
  ]
};
```

### Component Props
```typescript
<ProgressGallery 
  entries={progressEntries}      // Array of ProgressEntry
  clientName={client.name}       // Optional client name
/>
```

## Security Considerations

1. **Public Route**: The `/progress/public/:clientId` route is accessible without authentication
2. **No PII**: Public view should not expose sensitive client information
3. **Future Enhancement**: Add secure hash or opt-in toggle for public sharing

## Future Enhancements

### Backend Integration
1. Create `progress_entries` table in database:
   ```sql
   CREATE TABLE progress_entries (
     id INTEGER PRIMARY KEY,
     business_id INTEGER REFERENCES businesses(id),
     stage TEXT NOT NULL,
     image_url TEXT NOT NULL,
     date TEXT NOT NULL,
     notes TEXT,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. Add API endpoints:
   - `GET /api/businesses/:id/progress` - Get progress entries
   - `POST /api/businesses/:id/progress` - Add new entry
   - `DELETE /api/progress/:id` - Remove entry

### Image Upload
1. Integrate with cloud storage (S3, Cloudinary, etc.)
2. Add drag-and-drop upload in the UI
3. Image optimization and thumbnails

### Permissions
1. Add public sharing toggle per client
2. Generate secure sharing links
3. Set expiration dates for public access

## Customization

### Styling
The component uses Tailwind CSS classes. Key classes:
- Grid: `grid grid-cols-1 md:grid-cols-2 gap-4`
- Cards: `overflow-hidden cursor-pointer hover:shadow-lg`
- Images: `w-full h-48 object-cover`

### Placeholder Images
Currently using Unsplash for demo images. Replace with actual project images in production.

## Testing

1. Navigate to any client profile: `/clients/1`
2. Click on the "Progress" tab
3. View the image gallery
4. Click "Public View" to see the embeddable version
5. Click any image to open the lightbox view

## Example Embed Code for Squarespace

```html
<!-- Add to Code Block in Squarespace -->
<div style="width: 100%; max-width: 1200px; margin: 0 auto;">
  <iframe 
    src="https://app.localbizbro.com/progress/public/1" 
    width="100%" 
    height="600" 
    style="border: none; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
    title="Project Progress">
  </iframe>
</div>
```

This will embed the progress gallery in your Squarespace site with a subtle shadow and rounded corners. 