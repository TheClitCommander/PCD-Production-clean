import { Pool } from 'pg';
import { Lead, NewLead, WebsiteVerificationResult } from './shared/schema';
import { spawn } from 'child_process';
import { promisify } from 'util';

export class LeadService {
  constructor(private db: Pool) {}

  // Normalize and deduplicate incoming lead data
  private normalizeLead(raw: any): Partial<NewLead> {
    // Normalize phone number (remove all non-digits)
    const phoneNormalized = raw.phone ? raw.phone.replace(/\D/g, '') : undefined;
    
    // Normalize email
    const emailNormalized = raw.email ? raw.email.toLowerCase().trim() : undefined;
    
    // Extract domain from website if present
    const websiteDomain = this.extractDomain(raw.website);
    
    // Create deduplication key
    const dedupKey = this.createDedupKey({
      phone: phoneNormalized,
      domain: websiteDomain,
      name: raw.name,
      address: raw.address
    });

    return {
      name: raw.name?.trim() || 'Unknown Business',
      category: raw.category || raw.business_type || 'general',
      source: 'scraper',
      
      // Raw data
      phoneRaw: raw.phone,
      phoneNormalized,
      emailRaw: raw.email,
      emailNormalized,
      addressRaw: raw.address,
      
      // Parsed address components
      addressLine1: raw.address,
      city: raw.city,
      region: raw.state || raw.region,
      postalCode: raw.postal_code || raw.zip,
      country: 'US',
      lat: parseFloat(raw.lat) || undefined,
      lng: parseFloat(raw.lng) || undefined,
      
      // Website (will be verified)
      websiteUrl: raw.website,
      websiteStatus: 'UNKNOWN',
      websiteConfidence: 0.0,
      socialUrls: [],
      
      // Google Maps data
      placeId: raw.place_id,
      mapsUrl: raw.maps_url,
      mapsRating: parseFloat(raw.rating) || undefined,
      mapsReviews: parseInt(raw.reviews) || undefined,
      
      // Deduplication
      dedupKey,
      
      // Metadata
      raw: raw, // Store original payload
      tags: [],
      notes: undefined
    };
  }

