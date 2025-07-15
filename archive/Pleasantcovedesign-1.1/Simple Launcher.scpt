-- Simple Pleasant Cove Design Launcher
-- This script directly starts the server without external dependencies

on run
	try
		-- Get the project directory (parent of the app)
		set appPath to path to me
		tell application "System Events"
			set appFolder to container of appPath
			set projectPath to POSIX path of appFolder
		end tell
		
		-- Create the terminal commands
		set cdCommand to "cd '" & projectPath & "'"
		set startCommand to "npm run dev"
		set openCommand to "sleep 3 && open http://localhost:5173"
		set fullCommand to cdCommand & " && " & startCommand & " & " & openCommand
		
		-- Display notification
		display notification "Starting Pleasant Cove Design..." with title "Launcher"
		
		-- Open Terminal and run commands
		tell application "Terminal"
			activate
			do script fullCommand
		end tell
		
	on error errorMessage
		display dialog "Error: " & errorMessage buttons {"OK"} with icon stop
	end try
end run 