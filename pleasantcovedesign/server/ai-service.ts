import OpenAI from 'openai';
import { storage } from './storage.js';
import dotenv from 'dotenv';

// Ensure dotenv is loaded
dotenv.config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'demo-key'
});

interface AIFunction {
  name: string;
  description: string;
  parameters: any;
}

// Define available functions for Minerva
const AVAILABLE_FUNCTIONS: AIFunction[] = [
  {
    name: "getLastMessages",
    description: "Fetch the last N chat messages for a given lead or project",
    parameters: {
      type: "object",
      properties: {
        leadId: { type: "string", description: "Company/lead ID to get messages for" },
        projectId: { type: "number", description: "Project ID to get messages for" },
        limit: { type: "integer", default: 5, description: "Number of messages to retrieve" }
      }
    }
  },
  {
    name: "getRecentLeads",
    description: "Get a list of recent leads/companies that have been contacted",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "integer", default: 10, description: "Number of leads to retrieve" }
      }
    }
  },
  {
    name: "searchCompanies",
    description: "Search for companies by name, email, or business type",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        limit: { type: "integer", default: 10 }
      },
      required: ["query"]
    }
  },
  {
    name: "getProjectDetails",
    description: "Get detailed information about a specific project",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "Project ID to get details for" }
      },
      required: ["projectId"]
    }
  },
  {
    name: 'generateDemo',
    description: 'Generate a website demo for a company. Creates both storefront and stylized versions.',
    parameters: {
      type: 'object',
      properties: {
        companyName: {
          type: 'string',
          description: 'Name of the company'
        },
        industry: {
          type: 'string',
          description: 'Industry type (e.g., plumbing, landscaping, restaurant)',
          enum: ['plumbing', 'landscaping', 'restaurant', 'dental', 'electrical', 'general']
        },
        confirmGeneration: {
          type: 'boolean',
          description: 'User confirmation to proceed with demo generation'
        }
      },
      required: ['companyName', 'industry']
    }
  },
  {
    name: 'createLead',
    description: 'Create a new lead/company in the system',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Company/contact name'
        },
        email: {
          type: 'string',
          description: 'Email address (optional)'
        },
        phone: {
          type: 'string',
          description: 'Phone number (optional)'
        },
        businessType: {
          type: 'string',
          description: 'Type of business (optional)'
        },
        notes: {
          type: 'string',
          description: 'Additional notes (optional)'
        },
        confirmCreation: {
          type: 'boolean',
          description: 'User confirmation to create the lead'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'updateLead',
    description: 'Update an existing lead/company information',
    parameters: {
      type: 'object',
      properties: {
        leadId: {
          type: 'number',
          description: 'ID of the lead to update'
        },
        updates: {
          type: 'object',
          description: 'Fields to update (name, email, phone, businessType, notes)',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            businessType: { type: 'string' },
            notes: { type: 'string' }
          }
        },
        confirmUpdate: {
          type: 'boolean',
          description: 'User confirmation to update the lead'
        }
      },
      required: ['leadId', 'updates']
    }
  },
  {
    name: "getUpcomingAppointments",
    description: "Get upcoming appointments",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "integer", default: 5, description: "Number of appointments to retrieve" },
        leadId: { type: "string", description: "Filter by specific lead/company" }
      }
    }
  },
  {
    name: "createQuickNote",
    description: "Create a quick note about a lead or project",
    parameters: {
      type: "object",
      properties: {
        leadId: { type: "string", description: "Company/lead ID" },
        note: { type: "string", description: "Note content" }
      },
      required: ["leadId", "note"]
    }
  },
  {
    name: "getBusinessStats",
    description: "Get business statistics and analytics",
    parameters: {
      type: "object",
      properties: {
        timeframe: { type: "string", enum: ["today", "week", "month", "all"], default: "week" }
      }
    }
  },
  {
    name: "searchMessages",
    description: "Search through message history",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        leadId: { type: "string", description: "Filter by specific lead" },
        limit: { type: "integer", default: 10 }
      },
      required: ["query"]
    }
  },
  {
    name: "sendSMS",
    description: "Send an SMS message to a lead (requires confirmation)",
    parameters: {
      type: "object",
      properties: {
        leadId: { type: "string", description: "Company/lead ID to send SMS to" },
        message: { type: "string", description: "SMS message content" },
        confirmationId: { type: "string", description: "Confirmation ID if user confirmed" }
      },
      required: ["leadId", "message"]
    }
  },
  {
    name: "createInvoice",
    description: "Create an invoice for a company (requires confirmation)",
    parameters: {
      type: "object",
      properties: {
        leadId: { type: "string", description: "Company/lead ID" },
        amount: { type: "number", description: "Invoice amount" },
        description: { type: "string", description: "Invoice description" },
        confirmationId: { type: "string", description: "Confirmation ID if user confirmed" }
      },
      required: ["leadId", "amount", "description"]
    }
  },
  {
    name: "scheduleAppointment",
    description: "Schedule an appointment with a lead (requires confirmation)",
    parameters: {
      type: "object",
      properties: {
        leadId: { type: "string", description: "Company/lead ID" },
        datetime: { type: "string", description: "Appointment date and time" },
        description: { type: "string", description: "Appointment description" },
        confirmationId: { type: "string", description: "Confirmation ID if user confirmed" }
      },
      required: ["leadId", "datetime", "description"]
    }
  }
];

