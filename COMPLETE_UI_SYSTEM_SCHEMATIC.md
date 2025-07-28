# 🏗️ Complete UI System Schematic - Pleasant Cove Design

## 📊 System Architecture Overview

This is the complete technical blueprint of your Pleasant Cove Design system showing every component, connection, and data flow.

---

## 🎨 **UI Layer Structure**

### Navigation Hierarchy
```
├── Layout.tsx (Main Navigation Container)
│   ├── Dashboard (/dashboard)
│   ├── Biz Pro Inbox (/business/1/inbox)
│   ├── Leads (/leads)
│   ├── Clients (/clients) [NEW]
│   ├── Outreach (/outreach) [NEW]
│   ├── Interactions (/interactions)
│   ├── Progress (/progress)
│   ├── Appointments (/schedule)
│   └── Settings (/settings)
```

### Page-Component Mapping
```typescript
// Route Definitions in App.tsx
{
  '/dashboard': Dashboard.tsx,
  '/leads': Leads.tsx → uses LeadCard, OrderBuilder, EntitySummaryCard
  '/leads/:id': ClientProfile.tsx → detailed client view with tabs
  '/clients': Clients.tsx → filtered view of paying customers
  '/clients/:id': ClientProfile.tsx → same component, different filter
  '/outreach': Outreach.tsx → campaign management interface
  '/inbox': Inbox.tsx → messaging system
  '/inbox/:projectToken': Inbox.tsx → project-specific messages
  '/progress': Progress.tsx → project tracking
  '/schedule': Schedule.tsx → appointment management
  '/settings': Settings.tsx → system configuration
}
```

---

## 🔄 **Data Flow Architecture**

### 1. **Lead Generation Flow**
```
Google Maps → Python Scraper → SQLite Database → API → UI Components
    ↓              ↓               ↓           ↓        ↓
[External]    [Automation]    [Storage]   [Backend] [Frontend]
```

### 2. **Lead Processing Pipeline**
```
Raw Lead Data → Enrichment → Scoring → UI Display → Action Triggers
     ↓             ↓          ↓          ↓            ↓
[Scraper]    [Validation]  [Algorithm] [LeadCard]  [Outreach]
```

### 3. **Order-to-Payment Flow**
```
Lead → Order Builder → Invoice → Stripe → Webhook → Project Creation
  ↓         ↓           ↓        ↓        ↓          ↓
[UI]    [Component]  [Minerva] [Payment] [API]   [Automation]
```

---

## 🗄️ **Database Schema Connections**

### Core Tables
```sql
-- Companies Table (feeds Leads & Clients pages)
CREATE TABLE companies (
  id INTEGER PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  industry TEXT,
  website_url TEXT,
  has_website BOOLEAN,
  score INTEGER,
  stage TEXT,
  priority TEXT,
  created_at TIMESTAMP
);

-- Projects Table (feeds Progress & Client detail)
CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  company_id INTEGER,
  name TEXT,
  status TEXT,
  progress INTEGER,
  start_date DATE,
  due_date DATE,
  created_at TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Orders Table (feeds Order Builder & Payment tracking)
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  company_id INTEGER,
  package TEXT,
  total DECIMAL,
  payment_status TEXT,
  invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_payment_link_url TEXT,
  created_at TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Messages Table (feeds Inbox & Communication)
CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  company_id INTEGER,
  project_id INTEGER,
  sender TEXT,
  content TEXT,
  channel TEXT,
  timestamp TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

### Data Relationships
```
Companies (1) → (Many) Projects
Companies (1) → (Many) Orders  
Companies (1) → (Many) Messages
Projects (1) → (Many) Messages
Orders (1) → (1) Projects [after payment]
```

---

## 🔌 **API Endpoint Mapping**

### Frontend API Calls
```typescript
// Leads Page API Calls
api.get('/companies') → Populates lead list
api.get('/projects') → Shows project status per company
api.get('/orders') → Shows payment status per company

// Clients Page API Calls  
api.get('/companies') → Filtered for paying customers
api.get('/projects') → Active projects only
api.get('/orders') → Payment history

// Order Builder API Calls
api.post('/orders') → Creates new order
api.post('/orders/:id/invoice') → Generates invoice via Minerva
api.get('/orders/:id') → Gets order status

