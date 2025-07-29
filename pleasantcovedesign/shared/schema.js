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
];
// Project types enum
export const PROJECT_TYPES = [
    "website",
    "seo",
    "ecommerce",
    "branding",
    "maintenance",
    "consultation"
];
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
export const messageSchema = z.object({
    id: z.number(),
    projectId: z.number(),
    senderType: z.enum(['client', 'admin']),
    senderName: z.string(),
    content: z.string(),
    attachments: z.array(z.string()).optional(),
    createdAt: z.string(),
});
//# sourceMappingURL=schema.js.map