  private extractDomain(url?: string): string | undefined {
    if (!url) return undefined;
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.replace('www.', '').toLowerCase();
    } catch {
      return undefined;
    }
  }

  private createDedupKey(data: { phone?: string; domain?: string; name?: string; address?: string }): string {
    // Create a unique key for deduplication
    const phone = data.phone || '';
    const domain = data.domain || '';
    const nameFingerprint = data.name ? data.name.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const addressFingerprint = data.address ? data.address.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20) : '';
    
    return `${phone}|${domain}|${nameFingerprint}|${addressFingerprint}`;
  }

  // Find existing lead by deduplication key
  private async findExistingLead(dedupKey: string): Promise<Lead | null> {
    const result = await this.db.query(
      'SELECT * FROM leads WHERE dedup_key = $1 LIMIT 1',
      [dedupKey]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return this.mapRowToLead(row);
  }

  private mapRowToLead(row: any): Lead {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      source: row.source,
      phoneRaw: row.phone_raw,
      phoneNormalized: row.phone_normalized,
      emailRaw: row.email_raw,
      emailNormalized: row.email_normalized,
      addressRaw: row.address_raw,
      addressLine1: row.address_line1,
      city: row.city,
      region: row.region,
      postalCode: row.postal_code,
      country: row.country,
      lat: row.lat ? parseFloat(row.lat) : undefined,
      lng: row.lng ? parseFloat(row.lng) : undefined,
      websiteUrl: row.website_url,
      websiteStatus: row.website_status,
      websiteConfidence: row.website_confidence ? parseFloat(row.website_confidence) : 0,
      websiteLastCheckedAt: row.website_last_checked_at,
      socialUrls: row.social_urls || [],
      placeId: row.place_id,
      mapsUrl: row.maps_url,
      mapsRating: row.maps_rating ? parseFloat(row.maps_rating) : undefined,
      mapsReviews: row.maps_reviews,
      dedupKey: row.dedup_key,
      raw: row.raw,
      tags: row.tags || [],
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // Enhanced website verification using Python script with evidence collection
  private async verifyWebsite(name: string, candidates: string[], phone?: string, address?: string): Promise<WebsiteVerificationResult & { evidence?: any }> {
    return new Promise((resolve) => {
      try {
        const args = [
          'scrapers/verify_site.py',
          '--name', name,
          '--candidates', JSON.stringify(candidates)
        ];
        
        if (phone) {
          args.push('--phone', phone);
        }
        
        if (address) {
          args.push('--address', address);
        }

        const pythonScript = spawn('python3', args, {
          cwd: process.cwd()
        });

        let output = '';
        let errorOutput = '';

        pythonScript.stdout.on('data', (data) => {
          output += data.toString();
        });

        pythonScript.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        pythonScript.on('close', (code) => {
          try {
            if (code === 0 && output.trim()) {
              const result = JSON.parse(output.trim());
              resolve({
                url: result.url,
                status: result.status,
                confidence: result.confidence,
                evidence: result.evidence,
                candidates: result.candidates
              });
            } else {
              console.warn('Verification script failed:', errorOutput);
              resolve(this.fallbackVerification(candidates));
            }
          } catch (parseError) {
            console.warn('Failed to parse verification result:', parseError);
            resolve(this.fallbackVerification(candidates));
          }
        });

        // Timeout after 15 seconds (increased for enhanced analysis)
        setTimeout(() => {
          pythonScript.kill();
          resolve(this.fallbackVerification(candidates));
        }, 15000);

      } catch (error) {
        console.warn('Failed to start verification script:', error);
        resolve(this.fallbackVerification(candidates));
      }
    });
  }

  private fallbackVerification(candidates: string[]): WebsiteVerificationResult {
    const socialHosts = ['facebook.com', 'instagram.com', 'tiktok.com', 'linkedin.com', 'twitter.com'];
    
    if (!candidates?.length) {
      return { status: 'NO_SITE', confidence: 0.8 };
    }

    const webSites = candidates.filter(url => {
      try {
        const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
        return !socialHosts.some(social => hostname.includes(social));
      } catch {
        return false;
      }
    });

    const socialSites = candidates.filter(url => {
      try {
        const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
        return socialHosts.some(social => hostname.includes(social));
      } catch {
        return false;
      }
    });

    if (webSites.length > 0) {
      return { url: webSites[0], status: 'HAS_SITE', confidence: 0.6 };
    }

    if (socialSites.length > 0) {
      return { url: socialSites[0], status: 'SOCIAL_ONLY', confidence: 0.7 };
    }

    return { status: 'UNSURE', confidence: 0.3 };
  }

  // Main method: Upsert lead with verification
  async upsertLeadWithVerification(rawData: any): Promise<Lead> {
    // Step 1: Normalize the data
    const normalized = this.normalizeLead(rawData);

    // Step 2: Check for existing lead
    const existing = await this.findExistingLead(normalized.dedupKey!);

    // Step 3: Verify website if we have candidates
    const candidates = [
      normalized.websiteUrl,
      rawData.website,
      rawData.site,
      ...(rawData.social_urls || [])
    ].filter(Boolean);

    const verification = candidates.length > 0 
      ? await this.verifyWebsite(
          normalized.name!, 
          candidates, 
          normalized.phoneNormalized,
          normalized.addressRaw
        )
      : { status: 'NO_SITE' as const, confidence: 0.8, evidence: {} };

    // Step 4: Prepare final data with verification results and enrichment
    const evidence = verification.evidence || {};
    
    const leadData = {
      ...normalized,
      websiteUrl: verification.url || normalized.websiteUrl,
      websiteStatus: verification.status,
      websiteConfidence: verification.confidence,
      websiteLastCheckedAt: new Date(),
      
      // Social URLs from candidates
      socialUrls: candidates.filter(url => 
        ['facebook.com', 'instagram.com', 'tiktok.com', 'linkedin.com'].some(social => 
          url?.toLowerCase().includes(social)
        )
      ),
      
      // Contact enrichment from verification evidence
      contactEmails: evidence.contact_emails || [],
      hasContactForm: evidence.has_contact_form || false,
      
      // Verification evidence for UI transparency
      verificationEvidence: evidence,
      
      // Website quality signals
      websiteTechStack: evidence.tech_stack || [],
      hasSsl: evidence.ssl_enabled,
      isMobileFriendly: evidence.mobile_friendly,
      pageLoadSpeedMs: evidence.load_time_ms
    };

    if (existing) {
      // Update existing lead
      const updated = await this.updateLead(existing.id, leadData);
      return updated;
    } else {
      // Create new lead
      const created = await this.createLead(leadData);
      return created;
    }
  }

  private async createLead(data: any): Promise<Lead> {
    const query = `
      INSERT INTO leads (
        name, category, source, phone_raw, phone_normalized, email_raw, email_normalized,
        address_raw, address_line1, city, region, postal_code, country, lat, lng,
        website_url, website_status, website_confidence, website_last_checked_at, social_urls,
        contact_emails, has_contact_form, verification_evidence, website_tech_stack,
        has_ssl, is_mobile_friendly, page_load_speed_ms,
        place_id, maps_url, maps_rating, maps_reviews, dedup_key, raw, tags, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27,
        $28, $29, $30, $31, $32, $33, $34, $35
      ) RETURNING *
    `;

    const values = [
      data.name, data.category, data.source, data.phoneRaw, data.phoneNormalized,
      data.emailRaw, data.emailNormalized, data.addressRaw, data.addressLine1,
      data.city, data.region, data.postalCode, data.country, data.lat, data.lng,
      data.websiteUrl, data.websiteStatus, data.websiteConfidence, data.websiteLastCheckedAt,
      JSON.stringify(data.socialUrls), JSON.stringify(data.contactEmails), data.hasContactForm,
      JSON.stringify(data.verificationEvidence), JSON.stringify(data.websiteTechStack),
      data.hasSsl, data.isMobileFriendly, data.pageLoadSpeedMs,
      data.placeId, data.mapsUrl, data.mapsRating, data.mapsReviews, 
      data.dedupKey, JSON.stringify(data.raw), data.tags, data.notes
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToLead(result.rows[0]);
  }

  private async updateLead(id: string, data: Partial<NewLead>): Promise<Lead> {
    const query = `
      UPDATE leads SET
        name = COALESCE($2, name),
        website_url = COALESCE($3, website_url),
        website_status = COALESCE($4, website_status),
        website_confidence = COALESCE($5, website_confidence),
        website_last_checked_at = COALESCE($6, website_last_checked_at),
        social_urls = COALESCE($7, social_urls),
        raw = COALESCE($8, raw),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const values = [
      id, data.name, data.websiteUrl, data.websiteStatus, data.websiteConfidence,
      data.websiteLastCheckedAt, JSON.stringify(data.socialUrls), JSON.stringify(data.raw)
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToLead(result.rows[0]);
  }

  // Get leads with filters
  async getLeads(filters: {
    websiteStatus?: string;
    city?: string;
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ leads: Lead[]; total: number }> {
    let whereClause = 'WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.websiteStatus) {
      whereClause += ` AND website_status = $${paramIndex}`;
      values.push(filters.websiteStatus);
      paramIndex++;
    }

    if (filters.city) {
      whereClause += ` AND city ILIKE $${paramIndex}`;
      values.push(`%${filters.city}%`);
      paramIndex++;
    }

    if (filters.query) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR address_raw ILIKE $${paramIndex})`;
      values.push(`%${filters.query}%`);
      paramIndex++;
    }

    // Count total
    const countQuery = `SELECT COUNT(*) FROM leads ${whereClause}`;
    const countResult = await this.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get leads
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    
    const leadsQuery = `
      SELECT * FROM leads ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const leadsResult = await this.db.query(leadsQuery, [...values, limit, offset]);
    const leads = leadsResult.rows.map(row => this.mapRowToLead(row));

    return { leads, total };
  }

  // Re-verify a single lead's website
  async reverifyWebsite(leadId: string): Promise<Lead> {
    const lead = await this.getLeadById(leadId);
    if (!lead) throw new Error('Lead not found');

    const candidates = [
      lead.websiteUrl,
      ...(lead.socialUrls || [])
    ].filter(Boolean);

    const verification = await this.verifyWebsite(lead.name, candidates, lead.phoneNormalized);

    const updatedData = {
      websiteUrl: verification.url || lead.websiteUrl,
      websiteStatus: verification.status,
      websiteConfidence: verification.confidence,
      websiteLastCheckedAt: new Date()
    };

    return this.updateLead(leadId, updatedData);
  }

  private async getLeadById(id: string): Promise<Lead | null> {
    const result = await this.db.query('SELECT * FROM leads WHERE id = $1', [id]);
    return result.rows.length > 0 ? this.mapRowToLead(result.rows[0]) : null;
  }
}
