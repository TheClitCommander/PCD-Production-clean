# Pleasant Cove Design - Messaging System

A real-time messaging system built for Squarespace sites, providing Facebook Messenger-style communication between business owners and their clients, with persistent storage and file sharing.

## 🏗 Project Structure

```
/pleasantcovedesign/
├── server/              # Node.js + Express + Socket.IO backend
│   ├── routes/          # API endpoints
│   ├── storage/         # Database and file storage
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   └── schema/          # Database schema
├── admin-ui/            # React admin dashboard
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable UI components
│   │   ├── lib/         # Utility libraries
│   │   └── hooks/       # React hooks
├── client-widget/       # Squarespace widgets
│   └── messaging-widget.html  # Self-contained messaging widget
├── shared/              # Shared types and utilities
└── infra/               # Deployment configuration
```

## ✨ Features

- **Real-time Messaging** - Socket.IO enables instant message delivery
- **File Sharing** - Support for images and documents
- **Squarespace Integration** - Automatic member detection and token-based auth
- **Persistent Storage** - Messages saved to database
- **Admin Management** - Comprehensive UI for business owners
- **Multi-tenant** - Supports multiple companies and projects
- **Responsive** - Works on desktop and mobile devices

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- A Squarespace site (for widget integration)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/pleasantcovedesign.git
cd pleasantcovedesign
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp infra/.env.example .env
# Edit .env with your configuration
```

### Development

Run the full development environment:

```bash
npm run dev
```

Or run individual components:

```bash
# Server only
npm run dev:server

# Admin UI only
npm run dev:admin
```

## 📦 Deployment

### Production Setup

1. Build the project:

```bash
npm run build
```

2. Configure production environment:

```bash
# Set production environment variables for Railway
export NODE_ENV=production
export DATABASE_URL=your_postgres_connection_string
export R2_ENDPOINT=your_r2_endpoint
# Additional R2 configuration...
```

3. Deploy to Railway:

```bash
# If using Railway CLI
railway up
```

### Widget Integration

1. Copy the contents of `client-widget/messaging-widget.html`
2. Paste into a Squarespace Code Block
3. Update the `backendUrl` variable if needed

See [Client Widget Integration Guide](client-widget/INTEGRATION_GUIDE.md) for detailed instructions.

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment (`development` or `production`) | `development` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `R2_ENDPOINT` | Cloudflare R2 endpoint | - |
| `R2_ACCESS_KEY_ID` | R2 access key | - |
| `R2_SECRET_ACCESS_KEY` | R2 secret key | - |
| `R2_BUCKET` | R2 bucket name | - |

## 📝 License

All rights reserved. This code is proprietary and confidential.

## 👥 Contact

- **Ben Dickinson** - [pleasantcovedesign.com](https://www.pleasantcovedesign.com) 