# Deployment Guide for LocalBiz Pro

## Frontend Deployment Options

### Option 1: Netlify (Recommended for Simplicity)

1. **Build the frontend**:
   ```bash
   cd /Users/bendickinson/Desktop/pleasantcovedesign/WebsiteWizard
   npm run build
   ```

2. **Deploy to Netlify**:
   - Install Netlify CLI: `npm install -g netlify-cli`
   - Deploy: `netlify deploy --dir=dist`
   - For production: `netlify deploy --prod --dir=dist`

3. **Your URLs will be**:
   - Base: `https://your-app-name.netlify.app`
   - Progress: `https://your-app-name.netlify.app/progress/public/1`

### Option 2: Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   cd /Users/bendickinson/Desktop/pleasantcovedesign/WebsiteWizard
   vercel
   ```

3. **Your URLs will be**:
   - Base: `https://your-app-name.vercel.app`
   - Progress: `https://your-app-name.vercel.app/progress/public/1`

### Option 3: Custom Domain (After Initial Deploy)

1. Deploy to Netlify/Vercel first
2. Add custom domain in their dashboard
3. Update DNS records
4. Your final URLs:
   - Base: `https://app.pleasantcovedesign.com`
   - Progress: `https://app.pleasantcovedesign.com/progress/public/1`

## Environment Variables

Create a `.env.production` file:
```env
VITE_API_URL=https://your-backend-url.com
```

## Backend Deployment

The backend also needs to be deployed. Options:
- Railway.app
- Render.com
- Fly.io
- Digital Ocean App Platform

## Testing Before Deploy

1. **Build locally**:
   ```bash
   npm run build
   npm run preview
   ```

2. **Test the progress page**:
   - Visit: `http://localhost:4173/progress/public/1`

## Post-Deployment Checklist

- [ ] Frontend deployed and accessible
- [ ] Backend deployed with database
- [ ] Environment variables configured
- [ ] CORS settings updated for production
- [ ] Custom domain configured (optional)
- [ ] Test all public progress URLs 