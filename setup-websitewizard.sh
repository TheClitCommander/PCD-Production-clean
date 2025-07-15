#!/bin/bash

echo "🚀 Setting up WebsiteWizard with Bot Integration"
echo "================================================"

# Check if we're in the right directory
if [ ! -d "WebsiteWizard" ]; then
    echo "❌ WebsiteWizard directory not found!"
    echo "Please run this script from the localwebsitebuilder directory"
    exit 1
fi

cd WebsiteWizard

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOL
# Python bot configuration
PYTHON_PATH=$(which python3)
BOT_SCRIPT_PATH=../bot_cli.py

# Database configuration (update with your PostgreSQL credentials)
DATABASE_URL=postgresql://postgres:password@localhost:5432/websitewizard

# Optional: Google Sheets API credentials
# GOOGLE_SHEETS_API_KEY=your-api-key-here

# Node environment
NODE_ENV=development
EOL
    echo "✅ .env file created - please update with your database credentials"
else
    echo "ℹ️  .env file already exists"
fi

# Install Node dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Create database if using local PostgreSQL
echo "🗄️  Setting up database..."
echo "Make sure PostgreSQL is running and update DATABASE_URL in .env"
echo "Then run: npm run db:push"

# Create Python bot CLI wrapper
echo "🐍 Creating Python bot CLI wrapper..."
cat > ../bot_cli.py << 'EOL'
#!/usr/bin/env python3
"""
CLI wrapper for WebsiteWizard bot integration
This wraps your existing main.py to provide the expected CLI interface
"""

import sys
import json
import argparse
from main import LocalWebsiteAutomation

def enrich_lead(args):
    """Enrich a single lead with additional data"""
    bot = LocalWebsiteAutomation()
    
    # Mock enrichment data - replace with actual bot logic
    enrichment_data = {
        "address": "123 Main St",
        "city": "Portland", 
        "state": "ME",
        "website": f"https://{args.name.lower().replace(' ', '')}.com",
        "businessType": "general",
        "reviews": {
            "count": 25,
            "rating": 4.2
        },
        "socialMedia": {
            "facebook": f"https://facebook.com/{args.name.lower().replace(' ', '')}"
        }
    }
    
    print(json.dumps(enrichment_data))

def launch_outreach(args):
    """Launch outreach campaign for multiple leads"""
    bot = LocalWebsiteAutomation()
    leads = json.loads(args.leads)
    
    # Process each lead - replace with actual bot logic
    for lead in leads:
        # bot.send_outreach(lead)
        pass
    
    print(json.dumps({"success": True, "processed": len(leads)}))

def import_sheets(args):
    """Import leads from Google Sheets"""
    bot = LocalWebsiteAutomation()
    
    # Mock data - replace with actual Google Sheets integration
    leads = [
        {
            "name": "Sample Business 1",
            "email": "contact@sample1.com",
            "phone": "207-555-0001",
            "address": "123 Main St",
            "city": "Portland",
            "state": "ME"
        },
        {
            "name": "Sample Business 2",
            "email": "info@sample2.com", 
            "phone": "207-555-0002",
            "address": "456 Oak Ave",
            "city": "Brunswick",
            "state": "ME"
        }
    ]
    
    print(json.dumps(leads))

def main():
    parser = argparse.ArgumentParser(description='WebsiteWizard Bot CLI')
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Enrich command
    enrich_parser = subparsers.add_parser('enrich', help='Enrich a lead')
    enrich_parser.add_argument('--name', required=True, help='Business name')
    enrich_parser.add_argument('--phone', required=True, help='Phone number')
    enrich_parser.add_argument('--email', default='', help='Email address')
    
    # Outreach command
    outreach_parser = subparsers.add_parser('outreach', help='Launch outreach')
    outreach_parser.add_argument('--leads', required=True, help='JSON array of leads')
    
    # Import command
    import_parser = subparsers.add_parser('import-sheets', help='Import from Google Sheets')
    import_parser.add_argument('--sheet-id', required=True, help='Google Sheet ID')
    
    args = parser.parse_args()
    
    if args.command == 'enrich':
        enrich_lead(args)
    elif args.command == 'outreach':
        launch_outreach(args)
    elif args.command == 'import-sheets':
        import_sheets(args)
    else:
        parser.print_help()

if __name__ == '__main__':
    main()
EOL

chmod +x ../bot_cli.py

# Update .env to use the CLI wrapper
sed -i '' 's|BOT_SCRIPT_PATH=../main.py|BOT_SCRIPT_PATH=../bot_cli.py|' .env 2>/dev/null || \
sed -i 's|BOT_SCRIPT_PATH=../main.py|BOT_SCRIPT_PATH=../bot_cli.py|' .env

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update the DATABASE_URL in WebsiteWizard/.env with your PostgreSQL credentials"
echo "2. Run 'cd WebsiteWizard && npm run db:push' to create database tables"
echo "3. Update bot_cli.py to integrate with your actual bot logic"
echo "4. Run 'cd WebsiteWizard && npm run dev' to start the development server"
echo "5. Access the UI at http://localhost:5173"
echo ""
echo "📚 See WebsiteWizard/BOT_INTEGRATION.md for detailed documentation" 