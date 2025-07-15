-- Pleasant Cove Design Desktop Launcher
-- This AppleScript opens Terminal and starts the development server

on run
	try
		-- Get the path to the project directory
		set projectPath to (path to me as text)
		set projectPath to (projectPath as string)
		
		-- Remove the app name from the path to get the directory
		set AppleScript's text item delimiters to ":"
		set pathItems to text items of projectPath
		set pathItems to items 1 through -2 of pathItems
		set projectDir to (pathItems as string) & ":"
		set AppleScript's text item delimiters to ""
		
		-- Convert to POSIX path
		set posixPath to POSIX path of projectDir
		
		-- Create the terminal command
		set terminalCommand to "cd '" & posixPath & "' && ./launch-pleasantcove.sh"
		
		-- Display a nice notification
		display notification "Starting Pleasant Cove Design..." with title "Launcher"
		
		-- Open Terminal and run the launch script
		tell application "Terminal"
			activate
			do script terminalCommand
		end tell
		
	on error errorMessage
		-- If something goes wrong, show an error dialog
		display dialog "Error launching Pleasant Cove Design: " & errorMessage buttons {"OK"} default button "OK" with icon stop
	end try
end run 