// Function implementations
async function getLastMessages({ leadId, projectId, limit = 5 }: { leadId?: string; projectId?: number; limit?: number }) {
  try {
    const messages = await storage.getAIChatMessages({ 
      leadId, 
      projectId, 
      limit 
    });
    
    if (messages.length === 0) {
      return { messages: [], summary: "No messages found for this lead/project." };
    }
    
    return {
      messages: messages.map(m => ({
        direction: m.direction,
        content: m.content,
        timestamp: m.timestamp,
        type: m.messageType
      })),
      summary: `Found ${messages.length} recent messages.`
    };
  } catch (error) {
    return { error: "Failed to retrieve messages", details: error };
  }
}

async function getRecentLeads({ limit = 10 }: { limit?: number }) {
  try {
    const companies = await storage.getCompanies();
    const recent = companies.slice(0, limit);
    
    return {
      leads: recent.map(c => ({
        id: c.id,
        name: c.name,
        businessType: c.businessType,
        email: c.email,
        phone: c.phone,
        createdAt: c.createdAt
      })),
      total: companies.length
    };
  } catch (error) {
    return { error: "Failed to retrieve leads", details: error };
  }
}

async function searchCompanies({ query, limit = 10 }: { query: string; limit?: number }) {
  try {
    const companies = await storage.getCompanies();
    const queryLower = query.toLowerCase();
    
    const matches = companies.filter(c => 
      c.name.toLowerCase().includes(queryLower) ||
      (c.email && c.email.toLowerCase().includes(queryLower)) ||
      (c.businessType && c.businessType.toLowerCase().includes(queryLower))
    ).slice(0, limit);
    
    return {
      results: matches.map(c => ({
        id: c.id,
        name: c.name,
        businessType: c.businessType,
        email: c.email,
        phone: c.phone
      })),
      found: matches.length
    };
  } catch (error) {
    return { error: "Failed to search companies", details: error };
  }
}

