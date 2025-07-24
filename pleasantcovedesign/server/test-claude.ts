import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function testClaude() {
  console.log('🔍 Testing Claude configuration...');
  console.log(`📝 API Key configured: ${process.env.ANTHROPIC_API_KEY ? 'Yes' : 'No (using hardcoded)'}`);
  
  try {
    console.log('🤖 Making test API call to Claude...');
    const response = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: "Say 'Claude is working!' in exactly 3 words."
        }
      ]
    });
    
    console.log('✅ Claude API call successful!');
    console.log(`📝 Response: ${response.content[0].type === 'text' ? response.content[0].text : 'No text response'}`);
    console.log('🎉 Claude is configured correctly and ready to use!');
  } catch (error: any) {
    console.error('❌ Claude API Error:', error.status || error.code, error.message);
    if (error.status === 401) {
      console.error('🔑 Invalid API key. Please check your Claude API key.');
    } else if (error.status === 429) {
      console.error('⏰ Rate limited. Please wait before trying again.');
    }
  }
}

testClaude(); 