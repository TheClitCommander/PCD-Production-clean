// @ts-nocheck
// Low-level file storage system for Pleasant Cove Design
import { db } from "./db";
import { PostgreSQLStorage } from "./postgres-storage";
import type { Business, NewBusiness, Activity, NewActivity, Company, NewCompany, Project, NewProject, ProjectMessage, ProjectFile, AIChatMessage, Order, Proposal, NewProposal } from "../shared/schema";
import { eq } from "drizzle-orm";

// Team agent interface
export interface TeamAgent {
  id: number;
  name: string;
  email: string;
  skills: string[];
  hourlyRate: number;
  hoursWorked: number;
  assignedProjects: number[];
  rating: number;
  joinedDate: string;
  status: 'active' | 'inactive' | 'busy';
  profileImage?: string;
}

// Global memory storage for proposals (development mode)
declare global {
  var memoryProposals: Proposal[] | undefined;
}

// Mock schema objects for the in-memory database
const businessesTable = { tableName: 'businesses' };
const companiesTable = { tableName: 'companies' };
const projectsTable = { tableName: 'projects' };
const projectMessagesTable = { tableName: 'project_messages' };
const projectFilesTable = { tableName: 'project_files' };
const activitiesTable = { tableName: 'activities' };
const campaignsTable = { tableName: 'campaigns' };
const templatesTable = { tableName: 'templates' };
const appointmentsTable = { tableName: 'appointments' };
const progressEntriesTable = { tableName: 'progress_entries' };
const teamAgentsTable = { tableName: 'team_agents' };

import { memoryDb } from './db';

export class Storage {
  async markMessageAsRead(messageId: number, readAt: string): Promise<void> {
    // Use the in-memory database method directly
    await memoryDb.markMessageAsRead(messageId, readAt);
  }

  // Direct query method for compatibility with PostgreSQLStorage
  async query(text: string, params?: any[]): Promise<any> {
    // For in-memory storage, we can't execute raw SQL, so return empty results
    console.warn('Raw SQL query not supported in in-memory storage:', text);
    return { rows: [] };
  }

  // Orders operations
  // Compatibility shim for in-memory mode; delegate to memoryDb
  async getOrdersByCompanyId(companyId: number): Promise<Order[]> {
    return await memoryDb.getOrdersByCompanyId(String(companyId));
  }
  // Business operations (legacy compatibility)
  async createBusiness(data: any): Promise<Business> {
    const results: any[] = db.insert(businessesTable).values(data).returning();
    return results[0] as Business;
  }

  async getBusinesses(tagFilter?: string): Promise<Business[]> {
    let results: any[] = db.select().from(businessesTable).orderBy({});
    
    // Apply tag filtering if provided
    if (tagFilter) {
      results = results.filter(business => 
        business.tags && business.tags.includes(tagFilter)
      );
    }
    
    return results as Business[];
  }

  async getBusinessById(id: number): Promise<Business | null> {
    const businesses: any[] = db.select().from(businessesTable).where({ id });
    return (businesses[0] as Business) || null;
  }

  async updateBusiness(id: number, data: Partial<Business>): Promise<Business> {
    const results: any[] = db.update(businessesTable).set(data).where({ id }).returning();
    return results[0] as Business;
  }

  async deleteBusiness(id: number): Promise<void> {
    db.delete(businessesTable).where({ id });
  }

  // Company operations
  async createCompany(data: NewCompany): Promise<Company> {
    const companyId = await memoryDb.createCompany(data);
    // Find the created company by ID
    return memoryDb.companies.find(c => c.id === companyId);
  }

  async getCompanies(tagFilter?: string): Promise<Company[]> {
    let results: any[] = db.select().from(companiesTable).orderBy({});
    
    // Apply tag filtering if provided
    if (tagFilter) {
      results = results.filter(company => 
        company.tags && company.tags.includes(tagFilter)
      );
    }
    
    return results as Company[];
  }

