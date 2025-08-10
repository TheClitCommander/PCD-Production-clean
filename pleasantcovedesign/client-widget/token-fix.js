/**
 * Pleasant Cove Design - Project Token Fix
 * 
 * This script fixes the issue with conversations not appearing in the admin UI
 * by ensuring consistent project tokens across sessions.
 */

// Add this method to the BulletproofMessagingWidget class
function normalizeEmail(email) {
    if (!email) return 'anonymous';
    return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

// Update the authenticateUser method with this code block at the beginning
// Place it right after the console.trace('[AUTH] Call stack'); line
async function fixedAuthenticateUser(member) {
    console.log(`🔐 [AUTH] Authenticating ${member.name} (${member.email})`);
    console.log('⚠️ [AUTH] This should NOT be called if session was restored!');
    console.trace('[AUTH] Call stack'); // Show where this was called from
    this.updateDebugInfo(`Authenticating ${member.email}...`, 'info');
    
    try {
        // NEW CODE: Check for existing token for this email
        const storageKey = `pcd_member_token_${this.normalizeEmail(member.email)}`;
        const existingToken = localStorage.getItem(storageKey);
        
        if (existingToken) {
            console.log(`✅ [AUTH] Found existing token for ${member.email}: ${existingToken.substring(0, 8)}...`);
            
            // Validate token before reusing
            const isValid = await this.validateTokenWithBackend(existingToken);
            if (isValid) {
                // Use existing token instead of creating a new one
                this.projectToken = existingToken;
                this.userName = member.name;
                this.userEmail = member.email;
                
                // Update standard storage keys
                localStorage.setItem('pcd_user_email', member.email);
                localStorage.setItem('pcd_user_name', member.name);
                localStorage.setItem('pcd_project_token', existingToken);
                
                // Skip the API call for new token
                console.log(`✅ [AUTH] Reused existing token successfully!`);
                this.updateDebugInfo(`Reused existing token for ${member.email}`, 'success');
                this.showUserInterface();
                return;
            } else {
                console.log(`⚠️ [AUTH] Existing token is invalid, requesting new one...`);
            }
        }
        
        // EXISTING CODE: Use the detected backend URL with ngrok bypass if needed
        const tokenUrl = this.config.backendUrl.includes('ngrok-free.app') 
            ? `${this.config.backendUrl}/api/token?ngrok-skip-browser-warning=true`
            : `${this.config.backendUrl}/api/token`;
        
        const headers = { 
            'Content-Type': 'application/json'
        };
        
        // Add ngrok bypass header if needed
        if (this.config.backendUrl.includes('ngrok-free.app')) {
            headers['ngrok-skip-browser-warning'] = 'true';
        }
        
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ 
                type: 'member', 
                email: member.email, 
                name: member.name 
            })
        });
        
        if (!response.ok) {
            throw new Error(`Authentication failed: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.valid || !data.token) {
            throw new Error('Invalid token response from server');
        }
        
        // Store session data
        this.projectToken = data.token;
        this.userName = member.name;
        this.userEmail = member.email;
        
        // CHECK IF THIS IS A NEW TOKEN
        const oldToken = localStorage.getItem('pcd_project_token');
        if (oldToken && oldToken !== data.token) {
            console.warn('⚠️ [AUTH] NEW TOKEN CREATED! Old:', oldToken.substring(0, 8) + '...', 'New:', data.token.substring(0, 8) + '...');
            console.warn('⚠️ [AUTH] This may cause conversation history to appear lost!');
        }
        
        localStorage.setItem('pcd_user_email', member.email);
        localStorage.setItem('pcd_user_name', member.name);
        localStorage.setItem('pcd_project_token', data.token);
        
        // NEW CODE: Store token with email-specific key
        const storageKey = `pcd_member_token_${this.normalizeEmail(member.email)}`;
        localStorage.setItem(storageKey, data.token);
        
        console.log(`✅ [AUTH] Authentication successful!`);
        console.log(`   Type: ${data.type}`);
        console.log(`   Token: ${data.token?.substring(0, 8)}...`);
        
        this.updateDebugInfo(`Authenticated successfully as ${member.email}`, 'success');
        this.showUserInterface();
        
    } catch (error) {
        console.error('❌ [AUTH] Authentication failed:', error);
        this.updateDebugInfo(`Authentication failed: ${error.message}`, 'error');
        this.handleAuthenticationError(error);
    }
}

// Usage instructions:
console.log(`
===================================================
PROJECT TOKEN FIX - INSTALLATION INSTRUCTIONS
===================================================

1. Open pleasantcovedesign/client-widget/messaging-widget-unified.html
2. Find the "authenticateUser" method
3. Replace it with the function from this file
4. Add the "normalizeEmail" helper method
5. Save the file and restart your server
6. Test by sending messages from the widget

For questions, refer to PERSISTENT_TOKEN_FIX.md
===================================================
`);
