import { exec, spawn } from "child_process";
import { promisify } from "util";
import { storage } from "./storage";
import type { Business } from "@shared/schema";
import { calculateLeadScore, getLeadTemperature } from "./lead-scoring";

const execAsync = promisify(exec);

export class BotIntegration {
  private pythonPath: string;
  private botScriptPath: string;

  constructor() {
    // Adjust these paths based on your setup
    this.pythonPath = process.env.PYTHON_PATH || "python3";
    this.botScriptPath = process.env.BOT_SCRIPT_PATH || "../bot_cli.py";
  }

  /**
   * Run Python CLI command and return JSON result
   */
  private runPythonCLI(command: string, args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonPath, [this.botScriptPath, command, ...args]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error('Python stderr:', data.toString());
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python CLI exited with code ${code}: ${stderr}`));
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse JSON response: ${stdout}`));
        }
      });
      
      process.on('error', (err) => {
        reject(new Error(`Failed to start Python process: ${err.message}`));
      });
    });
  }

  /**
   * Trigger the Python bot to enrich a lead with additional data
   */
  async enrichLead(businessId: number): Promise<void> {
    try {
      const business = await storage.getBusiness(businessId);
      if (!business) {
        throw new Error("Business not found");
      }

      // Call Python CLI for enrichment
      const enrichmentData = await this.runPythonCLI('enrich', [
        '--name', business.name,
        '--phone', business.phone,
        '--email', business.email || '',
        '--business-type', business.businessType || 'general'
      ]);

      // Calculate score and generate tags
      const score = calculateLeadScore({
        ...business,
        ...enrichmentData,
      });
      const temperature = getLeadTemperature(score);
      const priority = temperature === "hot" ? "high" : temperature === "warm" ? "medium" : "low";
      
      // Generate tags including source-based tags
      const baseTags = this.generateTags(enrichmentData);
      const sourceTags = this.getSourceTags(business.source || 'scraped');
      const allTags = [...new Set([...baseTags, ...sourceTags])]; // Remove duplicates

      // Combine all updates into a single call
      await storage.updateBusiness(businessId, {
        address: enrichmentData.address || business.address,
        city: enrichmentData.city || business.city,
        state: enrichmentData.state || business.state,
        website: enrichmentData.website || business.website,
        businessType: enrichmentData.businessType || business.businessType,
        notes: `${business.notes}\n\nEnrichment Data:\n${JSON.stringify(enrichmentData, null, 2)}`.substring(0, 1000), // Limit notes length
        score,
        priority,
        tags: JSON.stringify(allTags), // Convert tags array to JSON string
      });

      // Log activity
      await storage.createActivity({
        type: "enrichment_complete",
        description: `Lead enriched: ${business.name} (Score: ${score})`,
        businessId: businessId,
      });

    } catch (error) {
      console.error("Failed to enrich lead:", error);
      throw error;
    }
  }

  /**
   * Launch automated outreach for multiple leads
   */
  async launchOutreach(businessIds: number[]): Promise<void> {
    try {
      const businesses = await Promise.all(
        businessIds.map(id => storage.getBusiness(id))
      );

      const validBusinesses = businesses.filter(b => b !== undefined) as Business[];

      // Prepare data for Python bot
      const leadsData = validBusinesses.map(b => ({
        id: b.id,
        name: b.name,
        email: b.email,
        phone: b.phone,
        businessType: b.businessType,
        score: b.score,
      }));

      // Call Python CLI for outreach
      const result = await this.runPythonCLI('outreach', [
        '--leads', JSON.stringify(leadsData)
      ]);

      console.log("Outreach result:", result);

      // Update businesses to "contacted" stage
      for (const business of validBusinesses) {
        await storage.updateBusiness(business.id, {
          stage: "contacted",
          lastContactDate: new Date().toISOString(),
        });
        
        await storage.createActivity({
          type: "outreach_sent",
          description: `SMS sent to ${business.name}`,
          businessId: business.id,
        });
      }
    } catch (error) {
      console.error("Failed to launch outreach:", error);
      throw error;
    }
  }

  /**
   * Calculate lead score based on enrichment data
   */
  private calculateLeadScore(data: any): number {
    let score = 50; // Base score

    // Major boost for businesses without websites (your target market)
    if (!data.website) score += 30;
    
    // Additional scoring factors
    if (data.email && data.email.includes("@")) score += 10;
    if (data.businessHours) score += 5;
    if (data.socialMedia) score += 5;
    if (data.reviews && data.reviews.count > 10) score += 10;
    if (data.reviews && data.reviews.rating >= 4) score += 10;
    
    // Business type scoring (your target industries)
    const highValueTypes = ["plumbing", "electrical", "hvac", "roofing", "auto_repair", "landscaping"];
    if (highValueTypes.includes(data.businessType?.toLowerCase())) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Generate tags based on enrichment data
   */
  private generateTags(data: any): string[] {
    const tags: string[] = [];

    // Key tag for your business model
    if (!data.website) tags.push("no-website");
    if (data.website) tags.push("has-website");
    
    if (data.email) tags.push("has-email");
    if (data.reviews?.rating >= 4) tags.push("high-rated");
    if (data.businessHours) tags.push("active-business");
    if (data.socialMedia) tags.push("social-presence");
    
    // Business size tags
    if (data.employeeCount) {
      if (data.employeeCount < 10) tags.push("small-business");
      else if (data.employeeCount < 50) tags.push("medium-business");
      else tags.push("large-business");
    }

    // Location tags
    const maineTowns = ["brunswick", "bath", "portland", "boothbay", "damariscotta"];
    if (data.city && maineTowns.includes(data.city.toLowerCase())) {
      tags.push("midcoast-maine");
    }

    return tags;
  }

  /**
   * Get source-based tags
   */
  private getSourceTags(source: string): string[] {
    switch (source) {
      case 'acuity':
        return ['hot-lead', 'appointment-scheduled'];
      case 'squarespace':
        return ['follow-up', 'form-submission'];
      case 'manual':
        return ['manual-entry'];
      case 'scraped':
      default:
        return ['cold', 'scraped-lead'];
    }
  }

  /**
   * Connect to Google Sheets for lead import
   */
  async importFromGoogleSheets(sheetId: string): Promise<Business[]> {
    try {
      // Call Python CLI to fetch from Google Sheets
      const leadsData = await this.runPythonCLI('import-sheets', [
        '--sheet-id', sheetId
      ]);

      const importedBusinesses: Business[] = [];

      // Import each lead
      for (const lead of leadsData) {
        const business = await storage.createBusiness({
          name: lead.name || "Unknown Business",
          email: lead.email || "",
          phone: lead.phone || "No phone",
          address: lead.address || "To be enriched",
          city: lead.city || "To be enriched",
          state: lead.state || "ME",
          businessType: lead.businessType || "unknown",
          stage: "scraped",
          notes: `Imported from Google Sheets\n${JSON.stringify(lead, null, 2)}`,
          website: lead.website || "",
        });
        importedBusinesses.push(business);
      }

      return importedBusinesses;
    } catch (error) {
      console.error("Failed to import from Google Sheets:", error);
      throw error;
    }
  }
}

export const botIntegration = new BotIntegration(); 