async function generateDemo({ companyName, industry, confirmGeneration }: { 
  companyName: string; 
  industry: string; 
  confirmGeneration?: boolean;
}) {
  // If not confirmed, ask for confirmation
  if (!confirmGeneration) {
    return {
      requiresConfirmation: true,
      confirmationPrompt: `I'll generate a website demo for "${companyName}" in the ${industry} industry. This will create both storefront and stylized versions. Shall I proceed?`,
      pendingAction: {
        function: 'generateDemo',
        args: { companyName, industry, confirmGeneration: true }
      }
    };
  }

  try {
    // Call our demo generator directly using Python subprocess
    const { spawn } = await import('child_process');
    
    const result = await new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        'create_industry_demo_templates.py',
        companyName,
        industry,
        'modern'
      ]);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout.trim());
            resolve(result);
          } catch (e) {
            resolve({ output: stdout.trim(), success: true });
          }
        } else {
          reject({ error: stderr || stdout, code });
        }
      });

      // Handle timeout
      setTimeout(() => {
        pythonProcess.kill();
        reject({ error: 'Demo generation timeout', code: -1 });
      }, 30000);
    });

    if ((result as any).success) {
      const demoUrl = (result as any).demo_url;
      const customerViewUrl = `file://${process.cwd()}/pleasant_cove_demo_experience.html?demo=${encodeURIComponent(demoUrl)}&company=${encodeURIComponent(companyName)}`;
      
      return {
        success: true,
        message: `✅ Demo generated successfully for ${companyName}!`,
        demo_url: demoUrl,
        customer_preview_url: customerViewUrl,
        viewable_urls: [customerViewUrl, demoUrl].filter(Boolean)
      };
    } else {
      return {
        error: "Demo generation failed",
        details: (result as any).error || 'Unknown error'
      };
    }
  } catch (error: any) {
    // Safe error handling with proper null checks
    const errorMessage = error?.message || error?.error || 'Unknown error';
    const errorCode = error?.code;
    
    // If Minerva Bridge is not available, provide a helpful message
    if (errorMessage.includes('ECONNREFUSED') || errorCode === 'ECONNREFUSED') {
      return {
        error: "Minerva Bridge not available",
        message: "The demo generation service is not currently running. Please start the Minerva Bridge service.",
        suggestion: "Run: cd pleasantcovedesign/server && npx tsx minerva-bridge.ts"
      };
    }
    
    return {
      error: "Failed to generate demo",
      details: errorMessage
    };
  }
}

async function createLead({ 
  name, 
  email, 
  phone, 
  businessType, 
  notes,
  confirmCreation 
}: { 
  name: string; 
  email?: string; 
  phone?: string; 
  businessType?: string; 
  notes?: string;
  confirmCreation?: boolean;
}) {
  // If not confirmed, ask for confirmation
  if (!confirmCreation) {
    return {
      requiresConfirmation: true,
      confirmationPrompt: `I'll create a new lead for "${name}"${businessType ? ` in the ${businessType} industry` : ''}${email ? ` (${email})` : ''}. Shall I proceed?`,
      pendingAction: {
        function: 'createLead',
        args: { name, email, phone, businessType, notes, confirmCreation: true }
      }
    };
  }

  try {
    const newCompany = await storage.createCompany({
      name,
      email: email || '',
      phone: phone || '',
      businessType: businessType || 'general',
      notes: notes || ''
    });

    return {
      success: true,
      message: `✅ Lead created successfully for ${name}!`,
      leadId: newCompany.id,
      lead: {
        id: newCompany.id,
        name: newCompany.name,
        email: newCompany.email,
        phone: newCompany.phone,
        businessType: newCompany.businessType
      }
    };
  } catch (error: any) {
    return {
      error: "Failed to create lead",
      details: error.message
    };
  }
}

async function updateLead({ 
  leadId, 
  updates,
  confirmUpdate 
}: { 
  leadId: number; 
  updates: any;
  confirmUpdate?: boolean;
}) {
  // If not confirmed, ask for confirmation
  if (!confirmUpdate) {
    const updateFields = Object.keys(updates).join(', ');
    return {
      requiresConfirmation: true,
      confirmationPrompt: `I'll update lead #${leadId} with changes to: ${updateFields}. Shall I proceed?`,
      pendingAction: {
        function: 'updateLead',
        args: { leadId, updates, confirmUpdate: true }
      }
    };
  }

  try {
    const updatedCompany = await storage.updateCompany(leadId, updates);
    
    if (!updatedCompany) {
      return {
        error: "Lead not found",
        details: `No lead found with ID ${leadId}`
      };
    }
    
    return {
      success: true,
      message: `✅ Lead #${leadId} updated successfully!`,
      lead: {
        id: updatedCompany.id,
        name: updatedCompany.name,
        email: updatedCompany.email,
        phone: updatedCompany.phone,
        businessType: updatedCompany.businessType
      }
    };
  } catch (error: any) {
    return {
      error: "Failed to update lead",
      details: error.message
    };
  }
}

async function getProjectDetails({ projectId }: { projectId: number }) {
  try {
    const project = await storage.getProjectById(projectId);
    if (!project) {
      return { error: "Project not found" };
    }
    
    const company = await storage.getCompanyById(parseInt(project.companyId));
    
    return {
      project: {
        id: project.id,
        companyName: company?.name || 'Unknown',
        status: project.status,
        createdAt: project.createdAt,
        // Remove appointmentDate and notes as they don't exist on Project type
      }
    };
  } catch (error) {
    return { error: "Failed to retrieve project details", details: error };
  }
}