  async getCompanyById(id: number): Promise<Company | null> {
    const companies: any[] = db.select().from(companiesTable).where({ id });
    return (companies[0] as Company) || null;
  }

  async updateCompany(id: number, data: Partial<Company>): Promise<Company | null> {
    const results: any[] = db.update(companiesTable).set(data).where({ id }).returning();
    return (results[0] as Company) || null;
  }

  async deleteCompany(id: number): Promise<boolean> {
    try {
      const result = await memoryDb.deleteCompany(id);
      return result;
    } catch (error) {
      console.error('❌ Error deleting company:', error);
      return false;
    }
  }

  // Project operations
  async createProject(data: NewProject): Promise<Project> {
    const projectId = await memoryDb.createProject(data);
    // Find the created project by ID
    return memoryDb.projects.find(p => p.id === projectId);
  }

  async deleteProject(id: number): Promise<boolean> {
    try {
      const result = await memoryDb.deleteProject(id);
      return result;
    } catch (error) {
      console.error('❌ Error deleting project:', error);
      return false;
    }
  }

  async getProjects(filters?: {
    status?: string;
    stage?: string;
    type?: string;
    companyId?: number;
  }): Promise<Project[]> {
    let results: any[] = memoryDb.select('projects');
    
    if (filters) {
      if (filters.status) {
        results = results.filter(project => project.status === filters.status);
      }
      if (filters.stage) {
        results = results.filter(project => project.stage === filters.stage);
      }
      if (filters.type) {
        results = results.filter(project => project.type === filters.type);
      }
      if (filters.companyId) {
        results = results.filter(project => project.companyId === filters.companyId);
      }
    }
    
    return results as Project[];
  }

  async getProjectById(id: number): Promise<Project | null> {
    const projects: any[] = memoryDb.select('projects', { id });
    return (projects[0] as Project) || null;
  }

  async getProjectsByCompany(companyId: number, statusFilter?: string): Promise<Project[]> {
    let results = await memoryDb.getProjectsByCompany(companyId);
    
    if (statusFilter) {
      results = results.filter(project => project.status === statusFilter);
    }
    
    return results;
  }

  async updateProject(id: number, data: Partial<Project>): Promise<Project | null> {
    const results: any[] = db.update(projectsTable).set(data).where({ id }).returning();
    return (results[0] as Project) || null;
  }

  // Activity operations (updated for project awareness)
  async createActivity(data: NewActivity): Promise<Activity> {
    const results: any[] = db.insert(activitiesTable).values(data).returning();
    return results[0] as Activity;
  }

  async getActivities(): Promise<Activity[]> {
    const results: any[] = db.select().from(activitiesTable).orderBy({});
    return results as Activity[];
  }

  async getActivitiesByBusinessId(businessId: number): Promise<Activity[]> {
    const results: any[] = db.select().from(activitiesTable).where({ businessId });
    return results as Activity[];
  }

  async getActivitiesByCompany(companyId: number): Promise<Activity[]> {
    const results: any[] = db.select().from(activitiesTable).where({ companyId });
    return results as Activity[];
  }

  async getActivitiesByProject(projectId: number): Promise<Activity[]> {
    const results: any[] = db.select().from(activitiesTable).where({ projectId });
    return results as Activity[];
  }

  // Campaign operations
  async getCampaigns() {
    const results: any[] = db.select().from(campaignsTable).orderBy({});
    return results;
  }

  async createCampaign(data: any) {
    const results: any[] = db.insert(campaignsTable).values(data).returning();
    return results[0];
  }

  // Template operations
  async getTemplates() {
    const results: any[] = db.select().from(templatesTable).orderBy({});
    return results;
  }

  async createTemplate(data: any) {
    const results: any[] = db.insert(templatesTable).values(data).returning();
    return results[0];
  }

  // Appointment operations (updated for project awareness)
  async getAppointments() {
    const results: any[] = db.select().from(appointmentsTable).orderBy({});
    return results;
  }

  async createAppointment(data: any) {
    const results: any[] = db.insert(appointmentsTable).values(data).returning();
    return results[0];
  }

