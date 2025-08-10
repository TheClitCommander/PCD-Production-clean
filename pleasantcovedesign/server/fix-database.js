// Database repair script for Pleasant Cove Design
// This script fixes orphaned messages and ensures proper project references

const fs = require('fs');
const path = require('path');

// Define the database file path
const DATA_DIR = path.join(process.cwd(), 'data');
const DATABASE_FILE = path.join(DATA_DIR, 'database.json');
const BACKUP_FILE = path.join(DATA_DIR, `database.json.backup-${Date.now()}`);

console.log('🚀 Pleasant Cove Design - Database Repair Tool');
console.log('===============================================');

// Check if the database file exists
if (!fs.existsSync(DATABASE_FILE)) {
  console.error(`❌ Database file not found: ${DATABASE_FILE}`);
  console.log('Creating a new empty database file...');
  
  // Create the data directory if it doesn't exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  // Create a simple empty database structure
  const emptyDb = {
    companies: [],
    projects: [],
    messages: [],
    activities: []
  };
  
  fs.writeFileSync(DATABASE_FILE, JSON.stringify(emptyDb, null, 2));
  console.log(`✅ Created new empty database at: ${DATABASE_FILE}`);
  process.exit(0);
}

// Create a backup of the database
fs.copyFileSync(DATABASE_FILE, BACKUP_FILE);
console.log(`✅ Created backup at: ${BACKUP_FILE}`);

// Read the database
let data;
try {
  const fileContent = fs.readFileSync(DATABASE_FILE, 'utf8');
  data = JSON.parse(fileContent);
  console.log('✅ Successfully loaded database');
} catch (error) {
  console.error(`❌ Error reading database: ${error.message}`);
  process.exit(1);
}

// Print statistics before repair
console.log('\nDatabase contents before repair:');
console.log(`- Companies: ${data.companies?.length || 0}`);
console.log(`- Projects: ${data.projects?.length || 0}`);
console.log(`- Messages: ${data.messages?.length || 0}`);
console.log(`- Activities: ${data.activities?.length || 0}`);

// Initialize arrays if they don't exist
data.companies = data.companies || [];
data.projects = data.projects || [];
data.messages = data.messages || [];
data.activities = data.activities || [];

// Step 1: Check for orphaned messages (no projectId or projectToken)
const orphanedMessages = data.messages.filter(msg => !msg.projectId && !msg.projectToken);
console.log(`\nFound ${orphanedMessages.length} orphaned messages without project references`);

// Step 2: Find duplicate projects with same accessToken
const projectTokens = new Map();
const duplicateProjects = [];

data.projects.forEach(project => {
  if (!project.accessToken) return; // Skip projects without accessToken
  
  if (projectTokens.has(project.accessToken)) {
    duplicateProjects.push(project);
  } else {
    projectTokens.set(project.accessToken, project);
  }
});

console.log(`Found ${duplicateProjects.length} duplicate projects`);

// Step 3: Create a default project if there are orphaned messages but no projects
if (orphanedMessages.length > 0) {
  let targetProject;
  
  // First check if we have any existing projects we can use
  if (data.projects.length > 0) {
    targetProject = data.projects[0];
    console.log(`Using existing project "${targetProject.title}" (ID: ${targetProject.id}) for orphaned messages`);
  } else if (data.companies.length > 0) {
    // Create a new project for the first company
    const company = data.companies[0];
    
    const newId = 1;
    targetProject = {
      id: newId,
      companyId: company.id,
      title: `${company.name} - Master Conversation`,
      description: "Auto-created project for orphaned messages",
      type: "consultation",
      status: "active",
      stage: "in_progress",
      priority: "medium",
      accessToken: `pcd_${company.id}_${Date.now().toString(36)}_fixed`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    data.projects.push(targetProject);
    console.log(`Created new project "${targetProject.title}" with token ${targetProject.accessToken}`);
  } else {
    // Create a default company and project
    const newCompanyId = 1;
    const newCompany = {
      id: newCompanyId,
      name: "Default Company",
      email: "admin@pleasantcovedesign.com",
      phone: "",
      address: "",
      city: "",
      state: "",
      industry: "technology",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    data.companies.push(newCompany);
    console.log(`Created new default company "Default Company"`);
    
    const newProjectId = 1;
    targetProject = {
      id: newProjectId,
      companyId: newCompanyId,
      title: "Default Conversation",
      description: "Auto-created project for orphaned messages",
      type: "consultation",
      status: "active",
      stage: "in_progress",
      priority: "medium",
      accessToken: `pcd_${newCompanyId}_${Date.now().toString(36)}_fixed`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    data.projects.push(targetProject);
    console.log(`Created new default project with token ${targetProject.accessToken}`);
  }
  
  // Now link orphaned messages to the target project
  orphanedMessages.forEach(msg => {
    msg.projectId = targetProject.id;
    msg.projectToken = targetProject.accessToken;
  });
  
  console.log(`✅ Fixed ${orphanedMessages.length} orphaned messages`);
}

// Step 4: Remove duplicate projects and reassign their messages
if (duplicateProjects.length > 0) {
  duplicateProjects.forEach(dupProject => {
    // Find the primary project with the same token
    const primaryProject = data.projects.find(p => 
      p.accessToken === dupProject.accessToken && p.id !== dupProject.id
    );
    
    if (primaryProject) {
      // Reassign messages from duplicate project to primary
      data.messages.forEach(msg => {
        if (msg.projectId === dupProject.id) {
          msg.projectId = primaryProject.id;
          msg.projectToken = primaryProject.accessToken;
        }
      });
      
      console.log(`Reassigned messages from duplicate project ${dupProject.id} to primary project ${primaryProject.id}`);
    }
  });
  
  // Remove the duplicate projects
  data.projects = data.projects.filter(project => 
    !duplicateProjects.some(dup => dup.id === project.id)
  );
  
  console.log(`✅ Removed ${duplicateProjects.length} duplicate projects`);
}

// Step 5: Ensure all messages have both projectId and projectToken
let fixedMsgCount = 0;
data.messages.forEach(msg => {
  // Find the project if we only have projectId
  if (msg.projectId && !msg.projectToken) {
    const project = data.projects.find(p => p.id === msg.projectId);
    if (project) {
      msg.projectToken = project.accessToken;
      fixedMsgCount++;
    }
  }
  
  // Find the project if we only have projectToken
  if (!msg.projectId && msg.projectToken) {
    const project = data.projects.find(p => p.accessToken === msg.projectToken);
    if (project) {
      msg.projectId = project.id;
      fixedMsgCount++;
    }
  }
});

if (fixedMsgCount > 0) {
  console.log(`✅ Fixed ${fixedMsgCount} messages with incomplete project references`);
}

// Print statistics after repair
console.log('\nDatabase contents after repair:');
console.log(`- Companies: ${data.companies.length}`);
console.log(`- Projects: ${data.projects.length}`);
console.log(`- Messages: ${data.messages.length}`);
console.log(`- Activities: ${data.activities.length}`);

// Write the fixed database back
fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
console.log(`\n✅ Database repaired and saved to ${DATABASE_FILE}`);
console.log(`✅ Backup preserved at ${BACKUP_FILE}`);
console.log('\n🔄 To apply the changes, please restart your local server');
