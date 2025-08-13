import { z } from "zod";

// Pipeline stages enum
export const PIPELINE_STAGES = [
  "scraped",
  "contacted", 
  "responded",
  "scheduled",
  "quoted",
  "sold",
  "in_progress",
  "delivered",
  "paid"
] as const;

// Project types enum
export const PROJECT_TYPES = [
  "website",
  "seo", 
  "ecommerce",
  "branding",
  "maintenance",
  "consultation"
] as const;

// Company interface (core client information)
export interface Company {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  businessType?: string;
  description?: string;
  score?: number;
  tags?: string[];
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Project interface (specific deliverables/jobs)
export interface Project {
  id?: number;
  companyId: number;
  title: string;
  type: string; // website, seo, ecommerce, branding, etc.
  stage: string;
  status: string; // active, archived, cancelled
  score?: number;
  notes?: string;
  totalAmount?: number;
  paidAmount?: number;
  scheduledTime?: string;
  appointmentStatus?: string;
  paymentStatus?: string;
  stripeCustomerId?: string;
  stripePaymentLinkId?: string;
  lastPaymentDate?: string;
  paymentNotes?: string;
  accessToken?: string; // UUID token for client portal access
  createdAt?: string;
  updatedAt?: string;
}

// NEW: Order tracking for billing
export interface Order {
  id: string;
  companyId: string;
  projectId?: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'in_progress' | 'completed';
  package?: 'starter' | 'growth' | 'professional';
  customItems?: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  // Invoice tracking fields
  invoiceId?: string;
  invoiceStatus?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  invoiceUrl?: string;
  paymentStatus?: 'pending' | 'partial' | 'paid' | 'refunded';
  paymentMethod?: string;
  paymentDate?: Date;
  stripePaymentIntentId?: string;
  // Stripe payment fields
  stripePaymentLinkUrl?: string;
  stripeProductId?: string;
  stripePriceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  description: string;
  category: 'core' | 'addon' | 'custom';
  quantity: number;
  unitPrice: number;
  total: number;
}

// Proposal interface (Phase 1: Convert leads to structured proposals)
export interface Proposal {
  id: string;
  leadId: number; // References companies.id
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  totalAmount: number;
  lineItems: ProposalLineItem[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProposalLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// NEW: Project Brief interface for meeting notes and client confirmation
export interface ProjectBrief {
  id: string;
  orderId: string;
  companyId: string;
  projectId?: number;
  
  // Meeting Information
  meetingDate?: Date;
  attendees?: string[];
  meetingNotes?: string;
  
  // Brand & Design Preferences
  brandColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    preferences?: string; // "blue tones", "earthy", etc.
  };
  
  logoInfo?: {
    hasExistingLogo?: boolean;
    logoFiles?: string[]; // URLs to uploaded logos
    logoStyle?: 'modern' | 'classic' | 'minimal' | 'playful' | 'professional';
    logoNotes?: string;
  };
  
  designStyle?: {
    overall?: 'modern' | 'classic' | 'minimal' | 'bold' | 'elegant' | 'playful';
    inspiration?: string[]; // URLs or descriptions
    competitorSites?: string[];
    avoidStyles?: string;
    designNotes?: string;
  };
  
  // Content & Functionality
  contentPlan?: {
    copyWriter?: 'client' | 'pcd' | 'hybrid';
    photography?: 'client' | 'pcd' | 'stock' | 'hybrid';
    videoNeeds?: boolean;
    contentDeadline?: Date;
    contentNotes?: string;
  };
  
  siteStructure?: {
    pages?: Array<{
      name: string;
      purpose: string;
      priority: 'must-have' | 'nice-to-have';
    }>;
    navigation?: string;
    specialFeatures?: string[];
    integrations?: string[]; // "booking system", "payment", "social media"
  };
  
  // Timeline & Communication
  timeline?: {
    launchGoal?: Date;
    milestones?: Array<{
      name: string;
      target: Date;
      description: string;
    }>;
    urgency?: 'standard' | 'priority' | 'rush';
    timelineNotes?: string;
  };
  
  stakeholders?: {
    decisionMaker?: string;
    primaryContact?: string;
    reviewers?: string[];
    approvalProcess?: string;
  };
  
  // Client Confirmation
  clientStatus?: 'pending' | 'confirmed' | 'requested_changes' | 'approved';
  clientFeedback?: string;
  clientChanges?: Array<{
    section: string;
    change: string;
    timestamp: Date;
  }>;
  confirmationDate?: Date;
  
  // Admin tracking
  completedBy?: string; // Admin who filled it out
  status: 'draft' | 'sent_to_client' | 'client_reviewing' | 'approved' | 'needs_revision';
  createdAt: Date;
  updatedAt: Date;
}

// NEW: Lead status with order tracking
export interface LeadStatus {
  companyId: string;
  stage: 'scraped' | 'contacted' | 'demo_sent' | 'interested' | 'quoted' | 'customer' | 'lost';
  lastActivity?: Date;
  demoViewed?: boolean;
  orderId?: string;  // Links to their order
  invoiceId?: string; // Links to billing
}

// Business interface (legacy - for backward compatibility)
export interface Business {
  id?: number;
  name: string;
  email?: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  businessType: string;
  stage: string;
  website?: string;
  notes?: string;
  score?: number;
  priority?: string;
  tags?: string[];
  lastContactDate?: string;
  scheduledTime?: string;
  appointmentStatus?: string;
  paymentStatus?: string;
  totalAmount?: number;
  paidAmount?: number;
  stripeCustomerId?: string;
  stripePaymentLinkId?: string;
  lastPaymentDate?: string;
  paymentNotes?: string;
  createdAt?: string;
}

// Activity interface (updated to be project-aware)
export interface Activity {
  id?: number;
  type: string;
  description: string;
  companyId?: number;
  projectId?: number; // NEW: can be associated with specific project
  businessId?: number; // legacy compatibility
  createdAt?: string;
}

// Campaign interface
export interface Campaign {
  id?: number;
  name: string;
  businessType: string;
  status: string;
  totalContacts: number;
  sentCount: number;
  responseCount: number;
  message: string;
  createdAt?: string;
}

// Template interface
export interface Template {
  id?: number;
  name: string;
  businessType: string;
  description: string;
  usageCount: number;
  previewUrl?: string;
  features?: string;
}

// Appointment interface (updated to be project-aware)
export interface Appointment {
  id?: number;
  companyId?: number; // NEW: company association
  projectId?: number; // NEW: specific project association
  businessId?: number; // legacy compatibility
  projectToken?: string; // NEW: project token for privacy
  
