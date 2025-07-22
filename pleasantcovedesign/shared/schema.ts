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
  id: number;
  companyId: string;
  name: string;
  type: 'website' | 'seo' | 'maintenance' | 'other';
  status: 'lead' | 'quoted' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  value?: number;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
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

// Mock schema objects for compatibility
export const businesses = { tableName: 'businesses' };
export const companies = { tableName: 'companies' }; // NEW
export const projects = { tableName: 'projects' }; // NEW
export const activities = { tableName: 'activities' };
export const campaigns = { tableName: 'campaigns' };
export const templates = { tableName: 'templates' };
export const appointments = { tableName: 'appointments' };
export const progressEntries = { tableName: 'progress_entries' };

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

// Type exports for compatibility
export type NewBusiness = Omit<Business, 'id'>;
export type NewCompany = Omit<Company, 'id'>;
export type NewProject = Omit<Project, 'id'>;
export type NewActivity = Omit<Activity, 'id'>;
export type NewCampaign = Omit<Campaign, 'id'>;
export type NewAppointment = Omit<Appointment, 'id'>;
export type NewProgressEntry = Omit<ProgressEntry, 'id'>;

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