// Test script to verify Railway message persistence
const RAILWAY_URL = 'https://pleasantcovedesign-production.up.railway.app';
const PROJECT_TOKEN = 'mc516tr5_CSU4OUADdSIHB3AXxZPpbw';
const ADMIN_TOKEN = 'Bearer pleasantcove2024admin';

async function testRailwayMessages() {
    console.log('🧪 Testing Railway message persistence...\n');
    
    try {
        // 1. Test fetching messages
        console.log('📥 Fetching messages from Railway...');
        const response = await fetch(
            `${RAILWAY_URL}/api/messages?projectToken=${PROJECT_TOKEN}`,
            {
                headers: {
                    'Authorization': ADMIN_TOKEN
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`Failed to fetch messages: ${response.status}`);
        }
        
        const messages = await response.json();
        console.log(`✅ Found ${messages.length} total messages\n`);
        
        // 2. Show recent messages
        console.log('📋 Recent messages:');
        const recentMessages = messages.slice(-5); // Last 5 messages
        recentMessages.forEach(msg => {
            const messageText = msg.message || msg.content || 'No message';
            const senderName = msg.senderName || 'Unknown';
            const timestamp = msg.timestamp || msg.createdAt || new Date().toISOString();
            console.log(`- [${new Date(timestamp).toLocaleString()}] ${senderName}: ${messageText.substring(0, 50)}...`);
        });
        
        // 3. Test sending a message
        console.log('\n📤 Sending test message...');
        const testMessage = {
            projectToken: PROJECT_TOKEN,
            content: `Test message from script at ${new Date().toLocaleString()}`,
            senderName: 'Test Script',
            senderType: 'admin',
            businessId: 1
        };
        
        const sendResponse = await fetch(`${RAILWAY_URL}/api/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': ADMIN_TOKEN
            },
            body: JSON.stringify(testMessage)
        });
        
        if (sendResponse.ok) {
            console.log('✅ Test message sent successfully!');
        } else {
            console.log('❌ Failed to send test message:', sendResponse.status);
        }
        
        // 4. Verify persistence
        console.log('\n🔄 Verifying message persistence...');
        const verifyResponse = await fetch(
            `${RAILWAY_URL}/api/messages?projectToken=${PROJECT_TOKEN}`,
            {
                headers: {
                    'Authorization': ADMIN_TOKEN
                }
            }
        );
        
        const updatedMessages = await verifyResponse.json();
        console.log(`✅ Total messages after test: ${updatedMessages.length}`);
        
        // 5. Show message distribution by business
        console.log('\n📊 Messages by business:');
        const businessCounts = {};
        updatedMessages.forEach(msg => {
            const businessId = msg.businessId || 'unknown';
            businessCounts[businessId] = (businessCounts[businessId] || 0) + 1;
        });
        
        Object.entries(businessCounts).forEach(([businessId, count]) => {
            console.log(`  Business ${businessId}: ${count} messages`);
        });
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testRailwayMessages(); 