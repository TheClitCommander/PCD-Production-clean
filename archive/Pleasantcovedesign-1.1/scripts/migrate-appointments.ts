// Migration script to move appointment data from businesses table to appointments table
import { db } from "../server/db";
import * as schema from "../shared/schema";
import { eq, isNotNull } from "drizzle-orm";

async function migrateAppointments() {
  console.log("Starting appointment migration...");
  
  try {
    // Get all businesses with scheduled appointments
    const businessesWithAppointments = await db.select()
      .from(schema.businesses)
      .where(isNotNull(schema.businesses.scheduledTime));
    
    console.log(`Found ${businessesWithAppointments.length} businesses with appointments`);
    
    let migrated = 0;
    
    for (const business of businessesWithAppointments) {
      if (business.scheduledTime) {
        // Check if appointment already exists
        const existingAppointment = await db.select()
          .from(schema.appointments)
          .where(eq(schema.appointments.businessId, business.id))
          .limit(1);
        
        if (existingAppointment.length === 0) {
          // Create new appointment
          await db.insert(schema.appointments).values({
            businessId: business.id,
            datetime: business.scheduledTime,
            status: business.appointmentStatus || 'confirmed',
            notes: business.notes?.includes('Source: Scheduling Link') ? 'Self-scheduled via booking link' : null,
            isAutoScheduled: business.notes?.includes('Source: Scheduling Link') || false,
          });
          
          migrated++;
          console.log(`Migrated appointment for ${business.name}`);
        }
      }
    }
    
    console.log(`\nMigration complete! Migrated ${migrated} appointments.`);
    console.log("\nNote: The original scheduledTime fields are preserved in the businesses table.");
    console.log("You can manually remove them once you've verified the migration.");
    
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateAppointments(); 