  // Acuity-specific fields
  acuityId?: string; // Acuity's appointment ID
  email?: string; // Client email from Acuity
  firstName?: string; // Client first name
  lastName?: string; // Client last name
  phone?: string; // Client phone
  
  datetime: string;
  endTime?: string; // End time for appointment
  duration?: number; // Duration in minutes
  serviceType?: string; // Type of service booked
  appointmentTypeId?: string; // Acuity appointment type ID
  
  // Meeting fields
  meetingType?: 'zoom' | 'facetime' | 'phone' | 'in-person'; // Type of meeting
  meetingLink?: string; // Zoom meeting URL
  meetingId?: string; // Zoom meeting ID
  meetingPassword?: string; // Zoom meeting password (encrypted)
  dialInNumber?: string; // Phone number for phone meetings
  meetingInstructions?: string; // Custom instructions for the meeting
  
  status: string; // scheduled, completed, cancelled, rescheduled
  notes?: string;
  isAutoScheduled?: boolean;
  squarespaceId?: string; // For legacy Squarespace integration
  
  // Webhook tracking
  webhookAction?: string; // scheduled, rescheduled, canceled, changed
  acuityWebhookId?: string; // Acuity webhook delivery ID
  
  createdAt?: string;
  updatedAt?: string;
}

// Progress entry interface (updated to be project-aware)
export interface ProgressEntry {
  id?: number;
  companyId?: number; // NEW: company association
  projectId?: number; // NEW: specific project association  
  businessId?: number; // legacy compatibility
  stage: string;
  imageUrl: string;
  date: string;
  notes?: string;
  publiclyVisible?: number;
  paymentRequired?: number;
  paymentAmount?: number;
  paymentStatus?: string;
  paymentNotes?: string;
  stripeLink?: string;
  createdAt?: string;
  updatedAt?: string;
}

// NEW: Project Message interface for client-admin communication
export interface ProjectMessage {
  id?: number;
  projectId: number;
  senderType: 'admin' | 'client';
  senderName: string;
  content: string;
  attachments?: string[]; // Array of file URLs
  readAt?: string; // When the message was read by recipient
  createdAt?: string;
  updatedAt?: string;
}

// NEW: Project File interface for file management
export interface ProjectFile {
  id?: number;
  projectId: number;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  fileType?: string;
  uploadedBy: 'admin' | 'client';
  uploaderName: string;
  description?: string;
  createdAt?: string;
}

// AI Chat Message interface for conversational recall
export interface AIChatMessage {
  id?: number;
  leadId?: string; // Company ID or lead identifier
  projectId?: number; // Optional project context
  direction: 'inbound' | 'outbound'; // user -> AI or AI -> user
  messageType: 'user' | 'ai' | 'function_call' | 'function_response';
  content: string;
  functionName?: string; // If this was a function call
  functionArgs?: any; // Function arguments
  functionResult?: any; // Function execution result
  context?: any; // Additional context (current page, selected items, etc.)
  timestamp: Date;
  sessionId?: string; // Group related messages
}

// Mock schema objects for compatibility
export const businesses = { tableName: 'businesses' };
export const companies = { tableName: 'companies' }; // NEW
export const projects = { tableName: 'projects' }; // NEW
export const activities = { tableName: 'activities' };
export const campaigns = { tableName: 'campaigns' };
export const templates = { tableName: 'templates' };
export const appointments = { tableName: 'appointments' };
export const progressEntries = { tableName: 'progress_entries' };
export const proposals = { tableName: 'proposals' }; // NEW

// Zod validation schemas
export const insertCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  industry: z.string().min(1, "Industry is required"),
  website: z.string().optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  tags: z.array(z.string()).optional()
});

