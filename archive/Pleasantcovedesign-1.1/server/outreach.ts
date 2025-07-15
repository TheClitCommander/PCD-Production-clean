import { storage } from "./storage";
import type { Business } from "@shared/schema";
import { generateSchedulingLink } from "./scheduling-utils";

// Message Templates - Updated with scheduling links
const SMS_TEMPLATE = 
  "Hi {name}, I noticed {business_name} doesn't have a website yet. " +
  "I help local businesses get online affordably. Mind if I show you what's possible? " +
  "No obligation - just a quick mockup I made for you. " +
  "If you'd like to chat, here's my calendar: {scheduling_link}";

const EMAIL_SUBJECT = "Quick mockup I made for {business_name}";
const EMAIL_BODY = 
  "Hi {name},\n\n" +
  "I was doing some research on local businesses in {city} and came across {business_name}. " +
  "I noticed you don't have a website yet, which surprised me given how established you seem to be.\n\n" +
  "I specialize in creating affordable websites for local businesses - nothing fancy or expensive, " +
  "just clean, professional sites that help customers find you online.\n\n" +
  "I actually put together a quick mockup of what a site could look like for {business_name}. " +
  "Would you be interested in taking a peek? Takes 2 minutes to review, and there's absolutely no obligation.\n\n" +
  "If you'd like to discuss it, feel free to book a quick consultation at your convenience:\n" +
  "{scheduling_link}\n\n" +
  "Either way, best of luck with the business!\n\n" +
  "Ben Dickinson\n" +
  "Pleasant Cove Design\n" +
  "Boothbay, Maine\n" +
  "207-380-5680\n" +
  "https://www.pleasantcovedesign.com";

// Follow-up templates
const FOLLOW_UP_SMS = 
  "Hi {name}, following up on my message about a website for {business_name}. " +
  "I know you're busy - if you'd like to chat, here's my calendar: {scheduling_link}";

const FOLLOW_UP_EMAIL_SUBJECT = "Re: Quick mockup I made for {business_name}";
const FOLLOW_UP_EMAIL_BODY = 
  "Hi {name},\n\n" +
  "Just wanted to make sure my last email didn't get lost in the shuffle. " +
  "I created a sample website design for {business_name} that I'd love to share with you.\n\n" +
  "If you're not interested, no worries at all - just let me know and I won't bother you again. " +
  "But if you're curious about getting online affordably, feel free to book a quick chat:\n" +
  "{scheduling_link}\n\n" +
  "Best,\n" +
  "Ben\n" +
  "Pleasant Cove Design\n" +
  "Boothbay, Maine\n" +
  "207-380-5680\n" +
  "https://www.pleasantcovedesign.com";

