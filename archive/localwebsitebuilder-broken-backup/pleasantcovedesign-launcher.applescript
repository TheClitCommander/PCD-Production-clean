#!/usr/bin/osascript

-- Pleasant Cove Design WebsiteWizard Launcher
-- This script launches the development server for your lead automation system

on run
    -- Get the user's home directory dynamically
    set homeDir to (POSIX path of (path to home folder))
    set projectPath to homeDir & "Desktop/localwebsitebuilder/WebsiteWizard"
    
    -- Check if project directory exists
    try
        do shell script "test -d " & quoted form of projectPath
    on error
        display alert "Project Not Found" message "Could not find WebsiteWizard at: " & projectPath buttons {"OK"} default button "OK"
        return
    end try
    
    -- Open Terminal and run the dev server
    tell application "Terminal"
        -- Create a new window if Terminal is not running, otherwise create a new tab
        if not (exists window 1) then
            do script ""
        else
            tell application "System Events" to keystroke "t" using command down
        end if
        
        -- Run commands in the new terminal window/tab
        set currentTab to do script "echo '🚀 Starting Pleasant Cove Design WebsiteWizard...'" in front window
        
        -- Change to project directory
        do script "cd " & quoted form of projectPath in currentTab
        
        -- Add node/npm to PATH (for homebrew on Apple Silicon)
        do script "export PATH=/opt/homebrew/bin:$PATH" in currentTab
        
        -- Install dependencies if needed (this will be fast if already installed)
        do script "echo '📦 Checking dependencies...'" in currentTab
        do script "npm install --silent 2>/dev/null || echo '⚠️  Dependencies check failed'" in currentTab
        
        -- Start the development server
        do script "echo '🌟 Launching WebsiteWizard...'" in currentTab
        do script "echo ''" in currentTab
        do script "/opt/homebrew/bin/npm run dev" in currentTab
        
        -- Bring Terminal to front
        activate
        
        -- Wait a moment for server to start
        delay 3
        
        -- Open the browser to the leads dashboard
        do shell script "open http://localhost:5173/leads"
        
        -- Show success notification
        display notification "WebsiteWizard is running at http://localhost:5173" with title "Pleasant Cove Design" subtitle "Lead Automation System Started"
    end tell
end run 