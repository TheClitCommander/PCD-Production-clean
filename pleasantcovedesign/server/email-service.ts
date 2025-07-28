import sgMail from '@sendgrid/mail';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('⚠️ SENDGRID_API_KEY not found - email sending will be simulated');
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'pleasantcovedesign@gmail.com';
const FROM_NAME = process.env.FROM_NAME || 'Pleasant Cove Design';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Core email sending function
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('📧 [SIMULATION] Email would be sent:');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Content: ${options.text}`);
      return true;
    }

    const msg = {
      to: options.to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      subject: options.subject,
      text: options.text,
      html: options.html || options.text
    };

    await sgMail.send(msg);
    console.log(`✅ Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return false;
  }
}

// Receipt Email Template
export function generateReceiptHTML(order: any, company: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Receipt</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 2rem; text-align: center; }
        .header h1 { margin: 0; font-size: 1.8rem; font-weight: 600; }
        .header p { margin: 0.5rem 0 0 0; opacity: 0.9; }
        .content { padding: 2rem; }
        .receipt-box { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; }
        .receipt-title { font-size: 1.2rem; font-weight: 600; color: #1e40af; margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.5rem; }
        .receipt-row { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0; }
        .receipt-row:last-child { border-bottom: none; font-weight: 600; font-size: 1.1rem; color: #1e40af; }
        .package-info { background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
        .next-steps { background: #fff7ed; border: 1px solid #f59e0b; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
        .next-steps h3 { color: #f59e0b; margin: 0 0 0.5rem 0; }
        .next-steps ul { margin: 0.5rem 0; padding-left: 1.2rem; }
        .footer { background: #1f2937; color: white; padding: 1.5rem; text-align: center; }
        .footer p { margin: 0.3rem 0; }
        .contact-info { margin-top: 1rem; }
        .emoji { font-size: 1.2em; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>🧾 Payment Receipt</h1>
          <p>Thank you for your payment!</p>
        </div>
        
        <!-- Main Content -->
        <div class="content">
          <p>Hi <strong>${company.name}</strong>,</p>
          <p>Your payment has been successfully processed. Here are your receipt details:</p>
          
          <!-- Receipt Details -->
          <div class="receipt-box">
            <div class="receipt-title">
              <span class="emoji">🧾</span> Receipt Details
            </div>
            <div class="receipt-row">
              <span>Order Number:</span>
              <span><strong>${order.id}</strong></span>
            </div>
            <div class="receipt-row">
              <span>Invoice:</span>
              <span>${order.invoiceId || 'N/A'}</span>
            </div>
            <div class="receipt-row">
              <span>Payment Date:</span>
              <span>${order.paymentDate ? new Date(order.paymentDate).toLocaleDateString() : new Date().toLocaleDateString()}</span>
            </div>
            <div class="receipt-row">
              <span>Payment Method:</span>
              <span>${order.paymentMethod || 'Stripe'}</span>
            </div>
            <div class="receipt-row">
              <span>Transaction ID:</span>
              <span><code>${order.stripePaymentIntentId || 'N/A'}</code></span>
            </div>
            <div class="receipt-row">
              <span>Amount Paid:</span>
              <span><strong>$${order.total.toLocaleString()}</strong></span>
            </div>
          </div>
          
          <!-- Package Info -->
          <div class="package-info">
            <h3><span class="emoji">📦</span> Package: ${order.package ? order.package.charAt(0).toUpperCase() + order.package.slice(1) : 'Website'} Package</h3>
            <p>You're all set! Your project is now in our fulfillment queue.</p>
          </div>
          
          <!-- Next Steps -->
          <div class="next-steps">
            <h3><span class="emoji">🎉</span> What's Next?</h3>
            <ul>
              <li><strong>Confirmation:</strong> Payment confirmed and processed</li>
              <li><strong>Welcome Email:</strong> Detailed next steps sent separately</li>
              <li><strong>Team Assignment:</strong> Our team has been notified</li>
              <li><strong>Kickoff Call:</strong> We'll contact you within 1-2 business days</li>
            </ul>
          </div>
          
          <p><strong>Questions or concerns?</strong> Just reply to this email or contact us using the information below.</p>
          
          <p>Thank you for choosing Pleasant Cove Design!</p>
          
          <p style="margin-top: 2rem;">
            Best regards,<br>
            <strong>The Pleasant Cove Design Team</strong>
          </p>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p><strong>Pleasant Cove Design</strong></p>
          <p>123 Main Street, Portland, ME 04101</p>
          <div class="contact-info">
            <p>📞 (207) 555-0123 | 📧 ${FROM_EMAIL}</p>
            <p>🌐 https://pleasantcovedesign.com</p>
            <p style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.8;">Tax ID: 12-3456789</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Welcome Email Template
export function generateWelcomeHTML(order: any, company: any, packageFeatures: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Pleasant Cove Design</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 2rem; text-align: center; }
        .header h1 { margin: 0; font-size: 2rem; font-weight: 600; }
        .header p { margin: 0.5rem 0 0 0; opacity: 0.9; font-size: 1.1rem; }
        .content { padding: 2rem; }
        .highlight-box { background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%); border: 2px solid #10b981; border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; text-align: center; }
        .package-features { background: #f8fafc; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; }
        .package-features h3 { color: #1e40af; margin: 0 0 1rem 0; }
        .timeline { background: #fff7ed; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; }
        .timeline h3 { color: #f59e0b; margin: 0 0 1rem 0; }
        .contact-box { background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 1rem; margin: 1rem 0; text-align: center; }
        .footer { background: #1f2937; color: white; padding: 1.5rem; text-align: center; }
        .footer p { margin: 0.3rem 0; }
        .emoji { font-size: 1.2em; }
        .cta-button { display: inline-block; background: #10b981; color: white; padding: 0.8rem 1.5rem; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 0.5rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>🎉 Welcome to Pleasant Cove Design!</h1>
          <p>Your project journey starts here</p>
        </div>
        
        <!-- Main Content -->
        <div class="content">
          <p>Hi <strong>${company.name}</strong>,</p>
          
          <p><strong>Congratulations!</strong> Your payment has been processed and your project is officially underway.</p>
          
          <!-- Payment Confirmation -->
          <div class="highlight-box">
            <h2 style="margin: 0 0 0.5rem 0;"><span class="emoji">✅</span> Payment Confirmed</h2>
            <p style="margin: 0; font-size: 1.1rem;"><strong>$${order.total.toLocaleString()}</strong> received for your ${order.package ? order.package.charAt(0).toUpperCase() + order.package.slice(1) : 'Website'} Package</p>
          </div>
          
          <!-- Package Features -->
          <div class="package-features">
            <h3><span class="emoji">🎯</span> Your ${order.package ? order.package.charAt(0).toUpperCase() + order.package.slice(1) : 'Website'} Package Includes:</h3>
            <div style="white-space: pre-line;">${packageFeatures}</div>
          </div>
          
          <!-- Timeline -->
          <div class="timeline">
            <h3><span class="emoji">📅</span> What Happens Next</h3>
            <ul style="margin: 0; padding-left: 1.2rem;">
              <li><strong>Within 24 hours:</strong> Project kickoff and team assignment</li>
              <li><strong>1-2 business days:</strong> Dedicated project manager contact</li>
              <li><strong>2-3 business days:</strong> Kickoff call to discuss your vision</li>
              <li><strong>1 week:</strong> Initial designs and project timeline</li>
              <li><strong>Throughout:</strong> Regular updates via your project portal</li>
            </ul>
          </div>
          
          <p><strong>Our team has been automatically notified</strong> of your paid project and will be reaching out shortly to:</p>
          <ul>
            <li>Assign your dedicated project team</li>
            <li>Schedule your project kickoff call</li>
            <li>Provide access to your project tracking portal</li>
            <li>Gather detailed requirements for your vision</li>
          </ul>
          
          <!-- Contact Info -->
          <div class="contact-box">
            <h3 style="margin: 0 0 0.5rem 0;"><span class="emoji">📱</span> Questions?</h3>
            <p style="margin: 0;">Reply to this email • Call (207) 555-0123 • Text (207) 555-0123</p>
          </div>
          
          <p style="margin-top: 2rem;"><strong>We can't wait to bring your vision to life!</strong></p>
          
          <p style="margin-top: 2rem;">
            Best regards,<br>
            <strong>The Pleasant Cove Design Team</strong>
          </p>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p><strong>Pleasant Cove Design</strong></p>
          <p>123 Main Street, Portland, ME 04101</p>
          <p>📞 (207) 555-0123 | 📧 ${FROM_EMAIL}</p>
          <p>🌐 https://pleasantcovedesign.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Invoice Email Template
export function generateInvoiceHTML(order: any, company: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice with Easy Payment</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); color: white; padding: 2rem; text-align: center; }
        .header h1 { margin: 0; font-size: 1.8rem; font-weight: 600; }
        .header p { margin: 0.5rem 0 0 0; opacity: 0.9; }
        .content { padding: 2rem; }
        .invoice-details { background: #f8fafc; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; }
        .pay-button { background: #10b981; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 1.1rem; display: inline-block; margin: 1rem 0; text-align: center; }
        .pay-button:hover { background: #059669; }
        .footer { background: #1f2937; color: white; padding: 1.5rem; text-align: center; }
        .emoji { font-size: 1.2em; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>📄 Invoice Ready</h1>
          <p>Easy payment in just one click</p>
        </div>
        
        <!-- Main Content -->
        <div class="content">
          <p>Hi <strong>${company.name}</strong>,</p>
          
          <p>Thank you for choosing Pleasant Cove Design! Your invoice is ready for the ${order.package ? `${order.package.charAt(0).toUpperCase() + order.package.slice(1)} Package` : 'Website Package'}.</p>
          
          <!-- Invoice Details -->
          <div class="invoice-details">
            <h3><span class="emoji">📄</span> Invoice Details</h3>
            <p><strong>Invoice:</strong> ${order.invoiceId}</p>
            <p><strong>Amount:</strong> $${order.total.toLocaleString()}</p>
            <p><strong>Package:</strong> ${order.package ? order.package.charAt(0).toUpperCase() + order.package.slice(1) : 'Website'} Package</p>
          </div>
          
          <div style="text-align: center; margin: 2rem 0;">
            <a href="${order.stripePaymentLinkUrl}" class="pay-button">
              <span class="emoji">💳</span> PAY NOW - SECURE PAYMENT
            </a>
            <p style="margin: 0.5rem 0; color: #666; font-size: 0.9rem;">
              Accepts credit cards, debit cards, and bank transfers
            </p>
          </div>
          
          <p><strong>Questions?</strong> Just reply to this email or call us at (207) 555-0123.</p>
          
          <p>We're excited to start working on your project!</p>
          
          <p style="margin-top: 2rem;">
            Best regards,<br>
            <strong>The Pleasant Cove Design Team</strong>
          </p>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p><strong>Pleasant Cove Design</strong></p>
          <p>123 Main Street, Portland, ME 04101</p>
          <p>📞 (207) 555-0123 | 📧 ${FROM_EMAIL}</p>
          <p>🌐 https://pleasantcovedesign.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// High-level email functions
export async function sendReceiptEmail(order: any, company: any): Promise<boolean> {
  const html = generateReceiptHTML(order, company);
  const text = `
Payment Receipt - Pleasant Cove Design - Order ${order.id.slice(-8)}

Hi ${company.name},

Thank you for your payment! Here's your receipt:

🧾 PAYMENT RECEIPT
==================

📄 Order: ${order.id}
📄 Invoice: ${order.invoiceId || 'N/A'}
💰 Amount Paid: $${order.total.toLocaleString()}
📅 Payment Date: ${order.paymentDate ? new Date(order.paymentDate).toLocaleDateString() : new Date().toLocaleDateString()}
💳 Payment Method: ${order.paymentMethod || 'Stripe'}
🔗 Transaction ID: ${order.stripePaymentIntentId || 'N/A'}

📦 Package: ${order.package ? order.package.charAt(0).toUpperCase() + order.package.slice(1) : 'Website'} Package

🎉 What's Next:

✅ Payment confirmed and processed
📧 Welcome email with next steps sent separately  
👥 Our team has been notified of your paid project
📞 We'll contact you within 1-2 business days to schedule your kickoff call

Thank you for choosing Pleasant Cove Design!

Best regards,
The Pleasant Cove Design Team

Pleasant Cove Design
123 Main Street, Portland, ME 04101
Tax ID: 12-3456789
  `;

  return await sendEmail({
    to: company.email,
    subject: `Payment Receipt - Pleasant Cove Design - Order ${order.id.slice(-8)}`,
    text,
    html
  });
}

export async function sendWelcomeEmail(order: any, company: any, packageFeatures: string): Promise<boolean> {
  const html = generateWelcomeHTML(order, company, packageFeatures);
  const text = `
Welcome to Pleasant Cove Design!

Hi ${company.name},

Congratulations! Your payment has been processed and your project is officially underway.

✅ Payment Confirmed: $${order.total.toLocaleString()} received for your ${order.package ? order.package.charAt(0).toUpperCase() + order.package.slice(1) : 'Website'} Package

🎯 Your Package Includes:
${packageFeatures}

📅 What Happens Next:
- Within 24 hours: Project kickoff and team assignment
- 1-2 business days: Dedicated project manager contact
- 2-3 business days: Kickoff call to discuss your vision
- 1 week: Initial designs and project timeline
- Throughout: Regular updates via your project portal

We can't wait to bring your vision to life!

Best regards,
The Pleasant Cove Design Team
  `;

  return await sendEmail({
    to: company.email,
    subject: 'Welcome to Pleasant Cove Design! Your Project Journey Starts Here',
    text,
    html
  });
}

export async function sendInvoiceEmail(order: any, company: any): Promise<boolean> {
  if (!order.stripePaymentLinkUrl) {
    throw new Error('No payment link available');
  }

  const html = generateInvoiceHTML(order, company);
  const text = `
Easy Payment Link - Pleasant Cove Design Invoice ${order.invoiceId}

Hi ${company.name},

Thank you for choosing Pleasant Cove Design! 

Your invoice for the ${order.package ? `${order.package.charAt(0).toUpperCase() + order.package.slice(1)} Package` : 'Website Package'} is ready.

📄 Invoice: ${order.invoiceId}
💰 Amount: $${order.total.toLocaleString()}

💳 PAY NOW: ${order.stripePaymentLinkUrl}

This secure payment link allows you to pay by credit card, debit card, or bank transfer.

Questions? Just reply to this email or call us at (207) 555-0123.

Best regards,
The Pleasant Cove Design Team

Pleasant Cove Design
123 Main Street, Portland, ME 04101
https://pleasantcovedesign.com
  `;

  return await sendEmail({
    to: company.email,
    subject: `Easy Payment Link - Pleasant Cove Design Invoice ${order.invoiceId}`,
    text,
    html
  });
} 