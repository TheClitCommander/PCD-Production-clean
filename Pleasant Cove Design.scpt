-- Pleasant Cove Design Launcher
-- Automatically launches the Pleasantcovedesign-1.1 version

on run
	tell application "Terminal"
		-- Open a new terminal window
		do script ""
		
		-- Change to the correct directory
		do script "cd /Users/bendickinson/Desktop/Pleasantcovedesign-1.1" in front window
		
		-- Kill any conflicting processes
		do script "lsof -ti:3000 | xargs kill -9 2>/dev/null || true" in front window
		do script "lsof -ti:5173 | xargs kill -9 2>/dev/null || true" in front window
		do script "sleep 1" in front window
		
		-- Run the application
		do script "npm run dev" in front window
		
		-- Open browser after a short delay
		delay 10
		do shell script "open http://localhost:5173/inbox"
	end tell
	
	display notification "Pleasant Cove Design v1.1 is starting..." with title "Pleasant Cove Design" subtitle "Opening http://localhost:5173/inbox"
end run 