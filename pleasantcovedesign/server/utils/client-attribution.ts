import { Storage } from '../storage';

/**
 * Smart Client Attribution System
 * Handles email variations, name similarities, and duplicate detection
 */

export interface AttributionCandidate {
  id: number;
  name: string;
  email: string;
  phone?: string;
  confidence: number; // 0-100
  matchReasons: string[];
}

export interface AttributionResult {
  exactMatch?: any;
  potentialMatches: AttributionCandidate[];
  shouldCreateNew: boolean;
  confidence: number;
}

/**
 * Normalize email for fuzzy matching
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';
  
  return email.toLowerCase()
    .trim()
    .replace(/\./g, '')  // Remove periods (john.doe@gmail.com → johndoe@gmail.com)
    .replace(/\+.*@/, '@')  // Remove + aliases (john+work@gmail.com → john@gmail.com)
    .replace(/\s/g, '');  // Remove spaces
}

/**
 * Normalize name for comparison
 */
export function normalizeName(name: string): string {
  if (!name) return '';
  
  return name.toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, '')  // Remove special characters
    .replace(/\s+/g, ' ');  // Normalize spaces
}

/**
 * Calculate name similarity (0-100)
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);
  
  if (norm1 === norm2) return 100;
  
  // Check if one name is contained in the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 80;
  
  // Check for first name match
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  
  if (words1[0] === words2[0] && words1[0].length > 2) return 60;
  
  // Basic character similarity
  const longer = norm1.length > norm2.length ? norm1 : norm2;
  const shorter = norm1.length > norm2.length ? norm2 : norm1;
  
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  
  return Math.round((matches / longer.length) * 100);
}

/**
 * Calculate email domain similarity
 */
export function calculateEmailSimilarity(email1: string, email2: string): number {
  const norm1 = normalizeEmail(email1);
  const norm2 = normalizeEmail(email2);
  
  if (norm1 === norm2) return 100;
  
  // Same domain
  const domain1 = email1.split('@')[1];
  const domain2 = email2.split('@')[1];
  
  if (domain1 === domain2) {
    // Same domain, different username
    const user1 = normalizeEmail(email1.split('@')[0]);
    const user2 = normalizeEmail(email2.split('@')[0]);
    
    if (user1.includes(user2) || user2.includes(user1)) return 85;
    return 50;
  }
  
  return 0;
}

/**
 * Smart client attribution engine
 */
export async function findAttributionCandidates(
  email: string, 
  name: string, 
  phone?: string,
  storage?: Storage
): Promise<AttributionResult> {
  
  if (!storage) {
    return {
      potentialMatches: [],
      shouldCreateNew: true,
      confidence: 0
    };
  }

  try {
    // Step 1: Try exact email match
    const exactMatch = await storage.findClientByEmail(email);
    if (exactMatch && (exactMatch.company || exactMatch.business)) {
      const client = exactMatch.company || exactMatch.business;
      return {
        exactMatch: client,
        potentialMatches: [],
        shouldCreateNew: false,
        confidence: 100
      };
    }

    // Step 2: Get all clients for fuzzy matching
    const allCompanies = await storage.getBusinesses(); // This gets all clients
    const candidates: AttributionCandidate[] = [];

    const normalizedInputEmail = normalizeEmail(email);
    const normalizedInputName = normalizeName(name);

    for (const client of allCompanies) {
      if (!client.email && !client.name) continue;
      if (!client.id) continue; // Skip clients without valid ID

      const matchReasons: string[] = [];
      let confidence = 0;

      // Email similarity
      if (client.email) {
        const emailSim = calculateEmailSimilarity(email, client.email);
        if (emailSim > 70) {
          confidence += emailSim * 0.6; // Email is 60% of confidence
          matchReasons.push(`Email similarity: ${emailSim}%`);
        }
      }

      // Name similarity
      if (client.name) {
        const nameSim = calculateNameSimilarity(name, client.name);
        if (nameSim > 50) {
          confidence += nameSim * 0.3; // Name is 30% of confidence
          matchReasons.push(`Name similarity: ${nameSim}%`);
        }
      }

      // Phone match (exact)
      if (phone && client.phone && client.phone === phone) {
        confidence += 40; // Phone match adds 40 points
        matchReasons.push('Phone number match');
      }

      // Only include candidates with reasonable confidence
      if (confidence > 60 && matchReasons.length > 0) {
        candidates.push({
          id: client.id,
          name: client.name,
          email: client.email || '',
          phone: client.phone,
          confidence: Math.min(100, Math.round(confidence)),
          matchReasons
        });
      }
    }

    // Sort by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);

    return {
      potentialMatches: candidates.slice(0, 3), // Top 3 matches
      shouldCreateNew: candidates.length === 0 || candidates[0].confidence < 80,
      confidence: candidates.length > 0 ? candidates[0].confidence : 0
    };

  } catch (error) {
    console.error('Attribution engine error:', error);
    return {
      potentialMatches: [],
      shouldCreateNew: true,
      confidence: 0
    };
  }
}

/**
 * Format attribution results for admin review
 */
export function formatAttributionResults(results: AttributionResult, inputEmail: string, inputName: string): string {
  if (results.exactMatch) {
    return `✅ Exact match found: ${results.exactMatch.name} (${results.exactMatch.email})`;
  }

  if (results.potentialMatches.length === 0) {
    return `🆕 No similar clients found. Creating new profile for ${inputName} (${inputEmail})`;
  }

  let message = `🤔 Found ${results.potentialMatches.length} potential matches for ${inputName} (${inputEmail}):\n\n`;
  
  results.potentialMatches.forEach((candidate, index) => {
    message += `${index + 1}. ${candidate.name} (${candidate.email}) - ${candidate.confidence}% match\n`;
    message += `   Reasons: ${candidate.matchReasons.join(', ')}\n\n`;
  });

  if (results.shouldCreateNew) {
    message += `💡 Recommendation: Create new profile (confidence too low)`;
  } else {
    message += `💡 Recommendation: Consider merging with top match`;
  }

  return message;
} 