export const insertProjectSchema = z.object({
  companyId: z.number().min(1, "Company ID is required"),
  title: z.string().min(1, "Project title is required"),
  type: z.enum(PROJECT_TYPES).default("website"),
  stage: z.enum(PIPELINE_STAGES).default("scraped"),
  status: z.enum(["active", "archived", "cancelled"]).default("active"),
  score: z.number().min(0).max(100).default(0),
  notes: z.string().optional().or(z.literal("")),
  totalAmount: z.number().optional(),
  paidAmount: z.number().optional(),
  scheduledTime: z.string().optional(),
  appointmentStatus: z.string().optional(),
  paymentStatus: z.string().optional()
});

export const insertBusinessSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  businessType: z.string().min(1, "Business type is required"),
  stage: z.enum(PIPELINE_STAGES).default("scraped"),
  website: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  score: z.number().min(0).max(100).default(0),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  tags: z.array(z.string()).optional(),
  scheduledTime: z.string().optional(),
  appointmentStatus: z.string().optional(),
  paymentStatus: z.string().optional(),
  totalAmount: z.number().optional(),
  paidAmount: z.number().optional()
});

export const insertCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  businessType: z.string().min(1, "Business type is required"),
  status: z.enum(["active", "paused", "completed"]).default("active"),
  totalContacts: z.number().min(0).default(0),
  sentCount: z.number().min(0).default(0),
  responseCount: z.number().min(0).default(0),
  message: z.string().min(1, "Message is required")
});

export const proposalLineItemSchema = z.object({
  description: z.string().min(1, "Description is required").max(500, "Description too long"),
  quantity: z.number().min(1, "Quantity must be at least 1").max(1000, "Quantity too large"),
  unitPrice: z.number().min(0.01, "Unit price must be greater than zero").max(1000000, "Unit price too large"),
  total: z.number().min(0.01, "Total must be greater than zero")
}).refine((data) => {
  // Validate total = quantity * unitPrice (with small tolerance for floating point)
  const calculatedTotal = data.quantity * data.unitPrice;
  return Math.abs(calculatedTotal - data.total) < 0.01;
}, {
  message: "Total must equal quantity × unit price",
  path: ["total"]
});

