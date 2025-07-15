#!/bin/bash

echo "🔧 Fixing WebsiteWizard Setup Issues"
echo "===================================="

# Fix 1: Create .env file with SQLite (no PostgreSQL needed!)
cd WebsiteWizard
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file with SQLite database..."
    cat > .env << 'EOL'
# Python bot configuration
PYTHON_PATH=/usr/bin/python3
BOT_SCRIPT_PATH=../bot_cli.py

# Database configuration - Using SQLite for easy local development
DATABASE_URL=sqlite://websitewizard.db

# Node environment
NODE_ENV=development
EOL
else
    echo "✅ .env file already exists"
fi

# Fix 2: Set up ngrok authentication
echo ""
echo "🌐 Setting up ngrok..."
echo "1. Go to: https://dashboard.ngrok.com/signup"
echo "2. Sign up for a FREE account"
echo "3. Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken"
echo ""
read -p "Paste your ngrok authtoken here: " NGROK_TOKEN

if [ ! -z "$NGROK_TOKEN" ]; then
    ngrok config add-authtoken "$NGROK_TOKEN"
    echo "✅ Ngrok configured!"
else
    echo "⚠️  Skipping ngrok setup - you'll need to set it up later"
fi

# Fix 3: Install SQLite dependencies
echo ""
echo "📦 Installing SQLite dependencies..."
npm install better-sqlite3

# Fix 4: Update drizzle config for SQLite
echo ""
echo "🔧 Updating database configuration..."
cat > drizzle.config.ts << 'EOL'
import type { Config } from "drizzle-kit";

export default {
  schema: "./shared/schema.ts",
  out: "./migrations",
  driver: "better-sqlite3",
  dbCredentials: {
    url: "./websitewizard.db",
  },
} satisfies Config;
EOL

# Fix 5: Run database migrations
echo ""
echo "🗄️  Setting up database..."
npm run db:push

# Done!
echo ""
echo "✅ Setup complete!"
echo ""
echo "Now run: ./start-webhook-server.sh"
echo "Your server should start properly this time!" 