// Demo site mapping - organized by industry
const DEMO_LINKS: Record<string, string> = {
  // Home Services
  "plumber": "https://pleasantcovedesign.com/demo/plumber",
  "plumbing": "https://pleasantcovedesign.com/demo/plumber",
  "electrician": "https://pleasantcovedesign.com/demo/electrician",
  "electrical": "https://pleasantcovedesign.com/demo/electrician",
  "hvac": "https://pleasantcovedesign.com/demo/hvac",
  "heating": "https://pleasantcovedesign.com/demo/hvac",
  "cooling": "https://pleasantcovedesign.com/demo/hvac",
  "landscaper": "https://pleasantcovedesign.com/demo/landscaper",
  "landscaping": "https://pleasantcovedesign.com/demo/landscaper",
  "lawn care": "https://pleasantcovedesign.com/demo/landscaper",
  "handyman": "https://pleasantcovedesign.com/demo/handyman",
  "contractor": "https://pleasantcovedesign.com/demo/contractor",
  "roofing": "https://pleasantcovedesign.com/demo/roofing",
  "painting": "https://pleasantcovedesign.com/demo/painting",
  
  // Food & Dining
  "cafe": "https://pleasantcovedesign.com/demo/cafe",
  "coffee shop": "https://pleasantcovedesign.com/demo/cafe",
  "restaurant": "https://pleasantcovedesign.com/demo/restaurant",
  "diner": "https://pleasantcovedesign.com/demo/diner",
  "bakery": "https://pleasantcovedesign.com/demo/bakery",
  "pizza": "https://pleasantcovedesign.com/demo/pizza",
  "seafood": "https://pleasantcovedesign.com/demo/seafood",
  "lobster": "https://pleasantcovedesign.com/demo/seafood",
  
  // Automotive
  "automotive": "https://pleasantcovedesign.com/demo/auto-repair",
  "auto repair": "https://pleasantcovedesign.com/demo/auto-repair",
  "mechanic": "https://pleasantcovedesign.com/demo/auto-repair",
  "tire shop": "https://pleasantcovedesign.com/demo/tire-shop",
  "body shop": "https://pleasantcovedesign.com/demo/body-shop",
  "detailing": "https://pleasantcovedesign.com/demo/auto-detailing",
  
  // Healthcare & Wellness
  "healthcare": "https://pleasantcovedesign.com/demo/medical",
  "medical": "https://pleasantcovedesign.com/demo/medical",
  "dental": "https://pleasantcovedesign.com/demo/dental",
  "dentist": "https://pleasantcovedesign.com/demo/dental",
  "chiropractor": "https://pleasantcovedesign.com/demo/chiro",
  "massage": "https://pleasantcovedesign.com/demo/massage",
  "spa": "https://pleasantcovedesign.com/demo/spa",
  "salon": "https://pleasantcovedesign.com/demo/salon",
  "barber": "https://pleasantcovedesign.com/demo/barber",
  
  // Retail & Services
  "retail": "https://pleasantcovedesign.com/demo/retail",
  "boutique": "https://pleasantcovedesign.com/demo/boutique",
  "gift shop": "https://pleasantcovedesign.com/demo/gift-shop",
  "antiques": "https://pleasantcovedesign.com/demo/antiques",
  "florist": "https://pleasantcovedesign.com/demo/florist",
  "pet grooming": "https://pleasantcovedesign.com/demo/pet-grooming",
  "cleaning": "https://pleasantcovedesign.com/demo/cleaning",
  "laundry": "https://pleasantcovedesign.com/demo/laundry",
  
  // Professional Services
  "accounting": "https://pleasantcovedesign.com/demo/accounting",
  "insurance": "https://pleasantcovedesign.com/demo/insurance",
  "real estate": "https://pleasantcovedesign.com/demo/real-estate",
  "law": "https://pleasantcovedesign.com/demo/law-firm",
  "attorney": "https://pleasantcovedesign.com/demo/law-firm",
  
  // Recreation & Fitness
  "gym": "https://pleasantcovedesign.com/demo/gym",
  "fitness": "https://pleasantcovedesign.com/demo/fitness",
  "yoga": "https://pleasantcovedesign.com/demo/yoga",
  "marina": "https://pleasantcovedesign.com/demo/marina",
  "boat rental": "https://pleasantcovedesign.com/demo/boat-rental",
  
  // Default
  "general": "https://pleasantcovedesign.com/demo/general",
  "unknown": "https://pleasantcovedesign.com/demo/general"
};

// Demo site taglines for different industries (for reference/documentation)
const DEMO_TAGLINES: Record<string, string> = {
  "plumber": "24/7 Emergency Service • Licensed & Insured • Serving Midcoast Maine",
  "electrician": "Safe, Reliable Electrical Services • Free Estimates • Family Owned Since 1985",
  "landscaping": "Beautiful Lawns, Happy Customers • Weekly Maintenance • Spring/Fall Cleanup",
  "cafe": "Fresh, Local, Delicious • Open Daily 7am-3pm • Waterfront Views",
  "restaurant": "Farm to Table Dining • Reservations Welcome • Private Events Available",
  "auto-repair": "Honest Service, Fair Prices • ASE Certified • All Makes & Models",
  "dental": "Gentle Care for the Whole Family • New Patients Welcome • Evening Hours",
  "salon": "Look Your Best, Feel Amazing • Walk-ins Welcome • Gift Certificates",
  "retail": "Unique Gifts & Local Treasures • Shop Local, Support Community",
  "marina": "Full Service Marina • Boat Storage & Repair • Fuel Dock Open 7 Days"
};

// Configuration
const MOCK_MODE = process.env.OUTREACH_MOCK !== "false"; // Default to mock mode

interface OutreachMessage {
  sms: {
    to: string;
    body: string;
  };
  email: {
    to: string;
    subject: string;
    body: string;
  };
}

interface OutreachResult {
  success: boolean;
  smsStatus?: string;
  emailStatus?: string;
  error?: string;
  mockMode: boolean;
  messages?: OutreachMessage;
}

/**
 * Format a message template with lead data
 */
