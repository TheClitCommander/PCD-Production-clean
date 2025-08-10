#!/bin/bash

# Pleasant Cove Design - Database Repair Tool
# This script will check and fix issues with the database files

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Pleasant Cove Design - Database Repair Tool${NC}"
echo -e "${BLUE}===============================================${NC}"

# Set the project root
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$PROJECT_ROOT"

# Check if the database file exists
DATABASE_FILE="$PROJECT_ROOT/data/database.json"
DATABASE_BACKUP="$PROJECT_ROOT/data/database.json.bak.$(date +%s)"

if [ -f "$DATABASE_FILE" ]; then
    echo -e "${GREEN}✅ Database file found: $DATABASE_FILE${NC}"
    
    # Create a backup
    cp "$DATABASE_FILE" "$DATABASE_BACKUP"
    echo -e "${GREEN}✅ Backup created: $DATABASE_BACKUP${NC}"
    
    # Check the database contents
    echo -e "${YELLOW}🔍 Checking database contents...${NC}"
    
    # Count the objects in the database
    COMPANY_COUNT=$(grep -o '"companies":\[[^]]*\]' "$DATABASE_FILE" | grep -o '\{' | wc -l)
    PROJECT_COUNT=$(grep -o '"projects":\[[^]]*\]' "$DATABASE_FILE" | grep -o '\{' | wc -l)
    MESSAGE_COUNT=$(grep -o '"messages":\[[^]]*\]' "$DATABASE_FILE" | grep -o '\{' | wc -l)
    
    echo -e "${GREEN}✅ Found $COMPANY_COUNT companies, $PROJECT_COUNT projects, $MESSAGE_COUNT messages${NC}"
    
    # Check if the database has any orphaned messages
    echo -e "${YELLOW}🔍 Looking for orphaned messages without project tokens...${NC}"
    
    # Extract the database to a temporary file for Node.js processing
    echo -e "${YELLOW}🔧 Running database integrity check...${NC}"
    
    # Create a simple Node.js script to check and fix the database
    cat > /tmp/database_fix.js <<'EOF'
const fs = require('fs');
const path = require('path');

const databaseFile = process.argv[2];

if (!databaseFile) {
  console.error('Please provide a database file path');
  process.exit(1);
}

try {
  // Read the database file
  const data = JSON.parse(fs.readFileSync(databaseFile, 'utf8'));
  
  // Print statistics
  console.log(`Database contents before repair:`);
  console.log(`- Companies: ${data.companies?.length || 0}`);
  console.log(`- Projects: ${data.projects?.length || 0}`);
  console.log(`- Messages: ${data.messages?.length || 0}`);
  
  // Check for messages without projectToken or projectId
  const orphanedMessages = data.messages?.filter(msg => !msg.projectToken && !msg.projectId) || [];
  console.log(`Found ${orphanedMessages.length} orphaned messages without project references`);
  
  // Create a default project if needed
  if (data.projects?.length === 0 && data.companies?.length > 0) {
    console.log('Creating a default project for orphaned messages');
    
    // Use the first company
    const company = data.companies[0];
    
    // Create a new project
    const newProject = {
      id: 1,
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
    
    // Add the project to the database
    if (!data.projects) {
      data.projects = [];
    }
    data.projects.push(newProject);
    
    console.log(`Created new project with ID ${newProject.id} and token ${newProject.accessToken}`);
    
    // Assign orphaned messages to this project
    orphanedMessages.forEach(msg => {
      msg.projectId = newProject.id;
      msg.projectToken = newProject.accessToken;
    });
    
    console.log(`Fixed ${orphanedMessages.length} orphaned messages`);
  }
  
  // Check for duplicate projects
  const projectTokens = new Map();
  const duplicateProjects = [];
  
  data.projects?.forEach(project => {
    if (projectTokens.has(project.accessToken)) {
      duplicateProjects.push(project);
    } else {
      projectTokens.set(project.accessToken, project);
    }
  });
  
  console.log(`Found ${duplicateProjects.length} duplicate projects`);
  
  // Remove duplicate projects
  if (duplicateProjects.length > 0) {
    data.projects = data.projects.filter(project => 
      !duplicateProjects.some(dup => dup.id === project.id)
    );
    console.log(`Removed ${duplicateProjects.length} duplicate projects`);
  }
  
  // Print statistics after fix
  console.log(`Database contents after repair:`);
  console.log(`- Companies: ${data.companies?.length || 0}`);
  console.log(`- Projects: ${data.projects?.length || 0}`);
  console.log(`- Messages: ${data.messages?.length || 0}`);
  
  // Write the fixed database back
  fs.writeFileSync(databaseFile, JSON.stringify(data, null, 2));
  console.log(`Database repaired and saved to ${databaseFile}`);
  
} catch (error) {
  console.error('Error processing database file:', error);
  process.exit(1);
}
EOF
    
    # Run the database fix script
    node /tmp/database_fix.js "$DATABASE_FILE"
    
    echo -e "${GREEN}✅ Database integrity check completed${NC}"
    
    # Show the location of both files
    echo -e "${BLUE}📂 Original database backup: $DATABASE_BACKUP${NC}"
    echo -e "${BLUE}📂 Repaired database: $DATABASE_FILE${NC}"
    
    echo -e "${YELLOW}🔄 To apply the changes, please restart your local server${NC}"
    echo -e "${GREEN}✅ Done!${NC}"
else
    echo -e "${RED}❌ Database file not found: $DATABASE_FILE${NC}"
    echo -e "${YELLOW}Creating a new empty database file...${NC}"
    
    # Create the data directory if it doesn't exist
    mkdir -p "$(dirname "$DATABASE_FILE")"
    
    # Create a simple empty database structure
    cat > "$DATABASE_FILE" <<EOF
{
  "companies": [],
  "projects": [],
  "messages": [],
  "activities": []
}
EOF
    
    echo -e "${GREEN}✅ Created new empty database at: $DATABASE_FILE${NC}"
    echo -e "${YELLOW}🔄 To apply the changes, please restart your local server${NC}"
    echo -e "${GREEN}✅ Done!${NC}"
fi

# Clean up
rm -f /tmp/database_fix.js

# Wait for user input before exiting
echo -e "${YELLOW}Press any key to exit...${NC}"
read -n 1 -s
