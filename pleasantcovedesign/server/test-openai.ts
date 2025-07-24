import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'demo-key'
});

async function testOpenAI() {
  console.log('🔍 Testing OpenAI configuration...');
  console.log(`📝 API Key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
  console.log(`🔑 Key starts with: ${process.env.OPENAI_API_KEY?.substring(0, 20)}...`);
  
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'demo-key') {
    console.error('❌ OpenAI API key not configured properly!');
    return;
  }
  
  try {
    console.log('🤖 Making test API call to OpenAI...');
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Say 'OpenAI is working!' in exactly 3 words." }
      ],
      max_tokens: 10
    });
    
    console.log('✅ OpenAI API is working!');
    console.log('🤖 Response:', response.choices[0].message.content);
  } catch (error: any) {
    console.error('❌ OpenAI API Error:', error.message);
    if (error.code === 'invalid_api_key') {
      console.error('🔑 The API key appears to be invalid');
    }
  }
}

testOpenAI(); 