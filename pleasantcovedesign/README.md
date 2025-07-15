# Pleasant Cove Design - Business Management System

A comprehensive business management system with real-time messaging, appointment scheduling, and client management.

## 🚀 Current Status

The messaging widget is **FULLY FUNCTIONAL** with:
- ✅ Private member conversations
- ✅ File uploads (photos, documents)
- ✅ Real-time messaging
- ✅ Offline message delivery
- ✅ Session management

## 🛠️ Tech Stack

- **Frontend**: React (Vite), TypeScript
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite (development), PostgreSQL ready
- **Real-time**: Socket.IO
- **File Storage**: Local (dev), Cloudflare R2 (production ready)

## 📁 Project Structure

```
pleasantcovedesign/
├── admin-ui/          # React admin dashboard
├── client-widget/     # Embeddable messaging widget
├── server/            # Express backend
├── shared/            # Shared types and schemas
└── GOLDEN_BACKUP_DO_NOT_TOUCH/  # Working widget backup
```

## 🚦 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   ./PleasantCove-1.1-Launcher.command
   ```
   Or manually:
   ```bash
   cd pleasantcovedesign
   npm run dev
   ```

3. **Access**:
   - Admin UI: http://localhost:5173
   - API: http://localhost:3000
   - Client Portal: http://localhost:5173/clientportal

## 🧪 Testing

See `WIDGET_TEST_CHECKLIST.md` for comprehensive testing procedures.

## ⚠️ Important Files

- `DEVELOPMENT_GUIDELINES.md` - Must read before making changes
- `EMERGENCY_RESTORE_WIDGET.sh` - Restore working widget if broken
- `CROSS_PLATFORM_TESTING.md` - Platform compatibility guide

## 🤝 Contributing

1. Read `DEVELOPMENT_GUIDELINES.md`
2. Test thoroughly using `WIDGET_TEST_CHECKLIST.md`
3. Don't modify protected areas (see guidelines)

## 📱 Cross-Platform Status

- ✅ Mac (Safari, Chrome, Firefox) - Fully tested
- ❓ Windows - Needs testing
- ❓ iOS - Needs testing
- ❓ Android - Needs testing

## 🔒 Security Notes

- Database files are gitignored
- Environment variables not included
- Use `.env.example` as template

## 📞 Help Needed

1. Cross-platform testing (Windows, mobile)
2. HEIC/HEIF image support for iOS
3. Production deployment setup
4. Database migration to PostgreSQL

## License

Private project - contact owner for licensing information. 