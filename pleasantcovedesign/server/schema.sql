-- PostgreSQL Schema for Pleasant Cove Design
-- This replaces the in-memory SQLite database with persistent PostgreSQL

-- Companies table (main client profiles)
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
    tags TEXT[], -- PostgreSQL array type
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table (linked to companies)
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
    scheduled_time TIMESTAMP,
    appointment_status VARCHAR(50),
    payment_status VARCHAR(50),
    stripe_customer_id VARCHAR(255),
    stripe_payment_link_id VARCHAR(255),
    last_payment_date TIMESTAMP,
    payment_notes TEXT,
    access_token VARCHAR(255) UNIQUE, -- For client portal access
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project messages table (messaging system)
CREATE TABLE IF NOT EXISTS project_messages (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL, -- 'admin' or 'client'
    sender_name VARCHAR(255) NOT NULL,
    content TEXT,
    attachments TEXT[], -- Array of file URLs
    read_at TIMESTAMP, -- When message was marked as read
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project files table (file attachments)
CREATE TABLE IF NOT EXISTS project_files (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activities table (audit log)
CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    business_id INTEGER, -- Legacy compatibility
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    business_id INTEGER, -- Legacy compatibility
    datetime TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled',
    notes TEXT,
    is_auto_scheduled BOOLEAN DEFAULT false,
    service_type VARCHAR(100) DEFAULT 'consultation',
    duration INTEGER DEFAULT 30,
    squarespace_id VARCHAR(255),
    project_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Businesses table (legacy compatibility)
CREATE TABLE IF NOT EXISTS businesses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    business_type VARCHAR(100),
    stage VARCHAR(50),
    notes TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    score INTEGER DEFAULT 0,
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Progress entries table
CREATE TABLE IF NOT EXISTS progress_entries (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table (billing and payments)
CREATE TABLE IF NOT EXISTS orders (
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
);

-- Proposals table (Phase 1: Convert leads to structured proposals)
CREATE TABLE IF NOT EXISTS proposals (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    lead_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    line_items JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT proposals_status_check CHECK (status IN ('draft', 'sent', 'accepted', 'rejected'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
CREATE INDEX IF NOT EXISTS idx_projects_access_token ON projects(access_token);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_project_messages_project_id ON project_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_activities_company_id ON activities(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_appointments_company_id ON appointments(company_id);
CREATE INDEX IF NOT EXISTS idx_appointments_project_id ON appointments(project_id);
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status); 