// Outreach Page API Calls
api.post('/bot/outreach') → Triggers Python SMS automation
api.get('/outreach/campaigns') → Gets campaign statistics
api.post('/outreach/create') → Creates new campaign

// Inbox API Calls
api.get('/messages') → Gets all conversations
api.post('/messages') → Sends new message
api.get('/messages/:projectId') → Project-specific messages
```

### Backend Route Handlers
```typescript
// In pleasantcovedesign/server/routes.ts

// Company Management
GET /api/companies → fetchCompanies()
POST /api/companies → createCompany()
PUT /api/companies/:id → updateCompany()

// Order Processing
POST /api/orders → createOrder() → calls Minerva billing
GET /api/orders → getOrders()
GET /api/orders/:id → getOrderById()

// Project Management  
GET /api/projects → getProjects()
POST /api/projects → createProject()
PUT /api/projects/:id → updateProject()

// Message System
GET /api/messages → getMessages()
POST /api/messages → sendMessage()
GET /api/messages/conversation/:id → getConversation()

// Stripe Integration
POST /api/stripe/webhook → handleStripeWebhook()
POST /api/stripe/create-payment-link → createPaymentLink()

// Bot Integration
POST /api/bot/scrape → triggerScraping()
POST /api/bot/outreach → triggerOutreach()
POST /api/bot/enrich → enrichLead()
```

---

## 🤖 **Python Automation Integration**

### CLI Bridge System
```
UI Action → Node.js API → Python CLI → Python Scripts → Database
    ↓           ↓            ↓            ↓             ↓
[Button]   [Express]    [bot_cli.py]  [Modules]    [SQLite]
```

### Python Module Connections
```python
# In bot_cli.py - The bridge between Node.js and Python

def handle_scrape():
    from scrapers.google_maps_scraper import GoogleMapsScraper
    scraper = GoogleMapsScraper()
    results = scraper.scrape_businesses()
    return results

def handle_outreach():
    from outreach.sms_automation import SMSOutreach  
    sms = SMSOutreach()
    results = sms.run_campaign()
    return results

def handle_enrich():
    from validation import LeadEnricher
    enricher = LeadEnricher()
    results = enricher.enrich_lead()
    return results
```

---

## 📱 **Component State Management**

### State Flow in Key Components

#### Leads.tsx State Management
```typescript
interface LeadsState {
  companies: CompanyWithProjects[]     // From /api/companies
  loading: boolean                     // UI loading state
  searchTerm: string                   // Filter state
  stageFilter: string                  // Filter state
  priorityFilter: string               // Filter state
  ordersView: boolean                  // View toggle state
  expandedCompanies: Set<number>       // Expansion state
  orderBuilderOpen: boolean            // Modal state
  selectedCompany: Company | null      // Selected for order building
}

// Data fetching flow:
useEffect(() => {
  fetchData() → Promise.all([
    api.get('/companies'),
    api.get('/projects')  
  ]) → setState()
}, [])
```

#### OrderBuilder.tsx State Management
```typescript
interface OrderBuilderState {
  selectedPackage: PackageType         // Package selection
  addOns: AddOn[]                      // Additional services
  customItems: CustomItem[]            // Custom line items
  total: number                        // Calculated total
  notes: string                        // Order notes
  loading: boolean                     // Submission state
}

// Order creation flow:
handleCreateOrder() → 
  api.post('/orders', orderData) →
  Minerva invoice generation →
  Stripe payment link →
  Email notification →
  UI update
```

#### Clients.tsx State Management
```typescript
interface ClientsState {
  clients: Client[]                    // Filtered companies with projects
  loading: boolean                     // Loading state
  searchTerm: string                   // Search filter
  statusFilter: string                 // Status filter
}

// Data filtering logic:
const clientsData = companiesRes.data
  .filter(company => {
    const hasProjects = projectsByCompany[company.id]?.length > 0
    const hasPaidOrders = ordersByCompany[company.id]?.some(
      order => order.paymentStatus === 'paid'
    )
    return hasProjects || hasPaidOrders
  })
```

---

## 🌐 **External API Integrations**

### Stripe Payment Flow
```
UI Order → Express API → Stripe API → Webhook → Database Update
    ↓          ↓           ↓           ↓           ↓
