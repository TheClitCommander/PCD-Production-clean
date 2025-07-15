import { 
  businesses, 
  campaigns, 
  templates, 
  activities,
  type Business, 
  type InsertBusiness,
  type Campaign,
  type InsertCampaign,
  type Template,
  type InsertTemplate,
  type Activity,
  type InsertActivity,
  type PipelineStage,
  PIPELINE_STAGES,
  BUSINESS_TYPES,
  availabilityConfig,
  type AvailabilityConfig,
  type InsertAvailabilityConfig,
  blockedDates,
  type BlockedDate,
  type InsertBlockedDate
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Business operations
  getBusinesses(): Promise<Business[]>;
  getBusinessesByStage(stage: PipelineStage): Promise<Business[]>;
  getBusinessById(id: number): Promise<Business | undefined>;
  getBusiness(id: number): Promise<Business | undefined>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  updateBusiness(id: number, updates: Partial<Business>): Promise<Business>;
  deleteBusiness(id: number): Promise<void>;
  
  // Campaign operations
  getCampaigns(): Promise<Campaign[]>;
  getCampaignById(id: number): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign>;
  
  // Template operations
  getTemplates(): Promise<Template[]>;
  getTemplateById(id: number): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplateUsage(id: number): Promise<void>;
  
  // Activity operations
  getActivities(): Promise<Activity[]>;
  getRecentActivities(limit?: number): Promise<Activity[]>;
  getBusinessActivities(businessId: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Availability operations
  getAvailabilityConfig(): Promise<AvailabilityConfig[]>;
  updateAvailabilityConfig(configs: InsertAvailabilityConfig[]): Promise<void>;
  
  // Blocked dates operations
  getBlockedDates(): Promise<BlockedDate[]>;
  getBlockedDatesByRange(startDate: string, endDate: string): Promise<BlockedDate[]>;
  createBlockedDate(blockedDate: InsertBlockedDate): Promise<BlockedDate>;
  deleteBlockedDate(id: number): Promise<void>;
  
  // Stats
  getStats(): Promise<{
    totalLeads: number;
    stageStats: Record<PipelineStage, number>;
    activeCampaigns: number;
    conversionRate: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getBusinesses(): Promise<Business[]> {
    const results = await db.select().from(businesses);
    
    // If no businesses exist, create some sample data
    if (results.length === 0) {
      const sampleBusinesses = [
        {
          name: "Coastal Electric",
          email: "info@coastalelectric.me",
          phone: "(207) 555-0123",
          address: "123 Main St",
          city: "Portland",
          state: "ME",
          businessType: "electrical",
          stage: "scraped" as const,
          score: 85,
          priority: "high",
          lastContactDate: null,
          notes: "No website found. High-value electrical contractor serving Portland area."
        },
        {
          name: "Bath Plumbing Co",
          email: "contact@bathplumbing.com",
          phone: "(207) 555-0198",
          address: "456 Water St",
          city: "Bath",
          state: "ME",
          businessType: "plumbing",
          stage: "scraped" as const,
          score: 78,
          priority: "high",
          lastContactDate: null,
          notes: "Family-owned plumbing business. Outdated Facebook page only."
        },
        {
          name: "Brunswick Tire Shop",
          email: "service@brunswicktire.com",
          phone: "(207) 555-0176",
          address: "789 Auto Ave",
          city: "Brunswick",
          state: "ME",
          businessType: "automotive",
          stage: "scraped" as const,
          score: 72,
          priority: "medium",
          lastContactDate: null,
          notes: "Recently scraped from local directory. Good reviews on Google."
        },
        {
          name: "Yarmouth Dental",
          email: "hello@yarmouthdental.com", 
          phone: "(207) 555-0145",
          address: "321 Health Blvd",
          city: "Yarmouth",
          state: "ME",
          businessType: "healthcare",
          stage: "delivered" as const,
          score: 95,
          priority: "low",
          lastContactDate: new Date(Date.now() - 172800000).toISOString(),
          notes: "Website delivered and live. Very happy with results!"
        },
        {
          name: "Camden Landscaping",
          email: "info@camdenlandscaping.com",
          phone: "(207) 555-0187",
          address: "567 Garden Way",
          city: "Camden",
          state: "ME",
          businessType: "landscaping",
          stage: "scraped" as const,
          score: 82,
          priority: "high",
          lastContactDate: null,
          notes: "Busy landscaping company. Owner mentioned wanting a website at chamber meeting."
        },
        {
          name: "Rockport Roofing",
          email: "mike@rockportroofing.com",
          phone: "(207) 555-0165",
          address: "890 Shingle St",
          city: "Rockport",
          state: "ME",
          businessType: "roofing",
          stage: "scraped" as const,
          score: 88,
          priority: "high",
          lastContactDate: null,
          notes: "High-value roofing contractor. Currently using only word-of-mouth."
        }
      ];
      
      await db.insert(businesses).values(sampleBusinesses);
      return await db.select().from(businesses);
    }
    
    return results;
  }

  async getBusinessesByStage(stage: PipelineStage): Promise<Business[]> {
    return await db.select().from(businesses).where(eq(businesses.stage, stage));
  }

  async getBusinessById(id: number): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, id));
    return business || undefined;
  }

  async getBusiness(id: number): Promise<Business | undefined> {
    return this.getBusinessById(id);
  }

  async createBusiness(insertBusiness: InsertBusiness): Promise<Business> {
    const result = db
      .insert(businesses)
      .values(insertBusiness)
      .run();
    
    const business = await this.getBusinessById(result.lastInsertRowid as number);
    if (!business) {
      throw new Error("Failed to create business");
    }
    
    // Create activity
    await this.createActivity({
      type: "lead_added",
      description: `New lead added: ${business.name}`,
      businessId: business.id
    });
    
    return business;
  }

  async updateBusiness(id: number, updates: Partial<Business>): Promise<Business> {
    const existing = await this.getBusinessById(id);
    if (!existing) {
      throw new Error("Business not found");
    }

    db
      .update(businesses)
      .set(updates)
      .where(eq(businesses.id, id))
      .run();

    const updated = await this.getBusinessById(id);
    if (!updated) {
      throw new Error("Failed to update business");
    }

    // Create activity for stage changes
    if (updates.stage && updates.stage !== existing.stage) {
      await this.createActivity({
        type: "stage_change",
        description: `${existing.name} moved to ${updates.stage}`,
        businessId: id
      });
    }

    return updated;
  }

  async deleteBusiness(id: number): Promise<void> {
    await db.delete(businesses).where(eq(businesses.id, id));
  }

  async getCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns);
  }

  async getCampaignById(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const result = db
      .insert(campaigns)
      .values(insertCampaign)
      .run();
    
    const campaign = await this.getCampaignById(result.lastInsertRowid as number);
    if (!campaign) {
      throw new Error("Failed to create campaign");
    }
    return campaign;
  }

  async updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign> {
    db
      .update(campaigns)
      .set(updates)
      .where(eq(campaigns.id, id))
      .run();
    
    const updated = await this.getCampaignById(id);
    if (!updated) {
      throw new Error("Failed to update campaign");
    }
    return updated;
  }

  async getTemplates(): Promise<Template[]> {
    return await db.select().from(templates);
  }

  async getTemplateById(id: number): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template || undefined;
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const result = db
      .insert(templates)
      .values(insertTemplate)
      .run();
    
    const template = await this.getTemplateById(result.lastInsertRowid as number);
    if (!template) {
      throw new Error("Failed to create template");
    }
    return template;
  }

  async updateTemplateUsage(id: number): Promise<void> {
    const template = await this.getTemplateById(id);
    if (template) {
      db
        .update(templates)
        .set({ usageCount: template.usageCount + 1 })
        .where(eq(templates.id, id))
        .run();
    }
  }

  async getActivities(): Promise<Activity[]> {
    return await db.select().from(activities);
  }

  async getRecentActivities(limit = 10): Promise<Activity[]> {
    return await db.select().from(activities).limit(limit);
  }

  async getBusinessActivities(businessId: number): Promise<Activity[]> {
    return await db.select().from(activities)
      .where(eq(activities.businessId, businessId));
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const result = db
      .insert(activities)
      .values(insertActivity)
      .run();
    
    const activity = await db.select().from(activities)
      .where(eq(activities.id, result.lastInsertRowid as number))
      .limit(1);
    
    if (!activity[0]) {
      throw new Error("Failed to create activity");
    }
    return activity[0];
  }

  async getAvailabilityConfig(): Promise<AvailabilityConfig[]> {
    return await db.select().from(availabilityConfig);
  }

  async updateAvailabilityConfig(configs: InsertAvailabilityConfig[]): Promise<void> {
    // Clear existing config
    db.delete(availabilityConfig).run();
    
    // Insert new config
    if (configs.length > 0) {
      for (const config of configs) {
        db.insert(availabilityConfig).values(config).run();
      }
    }
  }

  async getBlockedDates(): Promise<BlockedDate[]> {
    return await db.select().from(blockedDates);
  }

  async getBlockedDatesByRange(startDate: string, endDate: string): Promise<BlockedDate[]> {
    const allBlocked = await this.getBlockedDates();
    return allBlocked.filter(blocked => 
      blocked.date >= startDate && blocked.date <= endDate
    );
  }

  async createBlockedDate(insertBlockedDate: InsertBlockedDate): Promise<BlockedDate> {
    const result = db
      .insert(blockedDates)
      .values(insertBlockedDate)
      .run();
    
    const [blocked] = await db.select().from(blockedDates)
      .where(eq(blockedDates.id, result.lastInsertRowid as number))
      .limit(1);
    
    if (!blocked) {
      throw new Error("Failed to create blocked date");
    }
    
    // Create activity
    await this.createActivity({
      type: "blocked_date_added",
      description: `Blocked ${insertBlockedDate.date}${insertBlockedDate.startTime ? ` at ${insertBlockedDate.startTime}` : ' (whole day)'}${insertBlockedDate.reason ? `: ${insertBlockedDate.reason}` : ''}`,
    });
    
    return blocked;
  }

  async deleteBlockedDate(id: number): Promise<void> {
    await db.delete(blockedDates).where(eq(blockedDates.id, id));
  }

  async getStats(): Promise<{
    totalLeads: number;
    stageStats: Record<PipelineStage, number>;
    activeCampaigns: number;
    conversionRate: number;
  }> {
    const allBusinesses = await this.getBusinesses();
    const allCampaigns = await this.getCampaigns();
    
    const stageStats: Record<PipelineStage, number> = {
      scraped: 0,
      scheduled: 0,
      contacted: 0,
      interested: 0,
      sold: 0,
      delivered: 0
    };
    
    allBusinesses.forEach(business => {
      if (PIPELINE_STAGES.includes(business.stage as PipelineStage)) {
        stageStats[business.stage as PipelineStage]++;
      }
    });
    
    const totalLeads = allBusinesses.length;
    const activeCampaigns = allCampaigns.filter(c => c.status === 'active').length;
    const conversions = allBusinesses.filter(b => b.stage === 'sold' || b.stage === 'delivered').length;
    const conversionRate = totalLeads > 0 ? (conversions / totalLeads) * 100 : 0;
    
    return {
      totalLeads,
      stageStats,
      activeCampaigns,
      conversionRate: Math.round(conversionRate)
    };
  }
}

export const storage = new DatabaseStorage();