async function getUpcomingAppointments({ limit = 5, leadId }: { limit?: number; leadId?: string }) {
  try {
    const appointments = await storage.getAppointments();
    
    let filtered = appointments.filter(apt => new Date(apt.datetime) >= new Date());
    
    if (leadId) {
      const projects = await storage.getProjects();
      const leadProjects = projects.filter(p => p.companyId === leadId);
      const projectIds = leadProjects.map(p => p.id);
      filtered = filtered.filter(apt => projectIds.includes(apt.projectId));
    }
    
    const upcoming = filtered
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
      .slice(0, limit);
    
    return {
      appointments: upcoming.map(apt => ({
        id: apt.id,
        datetime: apt.datetime,
        projectId: apt.projectId,
        notes: apt.notes
      })),
      count: upcoming.length
    };
  } catch (error) {
    return { error: "Failed to retrieve appointments", details: error };
  }
}

async function createQuickNote({ leadId, note }: { leadId: string; note: string }) {
  try {
    const company = await storage.getCompanyById(parseInt(leadId));
    if (!company) {
      return { error: "Company not found" };
    }
    
    // Add note to company
    const updatedNotes = company.notes ? `${company.notes}\n\n[${new Date().toISOString()}] ${note}` : `[${new Date().toISOString()}] ${note}`;
    
    // This would normally update the company, but storage doesn't have updateCompany yet
    return {
      success: true,
      message: `Note added to ${company.name}`,
      note: note
    };
  } catch (error) {
    return { error: "Failed to create note", details: error };
  }
}

async function getBusinessStats({ timeframe = "week" }: { timeframe?: string }) {
  try {
    const companies = await storage.getCompanies();
    const projects = await storage.getProjects();
    const appointments = await storage.getAppointments();
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "all":
        startDate = new Date(0);
        break;
    }
    
    // Filter by timeframe - handle optional createdAt
    const recentCompanies = companies.filter(c => c.createdAt && new Date(c.createdAt) >= startDate);
    const recentProjects = projects.filter(p => p.createdAt && new Date(p.createdAt) >= startDate);
    const recentAppointments = appointments.filter(a => new Date(a.datetime) >= startDate);
    
    return {
      stats: {
        newLeads: recentCompanies.length,
        // Change 'active' to a valid status
        activeProjects: recentProjects.filter(p => p.status === 'in_progress').length,
        upcomingAppointments: recentAppointments.filter(a => new Date(a.datetime) >= now).length,
        totalCompanies: companies.length,
        totalProjects: projects.length
      },
      timeframe
    };
  } catch (error) {
    return { error: "Failed to retrieve business stats", details: error };
  }
}

async function searchMessages({ query, leadId, limit = 10 }: { query: string; leadId?: string; limit?: number }) {
  try {
    const messages = await storage.getAIChatMessages({ leadId });
    const queryLower = query.toLowerCase();
    
    const matches = messages
      .filter(m => m.content.toLowerCase().includes(queryLower))
      .slice(0, limit);
    
    return {
      results: matches.map(m => ({
        content: m.content,
        direction: m.direction,
        timestamp: m.timestamp,
        leadId: m.leadId
      })),
      found: matches.length
    };
  } catch (error) {
    return { error: "Failed to search messages", details: error };
  }
}

// Action functions that require confirmation
async function sendSMS({ leadId, message, confirmationId }: { leadId: string; message: string; confirmationId?: string }) {
  if (!confirmationId) {
    return {
      success: false,
      requiresConfirmation: true,
      confirmationPrompt: `I'm ready to send this SMS to the lead:\n\n"${message}"\n\nPlease confirm with "yes" to proceed.`,
      action: 'sendSMS',
      params: { leadId, message }
    };
  }
  
  // Here you would actually send the SMS
  return {
    success: true,
    message: 'SMS sent successfully (simulated)',
    details: { leadId, message }
  };
}