  // New appointment methods for unified backend
  async getAppointmentsByDateTime(appointmentDate: string, appointmentTime: string) {
    const results: any[] = db.select().from(appointmentsTable).orderBy({});
    return results.filter(apt => 
      apt.appointmentDate === appointmentDate && 
      apt.appointmentTime === appointmentTime &&
      apt.status !== 'cancelled'
    );
  }

  async getAppointmentsByDate(date: string) {
    const results: any[] = db.select().from(appointmentsTable).orderBy({});
    return results.filter(apt => apt.appointmentDate === date);
  }

  async getAllAppointments() {
    const results: any[] = db.select().from(appointmentsTable).orderBy({});
    return results.sort((a, b) => {
      const dateA = new Date(`${a.appointmentDate} ${a.appointmentTime}`);
      const dateB = new Date(`${b.appointmentDate} ${b.appointmentTime}`);
      return dateB.getTime() - dateA.getTime();
    });
  }

  async updateAppointmentStatus(id: number, status: string) {
    const results: any[] = db.update(appointmentsTable).set({ status }).where({ id }).returning();
    return results[0] || null;
  }

  async getAppointmentsByBusinessId(businessId: number) {
    const results: any[] = db.select().from(appointmentsTable).where({ businessId });
    return results;
  }

  async getAppointmentsByCompany(companyId: number) {
    const results: any[] = db.select().from(appointmentsTable).where({ companyId });
    return results;
  }

  async getAppointmentsByProject(projectId: number) {
    const results: any[] = db.select().from(appointmentsTable).where({ projectId });
    return results;
  }

  async getAppointmentBySquarespaceId(squarespaceId: string) {
    const results: any[] = db.select().from(appointmentsTable).where({ squarespaceId });
    return results[0] || null;
  }

  async updateAppointment(id: number, data: any) {
    const results: any[] = db.update(appointmentsTable).set(data).where({ id }).returning();
    return results[0];
  }

  async getAppointmentById(id: number) {
    const results: any[] = db.select().from(appointmentsTable).where({ id });
    return results[0] || null;
  }

  async deleteAppointment(id: number) {
    db.delete(appointmentsTable).where({ id });
  }

  // ===================
  // ACUITY APPOINTMENT OPERATIONS
  // ===================

  async getAppointmentsByProjectToken(projectToken: string) {
    const results: any[] = db.select().from(appointmentsTable).where({ projectToken });
    return results;
  }

  async getAppointmentByAcuityId(acuityId: string) {
    const results: any[] = db.select().from(appointmentsTable).where({ acuityId });
    return results[0] || null;
  }

