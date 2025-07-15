import { db } from "../server/db";
import * as schema from "../shared/schema";

async function addSampleProgress() {
  console.log("Adding sample progress entries...");
  
  // Add progress for Coastal Electric (ID: 1)
  const entries = [
    {
      businessId: 1,
      stage: "Initial Consultation",
      imageUrl: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&auto=format",
      date: "2025-01-15",
      notes: "Kickoff meeting to discuss brand vision and website goals",
      publiclyVisible: true
    },
    {
      businessId: 1,
      stage: "Brand Identity Development",
      imageUrl: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&auto=format",
      date: "2025-01-20",
      notes: "Logo concepts and color palette development",
      publiclyVisible: true
    },
    {
      businessId: 1,
      stage: "Homepage Mockup",
      imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format",
      date: "2025-01-25",
      notes: "First iteration of homepage design with hero section",
      publiclyVisible: true
    },
    {
      businessId: 1,
      stage: "Development Phase",
      imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format",
      date: "2025-01-30",
      notes: "Building out the responsive website structure",
      publiclyVisible: true
    }
  ];
  
  for (const entry of entries) {
    try {
      await db.insert(schema.progressEntries).values(entry);
      console.log(`✅ Added: ${entry.stage}`);
    } catch (error) {
      console.error(`❌ Failed to add ${entry.stage}:`, error);
    }
  }
  
  console.log("\nDone! Progress entries added successfully.");
  process.exit(0);
}

addSampleProgress().catch(console.error); 