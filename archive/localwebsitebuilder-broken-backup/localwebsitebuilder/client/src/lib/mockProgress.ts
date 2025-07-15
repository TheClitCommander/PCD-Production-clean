export interface ProgressEntry {
  stage: string;
  imageUrl: string;
  date: string;
  notes?: string;
}

// Numeric ID based (current system)
export const mockProgress: Record<number, ProgressEntry[]> = {
  // Client ID 1 - Coastal Electric
  1: [
    {
      stage: "Initial Consultation",
      imageUrl: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&auto=format",
      date: "2025-06-01",
      notes: "Kickoff meeting to discuss brand vision and website goals"
    },
    {
      stage: "Brand Identity",
      imageUrl: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&auto=format",
      date: "2025-06-03",
      notes: "Logo concepts and color palette development"
    },
    {
      stage: "First Mockup",
      imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format",
      date: "2025-06-05",
      notes: "Homepage design with hero section and service highlights"
    },
    {
      stage: "Development Phase",
      imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format",
      date: "2025-06-08",
      notes: "Building out the responsive website structure"
    }
  ]
};

// Slug-based mapping for cleaner URLs
export const slugToIdMap: Record<string, number> = {
  "coastal-electric": 1,
  "pleasant-cove-wellness": 2,
  "midcoast-dental": 3,
  "bay-area-plumbing": 4
};

// Mock client names for display
export const clientNames: Record<string, string> = {
  "coastal-electric": "Coastal Electric",
  "pleasant-cove-wellness": "Pleasant Cove Wellness",
  "midcoast-dental": "Midcoast Dental", 
  "bay-area-plumbing": "Bay Area Plumbing"
};

// Default progress for clients without specific entries
const defaultProgress: ProgressEntry[] = [
  {
    stage: "Project Kickoff",
    imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format",
    date: "2025-06-01",
    notes: "Initial planning session"
  }
];

export const getProgressForClient = (clientId: number): ProgressEntry[] => {
  return mockProgress[clientId] || defaultProgress;
};

export const getProgressForSlug = (slug: string): ProgressEntry[] => {
  const clientId = slugToIdMap[slug];
  return clientId ? getProgressForClient(clientId) : defaultProgress;
};

export const getClientNameForSlug = (slug: string): string => {
  return clientNames[slug] || "Your Project";
}; 