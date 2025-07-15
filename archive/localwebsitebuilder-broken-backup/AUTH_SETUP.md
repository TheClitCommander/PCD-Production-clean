# Authentication Setup

## Admin Token Authentication

This application uses a simple token-based authentication system to protect admin routes while keeping public progress pages accessible for embedding.

### Setup Instructions

1. **Set your admin token** (in server/routes.ts line 14):
   ```typescript
   const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "pleasantcove2024admin";
   ```
   
   For production, set the `ADMIN_TOKEN` environment variable to a secure random string.

2. **Login to the admin panel**:
   - Navigate to `/login`
   - Enter your admin token
   - You'll be redirected to the dashboard

3. **Token storage**:
   - The token is stored in localStorage
   - It's automatically included in all API requests
   - To logout, clear localStorage or use the logout function

### Public Routes

These routes remain accessible without authentication:
- `/login` - Login page
- `/progress/public/:clientId` - Public progress galleries for embedding
- `/api/progress/public/:identifier` - API endpoint for public progress data
- `/api/scheduling/*` - Scheduling endpoints for clients
- `/api/new-lead` - Webhook for Squarespace forms

### Protected Routes

All other routes require admin authentication:
- Dashboard (`/`)
- Clients (`/clients`)
- Client profiles (`/clients/:id`)
- Analytics, Templates, etc.
- All admin API endpoints

### Using the Token

You can provide the token in three ways:
1. **Authorization header** (recommended):
   ```
   Authorization: Bearer your-admin-token
   ```

2. **Query parameter**:
   ```
   /api/businesses?token=your-admin-token
   ```

3. **After login** - The token is automatically included in all requests

### Security Notes

- Change the default token immediately in production
- Use a long, random string for the token
- Consider implementing proper authentication (Clerk, Auth0, etc.) for production use
- The token provides full admin access - keep it secure

### Testing

To test if authentication is working:
1. Try accessing `/dashboard` without logging in - you should be redirected to `/login`
2. Login with the admin token
3. You should now have access to all admin pages
4. Public progress pages should still work without authentication 