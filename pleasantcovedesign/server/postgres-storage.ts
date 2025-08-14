// @ts-nocheck
import { Pool } from 'pg';
import type { Business, NewBusiness, Activity, NewActivity, Company, NewCompany, Project, NewProject, ProjectMessage, ProjectFile, AIChatMessage } from "../shared/schema";
import type { TeamAgent } from "./storage";

export class PostgreSQLStorage {
  private pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    console.log('🐘 PostgreSQL storage initialized');
    this.initializeTables();
  }

  // Expose pool for specialized services (like LeadService)
  getPool(): Pool {
    return this.pool;
  }

  // Direct query method for raw SQL queries
  async query(text: string, params?: any[]): Promise<any> {
    return await this.pool.query(text, params);
  }

  async forceMigration() {
    try {
      console.log('🔧 FORCE MIGRATION: Adding missing columns...');
      
      // Add missing columns to companies table
      const missingColumns = [
        'ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone VARCHAR(50)',
        'ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT',
        'ALTER TABLE companies ADD COLUMN IF NOT EXISTS city VARCHAR(100)',
        'ALTER TABLE companies ADD COLUMN IF NOT EXISTS state VARCHAR(50)',
        'ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry VARCHAR(100)',
        'ALTER TABLE companies ADD COLUMN IF NOT EXISTS website VARCHAR(255)',
        'ALTER TABLE companies ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT \'medium\'',
        'ALTER TABLE companies ADD COLUMN IF NOT EXISTS tags TEXT[]',
        'ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
        
        // Add missing columns to projects table
        'ALTER TABLE projects ADD COLUMN IF NOT EXISTS type VARCHAR(100) NOT NULL DEFAULT \'website\'',
        'ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage VARCHAR(100) NOT NULL DEFAULT \'discovery\'',
        'ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'active\'',
        'ALTER TABLE projects ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0',
        'ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes TEXT',
        'ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0',
        'ALTER TABLE projects ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0',
        'ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
        
        // Add missing columns to project_messages table
        'ALTER TABLE project_messages ADD COLUMN IF NOT EXISTS attachments TEXT[]'
      ];
      
      for (const sql of missingColumns) {
        try {
          await this.pool.query(sql);
          console.log(`✅ Executed: ${sql.substring(0, 60)}...`);
        } catch (error) {
          console.log(`⚠️  Skipped: ${sql.substring(0, 60)}... (${error.message})`);
        }
      }
      
      console.log('✅ FORCE MIGRATION: Missing columns added successfully');
      return { success: true, message: 'Migration completed - missing columns added' };
    } catch (error) {
      console.error('❌ FORCE MIGRATION: Failed:', error);
      return { success: false, error: error.message };
    }
  }

  private async initializeTables() {
    try {
      console.log('🔧 Initializing PostgreSQL tables...');
      
      // Try multiple possible paths for schema.sql
      const fs = await import('fs');
      const path = await import('path');
      
      const possiblePaths = [
        path.join(process.cwd(), 'server', 'schema.sql'),
        path.join(process.cwd(), 'pleasantcovedesign', 'server', 'schema.sql'),
        path.join(__dirname, 'schema.sql'),
        path.join(__dirname, '..', 'schema.sql'),
        '/app/pleasantcovedesign/server/schema.sql', // Railway absolute path
        '/app/schema.sql', // Railway root path
        path.join(process.cwd(), 'dist', 'schema.sql'), // Built path
        path.join(process.cwd(), 'src', 'schema.sql') // Source path
      ];
      
      let schema: string | null = null;
      let usedPath: string | null = null;
      
      for (const schemaPath of possiblePaths) {
        try {
          if (fs.existsSync(schemaPath)) {
            schema = fs.readFileSync(schemaPath, 'utf8');
            usedPath = schemaPath;
            console.log(`✅ Found schema.sql at: ${schemaPath}`);
            break;
          }
        } catch (err) {
          console.log(`⚠️  Could not read schema from: ${schemaPath}`);
        }
      }
      
      if (!schema) {
        console.log('⚠️  schema.sql not found, using inline table creation');
        // Inline minimal schema for Railway
        schema = `
          CREATE TABLE IF NOT EXISTS companies (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE,
            phone VARCHAR(50),
            address TEXT,
            city VARCHAR(100),
            state VARCHAR(50),
            industry VARCHAR(100),
            website VARCHAR(255),
            priority VARCHAR(20) DEFAULT 'medium',
            tags TEXT[],
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          CREATE TABLE IF NOT EXISTS projects (
            id SERIAL PRIMARY KEY,
            company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            type VARCHAR(100) NOT NULL,
            stage VARCHAR(100) NOT NULL,
            status VARCHAR(50) DEFAULT 'active',
            score INTEGER DEFAULT 0,
            notes TEXT,
            total_amount DECIMAL(10,2) DEFAULT 0,
            paid_amount DECIMAL(10,2) DEFAULT 0,
            access_token VARCHAR(255) UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          CREATE TABLE IF NOT EXISTS project_messages (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
            sender_type VARCHAR(20) NOT NULL,
            sender_name VARCHAR(255) NOT NULL,
            content TEXT,
            attachments TEXT[],
            read_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `;
      }
      
      await this.pool.query(schema);
      console.log('✅ PostgreSQL tables initialized successfully');
      
      // Also try to add missing columns to existing tables (in case of incomplete schema)
      const columnUpdates = [
        'ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone VARCHAR(50)',
        'ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry VARCHAR(100) DEFAULT \'Web Design Client\'',
        'ALTER TABLE companies ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT \'medium\'',
        'ALTER TABLE companies ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT \'{}\'',
        'ALTER TABLE projects ADD COLUMN IF NOT EXISTS type VARCHAR(100) DEFAULT \'website\'',
        'ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage VARCHAR(100) DEFAULT \'discovery\'',
        'ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'active\'',
        'ALTER TABLE project_messages ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT \'{}\'',
        'ALTER TABLE project_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP',
        // Create orders table if it doesn't exist
        `CREATE TABLE IF NOT EXISTS orders (
          id VARCHAR(255) PRIMARY KEY,
          company_id VARCHAR(255) NOT NULL,
          project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'draft',
          package VARCHAR(50),
          custom_items JSONB DEFAULT '[]'::jsonb,
          subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
          tax DECIMAL(10,2) NOT NULL DEFAULT 0,
          total DECIMAL(10,2) NOT NULL DEFAULT 0,
          notes TEXT,
          invoice_id VARCHAR(255),
          invoice_status VARCHAR(50) DEFAULT 'draft',
          invoice_url TEXT,
          payment_status VARCHAR(50) DEFAULT 'pending',
          payment_method VARCHAR(50),
          payment_date TIMESTAMP,
          stripe_payment_intent_id VARCHAR(255),
          stripe_payment_link_url TEXT,
          stripe_product_id VARCHAR(255),
          stripe_price_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        'CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id)',
        'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
      ];
      
      for (const sql of columnUpdates) {
        try {
          await this.pool.query(sql);
        } catch (error) {
          // Silently ignore errors (columns probably already exist)
        }
      }
      console.log('✅ Schema migration checks completed');
    } catch (error) {
      console.error('❌ Failed to initialize PostgreSQL tables:', error);
      // Don't throw - allow server to continue with degraded functionality
      console.log('⚠️  Server will continue with limited database functionality');
    }
  }

  // Company operations
  async createCompany(data: NewCompany): Promise<Company> {
    const query = `
      INSERT INTO companies (name, email, phone, address, city, state, industry, website, priority, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const values = [
      data.name, data.email, data.phone, data.address, data.city, 
      data.state, data.industry, data.website, data.priority || 'medium', 
      data.tags || []
    ];
    
    const result = await this.pool.query(query, values);
    return this.mapCompany(result.rows[0]);
  }

  async getCompanies(): Promise<Company[]> {
    const result = await this.pool.query('SELECT * FROM companies ORDER BY created_at DESC');
    return result.rows.map(row => this.mapCompany(row));
  }

  async getCompanyById(id: number): Promise<Company | null> {
    const result = await this.pool.query('SELECT * FROM companies WHERE id = $1', [id]);
    return result.rows[0] ? this.mapCompany(result.rows[0]) : null;
  }

  async updateCompany(id: number, data: Partial<Company>): Promise<Company | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${this.camelToSnake(key)} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) return null;

    const query = `
      UPDATE companies 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await this.pool.query(query, values);
    return result.rows[0] ? this.mapCompany(result.rows[0]) : null;
  }

  // Project operations
  async createProject(data: NewProject): Promise<Project> {
    console.log('🔧 [CREATE_PROJECT] Input data:', JSON.stringify(data, null, 2));
    console.log('🔧 [CREATE_PROJECT] Stage value:', data.stage, typeof data.stage);
    
    const query = `
      INSERT INTO projects (company_id, title, type, stage, status, score, notes, total_amount, paid_amount, access_token)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const values = [
      data.companyId, data.title, data.type, data.stage, data.status || 'active',
      data.score || 0, data.notes, data.totalAmount || 0, data.paidAmount || 0, data.accessToken
    ];
    
    console.log('🔧 [CREATE_PROJECT] SQL values:', values);
    
    const result = await this.pool.query(query, values);
    return this.mapProject(result.rows[0]);
  }

  async getProjects(filters?: any): Promise<Project[]> {
    let query = 'SELECT * FROM projects';
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (filters) {
      if (filters.status) {
        conditions.push(`status = $${paramCount}`);
        values.push(filters.status);
        paramCount++;
      }
      if (filters.companyId) {
        conditions.push(`company_id = $${paramCount}`);
        values.push(filters.companyId);
        paramCount++;
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapProject(row));
  }

  async getProjectById(id: number): Promise<Project | null> {
    const result = await this.pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    return result.rows[0] ? this.mapProject(result.rows[0]) : null;
  }

  async getProjectByToken(token: string): Promise<Project | null> {
    const result = await this.pool.query('SELECT * FROM projects WHERE access_token = $1', [token]);
    return result.rows[0] ? this.mapProject(result.rows[0]) : null;
  }

  async getProjectByAccessToken(token: string): Promise<Project | null> {
    return this.getProjectByToken(token);
  }

  async getProjectsByCompany(companyId: number): Promise<Project[]> {
    const result = await this.pool.query('SELECT * FROM projects WHERE company_id = $1 ORDER BY created_at DESC', [companyId]);
    return result.rows.map(row => this.mapProject(row));
  }

  async updateProject(id: number, data: Partial<Project>): Promise<Project | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${this.camelToSnake(key)} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) return null;

    const query = `
      UPDATE projects 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await this.pool.query(query, values);
    return result.rows[0] ? this.mapProject(result.rows[0]) : null;
  }

  // Project Messages
  async getProjectMessages(projectId: number): Promise<ProjectMessage[]> {
    const result = await this.pool.query(
      'SELECT * FROM project_messages WHERE project_id = $1 ORDER BY created_at ASC', 
      [projectId]
    );
    return result.rows.map(row => this.mapProjectMessage(row));
  }

  async createProjectMessage(data: Omit<ProjectMessage, 'id'>): Promise<ProjectMessage> {
    const query = `
      INSERT INTO project_messages (project_id, sender_type, sender_name, content, attachments)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [data.projectId, data.senderType, data.senderName, data.content, data.attachments || []];
    
    const result = await this.pool.query(query, values);
    return this.mapProjectMessage(result.rows[0]);
  }

  async markMessageAsRead(messageId: number, readAt: string): Promise<void> {
    const query = `
      UPDATE project_messages 
      SET read_at = $1 
      WHERE id = $2
    `;
    await this.pool.query(query, [readAt, messageId]);
  }

  // Activities
  async createActivity(data: NewActivity): Promise<Activity> {
    const query = `
      INSERT INTO activities (type, description, company_id, project_id, business_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [data.type, data.description, data.companyId, data.projectId, data.businessId];
    
    const result = await this.pool.query(query, values);
    return this.mapActivity(result.rows[0]);
  }

  // Legacy Business operations (for compatibility)
  async createBusiness(data: any): Promise<Business> {
    const query = `
      INSERT INTO businesses (name, email, phone, address, city, state, business_type, stage, notes, priority, score, website)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const values = [
      data.name, data.email, data.phone, data.address, data.city, data.state,
      data.businessType, data.stage, data.notes, data.priority || 'medium', 
      data.score || 0, data.website
    ];
    
    const result = await this.pool.query(query, values);
    return this.mapBusiness(result.rows[0]);
  }

  async getBusinesses(): Promise<Business[]> {
    const result = await this.pool.query('SELECT * FROM businesses ORDER BY created_at DESC');
    return result.rows.map(row => this.mapBusiness(row));
  }

  async searchBusinesses(query: string): Promise<Business[]> {
    const searchQuery = `
      SELECT * FROM businesses 
      WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(searchQuery, [`%${query}%`]);
    return result.rows.map(row => this.mapBusiness(row));
  }

  // Appointments
  async createAppointment(data: any): Promise<any> {
    const query = `
      INSERT INTO appointments (company_id, project_id, business_id, datetime, status, notes, is_auto_scheduled, service_type, duration, squarespace_id, project_token)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [
      data.companyId, data.projectId, data.businessId, data.datetime, data.status || 'scheduled',
      data.notes, data.isAutoScheduled || false, data.serviceType || 'consultation', 
      data.duration || 30, data.squarespaceId, data.projectToken
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getAppointments(): Promise<any[]> {
    const result = await this.pool.query('SELECT * FROM appointments ORDER BY datetime DESC');
    return result.rows;
  }

  // Get appointments for a specific calendar date (YYYY-MM-DD)
  async getAppointmentsByDate(date: string): Promise<any[]> {
    const result = await this.pool.query('SELECT * FROM appointments WHERE DATE(datetime) = $1 ORDER BY datetime', [date]);
    return result.rows;
  }

  // Get appointments that exactly match date + time (to detect conflicts)
  async getAppointmentsByDateTime(date: string, time: string): Promise<any[]> {
    const result = await this.pool.query(`SELECT * FROM appointments WHERE DATE(datetime) = $1 AND TO_CHAR(datetime, 'HH12:MI AM') = $2`, [date, time]);
    return result.rows;
  }

  async getAllAppointments(): Promise<any[]> {
    const result = await this.pool.query('SELECT * FROM appointments ORDER BY datetime DESC');
    return result.rows;
  }

  // Helper methods for mapping database rows to objects
  private mapCompany(row: any): Company {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      city: row.city,
      state: row.state,
      industry: row.industry,
      website: row.website,
      priority: row.priority,
      tags: row.tags || [],
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString()
    };
  }

  private mapProject(row: any): Project {
    return {
      id: row.id,
      companyId: row.company_id,
      title: row.title,
      type: row.type,
      stage: row.stage,
      status: row.status,
      score: row.score,
      notes: row.notes,
      totalAmount: parseFloat(row.total_amount) || 0,
      paidAmount: parseFloat(row.paid_amount) || 0,
      accessToken: row.access_token,
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString()
    };
  }

  private mapProjectMessage(row: any): ProjectMessage {
    return {
      id: row.id,
      projectId: row.project_id,
      senderType: row.sender_type,
      senderName: row.sender_name,
      content: row.content,
      attachments: row.attachments || [],
      createdAt: row.created_at?.toISOString()
    };
  }

  private mapActivity(row: any): Activity {
    return {
      id: row.id,
      type: row.type,
      description: row.description,
      companyId: row.company_id,
      projectId: row.project_id,
      businessId: row.business_id,
      createdAt: row.created_at?.toISOString()
    };
  }

  private mapBusiness(row: any): Business {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      city: row.city,
      state: row.state,
      businessType: row.business_type,
      stage: row.stage,
      notes: row.notes,
      priority: row.priority,
      score: row.score,
      website: row.website,
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString()
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  // Additional methods needed for compatibility
  async getProjectSummaryByToken(token: string): Promise<any> {
    const project = await this.getProjectByToken(token);
    if (!project) return null;

    const company = await this.getCompanyById(project.companyId);
    const messages = await this.getProjectMessages(project.id!);
    
    return {
      project,
      company,
      messages,
      files: [], // TODO: Implement file retrieval
      activities: [] // TODO: Implement activity retrieval for project
    };
  }

  // Placeholder methods for missing functionality
  async getCampaigns() { return []; }
  async createCampaign(data: any) { return data; }
  async getTemplates() { return []; }
  async createTemplate(data: any) { return data; }
  async getProgressEntries() { return []; }
  async createProgressEntry(data: any) { return data; }
  async getAppointmentsByProject(projectId: number) { 
    const result = await this.pool.query('SELECT * FROM appointments WHERE project_id = $1', [projectId]);
    return result.rows;
  }
  async getAppointmentById(id: number) {
    const result = await this.pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    return result.rows[0] || null;
  }
  async updateAppointment(id: number, data: any) {
    // TODO: Implement
    return null;
  }
  async deleteProject(id: number) {
    await this.pool.query('DELETE FROM projects WHERE id = $1', [id]);
  }
  async deleteBusiness(id: number) {
    await this.pool.query('DELETE FROM businesses WHERE id = $1', [id]);
  }
  async createProjectFile(data: any) {
    // TODO: Implement
    return data;
  }
  async updateProjectMessage(id: number, data: any) {
    // TODO: Implement
    return null;
  }
  async deleteProjectMessage(id: number) {
    await this.pool.query('DELETE FROM project_messages WHERE id = $1', [id]);
  }

  // Find client by email
  async findClientByEmail(email: string): Promise<Company | null> {
    const result = await this.pool.query('SELECT * FROM companies WHERE email = $1', [email]);
    return result.rows[0] ? this.mapCompany(result.rows[0]) : null;
  }

  // Generate stable token based on email for consistent customer experience
  private generateStableToken(email: string): string {
    // For Ben's email, always use the same token for testing
    if (email === 'ben04537@gmail.com') {
      return 'Q_lXDL9XQ-Q8d-jay7W2a2ZU'; // Fixed token for testing
    }
    
    // For other emails, generate a consistent token based on email hash
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert hash to a token-like string
    const hashStr = Math.abs(hash).toString(36);
    return `stable_${hashStr}_${email.split('@')[0].slice(0, 5)}`;
  }

  // Find or create project with stable token for customer
  async findOrCreateCustomerProject(email: string, name: string): Promise<{ projectId: number; token: string }> {
    try {
      // First, try to find existing client by email
      const existingClient = await this.findClientByEmail(email);
      
      if (existingClient) {
        console.log(`✅ Found existing client: ${existingClient.name} (ID: ${existingClient.id})`);
        
        // Find their existing project
        const projects = await this.getProjectsByCompany(existingClient.id!);
        if (projects.length > 0) {
          const project = projects[0]; // Use first project
          console.log(`🔗 Using existing project: ${project.title} (Token: ${project.accessToken})`);
          return { projectId: project.id!, token: project.accessToken! };
        }
      }
      
      // Generate stable token for this customer
      const stableToken = this.generateStableToken(email);
      
      // Create new client and project with stable token
      const company = await this.createCompany({
        name: name,
        email: email,
        phone: '',
        address: '',
        city: '',
        state: '',
        website: '',
        industry: 'Web Design Client',
        tags: [],
        priority: 'medium'
      });
      
      const project = await this.createProject({
        title: `${name} - Website Project`,
        companyId: company.id!,
        type: 'website',
        stage: 'planning',
        status: 'active',
        accessToken: stableToken,
        notes: `Project created from Squarespace messaging widget - ${new Date().toISOString()}`,
        totalAmount: 0,
        paidAmount: 0
      });
      
      console.log(`✅ Created new project with stable token: ID ${project.id}, Token: ${stableToken}`);
      return { projectId: project.id!, token: stableToken };
      
    } catch (error) {
      console.error('❌ Error in findOrCreateCustomerProject:', error);
      throw error;
    }
  }

  // AI Chat Message methods (not implemented in PostgreSQL yet)
  async createAIChatMessage(message: Omit<AIChatMessage, 'id' | 'timestamp'> & { timestamp?: Date }): Promise<AIChatMessage> {
    throw new Error('AI Chat messages not implemented in PostgreSQL storage yet. Switch to in-memory storage for AI features.');
  }

  async getAIChatMessages(filters: {
    leadId?: string;
    projectId?: number;
    sessionId?: string;
    limit?: number;
    messageType?: 'user' | 'ai' | 'function_call' | 'function_response';
  } = {}): Promise<AIChatMessage[]> {
    throw new Error('AI Chat messages not implemented in PostgreSQL storage yet. Switch to in-memory storage for AI features.');
  }

  async getLastAIChatMessage(leadId: string): Promise<AIChatMessage | null> {
    throw new Error('AI Chat messages not implemented in PostgreSQL storage yet. Switch to in-memory storage for AI features.');
  }

  async getAIChatContext(leadId?: string, projectId?: number, limit: number = 10): Promise<AIChatMessage[]> {
    throw new Error('AI Chat messages not implemented in PostgreSQL storage yet. Switch to in-memory storage for AI features.');
  }

  // Order Management Methods
  async createOrder(order: Omit<Order, 'createdAt' | 'updatedAt'>): Promise<Order> {
    const query = `
      INSERT INTO orders (
        id, company_id, project_id, status, package, custom_items, 
        subtotal, tax, total, notes, invoice_id, invoice_status, 
        invoice_url, payment_status, payment_method, payment_date,
        stripe_payment_intent_id, stripe_payment_link_url, 
        stripe_product_id, stripe_price_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW()
      ) RETURNING *
    `;
    
    const values = [
      order.id,
      order.companyId,
      order.projectId || null,
      order.status,
      order.package || null,
      JSON.stringify(order.customItems || []),
      order.subtotal,
      order.tax,
      order.total,
      order.notes || null,
      order.invoiceId || null,
      order.invoiceStatus || 'draft',
      order.invoiceUrl || null,
      order.paymentStatus || 'pending',
      order.paymentMethod || null,
      order.paymentDate || null,
      order.stripePaymentIntentId || null,
      order.stripePaymentLinkUrl || null,
      order.stripeProductId || null,
      order.stripePriceId || null
    ];

    const result = await this.pool.query(query, values);
    return this.mapOrder(result.rows[0]);
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    const result = await this.pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    return result.rows.length > 0 ? this.mapOrder(result.rows[0]) : null;
  }

  async updateOrder(orderId: string, updates: Partial<Order>): Promise<Order | null> {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt') {
        const dbKey = key === 'companyId' ? 'company_id' :
                     key === 'projectId' ? 'project_id' :
                     key === 'customItems' ? 'custom_items' :
                     key === 'invoiceId' ? 'invoice_id' :
                     key === 'invoiceStatus' ? 'invoice_status' :
                     key === 'invoiceUrl' ? 'invoice_url' :
                     key === 'paymentStatus' ? 'payment_status' :
                     key === 'paymentMethod' ? 'payment_method' :
                     key === 'paymentDate' ? 'payment_date' :
                     key === 'stripePaymentIntentId' ? 'stripe_payment_intent_id' :
                     key === 'stripePaymentLinkUrl' ? 'stripe_payment_link_url' :
                     key === 'stripeProductId' ? 'stripe_product_id' :
                     key === 'stripePriceId' ? 'stripe_price_id' :
                     key;

        setParts.push(`${dbKey} = $${paramIndex}`);
        values.push(key === 'customItems' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    });

    if (setParts.length === 0) {
      return this.getOrderById(orderId);
    }

    setParts.push(`updated_at = NOW()`);
    values.push(orderId);

    const query = `UPDATE orders SET ${setParts.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapOrder(result.rows[0]) : null;
  }

  async getOrders(): Promise<Order[]> {
    const result = await this.pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    return result.rows.map(row => this.mapOrder(row));
  }

  async getOrdersByCompany(companyId: string): Promise<Order[]> {
    const result = await this.pool.query('SELECT * FROM orders WHERE company_id = $1 ORDER BY created_at DESC', [companyId]);
    return result.rows.map(row => this.mapOrder(row));
  }

  // Compatibility alias for routes expecting getOrdersByCompanyId
  async getOrdersByCompanyId(companyId: string | number): Promise<Order[]> {
    return this.getOrdersByCompany(String(companyId));
  }

  private mapOrder(row: any): Order {
    return {
      id: row.id,
      companyId: row.company_id,
      projectId: row.project_id,
      status: row.status,
      package: row.package,
      customItems: row.custom_items ? JSON.parse(row.custom_items) : [],
      subtotal: parseFloat(row.subtotal),
      tax: parseFloat(row.tax),
      total: parseFloat(row.total),
      notes: row.notes,
      invoiceId: row.invoice_id,
      invoiceStatus: row.invoice_status,
      invoiceUrl: row.invoice_url,
      paymentStatus: row.payment_status,
      paymentMethod: row.payment_method,
      paymentDate: row.payment_date,
      stripePaymentIntentId: row.stripe_payment_intent_id,
      stripePaymentLinkUrl: row.stripe_payment_link_url,
      stripeProductId: row.stripe_product_id,
      stripePriceId: row.stripe_price_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // Proposal Management Methods (Phase 1)
  async createProposal(proposal: NewProposal): Promise<Proposal> {
    const query = `
      INSERT INTO proposals (
        id, lead_id, status, total_amount, line_items, notes, created_at, updated_at
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW()
      ) RETURNING *
    `;
    
    const values = [
      proposal.leadId,
      proposal.status || 'draft',
      proposal.totalAmount,
      JSON.stringify(proposal.lineItems || []),
      proposal.notes || null
    ];

    const result = await this.pool.query(query, values);
    return this.mapProposal(result.rows[0]);
  }

  async getProposals(): Promise<Proposal[]> {
    const result = await this.pool.query('SELECT * FROM proposals ORDER BY created_at DESC');
    return result.rows.map(row => this.mapProposal(row));
  }

  async getProposalById(id: string): Promise<Proposal | null> {
    const result = await this.pool.query('SELECT * FROM proposals WHERE id = $1', [id]);
    return result.rows[0] ? this.mapProposal(result.rows[0]) : null;
  }

  async getProposalsByLead(leadId: number): Promise<Proposal[]> {
    const result = await this.pool.query('SELECT * FROM proposals WHERE lead_id = $1 ORDER BY created_at DESC', [leadId]);
    return result.rows.map(row => this.mapProposal(row));
  }

  async updateProposal(id: string, data: Partial<Proposal>): Promise<Proposal | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt') {
        fields.push(`${this.camelToSnake(key)} = $${paramCount}`);
        if (key === 'lineItems') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramCount++;
      }
    });

    if (fields.length === 0) return null;

    const query = `
      UPDATE proposals 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await this.pool.query(query, values);
    return result.rows[0] ? this.mapProposal(result.rows[0]) : null;
  }

  async deleteProposal(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM proposals WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  private mapProposal(row: any): Proposal {
    return {
      id: row.id,
      leadId: parseInt(row.lead_id),
      status: row.status,
      totalAmount: parseFloat(row.total_amount),
      lineItems: row.line_items ? JSON.parse(row.line_items) : [],
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // Canvas data storage methods
  async getCanvasData(projectId: number): Promise<any | null> {
    try {
      const result = await this.pool.query(
        'SELECT data FROM canvas_data WHERE project_id = $1',
        [projectId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].data;
    } catch (error) {
      console.error(`Failed to get canvas data for project ${projectId}:`, error);
      return null;
    }
  }
  
  async saveCanvasData(projectId: number, canvasData: any): Promise<boolean> {
    try {
      // Use upsert (insert or update)
      await this.pool.query(
        `INSERT INTO canvas_data (project_id, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (project_id) 
         DO UPDATE SET data = $2, updated_at = NOW()`,
        [projectId, canvasData]
      );
      
      return true;
    } catch (error) {
      console.error(`Failed to save canvas data for project ${projectId}:`, error);
      return false;
    }
  }
  
  async getCanvasVersions(projectId: number): Promise<any[]> {
    try {
      const result = await this.pool.query(
        'SELECT id, version, description, created_at, data FROM canvas_versions WHERE project_id = $1 ORDER BY created_at DESC',
        [projectId]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        version: row.version,
        description: row.description,
        createdAt: row.created_at,
        data: row.data
      }));
    } catch (error) {
      console.error(`Failed to get canvas versions for project ${projectId}:`, error);
      return [];
    }
  }
  
  async saveCanvasVersion(projectId: number, versionData: any): Promise<string> {
    try {
      const result = await this.pool.query(
        `INSERT INTO canvas_versions (project_id, version, description, data, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id`,
        [projectId, versionData.version, versionData.description, versionData.canvasData]
      );
      
      return result.rows[0].id;
    } catch (error) {
      console.error(`Failed to save canvas version for project ${projectId}:`, error);
      return '';
    }
  }
  
  async getCanvasVersion(projectId: number, versionId: string): Promise<any | null> {
    try {
      const result = await this.pool.query(
        'SELECT id, version, description, created_at, data FROM canvas_versions WHERE project_id = $1 AND id = $2',
        [projectId, versionId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        version: row.version,
        description: row.description,
        createdAt: row.created_at,
        data: row.data
      };
    } catch (error) {
      console.error(`Failed to get canvas version ${versionId} for project ${projectId}:`, error);
      return null;
    }
  }

  // Team agent operations (using in-memory storage for now)
  private teamAgents: TeamAgent[] = [];

  async getTeamAgents(): Promise<TeamAgent[]> {
    return this.teamAgents;
  }

  async getTeamAgentById(id: number): Promise<TeamAgent | null> {
    return this.teamAgents.find(agent => agent.id === id) || null;
  }

  async createTeamAgent(data: Omit<TeamAgent, 'id'>): Promise<TeamAgent> {
    const newId = this.teamAgents.length > 0 
      ? Math.max(...this.teamAgents.map(a => a.id)) + 1 
      : 1;
    
    const newAgent: TeamAgent = {
      ...data,
      id: newId
    };
    
    this.teamAgents.push(newAgent);
    return newAgent;
  }

  async updateTeamAgent(id: number, data: Partial<TeamAgent>): Promise<TeamAgent | null> {
    const index = this.teamAgents.findIndex(agent => agent.id === id);
    if (index === -1) return null;
    
    this.teamAgents[index] = {
      ...this.teamAgents[index],
      ...data
    };
    
    return this.teamAgents[index];
  }

  async deleteTeamAgent(id: number): Promise<boolean> {
    const initialLength = this.teamAgents.length;
    this.teamAgents = this.teamAgents.filter(agent => agent.id !== id);
    return this.teamAgents.length < initialLength;
  }

  // Demo operations (using in-memory storage for now)
  private demos: any[] = [];

  async getDemos(): Promise<any[]> {
    return this.demos;
  }

  async getDemoById(id: number): Promise<any | null> {
    return this.demos.find(demo => demo.id === id) || null;
  }

  async getDemoStats(): Promise<any> {
    const totalDemos = this.demos.length;
    const totalViews = this.demos.reduce((sum, demo) => sum + (demo.views || 0), 0);
    const averageViewsPerDemo = totalDemos > 0 ? totalViews / totalDemos : 0;
    
    let topPerformingDemo = '';
    if (totalDemos > 0) {
      const topDemo = this.demos.reduce((max, demo) => 
        (demo.views || 0) > (max.views || 0) ? demo : max, this.demos[0]);
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
    const newId = this.demos.length > 0 
      ? Math.max(...this.demos.map(d => d.id)) + 1 
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
    
    this.demos.push(newDemo);
    return newDemo;
  }
} 