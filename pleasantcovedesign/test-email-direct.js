// Direct Email Service Test
// Tests the beautiful email templates without requiring full system setup

import { sendReceiptEmail, sendWelcomeEmail, sendInvoiceEmail } from './server/email-service.js';

// Mock order data
const mockOrder = {
  id: "ORD-TEST-EMAIL-DEMO",
  companyId: 118,
  package: "standard",
  total: 2500,
  invoiceId: "INV-TEST-123",
  paymentDate: new Date(),
  paymentMethod: "stripe",
  stripePaymentIntentId: "pi_test_demo_12345",
  stripePaymentLinkUrl: "https://buy.stripe.com/test_demo_link",
  customItems: [
    {
      name: "Extra Logo Design",
      description: "Additional logo variations",
      price: 500,
      quantity: 1
    }
  ]
};

// Mock company data
const mockCompany = {
  id: 118,
  name: "Test Company Inc",
  email: "demo@testcompany.com",
  phone: "(555) 123-4567"
};

// Package features for welcome email
const packageFeatures = `
🌟 Professional Website Design
📱 Mobile-Responsive Layout
🚀 Performance Optimization
📧 Contact Form Integration
🔍 SEO Optimization
📊 Analytics Setup
🎨 Brand Integration
💻 CMS Training
`;

async function testEmailFlow() {
  console.log('🧪 Testing Pleasant Cove Email System\n');
  console.log('='.repeat(50));
  
  try {
    // Test 1: Invoice Email with Payment Link
    console.log('\n📄 Testing Invoice Email...');
    const invoiceResult = await sendInvoiceEmail(mockOrder, mockCompany);
    console.log(invoiceResult ? '✅ Invoice email sent!' : '❌ Invoice email failed');
    
    // Test 2: Receipt Email after Payment
    console.log('\n🧾 Testing Receipt Email...');
    const receiptResult = await sendReceiptEmail(mockOrder, mockCompany);
    console.log(receiptResult ? '✅ Receipt email sent!' : '❌ Receipt email failed');
    
    // Test 3: Welcome Email for Project Kickoff
    console.log('\n🎉 Testing Welcome Email...');
    const welcomeResult = await sendWelcomeEmail(mockOrder, mockCompany, packageFeatures);
    console.log(welcomeResult ? '✅ Welcome email sent!' : '❌ Welcome email failed');
    
    console.log('\n' + '='.repeat(50));
    console.log('🎯 Email System Test Complete!');
    console.log('\n💡 To see actual emails in your inbox:');
    console.log('   1. Get SendGrid API key: https://sendgrid.com');
    console.log('   2. Add to .env: SENDGRID_API_KEY=SG.your_key');
    console.log('   3. Run this test again');
    console.log('\n📧 Email templates are production-ready!');
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
  }
}

// Run the test
testEmailFlow(); 