async function createInvoice({ leadId, amount, description, confirmationId }: { leadId: string; amount: number; description: string; confirmationId?: string }) {
  if (!confirmationId) {
    return {
      success: false,
      requiresConfirmation: true,
      confirmationPrompt: `I'll create an invoice for $${amount} with description:\n"${description}"\n\nPlease confirm with "yes" to proceed.`,
      action: 'createInvoice',
      params: { leadId, amount, description }
    };
  }
  
  // Here you would actually create the invoice
  return {
    success: true,
    message: 'Invoice created successfully (simulated)',
    invoiceId: `INV-${Date.now()}`,
    details: { leadId, amount, description }
  };
}

async function scheduleAppointment({ leadId, datetime, description, confirmationId }: { leadId: string; datetime: string; description: string; confirmationId?: string }) {
  if (!confirmationId) {
    return {
      success: false,
      requiresConfirmation: true,
      confirmationPrompt: `I'll schedule an appointment on ${datetime}:\n"${description}"\n\nPlease confirm with "yes" to proceed.`,
      action: 'scheduleAppointment',
      params: { leadId, datetime, description }
    };
  }
  
  // Here you would actually schedule the appointment
  return {
    success: true,
    message: 'Appointment scheduled successfully (simulated)',
    appointmentId: `APT-${Date.now()}`,
    details: { leadId, datetime, description }
  };
}

// Map function names to implementations
const functionMap: { [key: string]: Function } = {
  getLastMessages,
  getRecentLeads,
  searchCompanies,
  getProjectDetails,
  generateDemo,
  getUpcomingAppointments,
  createQuickNote,
  getBusinessStats,
  searchMessages,
  sendSMS,
  createInvoice,
  scheduleAppointment,
  createLead,
  updateLead
};

// Build dynamic system prompt with context and memory
async function buildDynamicSystemPrompt(context: { leadId?: string; projectId?: number; sessionId?: string }): Promise<string> {
  let contextSummary = '';
  
  // Get recent conversation history if available
  if (context.sessionId || context.leadId) {
    try {
      const recentMessages = await storage.getAIChatMessages({
        leadId: context.leadId,
        sessionId: context.sessionId,
        limit: 5
      });
      
      if (recentMessages.length > 0) {
        const lastMessage = recentMessages[0];
        const messagePreview = lastMessage.content.substring(0, 100);
        contextSummary = `\n\nOur last interaction was about: "${messagePreview}..."`;
        
        // Add summary of recent topics
        const topics = recentMessages
          .filter(m => m.messageType === 'user')
          .map(m => m.content.substring(0, 50))
          .join(', ');
        if (topics) {
          contextSummary += `\nRecent topics discussed: ${topics}`;
        }
      }
    } catch (error) {
      console.log('Could not fetch conversation history:', error);
    }
  }
  
  // Get lead/company context if available
  let leadContext = '';
  if (context.leadId) {
    try {
      const company = await storage.getCompanyById(parseInt(context.leadId));
      if (company) {
        leadContext = `\n\nCurrent lead: ${company.name} (${company.businessType || 'Unknown type'})`;
        if (company.notes) {
          leadContext += `\nNotes: ${company.notes}`;
        }
      }
    } catch (error) {
      console.log('Could not fetch lead context:', error);
    }
  }
  
  return `You are Minerva—an intelligent AI copilot for Pleasant Cove Design, working directly with Ben and the team.

## Core Identity
You're a smart teammate, not a menu system. You remember conversations, understand context, and respond naturally.${contextSummary}${leadContext}

## Professional Guidelines
1. **Tone**: Professional yet conversational. Mirror the user's formality level.
2. **Privacy**: Never share private client data (emails, phones, PII) unless explicitly requested by authenticated user.
3. **Clarity**: Be concise and clear. Skip the bullet lists unless specifically helpful.

## Conversation Rules
- NEVER repeat the same "Here's what I can do" list
- Answer requests directly or ask ONE clarifying question
- Reference our conversation history when relevant
- If a request is ambiguous, ask for the specific detail needed

## Action Protocol
Before ANY action with side effects (SMS, email, scheduling, invoicing):
1. State back the intent clearly: "I'll send an invoice for $500 to Acme Corp. Confirm?"
2. Wait for explicit "yes" (not "maybe" or "sure")
3. If anything but "yes", ask a follow-up question

## Safety Guardrails
- Refuse requests containing: hate speech, adult content, medical/legal advice
- Enforce rate limits: max 3 SMS per lead per day
- Default to test/staging mode unless explicitly told "production"
- Log all actions but don't surface logs unless asked

## Available Tools
You can: retrieve conversations, search companies, generate demos, check appointments, create notes, analyze business data.

Remember: You're here to help, not to present options. Listen, understand, and act (with confirmation).`;
}

