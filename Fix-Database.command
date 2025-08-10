#!/bin/bash

# Pleasant Cove Design - Database Repair Tool
# This script runs the database repair tool to fix orphaned messages and project references

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Set the project root
PROJECT_ROOT="$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Pleasant Cove Design - Database Repair Tool${NC}"
echo -e "${BLUE}======================================================${NC}"

# Verify Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js and try again.${NC}"
    exit 1
fi

# Check if the fix-orphaned-data.js script exists
if [ ! -f "$PROJECT_ROOT/pleasantcovedesign/server/fix-orphaned-data.js" ]; then
    echo -e "${RED}❌ Database repair script not found at pleasantcovedesign/server/fix-orphaned-data.js${NC}"
    echo -e "${YELLOW}Creating the script now...${NC}"
    
    # Create the script file
    cat > "$PROJECT_ROOT/pleasantcovedesign/server/fix-orphaned-data.js" << 'EOL'
/**
 * Pleasant Cove Design - Database Repair Tool
 * This script fixes orphaned messages and project references in the database
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DATABASE_PATH = path.join(__dirname, 'data', 'database.json');
const BACKUP_PATH = path.join(__dirname, 'data', `database.json.backup-${Date.now()}`);

console.log('🔧 Pleasant Cove Design - Database Repair Tool');
console.log('=============================================');
console.log(`Database path: ${DATABASE_PATH}`);

// Load database
let db;
try {
    console.log('📂 Reading database...');
    const dbContent = fs.readFileSync(DATABASE_PATH, 'utf8');
    db = JSON.parse(dbContent);
    console.log('✅ Database loaded successfully');
} catch (error) {
    console.error(`❌ Failed to load database: ${error.message}`);
    process.exit(1);
}

// Backup database
try {
    console.log(`💾 Creating backup at ${BACKUP_PATH}`);
    fs.writeFileSync(BACKUP_PATH, JSON.stringify(db, null, 2), 'utf8');
    console.log('✅ Backup created successfully');
} catch (error) {
    console.error(`❌ Failed to create backup: ${error.message}`);
    process.exit(1);
}

// Analyze database structure
console.log('\n📊 Analyzing database...');
const projects = db.projects || [];
const messages = db.messages || [];
const companies = db.companies || [];

console.log(`Found ${projects.length} projects`);
console.log(`Found ${messages.length} messages`);
console.log(`Found ${companies.length} companies`);

// Find orphaned messages (messages without a valid projectId)
console.log('\n🔍 Looking for orphaned messages...');
const validProjectIds = new Set(projects.map(p => p.id));
const orphanedMessages = messages.filter(m => !validProjectIds.has(m.projectId));

console.log(`Found ${orphanedMessages.length} orphaned messages`);

if (orphanedMessages.length > 0) {
    console.log('\n🔨 Fixing orphaned messages...');
    
    // Group orphaned messages by sender or any common attribute
    const messageGroups = new Map();
    
    orphanedMessages.forEach(message => {
        // Try to group by sender/recipient if available
        const groupKey = message.sender || message.recipient || 'unknown';
        
        if (!messageGroups.has(groupKey)) {
            messageGroups.set(groupKey, []);
        }
        
        messageGroups.get(groupKey).push(message);
    });
    
    console.log(`Grouped into ${messageGroups.size} conversation groups`);
    
    // Create new projects for each group of orphaned messages
    messageGroups.forEach((messageGroup, groupKey) => {
        // Find if there's an existing company we can associate with
        let companyId = null;
        const possibleCompany = companies.find(c => 
            c.name && groupKey !== 'unknown' && 
            (c.name.includes(groupKey) || groupKey.includes(c.name)));
        
        if (possibleCompany) {
            companyId = possibleCompany.id;
            console.log(`Found matching company ${possibleCompany.name} (${companyId}) for group ${groupKey}`);
        } else {
            // Create a new company if needed
            if (groupKey !== 'unknown') {
                const newCompany = {
                    id: companies.length > 0 ? Math.max(...companies.map(c => c.id)) + 1 : 1,
                    name: `${groupKey} (Recovered)`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                companies.push(newCompany);
                companyId = newCompany.id;
                console.log(`Created new company ${newCompany.name} (${companyId}) for group ${groupKey}`);
            } else {
                // If we can't identify the sender, use the first company
                if (companies.length > 0) {
                    companyId = companies[0].id;
                    console.log(`Using default company ${companies[0].name} (${companyId}) for unknown group`);
                }
            }
        }
        
        // Create a new project for this message group
        const newProject = {
            id: projects.length > 0 ? Math.max(...projects.map(p => p.id)) + 1 : 1,
            name: `Recovered Conversation`,
            type: 'Master Conversation',
            companyId,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        projects.push(newProject);
        console.log(`Created new project ${newProject.name} (${newProject.id}) for ${messageGroup.length} messages`);
        
        // Update all messages in this group to reference the new project
        messageGroup.forEach(message => {
            message.projectId = newProject.id;
        });
    });
}

// Find duplicate projects
console.log('\n🔍 Looking for duplicate projects...');
const projectsByCompanyAndType = new Map();

projects.forEach(project => {
    const key = `${project.companyId}-${project.type}`;
    if (!projectsByCompanyAndType.has(key)) {
        projectsByCompanyAndType.set(key, []);
    }
    projectsByCompanyAndType.get(key).push(project);
});

let duplicateCount = 0;
projectsByCompanyAndType.forEach((projectGroup, key) => {
    if (projectGroup.length > 1) {
        console.log(`Found ${projectGroup.length} duplicate projects for key ${key}`);
        duplicateCount += projectGroup.length - 1;
        
        // Sort by creation date, newest first
        projectGroup.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Keep the newest project
        const primaryProject = projectGroup[0];
        const duplicateProjects = projectGroup.slice(1);
        
        console.log(`Keeping project ${primaryProject.id} as primary`);
        
        // Update all messages from duplicate projects to reference the primary project
        duplicateProjects.forEach(dupProject => {
            const messagesForDup = messages.filter(m => m.projectId === dupProject.id);
            console.log(`Moving ${messagesForDup.length} messages from project ${dupProject.id} to ${primaryProject.id}`);
            
            messagesForDup.forEach(message => {
                message.projectId = primaryProject.id;
            });
        });
        
        // Remove duplicate projects from the projects list
        for (let i = projects.length - 1; i >= 0; i--) {
            if (duplicateProjects.some(dup => dup.id === projects[i].id)) {
                projects.splice(i, 1);
            }
        }
    }
});

console.log(`Removed ${duplicateCount} duplicate projects`);

// Save the updated database
try {
    console.log('\n💾 Saving updated database...');
    
    // Update the database object
    db.projects = projects;
    db.messages = messages;
    db.companies = companies;
    
    fs.writeFileSync(DATABASE_PATH, JSON.stringify(db, null, 2), 'utf8');
    console.log('✅ Database saved successfully');
    console.log(`Total projects: ${projects.length}`);
    console.log(`Total messages: ${messages.length}`);
    console.log(`Total companies: ${companies.length}`);
} catch (error) {
    console.error(`❌ Failed to save database: ${error.message}`);
    process.exit(1);
}

console.log('\n🎉 Database repair completed successfully!');
EOL

    echo -e "${GREEN}✅ Repair script created${NC}"
fi

# Run the script
echo -e "${YELLOW}🚀 Running database repair tool...${NC}"
cd "$PROJECT_ROOT/pleasantcovedesign/server"
node fix-orphaned-data.js

# Check if the script ran successfully
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database repair completed successfully${NC}"
    echo -e "${YELLOW}💡 Tip: Restart your server to apply the changes${NC}"
else
    echo -e "${RED}❌ Database repair failed${NC}"
    exit 1
fi

# Keep the window open
echo -e "\n${BLUE}Press any key to close this window...${NC}"
read -n 1 -s