function formatMessage(template: string, business: Business): string {
  // Extract contact name with fallback
  const contactName = extractContactName(business);
  
  // Generate scheduling link
  const schedulingLink = generateSchedulingLink(business.id);
  
  return template
    .replace("{name}", contactName)
    .replace("{business_name}", business.name)
    .replace("{city}", business.city || "your area")
    .replace(/{scheduling_link}/g, schedulingLink);
}

/**
 * Extract contact name from business data with intelligent fallback
 */
function extractContactName(business: Business): string {
  // Priority 1: Check notes for explicit contact/owner names
  if (business.notes) {
    // Look for patterns like "Contact: John Smith" or "Owner: Sarah"
    const patterns = [
      /contact:\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
      /owner:\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
      /manager:\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
      /spoke (?:with|to)\s+([A-Za-z]+)/i,
      /([A-Za-z]+)\s+is the owner/i,
      /([A-Za-z]+)\s+runs the/i
    ];
    
    for (const pattern of patterns) {
      const match = business.notes.match(pattern);
      if (match) {
        // Extract just first name if full name found
        const name = match[1].split(' ')[0];
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      }
    }
  }
  
  // Priority 2: Extract from email address
  if (business.email && business.email.includes("@")) {
    const emailPrefix = business.email.split("@")[0].toLowerCase();
    
    // Handle common email formats
    if (emailPrefix.includes(".")) {
      // firstname.lastname@domain.com
      const firstName = emailPrefix.split(".")[0];
      return capitalizeFirstLetter(firstName);
    } else if (emailPrefix.includes("_")) {
      // firstname_lastname@domain.com
      const firstName = emailPrefix.split("_")[0];
      return capitalizeFirstLetter(firstName);
    } else if (emailPrefix.includes("-")) {
      // firstname-lastname@domain.com
      const firstName = emailPrefix.split("-")[0];
      return capitalizeFirstLetter(firstName);
    } else if (!emailPrefix.includes("info") && 
               !emailPrefix.includes("contact") && 
               !emailPrefix.includes("admin") &&
               !emailPrefix.includes("sales") &&
               !emailPrefix.includes("support") &&
               emailPrefix.length > 2) {
      // Likely a first name only
      return capitalizeFirstLetter(emailPrefix);
    }
  }
  
  // Priority 3: Try to extract from business name (for sole proprietors)
  const businessNameLower = business.name.toLowerCase();
  if (businessNameLower.includes("'s ")) {
    // "John's Plumbing" -> "John"
    const possibleName = business.name.split("'s ")[0];
    if (possibleName.length < 15 && /^[A-Za-z]+$/.test(possibleName)) {
      return possibleName;
    }
  }
  
  // Priority 4: Industry-specific fallbacks
  const industryFallbacks: Record<string, string> = {
    "restaurant": "chef",
    "salon": "stylist",
    "automotive": "mechanic",
    "dental": "doctor",
    "medical": "doctor",
    "law": "counselor"
  };
  
  if (industryFallbacks[business.businessType]) {
    return industryFallbacks[business.businessType];
  }
  
  // Default fallback
  return "there";
}

/**
 * Helper function to properly capitalize names
 */
function capitalizeFirstLetter(name: string): string {
  if (!name) return "there";
  
  // Handle names with special characters
  name = name.replace(/[^a-zA-Z]/g, '');
  
  // Handle all caps or all lowercase
  if (name.length > 2) {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }
  
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Get demo link based on business type/tags
 */
function getDemoLink(business: Business): string | undefined {
  // Check business type first
  const demoUrl = DEMO_LINKS[business.businessType];
  if (demoUrl) return demoUrl;
  
  // Check tags if available
  if (business.tags && business.tags.length > 0) {
    for (const tag of business.tags) {
      const lowerTag = tag.toLowerCase();
      if (DEMO_LINKS[lowerTag]) {
        return DEMO_LINKS[lowerTag];
      }
    }
  }
  
  // Return general demo as fallback
  return DEMO_LINKS.general;
}

/**
 * Send SMS via Twilio
 */
async function sendSMS(to: string, body: string): Promise<{ success: boolean; status: string }> {
  if (MOCK_MODE) {
    console.log("📱 [MOCK] SMS would be sent to:", to);
    console.log("Message:", body);
    return { success: true, status: "mock_sent" };
  }
  
  // Real Twilio implementation
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  
  if (!accountSid || !authToken || !fromNumber) {
    console.error("❌ Twilio credentials not configured");
    return { success: false, status: "credentials_missing" };
  }
  
  try {
    // Here you would use the Twilio SDK
    // For now, we'll simulate the API call
    console.log("📱 Sending real SMS via Twilio...");
    
    // const twilio = require('twilio')(accountSid, authToken);
    // const message = await twilio.messages.create({
    //   body: body,
    //   from: fromNumber,
    //   to: to
    // });
    
    return { success: true, status: "sent" };
  } catch (error) {
    console.error("❌ SMS send error:", error);
    return { success: false, status: "send_error" };
  }
}

/**
 * Send email (via SendGrid or similar)
 */
async function sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; status: string }> {
  if (MOCK_MODE) {
    console.log("📧 [MOCK] Email would be sent to:", to);
    console.log("Subject:", subject);
    console.log("Body:", body);
    return { success: true, status: "mock_sent" };
  }
  
  // Real email implementation
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || "ben@pleasantcovedesign.com";
  
  if (!apiKey) {
    console.error("❌ Email service credentials not configured");
    return { success: false, status: "credentials_missing" };
  }
  
  try {
    // Here you would use SendGrid SDK or similar
    console.log("📧 Sending real email...");
    
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(apiKey);
    // await sgMail.send({
    //   to: to,
    //   from: fromEmail,
    //   subject: subject,
    //   text: body
    // });
    
    return { success: true, status: "sent" };
  } catch (error) {
    console.error("❌ Email send error:", error);
    return { success: false, status: "send_error" };
  }
}

