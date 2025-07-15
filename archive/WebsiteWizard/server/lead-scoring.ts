import type { Business } from "@shared/schema";

// Source-based weight multipliers
const SOURCE_WEIGHTS = {
  acuity: 1.5,      // Highest weight - self-scheduled appointments
  squarespace: 1.2, // Form submissions show intent
  manual: 1.3,      // Manually added leads often pre-qualified
  scraped: 1.0,     // Base weight for cold leads
};

// Scoring criteria weights
const SCORING_CRITERIA = {
  hasEmail: 10,
  hasPhone: 15,
  hasWebsite: -20,  // Penalty if they already have a website
  isLocal: 20,      // Maine-based businesses
  businessTypeMatch: 15,
  recentActivity: 10,
};

export function calculateLeadScore(business: Business): number {
  let baseScore = 50; // Start with base score

  // Add points for contact info
  if (business.email && business.email !== "") {
    baseScore += SCORING_CRITERIA.hasEmail;
  }
  
  if (business.phone && business.phone !== "No phone provided") {
    baseScore += SCORING_CRITERIA.hasPhone;
  }
  
  // Deduct points if they have a website
  if (business.website && business.website !== "") {
    baseScore += SCORING_CRITERIA.hasWebsite;
  }
  
  // Add points for Maine businesses
  if (business.state === "ME") {
    baseScore += SCORING_CRITERIA.isLocal;
  }
  
  // Add points for good business types
  const goodBusinessTypes = ["plumbing", "electrical", "roofing", "hvac", "auto_repair"];
  if (goodBusinessTypes.includes(business.businessType)) {
    baseScore += SCORING_CRITERIA.businessTypeMatch;
  }
  
  // Add points for recent activity
  if (business.lastContactDate) {
    const daysSinceContact = Math.floor((Date.now() - new Date(business.lastContactDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceContact < 7) {
      baseScore += SCORING_CRITERIA.recentActivity;
    }
  }
  
  // Apply source weight multiplier
  const sourceWeight = SOURCE_WEIGHTS[business.source as keyof typeof SOURCE_WEIGHTS] || 1.0;
  const finalScore = Math.round(baseScore * sourceWeight);
  
  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, finalScore));
}

// Helper to get lead temperature based on score
export function getLeadTemperature(score: number): "cold" | "warm" | "hot" {
  if (score >= 80) return "hot";
  if (score >= 60) return "warm";
  return "cold";
}

// Helper to get recommended action based on score and source
export function getRecommendedAction(business: Business): string {
  const score = business.score || calculateLeadScore(business);
  const temperature = getLeadTemperature(score);
  
  switch (business.source) {
    case "acuity":
      return "Call immediately - scheduled appointment";
    case "squarespace":
      return temperature === "hot" 
        ? "Call within 1 hour" 
        : "Send follow-up email within 24 hours";
    case "manual":
      return "Review notes and contact as appropriate";
    default: // scraped
      return temperature === "hot"
        ? "Send SMS introduction"
        : temperature === "warm"
        ? "Add to email campaign"
        : "Monitor for website changes";
  }
} 