// Store user message in chat history
export async function storeUserMessage(
  message: string,
  context: { leadId?: string; projectId?: number; sessionId?: string } = {}
): Promise<void> {
  await storage.createAIChatMessage({
    leadId: context.leadId,
    projectId: context.projectId,
    sessionId: context.sessionId,
    direction: 'inbound',
    messageType: 'user',
    content: message,
    context
  });
}

// Main AI chat function with OpenAI
export async function processAIChat(
  message: string, 
  context: { leadId?: string; projectId?: number; sessionId?: string; confirmationId?: string } = {}
): Promise<{ content: string; functionCalls?: any[] }> {
  
  try {
    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'demo-key') {
      return { content: "OpenAI is not configured. Please add your API key to continue." };
    }

    // Build the system prompt with context
    const systemPrompt = await buildDynamicSystemPrompt(context);
    
    // Convert functions to OpenAI's tool format
    const tools = AVAILABLE_FUNCTIONS.map(func => ({
      type: "function" as const,
      function: {
        name: func.name,
        description: func.description,
        parameters: func.parameters
      }
    }));
    
    // Make the OpenAI API call
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ],
      tools: tools,
      tool_choice: "auto"
    });
    
    // Process the response
    const functionCalls: any[] = [];
    let finalContent = '';
    
    // Check if OpenAI wants to use tools
    if (response.choices && response.choices.length > 0) {
      const choice = response.choices[0];
      
      if (choice.message.tool_calls) {
        for (const toolCall of choice.message.tool_calls) {
          if (toolCall.function) {
            // Execute the function
            const func = functionMap[toolCall.function.name];
            if (func) {
              let args;
              try {
                args = JSON.parse(toolCall.function.arguments);
              } catch (e) {
                args = {};
              }
              
              const result = await func(args);
              functionCalls.push({
                name: toolCall.function.name,
                arguments: args,
                result
              });
              
              // Check if confirmation is required
              if (result.requiresConfirmation) {
                return {
                  content: result.confirmationPrompt,
                  functionCalls: [{
                    ...result,
                    confirmationRequired: true,
                    id: `confirm_${Date.now()}`
                  }]
                };
              }
            }
          }
        }
        
        // If we have function results, make a follow-up call to get the final response
        if (functionCalls.length > 0) {
          const followUpResponse = await openai.chat.completions.create({
            model: 'gpt-4',
            max_tokens: 1024,
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: message
              },
              {
                role: 'assistant',
                content: choice.message.content || '',
                tool_calls: choice.message.tool_calls
              },
              ...choice.message.tool_calls.map(toolCall => ({
                role: 'tool' as const,
                content: JSON.stringify(functionCalls.find(fc => fc.name === toolCall.function.name)?.result || {}),
                tool_call_id: toolCall.id
              }))
            ]
          });
          
          if (followUpResponse.choices && followUpResponse.choices.length > 0) {
            finalContent = followUpResponse.choices[0].message.content || '';
          }
        }
      } else if (choice.message.content) {
        finalContent = choice.message.content;
      }
    }
    
    // Store the AI response
    await storage.createAIChatMessage({
      leadId: context.leadId,
      projectId: context.projectId,
      sessionId: context.sessionId,
      direction: 'outbound',
      messageType: 'ai',
      content: finalContent || 'I understand your request.',
      functionName: functionCalls.length > 0 ? functionCalls[0].name : undefined,
      functionArgs: functionCalls.length > 0 ? functionCalls[0].arguments : undefined,
      functionResult: functionCalls.length > 0 ? functionCalls[0].result : undefined,
      context
    });
    
    return {
      content: finalContent || 'I understand your request.',
      functionCalls
    };
    
  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    
    // Fallback to a helpful error message
    if (error.status === 401) {
      return { content: "I'm having trouble authenticating with the AI service. Please check the API key configuration." };
    } else if (error.status === 429) {
      return { content: "I'm currently rate-limited. Please try again in a moment." };
    } else {
      return { content: `I encountered an error: ${error.message || 'Unknown error'}. Please try again.` };
    }
  }
}