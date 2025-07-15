const express = require("express");
const { getDB } = require("../services/db.js");
const router = express.Router();

// Mock data for demonstration - in production this would come from database
const mockBusinesses = [
  {
    id: 1,
    name: "Portland Auto Repair",
    email: "info@portlandauto.com",
    phone: "(207) 555-0123",
    address: "123 Main Street",
    city: "Portland", 
    state: "ME",
    businessType: "auto_repair",
    stage: "contacted",
    website: "https://portlandauto.com",
    notes: "Interested in basic website package",
    score: 85,
    priority: "high",
    tags: "auto-scraped,qualified",
    scheduledTime: null,
    appointmentStatus: "confirmed",
    paymentStatus: "pending",
    totalAmount: 45000, // $450.00 in cents
    paidAmount: 0,
    createdAt: "2025-05-15T10:30:00Z"
  },
  {
    id: 2,
    name: "Bath Plumbing Co",
    email: "contact@bathplumbing.com", 
    phone: "(207) 555-0456",
    address: "456 Water Street",
    city: "Bath",
    state: "ME", 
    businessType: "plumbing",
    stage: "interested",
    website: null,
    notes: "Ready to move forward, wants emergency booking features",
    score: 92,
    priority: "high",
    tags: "manual,hot-lead",
    scheduledTime: "2025-06-04T08:30:00Z",
    appointmentStatus: "confirmed",
    paymentStatus: "pending", 
    totalAmount: 45000,
    paidAmount: 0,
    createdAt: "2025-05-20T14:15:00Z"
  },
  {
    id: 3,
    name: "Coastal Electric",
    email: "info@coastalelectric.me",
    phone: "(207) 555-0789",
    address: "789 Ocean Avenue", 
    city: "Bar Harbor",
    state: "ME",
    businessType: "electrical",
    stage: "sold",
    website: "https://coastalelectric.me",
    notes: "Signed contract, website in development",
    score: 98,
    priority: "high", 
    tags: "converted,in-progress",
    scheduledTime: null,
    appointmentStatus: "completed",
    paymentStatus: "paid",
    totalAmount: 45000,
    paidAmount: 45000,
    createdAt: "2025-05-10T09:00:00Z"
  }
];

const mockStats = {
  totalLeads: 147,
  activeCampaigns: 3,
  conversionRate: 23.5,
  monthlyRevenue: 12750,
  avgDealSize: 450,
  monthlyRecurring: 2850,
  today: {
    newLeads: 8,
    responses: 12,
    callsScheduled: 3,
    delivered: 1
  },
  stageStats: {
    scraped: 42,
    enriched: 28,
    contacted: 31,
    interested: 19,
    scheduled: 8,
    client: 12,
    closed: 7
  }
};

const mockCampaigns = [
  {
    id: 1,
    name: "Auto Repair Outreach Q2",
    businessType: "auto_repair", 
    status: "active",
    totalContacts: 156,
    sentCount: 142,
    responseCount: 28,
    responseRate: 19.7,
    message: "Hi! I help auto shops get more customers with simple websites...",
    createdAt: "2025-05-01T00:00:00Z"
  },
  {
    id: 2,
    name: "Plumbing Emergency Sites",
    businessType: "plumbing",
    status: "active", 
    totalContacts: 89,
    sentCount: 76,
    responseCount: 15,
    responseRate: 19.7,
    message: "Emergency plumbing needs 24/7 online presence...",
    createdAt: "2025-05-15T00:00:00Z"
  }
];

const mockTemplates = [
  {
    id: 1,
    name: "Auto Repair Pro",
    businessType: "auto_repair",
    description: "Professional auto repair website with booking",
    usageCount: 23,
    previewUrl: "https://preview.pleasantcovedesign.com/auto",
    features: "Online booking, service gallery, reviews"
  },
  {
    id: 2,
    name: "Plumber Emergency",
    businessType: "plumbing", 
    description: "24/7 emergency plumbing service site",
    usageCount: 18,
    previewUrl: "https://preview.pleasantcovedesign.com/plumbing",
    features: "Emergency contact, service areas, testimonials"
  }
];

// GET /api/businesses
router.get("/businesses", async (req, res) => {
  try {
    // In production, fetch from database
    // const db = await getDB();
    // const businesses = await db.all("SELECT * FROM businesses ORDER BY created_at DESC");
    
    res.json(mockBusinesses);
  } catch (error) {
    console.error("Error fetching businesses:", error);
    res.status(500).json({ error: "Failed to fetch businesses" });
  }
});

// GET /api/stats  
router.get("/stats", async (req, res) => {
  try {
    res.json(mockStats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// GET /api/campaigns
router.get("/campaigns", async (req, res) => {
  try {
    res.json(mockCampaigns);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

// GET /api/templates
router.get("/templates", async (req, res) => {
  try {
    res.json(mockTemplates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// GET /api/activities
router.get("/activities", async (req, res) => {
  try {
    const mockActivities = [
      {
        id: 1,
        type: "lead_created",
        description: "New lead: Portland Auto Repair",
        businessId: 1,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        type: "meeting_scheduled",
        description: "Meeting scheduled with Bath Plumbing Co",
        businessId: 2,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        type: "payment_received",
        description: "Payment received from Coastal Electric",
        businessId: 3,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    res.json(mockActivities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

module.exports = router; 