[OrderBuilder] [routes.ts] [stripe.com] [webhook] [SQLite]
```

### SendGrid Email Flow  
```
Payment Success → Express → SendGrid API → Customer Email
      ↓            ↓           ↓             ↓
  [Webhook]   [email-service.ts] [sendgrid.com] [Delivery]
```

### Twilio SMS Flow
```
Outreach Button → Python CLI → Twilio API → SMS Delivery
       ↓             ↓           ↓           ↓
   [UI Action]  [sms_automation.py] [twilio.com] [Customer]
```

### OpenAI (Minerva) Flow
```
Invoice Request → Minerva API → OpenAI API → Generated Content
       ↓             ↓           ↓             ↓
   [Order Created] [minerva_*.py] [openai.com] [Invoice/Demo]
```

---

## 🔄 **Real-Time Data Synchronization**

### WebSocket Connections
```typescript
// In pleasantcovedesign/server/index.ts
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL }
})

// Message broadcasting
io.emit('newMessage', messageData)        // To all connected clients
io.to(roomId).emit('projectUpdate', data) // To specific project room
```

### Frontend WebSocket Handling
```typescript
// In components that need real-time updates
useEffect(() => {
  const socket = io(API_BASE_URL)
  
  socket.on('newMessage', (message) => {
    setMessages(prev => [...prev, message])
  })
  
  socket.on('projectUpdate', (update) => {
    setProjectStatus(update)
  })
  
  return () => socket.disconnect()
}, [])
```

---

## 🎯 **User Journey Mapping**

### Lead-to-Customer Journey
```
1. Lead Discovery (Scraping)
   ↓
2. Lead Enrichment (Validation) 
   ↓
3. Outreach Campaign (SMS/Email)
   ↓
4. Lead Response (Inbox)
   ↓
5. Order Building (OrderBuilder)
   ↓
6. Invoice Generation (Minerva)
   ↓
7. Payment Processing (Stripe)
   ↓
8. Project Creation (Automation)
   ↓
9. Upwork Posting (UpworkBriefGenerator)
   ↓
10. Project Management (Progress)
    ↓
11. Client Communication (Inbox)
    ↓
12. Project Delivery (ClientPortal)
```

### UI Navigation Flow
```
Dashboard → Overview of all activities
    ↓
Leads → Prospect management & outreach
    ↓
Outreach → Campaign management
    ↓
Inbox → Communication hub
    ↓
Clients → Active customer management
    ↓
Progress → Project tracking
    ↓
Schedule → Appointment management
    ↓
Settings → System configuration
```

---

## 🔧 **Development Environment Setup**

### Required Services
```bash
# Frontend Development
cd pleasantcovedesign/admin-ui
npm install && npm run dev  # Port 5173

# Backend API
cd pleasantcovedesign/server  
npm install && npm start     # Port 3000

# Python Automation
source protection_env/bin/activate
python bot_cli.py            # CLI bridge

# Stripe Webhooks (Development)
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Database
SQLite file: ./websitewizard.db (auto-created)
```

### Environment Variables Required
```bash
# API Keys
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG....
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
OPENAI_API_KEY=sk-...

# Database  
DATABASE_URL=./websitewizard.db

# CORS
FRONTEND_URL=http://localhost:5173
API_BASE_URL=http://localhost:3000
```

---

## 🚀 **Missing Connections & Next Steps**

### Critical Gaps to Address
1. **Scraping Interface**: Add UI controls for Google Maps scraping
2. **Campaign Builder**: Connect Outreach page to Python automation  
3. **Real-time Analytics**: Live campaign performance tracking
4. **File Management**: Project asset upload/download system
5. **Approval Workflows**: Order approval before payment processing
6. **Agent Management**: Upwork freelancer tracking interface

### Integration Priorities
1. Connect Outreach page to `bot_cli.py` for campaign management
2. Add scraping controls to Leads page
3. Implement real-time status updates across all pages
4. Build analytics dashboard with conversion tracking
5. Add file upload/sharing to ClientPortal
6. Create automated project milestone tracking

This schematic provides the complete technical blueprint for organizing and extending your Pleasant Cove Design system. Every component, API, and data flow is mapped for maximum clarity. 