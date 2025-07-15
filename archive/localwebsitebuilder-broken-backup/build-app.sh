#!/bin/bash

echo "🏗️  Building Pleasant Cove Design App Launcher"
echo "============================================"

# Compile the AppleScript into an app
echo "📱 Creating app..."
osacompile -o ~/Desktop/PleasantCoveDesign.app pleasantcovedesign-launcher.applescript

if [ $? -eq 0 ]; then
    echo "✅ App created successfully!"
    echo ""
    echo "📍 Location: ~/Desktop/PleasantCoveDesign.app"
    echo ""
    echo "🎯 Next Steps:"
    echo "1. Double-click 'PleasantCoveDesign' on your Desktop to launch"
    echo "2. To add a custom icon:"
    echo "   - Right-click the app → Get Info"
    echo "   - Drag your logo PNG onto the icon in the top-left"
    echo "3. Drag the app to your Dock for easy access"
    echo ""
    echo "🚀 The app will:"
    echo "   - Open Terminal"
    echo "   - Navigate to your project"
    echo "   - Start the dev server"
    echo "   - Open your browser to the leads dashboard"
    echo "   - Show a notification when ready"
    
    # Open the Desktop folder to show the new app
    open ~/Desktop/
else
    echo "❌ Failed to create app"
    exit 1
fi 