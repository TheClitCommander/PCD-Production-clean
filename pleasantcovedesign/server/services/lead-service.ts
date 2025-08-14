import { storage } from '../storage';

export async function reverifyLead(leadId: string) {
  try {
    console.log(`🔍 Re-verifying lead ${leadId}`);
    
    // Get the current lead
    const result = await storage.query('SELECT * FROM leads WHERE id = $1', [leadId]);
    
    if (result.rows.length === 0) {
      throw new Error('Lead not found');
    }
    
    const lead = result.rows[0];
    
    // For MVP: Simple website verification logic
    // In production, this would call the Python verify_site.py script
    let newStatus = 'UNKNOWN';
    let newConfidence = 0.0;
    
    if (lead.website_url && lead.website_url.trim()) {
      // Basic checks for a valid website URL
      if (lead.website_url.includes('http') && lead.website_url.includes('.')) {
        newStatus = 'HAS_SITE';
        newConfidence = 0.85;
      } else {
        newStatus = 'UNSURE';
        newConfidence = 0.5;
      }
    } else {
      newStatus = 'NO_SITE';
      newConfidence = 0.9;
    }
    
    // Update the lead with new verification results
    const updateResult = await storage.query(`
      UPDATE leads 
      SET 
        website_status = $1, 
        website_confidence = $2, 
        website_last_checked_at = $3,
        updated_at = $4
      WHERE id = $5 
      RETURNING *
    `, [newStatus, newConfidence, new Date(), new Date(), leadId]);
    
    const updatedLead = updateResult.rows[0];
    
    console.log(`✅ Lead ${leadId} re-verified: ${newStatus} (confidence: ${newConfidence})`);
    
    return updatedLead;
    
  } catch (error) {
    console.error(`❌ Failed to re-verify lead ${leadId}:`, error);
    throw error;
  }
}

