# 🚀 Pleasant Cove Design - 24/7 Startup Guide

## Quick Start (Manual)

### Option 1: Simple Start
```bash
cd /Users/bendickinson/Desktop/pleasantcovedesign
npm run dev
```

### Option 2: Using the Launcher
```bash
cd /Users/bendickinson/Desktop/pleasantcovedesign
./pleasantcove-launcher.sh start
```

## 🎯 Your Services

Once running, you'll have:

- **📱 Admin Dashboard**: `http://localhost:5173`
- **🖥️  Backend API**: `http://localhost:3000` 
- **🔧 Widget Server**: `http://localhost:8080`

## 🔄 24/7 Operation

### For Always-On Operation:

1. **Start with monitoring:**
   ```bash
   ./pleasantcove-launcher.sh monitor
   ```
   
2. **Or set up macOS auto-start:**
   ```bash
   # Copy the plist file to LaunchAgents
   cp pleasant-cove-daemon.plist ~/Library/LaunchAgents/
   
   # Load it to start automatically
   launchctl load ~/Library/LaunchAgents/pleasant-cove-daemon.plist
   ```

### To Stop 24/7 Operation:
```bash
# Stop the monitoring script
./pleasantcove-launcher.sh stop

# Or unload the LaunchAgent
launchctl unload ~/Library/LaunchAgents/pleasant-cove-daemon.plist
```

## 🛠️ Troubleshooting

### If Services Won't Start:
```bash
# Clean restart
./pleasantcove-launcher.sh restart
```

### Check What's Running:
```bash
./pleasantcove-launcher.sh status
```

### Manual Cleanup:
```bash
# Kill all processes
pkill -f "npm run dev"
pkill -f "tsx watch"

# Kill by port
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
lsof -ti:8080 | xargs kill -9
```

## 💡 Pro Tips

1. **Keep Terminal Open**: For development, keep a terminal window open with the services running
2. **Use the Launcher**: The launcher script handles cleanup and monitoring automatically
3. **Check Logs**: If something goes wrong, check `pleasant-cove.log` and `pleasant-cove-error.log`
4. **Browser Bookmark**: Bookmark `http://localhost:5173` for quick access to your admin dashboard

## ✅ Success Check

Your system is working when:
- ✅ `http://localhost:5173` shows your admin dashboard
- ✅ `http://localhost:3000/health` returns server status
- ✅ `http://localhost:8080` serves your widget files
- ✅ All your delete and contact buttons work in the UI

**That's it! Your Pleasant Cove Design system is now running 24/7.** 🎉 