export const insertProposalSchema = z.object({
  leadId: z.number().min(1, "Lead ID is required"),
  status: z.enum(["draft", "sent", "accepted", "rejected"]).default("draft"),
  totalAmount: z.number().min(0.01, "Total amount must be greater than zero").max(10000000, "Total amount too large"),
  lineItems: z.array(proposalLineItemSchema).min(1, "At least one line item is required").max(50, "Too many line items"),
  notes: z.string().max(2000, "Notes too long").optional().or(z.literal(""))
}).refine((data) => {
  // Validate total amount matches sum of line items
  const calculatedTotal = data.lineItems.reduce((sum, item) => sum + item.total, 0);
  return Math.abs(calculatedTotal - data.totalAmount) < 0.01;
}, {
  message: "Total amount must equal sum of line item totals",
  path: ["totalAmount"]
});

export const updateProposalSchema = z.object({
  leadId: z.number().min(1, "Lead ID is required").optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected"]).optional(),
  totalAmount: z.number().min(0.01, "Total amount must be greater than zero").max(10000000, "Total amount too large").optional(),
  lineItems: z.array(proposalLineItemSchema).min(1, "At least one line item is required").max(50, "Too many line items").optional(),
  notes: z.string().max(2000, "Notes too long").optional().or(z.literal(""))
}).refine((data) => {
  // Only validate total if both lineItems and totalAmount are provided
  if (data.lineItems && data.totalAmount) {
    const calculatedTotal = data.lineItems.reduce((sum, item) => sum + item.total, 0);
    return Math.abs(calculatedTotal - data.totalAmount) < 0.01;
  }
  return true;
}, {
  message: "Total amount must equal sum of line item totals",
  path: ["totalAmount"]
});

// Type exports for compatibility
export type NewBusiness = Omit<Business, 'id'>;
export type NewCompany = Omit<Company, 'id'>;
export type NewProject = Omit<Project, 'id'>;
export type NewActivity = Omit<Activity, 'id'>;
export type NewCampaign = Omit<Campaign, 'id'>;
export type NewAppointment = Omit<Appointment, 'id'>;
export type NewProgressEntry = Omit<ProgressEntry, 'id'>;
export type NewProposal = Omit<Proposal, 'id' | 'createdAt' | 'updatedAt'>;

export const messageSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  senderType: z.enum(['client', 'admin']),
  senderName: z.string(),
  content: z.string(),
  attachments: z.array(z.string()).optional(),
  createdAt: z.string(),
});

export type Message = z.infer<typeof messageSchema>;

// Lead Management System (Unified Pipeline)
export interface Lead {
  id: string; // UUID
  name: string;
  category?: string;
  source: 'scraper' | 'manual' | 'import';
  
  // Contact info (normalized)
  phoneRaw?: string;
  phoneNormalized?: string;
  emailRaw?: string;
  emailNormalized?: string;
  
  // Address (normalized)
  addressRaw?: string;
  addressLine1?: string;
  city?: string;
  region?: string; // state/province
  postalCode?: string;
  country?: string;
  lat?: number;
  lng?: number;
  
  // Website verification
  websiteUrl?: string;
  websiteStatus: 'HAS_SITE' | 'NO_SITE' | 'SOCIAL_ONLY' | 'UNSURE' | 'UNKNOWN';
  websiteConfidence: number; // 0.0 to 1.0
  websiteLastCheckedAt?: Date;
  socialUrls: string[];
  
  // Google Maps data
  placeId?: string;
  mapsUrl?: string;
  mapsRating?: number;
  mapsReviews?: number;
  
  // Deduplication
  dedupKey?: string;
  
  // Metadata
  raw?: any; // original scraper payload
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScrapeRun {
  id: string; // UUID
  city: string;
  category: string;
  limitRequested: number;
  status: 'running' | 'completed' | 'failed';
  leadsFound: number;
  leadsProcessed: number;
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface WebsiteVerificationResult {
  url?: string;
  status: 'HAS_SITE' | 'NO_SITE' | 'SOCIAL_ONLY' | 'UNSURE';
  confidence: number;
  candidates?: string[];
}

// Validation schemas for leads
export const insertLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().optional(),
  source: z.enum(['scraper', 'manual', 'import']).default('manual'),
  phoneRaw: z.string().optional(),
  emailRaw: z.string().optional(),
  addressRaw: z.string().optional(),
  websiteUrl: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional()
});

export const startScrapeSchema = z.object({
  city: z.string().min(1, "City is required"),
  category: z.string().min(1, "Category is required"),
  limit: z.number().min(1).max(1000).default(200)
});

export type NewLead = Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>; 