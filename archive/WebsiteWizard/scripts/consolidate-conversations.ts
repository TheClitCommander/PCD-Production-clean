#!/usr/bin/env node
/**
 * One-time migration script to consolidate all client conversations
 * Ensures each client has exactly ONE active conversation thread
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Company {
  id: number;
  email: string;
  name: string;
}

interface Project {
  id: number;
  companyId: number;
  title: string;
  status: string;
  accessToken: string;
  createdAt?: string;
}

interface Message {
  id: number;
  projectId: number;
  senderName: string;
  senderType: string;
  content: string;
  createdAt: string;
  attachments?: string[];
}

interface Database {
  companies: Company[];
  projects: Project[];
  projectMessages: Message[];
}

async function consolidateConversations() {
  console.log('🔄 Starting conversation consolidation migration...\n');
  
  // Load database - use absolute path to the actual database
  const dbPath = '/Users/bendickinson/Desktop/pleasantcovedesign/pleasantcovedesign/server/data/database.json';
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8')) as Database;
  
  console.log(`📊 Database stats:
  - Companies: ${dbData.companies.length}
  - Projects: ${dbData.projects.length}
  - Messages: ${dbData.projectMessages.length}\n`);
  
  // Group projects by company
  const projectsByCompany = new Map<number, Project[]>();
  
  for (const project of dbData.projects) {
    if (!projectsByCompany.has(project.companyId)) {
      projectsByCompany.set(project.companyId, []);
    }
    projectsByCompany.get(project.companyId)!.push(project);
  }
  
  // Process each company
  let consolidatedCount = 0;
  let messagesReassigned = 0;
  const projectsToDelete: number[] = [];
  
  for (const [companyId, projects] of projectsByCompany) {
    const company = dbData.companies.find(c => c.id === companyId);
    if (!company) continue;
    
    // Skip if only one project
    if (projects.length <= 1) continue;
    
    console.log(`\n👤 Processing ${company.name} (${company.email}):`);
    console.log(`   Found ${projects.length} projects`);
    
    // Find all active projects
    const activeProjects = projects.filter(p => p.status === 'active');
    
    // Determine master project (prefer most recent active, or most recent overall)
    let masterProject: Project;
    
    if (activeProjects.length > 0) {
      // Use most recent active project
      masterProject = activeProjects.sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )[0];
    } else {
      // Use most recent project overall
      masterProject = projects.sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )[0];
    }
    
    console.log(`   ✅ Master project: ${masterProject.title} (ID: ${masterProject.id}, Token: ${masterProject.accessToken.substring(0, 8)}...)`);
    
    // Reassign all messages to master project
    for (const project of projects) {
      if (project.id === masterProject.id) continue;
      
      const messagesToReassign = dbData.projectMessages.filter(m => m.projectId === project.id);
      console.log(`   📨 Reassigning ${messagesToReassign.length} messages from project ${project.id} to master`);
      
      // Update message project IDs
      for (const message of messagesToReassign) {
        message.projectId = masterProject.id;
        messagesReassigned++;
      }
      
      // Mark old project for deletion
      projectsToDelete.push(project.id);
      
      // Update project status to completed
      project.status = 'completed';
    }
    
    // Ensure master project is active
    masterProject.status = 'active';
    consolidatedCount++;
  }
  
  // Remove duplicate projects
  dbData.projects = dbData.projects.filter(p => !projectsToDelete.includes(p.id));
  
  // Sort messages by timestamp for each project
  const messagesByProject = new Map<number, Message[]>();
  for (const message of dbData.projectMessages) {
    if (!messagesByProject.has(message.projectId)) {
      messagesByProject.set(message.projectId, []);
    }
    messagesByProject.get(message.projectId)!.push(message);
  }
  
  // Sort messages within each project
  for (const [projectId, messages] of messagesByProject) {
    messages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }
  
  // Create backup in the same directory as the database
  const backupPath = `/Users/bendickinson/Desktop/pleasantcovedesign/pleasantcovedesign/server/data/database-backup-${Date.now()}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(dbData, null, 2));
  console.log(`\n💾 Backup saved to: ${backupPath}`);
  
  // Save consolidated database
  fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
  
  console.log(`\n✅ Consolidation complete!
  - Clients consolidated: ${consolidatedCount}
  - Messages reassigned: ${messagesReassigned}
  - Projects removed: ${projectsToDelete.length}
  - Total projects now: ${dbData.projects.length}
  `);
}

// Run migration
consolidateConversations().catch(console.error); 