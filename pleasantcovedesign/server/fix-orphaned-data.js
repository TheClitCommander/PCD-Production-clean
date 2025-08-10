const fs = require('fs');
const path = require('path');

// Path to the database file
const dbPath = path.join(__dirname, 'data/database.json');

// Read the database file
console.log(`Reading database from ${dbPath}...`);
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Get all project IDs
const projectIds = new Set(db.projects.map(p => p.id));
console.log(`Found ${projectIds.size} projects with IDs: ${[...projectIds].join(', ')}`);

// Find appointments with non-existent project IDs
const orphanedAppointments = db.appointments.filter(a => !projectIds.has(a.projectId));
console.log(`Found ${orphanedAppointments.length} orphaned appointments: ${orphanedAppointments.map(a => a.id).join(', ')}`);

// Remove orphaned appointments
if (orphanedAppointments.length > 0) {
  console.log('Removing orphaned appointments...');
  db.appointments = db.appointments.filter(a => projectIds.has(a.projectId));
  
  // Backup the original database
  const backupPath = `${dbPath}.backup-${Date.now()}`;
  fs.writeFileSync(backupPath, fs.readFileSync(dbPath));
  console.log(`Created backup at ${backupPath}`);
  
  // Write the updated database
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  console.log(`Updated database saved. Removed ${orphanedAppointments.length} orphaned appointments.`);
} else {
  console.log('No orphaned appointments found. Database is consistent.');
}

// Check for other orphaned data
const companyIds = new Set(db.companies.map(c => c.id));
const orphanedProjects = db.projects.filter(p => !companyIds.has(p.companyId));
if (orphanedProjects.length > 0) {
  console.log(`Warning: Found ${orphanedProjects.length} projects with non-existent company IDs: ${orphanedProjects.map(p => p.id).join(', ')}`);
}

// Check for orphaned messages if messages array exists
if (db.messages && Array.isArray(db.messages)) {
  const orphanedMessages = db.messages.filter(m => !projectIds.has(m.projectId));
  if (orphanedMessages.length > 0) {
    console.log(`Warning: Found ${orphanedMessages.length} messages with non-existent project IDs: ${orphanedMessages.map(m => m.id).join(', ')}`);
  } else {
    console.log('No orphaned messages found.');
  }
} else {
  console.log('No messages array found in database.');
}

console.log('Database check complete.');