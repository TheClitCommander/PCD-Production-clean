#!/bin/bash

# EMERGENCY WIDGET RESTORE SCRIPT
# Use this if the messaging widget breaks

echo "🚨 EMERGENCY WIDGET RESTORE 🚨"
echo "==============================="
echo ""

# Check if we're in the right directory
if [ ! -d "GOLDEN_BACKUP_DO_NOT_TOUCH" ]; then
    echo "❌ ERROR: Must run from pleasantcovedesign directory"
    exit 1
fi

# Find the latest backup
LATEST_BACKUP=$(ls -t GOLDEN_BACKUP_DO_NOT_TOUCH/WORKING_WIDGET_*.html 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ ERROR: No backup found in GOLDEN_BACKUP_DO_NOT_TOUCH"
    exit 1
fi

echo "Found backup: $LATEST_BACKUP"
echo ""

# Create a backup of current (broken) version
echo "📦 Backing up current (possibly broken) widget..."
mkdir -p broken_backups
cp client-widget/messaging-widget-unified.html "broken_backups/broken_$(date +%Y%m%d_%H%M%S).html"

# Restore the working version
echo "✅ Restoring working widget..."
cp "$LATEST_BACKUP" client-widget/messaging-widget-unified.html

echo ""
echo "🎉 WIDGET RESTORED!"
echo ""
echo "Next steps:"
echo "1. Restart your dev server (Ctrl+C and run launcher again)"
echo "2. Test the widget to confirm it's working"
echo "3. DO NOT make any changes until you understand what broke it"
echo ""
echo "The broken version was saved to: broken_backups/"

# Make this script executable
chmod +x "$0" 