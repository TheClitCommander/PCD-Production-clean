import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { InferSelectModel, InferInsertModel, sql } from "drizzle-orm";

export const businesses = sqliteTable("businesses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  businessType: text("business_type").notNull(),
  stage: text("stage").notNull().default("scraped"),
  website: text("website"),
  notes: text("notes").default(""),
  score: integer("score").default(0),
  priority: text("priority").default("medium"),
  tags: text("tags"),
  source: text("source").default("manual"), // 'scraped' | 'acuity' | 'squarespace' | 'manual'
  lastContactDate: text("last_contact_date"),
  scheduledTime: text("scheduled_time"),
  appointmentStatus: text("appointment_status").default("confirmed"), // 'confirmed' | 'completed' | 'no-show'
  
  // Payment tracking
  paymentStatus: text("payment_status").default("pending"), // 'pending' | 'partial' | 'paid' | 'overdue'
  totalAmount: integer("total_amount").default(0), // Amount in cents
  paidAmount: integer("paid_amount").default(0), // Amount in cents
  stripeCustomerId: text("stripe_customer_id"),
  stripePaymentLinkId: text("stripe_payment_link_id"),
  lastPaymentDate: text("last_payment_date"),
  paymentNotes: text("payment_notes"),
  
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const campaigns = sqliteTable("campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  businessType: text("business_type").notNull(),
  status: text("status").notNull().default("active"),
  totalContacts: integer("total_contacts").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  responseCount: integer("response_count").notNull().default(0),
  message: text("message").notNull(),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const templates = sqliteTable("templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  businessType: text("business_type").notNull(),
  description: text("description").notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  previewUrl: text("preview_url"),
  features: text("features"),
});

export const activities = sqliteTable("activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  description: text("description").notNull(),
  businessId: integer("business_id").references(() => businesses.id),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const availabilityConfig = sqliteTable("availability_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sunday-Saturday)
  startTime: text("start_time").notNull(), // "09:00"
  endTime: text("end_time").notNull(), // "17:00"
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const blockedDates = sqliteTable("blocked_dates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // "2025-06-15"
  startTime: text("start_time"), // "08:30" - null means whole day
  endTime: text("end_time"), // "09:30" - null means whole day
  reason: text("reason"), // Optional reason for blocking
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const appointments = sqliteTable("appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  businessId: integer("business_id").notNull().references(() => businesses.id),
  datetime: text("datetime").notNull(), // ISO datetime string
  status: text("status").notNull().default("confirmed"), // 'confirmed' | 'completed' | 'no-show' | 'cancelled'
  notes: text("notes"),
  isAutoScheduled: integer("is_auto_scheduled", { mode: 'boolean' }).notNull().default(false),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const progressEntries = sqliteTable("progress_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  businessId: integer("business_id").references(() => businesses.id, { onDelete: "cascade" }).notNull(),
  stage: text("stage").notNull(),
  imageUrl: text("image_url").notNull(),
  date: text("date").notNull(),
  notes: text("notes"),
  publiclyVisible: integer("publicly_visible", { mode: "boolean" }).default(true),
  
  // Payment metadata fields
  paymentRequired: integer("payment_required", { mode: "boolean" }).default(false),
  paymentAmount: integer("payment_amount"), // Amount in cents (e.g., 25000 = $250.00)
  paymentStatus: text("payment_status").$type<'pending' | 'partial' | 'paid'>(),
  paymentNotes: text("payment_notes"),
  stripeLink: text("stripe_link"),
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Insert schemas
export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertAvailabilityConfigSchema = createInsertSchema(availabilityConfig).omit({
  id: true,
  createdAt: true,
});

export const insertBlockedDateSchema = createInsertSchema(blockedDates).omit({
  id: true,
  createdAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProgressEntrySchema = createInsertSchema(progressEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type AvailabilityConfig = typeof availabilityConfig.$inferSelect;
export type InsertAvailabilityConfig = z.infer<typeof insertAvailabilityConfigSchema>;
export type BlockedDate = typeof blockedDates.$inferSelect;
export type InsertBlockedDate = z.infer<typeof insertBlockedDateSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type ProgressEntry = InferSelectModel<typeof progressEntries>;
export type InsertProgressEntry = InferInsertModel<typeof progressEntries>;

// Pipeline stages
export const PIPELINE_STAGES = ["scraped", "scheduled", "contacted", "interested", "sold", "delivered"] as const;
export type PipelineStage = typeof PIPELINE_STAGES[number];

// Business types
export const BUSINESS_TYPES = [
  "auto_repair",
  "plumbing", 
  "electrical",
  "landscaping",
  "roofing",
  "cleaning",
  "hvac",
  "general_contractor"
] as const;
export type BusinessType = typeof BUSINESS_TYPES[number];
