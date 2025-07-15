on run
	try
		set projectPath to "/Users/bendickinson/Desktop/Pleasantcovedesign-main"
		
		display notification "Starting Pleasant Cove Design..." with title "Launcher"
		
		tell application "Terminal"
			activate
			set newTab to do script "cd '" & projectPath & "' && npm run dev"
		end tell
		
		delay 5
		
		do shell script "open http://localhost:5173"
		
	on error errorMessage
		display dialog "Error starting app: " & errorMessage buttons {"OK"} with icon stop
	end try
end run 