  async createAcuityAppointment(appointmentData: any, projectToken?: string) {
    // Prevent duplicates by checking Acuity ID
    const existing = await this.getAppointmentByAcuityId(appointmentData.acuityId);
    if (existing) {
      console.log(`🔄 Acuity appointment ${appointmentData.acuityId} already exists, updating...`);
      return await this.updateAppointment(existing.id, {
        ...appointmentData,
        projectToken,
        updatedAt: new Date().toISOString()
      });
    }

    // Create new appointment
    const data = {
      ...appointmentData,
      projectToken,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const results: any[] = db.insert(appointmentsTable).values(data).returning();
    return results[0];
  }

  async findClientByEmail(email: string): Promise<{ 
    company?: Company, 
    project?: Project, 
    business?: Business 
  } | null> {
    console.log(`🔍 Storage: Searching for client with email: ${email}`);
    
    // Use the actual in-memory database instead of the fake db interface
    const company = await memoryDb.findClientByEmail(email);
    
    if (company) {
      console.log(`✅ Storage: Found matching company: ${company.name} (${company.email})`);
      
      // Get the first project for this company
      const projects = await memoryDb.getProjectsByCompany(company.id);
      const project = projects[0];
      
      return { company, project };
    }

    console.log(`❌ Storage: No client found for email: ${email}`);
    return null;
  }

  // Progress tracking operations
  async getProgressEntries() {
    const results: any[] = db.select().from(progressEntriesTable).orderBy({});
    return results;
  }

  async getProgressEntriesByBusinessId(businessId: number) {
    const results: any[] = db.select().from(progressEntriesTable).where({ businessId });
    return results;
  }

  async createProgressEntry(data: any) {
    const results: any[] = db.insert(progressEntriesTable).values(data).returning();
    return results[0];
  }

  // Public progress entries (for client viewing)
  async getPublicProgressEntries(businessId: number) {
    const results: any[] = db.select().from(progressEntriesTable).where({ businessId });
    return results;
  }

  // Availability and scheduling
  async getAvailabilityConfig() {
    return []; // Simplified for now
  }

  async getBlockedDates() {
    return []; // Simplified for now
  }

  async createBlockedDate(data: any) {
    return { id: Date.now() }; // Simplified for now
  }

  // Statistics and analytics
  async getStats() {
    const businesses = await this.getBusinesses();
    const activities = await this.getActivities();
    
    // Calculate stage statistics
    const stageStats = businesses.reduce((acc, business) => {
      acc[business.stage] = (acc[business.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate revenue metrics
    const soldBusinesses = businesses.filter(b => b.stage === 'sold' || b.stage === 'delivered');
    const totalRevenue = soldBusinesses.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const paidRevenue = soldBusinesses.reduce((sum, b) => sum + (b.paidAmount || 0), 0);

    // Lead quality metrics
    const highScoreLeads = businesses.filter(b => (b.score || 0) >= 80).length;
    const averageScore = businesses.reduce((sum, b) => sum + (b.score || 0), 0) / businesses.length || 0;

    // Activity metrics
    const recentActivities = activities.filter(a => {
      if (!a.createdAt) return false;
      const activityDate = new Date(a.createdAt);
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      return activityDate > dayAgo;
    });

    return {
      totalLeads: businesses.length,
      totalRevenue,
      paidRevenue,
      pendingRevenue: totalRevenue - paidRevenue,
      averageScore: Math.round(averageScore),
      highScoreLeads,
      stageStats,
      recentActivityCount: recentActivities.length,
      conversionRate: businesses.length > 0 ? (soldBusinesses.length / businesses.length * 100).toFixed(1) : 0
    };
  }

  // Search and filtering
  async searchBusinesses(query: string) {
    const businesses = await this.getBusinesses();
    const lowerQuery = query.toLowerCase();
    
    return businesses.filter(b => 
      b.name?.toLowerCase().includes(lowerQuery) ||
      b.email?.toLowerCase().includes(lowerQuery) ||
      b.phone?.toLowerCase().includes(lowerQuery) ||
      b.businessType?.toLowerCase().includes(lowerQuery)
    );
  }

  async getBusinessesByStage(stage: string) {
    const businesses = await this.getBusinesses();
    return businesses.filter(b => b.stage === stage);
  }

  async getBusinessesByPriority(priority: string) {
    const businesses = await this.getBusinesses();
    return businesses.filter(b => b.priority === priority)
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  // Get all unique tags from businesses
  async getAllTags(): Promise<string[]> {
    const businesses = await this.getBusinesses();
    const allTags = new Set<string>();
    
    businesses.forEach(business => {
      if (business.tags && Array.isArray(business.tags)) {
        business.tags.forEach((tag: string) => allTags.add(tag));
      }
    });
    
    return Array.from(allTags).sort();
  }

  // Bulk operations
  async updateBusinessStage(businessId: number, stage: string) {
    return await this.updateBusiness(businessId, { stage });
  }

  async updateBusinessScore(businessId: number, score: number) {
    return await this.updateBusiness(businessId, { score });
  }

  async updateBusinessPriority(businessId: number, priority: string) {
    return await this.updateBusiness(businessId, { priority });
  }

  // ===================
  // PROJECT MESSAGE OPERATIONS
  // ===================

  async getProjectMessages(projectId: number): Promise<ProjectMessage[]> {
    const results: any[] = db.select().from(projectMessagesTable).where({ projectId });
    return results as ProjectMessage[];
  }

  async createProjectMessage(data: Omit<ProjectMessage, 'id'>): Promise<ProjectMessage> {
    const results: any[] = db.insert(projectMessagesTable).values(data).returning();
    return results[0] as ProjectMessage;
  }

  async updateProjectMessage(id: number, data: Partial<ProjectMessage>): Promise<ProjectMessage | null> {
    const results: any[] = db.update(projectMessagesTable).set(data).where({ id }).returning();
    return (results[0] as ProjectMessage) || null;
  }

  async deleteProjectMessage(id: number): Promise<void> {
    db.delete(projectMessagesTable).where({ id });
  }

  // Alias for createProjectMessage (for compatibility)
  async addMessage(data: {
    projectId: number;
    senderType: 'client' | 'admin';
    senderName: string;
    content: string;
    attachments?: string[];
  }): Promise<ProjectMessage> {
    const messageData = {
      ...data,
      attachments: data.attachments || [],
      createdAt: new Date().toISOString()
    };
    return this.createProjectMessage(messageData);
  }

  // ===================
  // PROJECT FILE OPERATIONS
  // ===================

  async getProjectFiles(projectId: number): Promise<ProjectFile[]> {
    const results: any[] = db.select().from(projectFilesTable).where({ projectId });
    return results as ProjectFile[];
  }

  async createProjectFile(data: Omit<ProjectFile, 'id'>): Promise<ProjectFile> {
    const results: any[] = db.insert(projectFilesTable).values(data).returning();
    return results[0] as ProjectFile;
  }

  async updateProjectFile(id: number, data: Partial<ProjectFile>): Promise<ProjectFile | null> {
    const results: any[] = db.update(projectFilesTable).set(data).where({ id }).returning();
    return (results[0] as ProjectFile) || null;
  }

  async deleteProjectFile(id: number): Promise<void> {
    db.delete(projectFilesTable).where({ id });
  }

  // ===================
  // CLIENT PORTAL OPERATIONS
  // ===================

  async getProjectByToken(accessToken: string): Promise<(Project & { company: Company }) | null> {
    const projectResults: any[] = db.select().from(projectsTable).where({ accessToken });
    const project = projectResults[0] as Project;
    
    if (!project) {
      return null;
    }

    // Get company information
    const companyResults: any[] = db.select().from(companiesTable).where({ id: project.companyId });
    const company = companyResults[0] as Company;

    return {
      ...project,
      company
    };
  }

  // Alias for compatibility with existing code
  async getProjectByAccessToken(accessToken: string): Promise<Project | null> {
    const projectResults: any[] = db.select().from(projectsTable).where({ accessToken });
    return (projectResults[0] as Project) || null;
  }

  async getProjectSummaryByToken(accessToken: string): Promise<{
    project: Project;
    company: Company;
    messages: ProjectMessage[];
    files: ProjectFile[];
    activities: Activity[];
  } | null> {
    const projectData = await this.getProjectByToken(accessToken);
    
    if (!projectData) {
      return null;
    }

    const { company, ...project } = projectData;
    
    // Check if company exists to prevent "Cannot read properties of undefined (reading 'name')" error
    if (!company) {
      console.error(`Company not found for project with token ${accessToken}`);
      
      // Create a fallback company object for projects with missing companies
      const fallbackCompany: Company = {
        id: project.companyId,
        name: "Client",
        email: "client@example.com",
        phone: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        country: "",
        notes: "Auto-generated fallback company",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Get all related data
      const messages = await this.getProjectMessages(project.id!);
      const files = await this.getProjectFiles(project.id!);
      const activities = await this.getActivitiesByProject(project.id!);

      return {
        project,
        company: fallbackCompany,
        messages,
        files,
        activities: activities || []
      };
    }
    
    // Get all related data
    const messages = await this.getProjectMessages(project.id!);
    const files = await this.getProjectFiles(project.id!);
    const activities = await this.getActivitiesByProject(project.id!);

    return {
      project,
      company,
      messages,
      files,
      activities: activities || []
    };
  }

  // ===================
  // NEW UNIFIED CONVERSATION LOADER
  // ===================
  async getAllConversations() {
    console.log("🔄 [STORAGE] Getting all conversations for admin inbox...");
    
    const projects = await this.getProjects({});
    const companies = await this.getCompanies();
    
    // Get all project messages
    const allProjectMessages: any[] = [];
    for (const project of projects) {
      if (project.id) {
        const projectMessages = await this.getProjectMessages(project.id);
        allProjectMessages.push(...projectMessages);
      }
    }
    const messages = allProjectMessages;

    const companyMap = new Map(companies.map(c => [c.id, c]));

    const conversations = projects
      .map(project => {
        const company = companyMap.get(project.companyId);
        const projectMessages = messages.filter(m => m.projectId === project.id);

        if (!company || projectMessages.length === 0) {
          return null;
        }
        
        projectMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        return {
          projectId: project.id,
          projectTitle: project.title,
          customerName: company.name,
          accessToken: project.accessToken,
          lastMessage: projectMessages[projectMessages.length - 1],
          lastMessageTime: projectMessages[projectMessages.length - 1].createdAt,
          messages: projectMessages,
        };
      })
      .filter(Boolean); // Remove null entries for projects with no messages or company

    conversations.sort((a, b) => {
      if (!a || !b) return 0;
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });
    
    console.log(`✅ [STORAGE] Returning ${conversations.length} formatted conversations.`);
    return conversations;
  }

  // AI Chat Message methods (delegate to memoryDb)
  async createAIChatMessage(message: Omit<AIChatMessage, 'id' | 'timestamp'> & { timestamp?: Date }): Promise<AIChatMessage> {
    return await memoryDb.createAIChatMessage(message);
  }

  async getAIChatMessages(filters: {
    leadId?: string;
    projectId?: number;
    sessionId?: string;
    limit?: number;
    messageType?: 'user' | 'ai' | 'function_call' | 'function_response';
  } = {}): Promise<AIChatMessage[]> {
    return await memoryDb.getAIChatMessages(filters);
  }

  async getLastAIChatMessage(leadId: string): Promise<AIChatMessage | null> {
    return await memoryDb.getLastAIChatMessage(leadId);
  }

  async getAIChatContext(leadId?: string, projectId?: number, limit: number = 10): Promise<AIChatMessage[]> {
    return await memoryDb.getAIChatContext(leadId, projectId, limit);
  }

  // Order Management Methods
  async createOrder(order: Omit<Order, 'createdAt' | 'updatedAt'>): Promise<Order> {
    if (this.postgresStorage) {
      return await this.postgresStorage.createOrder(order);
    }
    return await memoryDb.createOrder(order);
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    if (this.postgresStorage) {
      return await this.postgresStorage.getOrderById(orderId);
    }
    return await memoryDb.getOrderById(orderId);
  }

  async getOrdersByCompanyId(companyId: string): Promise<Order[]> {
    if (this.postgresStorage) {
      return await this.postgresStorage.getOrdersByCompany(companyId);
    }
    return await memoryDb.getOrdersByCompanyId(companyId);
  }

  async updateOrder(orderId: string, updates: Partial<Order>): Promise<Order | null> {
    if (this.postgresStorage) {
      return await this.postgresStorage.updateOrder(orderId, updates);
    }
    return await memoryDb.updateOrder(orderId, updates);
  }

  async getOrders(): Promise<Order[]> {
    if (this.postgresStorage) {
      return await this.postgresStorage.getOrders();
    }
    return await memoryDb.getOrders();
  }

  async deleteOrder(orderId: string): Promise<boolean> {
    return await memoryDb.deleteOrder(orderId);
  }

  // Proposal Management Methods (Phase 1) - In-Memory Storage
  async createProposal(proposal: NewProposal): Promise<Proposal> {
    const newProposal: Proposal = {
      id: `proposal_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      leadId: proposal.leadId,
      status: proposal.status || 'draft',
      totalAmount: proposal.totalAmount,
      lineItems: proposal.lineItems || [],
      notes: proposal.notes || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Store in memory (using a simple array for now)
    if (!global.memoryProposals) {
      global.memoryProposals = [];
    }
    global.memoryProposals.push(newProposal);
    
    return newProposal;
  }

  async getProposals(): Promise<Proposal[]> {
    return global.memoryProposals || [];
  }

  async getProposalById(id: string): Promise<Proposal | null> {
    const proposals = global.memoryProposals || [];
    return proposals.find(p => p.id === id) || null;
  }

  async getProposalsByLead(leadId: number): Promise<Proposal[]> {
    const proposals = global.memoryProposals || [];
    return proposals.filter(p => p.leadId === leadId);
  }

  async updateProposal(id: string, data: Partial<Proposal>): Promise<Proposal | null> {
    const proposals = global.memoryProposals || [];
    const index = proposals.findIndex(p => p.id === id);
    
    if (index === -1) return null;
    
    const updated = {
      ...proposals[index],
      ...data,
      updatedAt: new Date()
    };
    
    proposals[index] = updated;
    return updated;
  }

  async deleteProposal(id: string): Promise<boolean> {
    if (!global.memoryProposals) return false;
    
    const index = global.memoryProposals.findIndex(p => p.id === id);
    if (index === -1) return false;
    
    global.memoryProposals.splice(index, 1);
    return true;
  }

  // Canvas data storage methods
  async getCanvasData(projectId: number): Promise<any | null> {
    try {
      return memoryDb.getCanvasData(projectId);
    } catch (error) {
      console.error(`Failed to get canvas data for project ${projectId}:`, error);
      return null;
    }
  }

  async saveCanvasData(projectId: number, canvasData: any): Promise<boolean> {
    try {
      await memoryDb.saveCanvasData(projectId, canvasData);
      return true;
    } catch (error) {
      console.error(`Failed to save canvas data for project ${projectId}:`, error);
      return false;
    }
  }

  async getCanvasVersions(projectId: number): Promise<any[]> {
    try {
      return memoryDb.getCanvasVersions(projectId) || [];
    } catch (error) {
      console.error(`Failed to get canvas versions for project ${projectId}:`, error);
      return [];
    }
  }

  async saveCanvasVersion(projectId: number, versionData: any): Promise<string> {
    try {
      const versionId = `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await memoryDb.saveCanvasVersion(projectId, {
        ...versionData,
        id: versionId
      });
      return versionId;
    } catch (error) {
      console.error(`Failed to save canvas version for project ${projectId}:`, error);
      throw error;
    }
  }

  async getCanvasVersion(projectId: number, versionId: string): Promise<any | null> {
    try {
      return memoryDb.getCanvasVersion(projectId, versionId);
    } catch (error) {
      console.error(`Failed to get canvas version ${versionId} for project ${projectId}:`, error);
      return null;
    }
  }

  // Team agent operations
  async getTeamAgents(): Promise<TeamAgent[]> {
    // In-memory implementation
    if (!memoryDb.teamAgents) {
      memoryDb.teamAgents = [];
    }
    return memoryDb.teamAgents;
  }

  async getTeamAgentById(id: number): Promise<TeamAgent | null> {
    // In-memory implementation
    if (!memoryDb.teamAgents) {
      memoryDb.teamAgents = [];
    }
    return memoryDb.teamAgents.find(agent => agent.id === id) || null;
  }

  async createTeamAgent(data: Omit<TeamAgent, 'id'>): Promise<TeamAgent> {
    // In-memory implementation
    if (!memoryDb.teamAgents) {
      memoryDb.teamAgents = [];
    }
    
    const newId = memoryDb.teamAgents.length > 0 
      ? Math.max(...memoryDb.teamAgents.map(a => a.id)) + 1 
      : 1;
    
    const newAgent: TeamAgent = {
      ...data,
      id: newId
    };
    
    memoryDb.teamAgents.push(newAgent);
    return newAgent;
  }

  async updateTeamAgent(id: number, data: Partial<TeamAgent>): Promise<TeamAgent | null> {
    // In-memory implementation
    if (!memoryDb.teamAgents) {
      memoryDb.teamAgents = [];
    }
    
    const index = memoryDb.teamAgents.findIndex(agent => agent.id === id);
    if (index === -1) return null;
    
    memoryDb.teamAgents[index] = {
      ...memoryDb.teamAgents[index],
      ...data
    };
    
    return memoryDb.teamAgents[index];
  }

  async deleteTeamAgent(id: number): Promise<boolean> {
    // In-memory implementation
    if (!memoryDb.teamAgents) {
      memoryDb.teamAgents = [];
      return false;
    }
    
    const initialLength = memoryDb.teamAgents.length;
    memoryDb.teamAgents = memoryDb.teamAgents.filter(agent => agent.id !== id);
    
    return memoryDb.teamAgents.length < initialLength;
  }

  // Demo operations
  async getDemos(): Promise<any[]> {
    // In-memory implementation
    if (!memoryDb.demos) {
      memoryDb.demos = [];
    }
    return memoryDb.demos;
  }

  async getDemoById(id: number): Promise<any | null> {
    // In-memory implementation
    if (!memoryDb.demos) {
      memoryDb.demos = [];
    }
    return memoryDb.demos.find(demo => demo.id === id) || null;
  }

  async getDemoStats(): Promise<any> {
    // In-memory implementation
    if (!memoryDb.demos) {
      memoryDb.demos = [];
    }
    
    const totalDemos = memoryDb.demos.length;
    const totalViews = memoryDb.demos.reduce((sum, demo) => sum + (demo.views || 0), 0);
    const averageViewsPerDemo = totalDemos > 0 ? totalViews / totalDemos : 0;
    
    let topPerformingDemo = '';
    if (totalDemos > 0) {
      const topDemo = memoryDb.demos.reduce((max, demo) => 
        (demo.views || 0) > (max.views || 0) ? demo : max, memoryDb.demos[0]);
      topPerformingDemo = topDemo.companyName || '';
    }
    
    return {
      totalDemos,
      totalViews,
      averageViewsPerDemo,
      topPerformingDemo,
      recentActivity: []
    };
  }

  async generateDemo(data: any): Promise<any> {
    // In-memory implementation
    if (!memoryDb.demos) {
      memoryDb.demos = [];
    }
    
    const newId = memoryDb.demos.length > 0 
      ? Math.max(...memoryDb.demos.map(d => d.id)) + 1 
      : 1;
    
    const newDemo = {
      id: newId,
      companyName: data.businessName,
      businessType: data.businessType,
      demoUrl: `/demos/${data.businessName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.html`,
      previewImage: `https://placehold.co/600x400/e8f4ff/0a2540?text=${encodeURIComponent(data.businessName)}`,
      views: 0,
      createdAt: new Date().toISOString(),
      status: "active",
      template: data.template || "default",
      customizations: data.customizations || ["responsive"]
    };
    
    memoryDb.demos.push(newDemo);
    return newDemo;
  }
}

// Export singleton instance
// Initialize storage based on environment
function createStorage() {
  const databaseUrl = process.env.DATABASE_URL;
  
  try {
    if (databaseUrl) {
      console.log('🐘 Using PostgreSQL storage (persistent)');
      console.log('🔗 Database URL configured:', databaseUrl.substring(0, 20) + '...');
      return new PostgreSQLStorage(databaseUrl);
    } else {
      console.log('💾 Using in-memory storage (development)');
      return new Storage();
    }
  } catch (error) {
    console.error('❌ Failed to initialize storage:', error);
    console.log('🔄 Falling back to in-memory storage');
    return new Storage();
  }
}

export const storage = createStorage();