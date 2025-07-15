# Pleasant Cove Design - Desktop Launcher

This project now includes a convenient desktop launcher for Mac that will start your development server and open the application in your browser with a single click.

## Files Created

1. **`🚀 Launch Pleasant Cove Design.command`** - Double-clickable launcher (EASIEST!)
2. **`launch-pleasantcove.sh`** - Shell script that starts the development server
3. **`Pleasant Cove Design Launcher.scpt`** - AppleScript for creating a Mac application

## Quick Start Options

### Option 1: Double-Click Launcher (EASIEST!)

Simply **double-click** on `🚀 Launch Pleasant Cove Design.command` in Finder!

That's it! The file will:
- ✅ Check that everything is set up correctly
- 📦 Install dependencies if needed
- 🚀 Start the development server
- 🌐 Open your browser to `http://localhost:5173`
- 💡 Show helpful status messages

### Option 2: Use the Shell Script

1. Double-click on `launch-pleasantcove.sh` in Finder
2. If prompted, choose "Run in Terminal"
3. The script will start the server and open your browser

### Option 3: Create a Desktop Application

1. Open **Script Editor** (found in Applications → Utilities)
2. Open the file `Pleasant Cove Design Launcher.scpt`
3. Go to **File → Export...**
4. Set the following options:
   - **File Format**: Application
   - **Name**: Pleasant Cove Design
   - **Where**: Desktop (or wherever you want the launcher)
   - Check **"Run-only"** (optional, makes it faster)
5. Click **Save**

Now you'll have a `Pleasant Cove Design.app` on your desktop!

## How It Works

When you run any launcher:

1. 🚀 **Starts the development server** using `npm run dev`
2. ⏳ **Waits for the server** to be ready (3-4 seconds)
3. 🌐 **Opens your browser** to `http://localhost:5173`
4. ✅ **Shows status messages** so you know what's happening

## Customization

### Change the Port
If you need to use a different port, edit the `URL` variable in the launcher files:
```bash
URL="http://localhost:YOUR_PORT_HERE"
```

### Add Environment Variables
You can add environment variables to any launcher before the `npm run dev` command:
```bash
export MY_VAR="value"
npm run dev &
```

## Troubleshooting

### "Permission Denied" Error
If you get a permission denied error, run this in Terminal from your project directory:
```bash
chmod +x "🚀 Launch Pleasant Cove Design.command"
chmod +x launch-pleasantcove.sh
```

### Security Warning on First Run
macOS might show a security warning the first time you run the .command file:
1. Right-click the file and select "Open"
2. Click "Open" in the security dialog
3. Future runs will work normally

### Port Already in Use
If port 5173 is already in use, the server will automatically try other ports. Check the terminal output for the actual port being used.

### Dependencies Not Installed
The launcher will automatically run `npm install` if the `node_modules` folder doesn't exist.

## Stopping the Server

- **From Terminal**: Press `Ctrl+C`
- **Kill Process**: Use the PID shown in the terminal output: `kill [PID]`
- **Force Stop**: `pkill -f "npm run dev"` or `pkill -f "tsx server"`
- **Close Terminal**: Simply close the terminal window

## Advanced Usage

### Running in Background
To run the server in the background without keeping Terminal open, modify any launcher script and remove the `wait` command at the end.

### Auto-Start on Login
To automatically start the application when you log in:
1. Go to **System Preferences → Users & Groups → Login Items**
2. Click the **+** button
3. Select your `Pleasant Cove Design.app` (if using Option 3)

### Moving the Launcher
You can move the `🚀 Launch Pleasant Cove Design.command` file to:
- Your Desktop for easy access
- Your Applications folder
- Your Dock (drag and drop)
- Anywhere you like - it will always find the project directory

## Pro Tips

🔥 **Fastest Setup**: Just double-click `🚀 Launch Pleasant Cove Design.command` - it's ready to go!

📌 **Pin to Dock**: Drag the .command file to your Dock for one-click access

🖥️ **Desktop Shortcut**: Copy the .command file to your Desktop

⚡ **Keyboard Shortcut**: You can assign a keyboard shortcut to the .app version in System Preferences

Enjoy your new desktop launcher! 🚀 