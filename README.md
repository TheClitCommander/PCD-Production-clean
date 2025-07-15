# Pleasant Cove Design - Complete Project

## 🚀 Overview

Pleasant Cove Design is a comprehensive business automation platform for selling websites to small businesses. The system includes:

- **Admin Dashboard**: React-based UI for managing leads, clients, and projects
- **Client Messaging Widget**: Real-time chat widget for Squarespace integration
- **Python Automation**: Bot CLI for automating outreach and lead generation
- **Portal System**: Client-facing portal for website management
- **Template Builder**: Automated website generation system

## 📁 Project Structure

```
pleasantcovedesign/
├── pleasantcovedesign/          # Main application (currently active)
│   ├── admin-ui/                # React admin dashboard
│   ├── client-widget/           # Squarespace messaging widgets
│   ├── server/                  # Node.js backend with WebSocket support
│   └── shared/                  # Shared TypeScript schemas
│
├── archive/                     # Previous versions and backups
│   ├── Pleasantcovedesign-1.1/  # Version 1.1 with launcher
│   ├── Pleasantcovedesign-main/ # Production-ready version
│   ├── WebsiteWizard/           # Enhanced version with file sharing
│   └── localwebsitebuilder-broken-backup/
│
├── Python Automation/
│   ├── bot_cli.py              # Main CLI interface
│   ├── outreach/               # SMS automation
│   ├── scrapers/               # Lead generation scrapers
│   ├── fulfillment/            # Website builder
│   └── communication/          # Messaging templates
│
├── portal/                     # Flask-based client portal
│   ├── app.py                 # Main Flask application
│   ├── templates/             # HTML templates
│   └── static/                # CSS/JS assets
│
└── templates/                 # Website templates
    └── basic_service_template/
```

## 🔧 How It All Works Together

### 1. **Lead Generation Flow**
```
Google Maps Scraper → CSV Data → Bot CLI → SMS Outreach → Squarespace Form
```

### 2. **Client Onboarding**
```
Squarespace Webhook → Backend API → Admin Dashboard → Project Creation
```

### 3. **Communication System**
```
Client Widget ↔ WebSocket Server ↔ Admin Inbox
```

### 4. **Website Fulfillment**
```
Admin Dashboard → Template Selection → Website Builder → Client Portal
```

## 🚀 Quick Start

### Running the Main Application

```bash
cd pleasantcovedesign
npm install
npm start
```

This starts:
- Admin UI: http://localhost:5173
- Backend API: http://localhost:3000
- WebSocket Server: ws://localhost:3000

### Running the Python Automation

```bash
python bot_cli.py
```

Available commands:
- `scrape` - Scrape leads from Google Maps
- `import` - Import CSV data
- `outreach` - Send SMS campaigns
- `status` - View campaign status
- `export` - Export data

### Running the Client Portal

```bash
cd portal
python app.py
```

Portal runs on: http://localhost:5000

## 🔌 Key Integrations

### Squarespace Integration
1. Add messaging widget to Code Injection
2. Configure webhook URL: `https://your-domain.com/api/new-lead`
3. Widget automatically detects logged-in members

### SMS Integration (Twilio)
```python
# Configure in .env
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```

### File Storage (Cloudflare R2)
```bash
# Configure in .env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_key_id
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=your_bucket
```

## 📊 Database Schema

The system uses SQLite for development and PostgreSQL for production:

- **Companies**: Business leads and clients
- **Projects**: Active website projects
- **Messages**: Chat conversations
- **Appointments**: Scheduling data
- **Progress**: Project milestones

## 🛠️ Development Workflow

1. **Scrape Leads**: Use bot CLI to find potential clients
2. **Send Outreach**: Automated SMS campaigns
3. **Handle Responses**: Webhook captures form submissions
4. **Manage in Dashboard**: View leads, convert to projects
5. **Communicate**: Real-time chat with clients
6. **Build Website**: Use templates or custom designs
7. **Deploy**: Client portal for ongoing management

## 🔒 Security Features

- Token-based authentication for admin access
- Member ID verification for client widgets
- Encrypted file storage
- Rate limiting on API endpoints
- CORS protection

## 📱 Mobile Support

- Responsive admin dashboard
- Mobile-optimized client widget
- Touch-friendly file uploads
- PWA capabilities

## 🚨 Important Files

### Critical Widget Code
- `/pleasantcovedesign/client-widget/messaging-widget-unified.html` - Main working widget
- `/pleasantcovedesign/GOLDEN_BACKUP_DO_NOT_TOUCH/` - Backup of working state

### Configuration
- `/pleasantcovedesign/.env.example` - Environment variables template
- `/pleasantcovedesign/server/index.ts` - Main server configuration

### Documentation
- `/pleasantcovedesign/WIDGET_TEST_CHECKLIST.md` - Testing procedures
- `/pleasantcovedesign/DEVELOPMENT_GUIDELINES.md` - Code standards

## 🔄 Deployment

### Railway Deployment
```bash
# Configure in railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start"
  }
}
```

### Vercel Deployment
```bash
# Frontend only
cd pleasantcovedesign/admin-ui
vercel
```

## 📈 Future Enhancements

- [ ] AI-powered website generation
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] White-label capabilities
- [ ] API for third-party integrations

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly using checklist
4. Submit pull request

## 📞 Support

For issues or questions:
- Check `/pleasantcovedesign/FIXES_NEEDED.md`
- Review test checklists
- Contact development team

---

**Version**: 2.0  
**Last Updated**: January 2025  
**Status**: Production Ready ✅
