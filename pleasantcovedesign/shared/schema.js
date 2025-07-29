"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageSchema = exports.insertCampaignSchema = exports.insertBusinessSchema = exports.insertProjectSchema = exports.insertCompanySchema = exports.progressEntries = exports.appointments = exports.templates = exports.campaigns = exports.activities = exports.projects = exports.companies = exports.businesses = exports.PROJECT_TYPES = exports.PIPELINE_STAGES = void 0;
const zod_1 = require("zod");
// Pipeline stages enum
exports.PIPELINE_STAGES = [
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
exports.PROJECT_TYPES = [
    "website",
    "seo",
    "ecommerce",
    "branding",
    "maintenance",
    "consultation"
];
// Mock schema objects for compatibility
exports.businesses = { tableName: 'businesses' };
exports.companies = { tableName: 'companies' }; // NEW
exports.projects = { tableName: 'projects' }; // NEW
exports.activities = { tableName: 'activities' };
exports.campaigns = { tableName: 'campaigns' };
exports.templates = { tableName: 'templates' };
exports.appointments = { tableName: 'appointments' };
exports.progressEntries = { tableName: 'progress_entries' };
// Zod validation schemas
exports.insertCompanySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Company name is required"),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
    phone: zod_1.z.string().min(1, "Phone number is required"),
    address: zod_1.z.string().min(1, "Address is required"),
    city: zod_1.z.string().min(1, "City is required"),
    state: zod_1.z.string().min(1, "State is required"),
    industry: zod_1.z.string().min(1, "Industry is required"),
    website: zod_1.z.string().optional().or(zod_1.z.literal("")),
    priority: zod_1.z.enum(["low", "medium", "high"]).default("medium"),
    tags: zod_1.z.array(zod_1.z.string()).optional()
});
exports.insertProjectSchema = zod_1.z.object({
    companyId: zod_1.z.number().min(1, "Company ID is required"),
    title: zod_1.z.string().min(1, "Project title is required"),
    type: zod_1.z.enum(exports.PROJECT_TYPES).default("website"),
    stage: zod_1.z.enum(exports.PIPELINE_STAGES).default("scraped"),
    status: zod_1.z.enum(["active", "archived", "cancelled"]).default("active"),
    score: zod_1.z.number().min(0).max(100).default(0),
    notes: zod_1.z.string().optional().or(zod_1.z.literal("")),
    totalAmount: zod_1.z.number().optional(),
    paidAmount: zod_1.z.number().optional(),
    scheduledTime: zod_1.z.string().optional(),
    appointmentStatus: zod_1.z.string().optional(),
    paymentStatus: zod_1.z.string().optional()
});
exports.insertBusinessSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Business name is required"),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
    phone: zod_1.z.string().min(1, "Phone number is required"),
    address: zod_1.z.string().min(1, "Address is required"),
    city: zod_1.z.string().min(1, "City is required"),
    state: zod_1.z.string().min(1, "State is required"),
    businessType: zod_1.z.string().min(1, "Business type is required"),
    stage: zod_1.z.enum(exports.PIPELINE_STAGES).default("scraped"),
    website: zod_1.z.string().optional().or(zod_1.z.literal("")),
    notes: zod_1.z.string().optional().or(zod_1.z.literal("")),
    score: zod_1.z.number().min(0).max(100).default(0),
    priority: zod_1.z.enum(["low", "medium", "high"]).default("medium"),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    scheduledTime: zod_1.z.string().optional(),
    appointmentStatus: zod_1.z.string().optional(),
    paymentStatus: zod_1.z.string().optional(),
    totalAmount: zod_1.z.number().optional(),
    paidAmount: zod_1.z.number().optional()
});
exports.insertCampaignSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Campaign name is required"),
    businessType: zod_1.z.string().min(1, "Business type is required"),
    status: zod_1.z.enum(["active", "paused", "completed"]).default("active"),
    totalContacts: zod_1.z.number().min(0).default(0),
    sentCount: zod_1.z.number().min(0).default(0),
    responseCount: zod_1.z.number().min(0).default(0),
    message: zod_1.z.string().min(1, "Message is required")
});
exports.messageSchema = zod_1.z.object({
    id: zod_1.z.number(),
    projectId: zod_1.z.number(),
    senderType: zod_1.z.enum(['client', 'admin']),
    senderName: zod_1.z.string(),
    content: zod_1.z.string(),
    attachments: zod_1.z.array(zod_1.z.string()).optional(),
    createdAt: zod_1.z.string(),
});