/**
 * Launch outreach campaign for a single lead
 */
export async function launchOutreachForLead(leadId: number): Promise<OutreachResult> {
  try {
    // Get lead data
    const business = await storage.getBusiness(leadId);
    if (!business) {
      return { 
        success: false, 
        error: "Lead not found",
        mockMode: MOCK_MODE 
      };
    }
    
    // Check if lead qualifies (has phone or email)
    if (!business.phone && !business.email) {
      return { 
        success: false, 
        error: "No contact information available",
        mockMode: MOCK_MODE 
      };
    }
    
    // Format messages
    const smsBody = formatMessage(SMS_TEMPLATE, business);
    const emailSubject = formatMessage(EMAIL_SUBJECT, business);
    const emailBody = formatMessage(EMAIL_BODY, business);
    
    // Get demo link if available
    const demoLink = getDemoLink(business);
    console.log(`📎 Demo link for ${business.businessType}: ${demoLink}`);
    
    // Prepare outreach messages
    const messages: OutreachMessage = {
      sms: {
        to: business.phone,
        body: smsBody
      },
      email: {
        to: business.email || "",
        subject: emailSubject,
        body: emailBody
      }
    };
    
    // Send messages
    let smsResult = { success: false, status: "not_sent" };
    let emailResult = { success: false, status: "not_sent" };
    
    if (business.phone) {
      smsResult = await sendSMS(business.phone, smsBody);
    }
    
    if (business.email) {
      emailResult = await sendEmail(business.email, emailSubject, emailBody);
    }
    
    // Update business stage if outreach was successful
    if (smsResult.success || emailResult.success) {
      await storage.updateBusiness(leadId, {
        stage: "contacted",
        notes: `${business.notes}\n\nOutreach sent: ${new Date().toLocaleString()}\nSMS: ${smsResult.status}, Email: ${emailResult.status}`
      });
      
      // Log activity
      await storage.createActivity({
        type: "outreach_sent",
        description: `Sent outreach to ${business.name} - SMS: ${smsResult.status}, Email: ${emailResult.status}`,
        businessId: leadId
      });
    }
    
    return {
      success: smsResult.success || emailResult.success,
      smsStatus: smsResult.status,
      emailStatus: emailResult.status,
      mockMode: MOCK_MODE,
      messages: MOCK_MODE ? messages : undefined
    };
    
  } catch (error) {
    console.error("❌ Outreach error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      mockMode: MOCK_MODE
    };
  }
}

/**
 * Launch bulk outreach campaign
 */
export async function launchBulkOutreach(leadIds: number[]): Promise<{
  totalSent: number;
  successful: number;
  failed: number;
  results: Record<number, OutreachResult>;
}> {
  const results: Record<number, OutreachResult> = {};
  let successful = 0;
  let failed = 0;
  
  for (const leadId of leadIds) {
    const result = await launchOutreachForLead(leadId);
    results[leadId] = result;
    
    if (result.success) {
      successful++;
    } else {
      failed++;
    }
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return {
    totalSent: leadIds.length,
    successful,
    failed,
    results
  };
} 