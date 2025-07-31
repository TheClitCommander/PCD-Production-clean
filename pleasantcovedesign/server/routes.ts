// @ts-nocheck
import express, { type Request, Response, NextFunction, Express } from "express";
import { storage } from "./storage";
import type { Business } from "../shared/schema";
import { nanoid } from "nanoid";
import nodemailer from 'nodemailer';
import path from 'path';
// Removed fileURLToPath import - using __filename directly
import multer from 'multer';
import multerS3 from 'multer-s3';
import AWS from 'aws-sdk';
import fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import uploadRoutes from './uploadRoutes';
import { 
  generateSecureProjectToken, 
  generateConversationMetadata, 
  validateTokenFormat 
} from './utils/tokenGenerator';
import { zoomIntegration } from './zoom-integration';
import { 
  validateChatToken, 
  securityLoggingMiddleware, 
  rateLimitConversations 
} from './middleware/validateToken';
import { authenticate, requireAdmin } from './middleware/auth';
import { requestLogger, errorHandler, performanceMonitor, getHealthStats } from './middleware/logging';
import { processAIChat, storeUserMessage } from './ai-service';
import { createPaymentLink, verifyWebhookSignature } from './stripe-config';
import { sendReceiptEmail, sendWelcomeEmail, sendInvoiceEmail } from './email-service';

// Use CommonJS compatible approach - avoid import.meta.url
const __routes_dirname = path.dirname(__filename);

// Configure Cloudflare R2 (S3-compatible) storage
const useR2Storage = !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET);

// Function to create R2 S3Client for presigned URLs (AWS SDK v3) - only when needed
function createR2Client(): S3Client {
  if (!useR2Storage) {
    throw new Error('R2 storage not configured');
  }
  
  return new S3Client({
    endpoint: process.env.R2_ENDPOINT,
    region: process.env.R2_REGION || 'auto',
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });
}

// Configure R2 (Cloudflare S3-compatible) storage
console.log('🔧 Configuring Cloudflare R2 storage...');

if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET) {
  console.log('⚠️ R2 credentials not found, using memory storage fallback');
}

// Configure AWS SDK v2 client for multer-s3 compatibility
const s3 = useR2Storage ? new AWS.S3({
  endpoint: new AWS.Endpoint(process.env.R2_ENDPOINT!),
  region: process.env.R2_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  signatureVersion: 'v4',       // Required for R2
  s3ForcePathStyle: true,      // R2 only supports path-style
}) : null;

// Create uploads directory for local storage
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
}

// Configure multer for both R2 and local storage with robust error handling
let upload: multer.Multer;

// Always configure local storage first as fallback
const localStorageConfig = {
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Ensure uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      try {
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `upload-${timestamp}-${safeName}`;
        cb(null, filename);
      } catch (err) {
        cb(err as Error, '');
      }
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Max 5 files per request
  },
  fileFilter: function (req, file, cb) {
    try {
      const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|xls|xlsx|webp|heic|heif/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('image/');
      
      if (mimetype || extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only images, documents, and common file types are allowed!'));
      }
    } catch (err) {
      cb(err as Error, false);
    }
  }
};

try {
  // Always use local storage for now - it's more reliable
  // R2 storage has AWS SDK v2/v3 compatibility issues with multer-s3
  console.log('🔧 Configuring multer with local storage...');
  upload = multer(localStorageConfig);
  console.log('✅ Multer configured with local storage');
  
  // Note: R2 storage is available but we're using local for file uploads
  // Files are served via static middleware and image proxy
  if (useR2Storage) {
    console.log('📦 R2 storage available but using local storage for multer compatibility');
  }
} catch (multerConfigError) {
  console.error('❌ Failed to configure multer:', multerConfigError);
  // Fallback: create a basic multer instance that will handle errors gracefully
  upload = multer({
    dest: uploadsDir,
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 5
    },
    fileFilter: (req, file, cb) => {
      // Accept all files in fallback mode
      cb(null, true);
    }
  });
  console.log('⚠️ Using fallback multer configuration');
}

if (useR2Storage) {
  console.log('✅ R2 storage configured successfully');
  console.log('📦 Bucket:', process.env.R2_BUCKET);
  console.log('🌐 Endpoint:', process.env.R2_ENDPOINT);
} else {
  console.log('⚠️ R2 storage not available - file uploads will use memory fallback');
}

// Admin token for authentication
const ADMIN_TOKEN = 'pleasantcove2024admin';

// Utility function to generate unique project tokens
function generateProjectToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Email configuration (consolidated from appointment-server.js)  
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || 'pleasantcovedesign@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    }
  });
};

// Real-time notification system
interface Notification {
  id: string;
  type: 'new_lead' | 'high_score_lead' | 'appointment_booked' | 'payment_received';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  businessId?: number;
}

const notifications: Notification[] = [];

function addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
  const newNotification: Notification = {
    ...notification,
    id: Date.now().toString(),
    timestamp: new Date(),
    read: false
  };
  notifications.unshift(newNotification);
  if (notifications.length > 100) {
    notifications.splice(100);
  }
}

// Enhanced lead scoring algorithm
function calculateLeadScore(leadData: any): number {
  let score = 50; // Base score
  
  const highValueTypes = ['electrical', 'plumbing', 'roofing', 'hvac'];
  if (highValueTypes.includes(leadData.business_type?.toLowerCase())) {
    score += 25;
  }
  
  if (leadData.email && leadData.email.includes('.com')) score += 10;
  if (leadData.phone && leadData.phone.length >= 10) score += 15;
  if (leadData.website) score += 10;
  
  if (leadData.message) {
    const message = leadData.message.toLowerCase();
    if (message.includes('urgent') || message.includes('asap')) score += 20;
    if (message.includes('budget') || message.includes('quote')) score += 15;
    if (message.includes('need') || message.includes('require')) score += 10;
    if (message.length > 50) score += 5;
  }
  
  if (leadData.appointment_date || leadData.preferred_date) score += 30;
  
  return Math.min(score, 100);
}

// Public API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  "/api/progress/public",
  "/api/scheduling/appointment-created",
  "/api/scheduling/appointment-updated",
  "/api/scheduling/appointment-cancelled",
  "/api/new-lead",
  "/api/acuity-appointment",
  "/api/public/project",
  "/api/book-appointment",
  "/api/availability",
  "/health"
];

// Admin auth middleware
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
  
  if (token !== 'pleasantcove2024admin') {
    return res.status(401).json({ error: 'Unauthorized. Admin access required.' });
  }
  
  next();
};

export async function registerRoutes(app: Express, io: any) {
  console.log('🔌 Socket.IO server initialized for routes');

  // Helper function to broadcast to admin room
  const broadcastToAdmin = (eventName: string, data: any) => {
      if (!io) {
          console.error('❌ Socket.IO not available to broadcast event:', eventName);
          return;
      }
      console.log(`📡 [SOCKET_BROADCAST] Broadcasting ${eventName} to admin-room`);
      io.to('admin-room').emit(eventName, data);
  };
  
  // Mount presigned URL routes BEFORE body-parser
  app.use(uploadRoutes);
  
  // Serve uploaded files statically (for local storage)
  const uploadsDir = path.join(process.cwd(), 'uploads');
  
  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory:', uploadsDir);
  }
  
  app.use('/uploads', express.static(uploadsDir));
  console.log('📁 Serving uploads from:', uploadsDir);
  
  // Test file upload endpoint
  app.post('/api/test-upload', (req: Request, res: Response, next: NextFunction) => {
    console.log('📤 Test upload endpoint called');
    
    // Handle multer with error catching
    upload.array('files')(req, res, (err) => {
      if (err) {
        console.error('❌ Test upload multer error:', err);
        return res.status(500).json({ error: `Upload failed: ${err.message}` });
      }
      
      console.log('✅ Test upload multer processed successfully');
      console.log('Files received:', req.files ? (req.files as any[]).length : 0);
      
      res.json({
        success: true,
        message: 'Test upload successful',
        filesReceived: req.files ? (req.files as any[]).length : 0,
        files: req.files ? (req.files as any[]).map(f => ({
          originalname: f.originalname,
          filename: f.filename,
          size: f.size,
          mimetype: f.mimetype
        })) : []
      });
    });
  });
  
  // ===================
  // APPOINTMENT BOOKING ROUTES (from appointment-server.js)
  // ===================
  
  // REMOVED: Book appointment (PUBLIC - for Squarespace widget) - using comprehensive version below
  /*app.post('/api/book-appointment', async (req: Request, res: Response) => {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        businessName,
        services,
        projectDescription,
        budget,
        timeline,
        appointmentDate,
        appointmentTime,
        meetingType,
        additionalNotes
      } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !phone || !services || !projectDescription || !budget || !timeline || !appointmentDate || !appointmentTime) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required fields' 
        });
      }

      console.log('🔍 Checking appointment availability...');
      
      // Check for existing appointments at the same date/time using unified storage
      const existingAppointments = await storage.getAppointmentsByDateTime(appointmentDate, appointmentTime);
      
      if (existingAppointments.length > 0) {
        console.log('❌ Time slot conflict detected');
        console.log('Conflicting appointments:', existingAppointments.map(apt => ({
          id: apt.id,
          date: apt.appointmentDate,
          time: apt.appointmentTime,
          client: apt.clientName
        })));
        
        return res.status(409).json({
          success: false,
          message: `Sorry, the ${appointmentTime} time slot on ${new Date(appointmentDate).toLocaleDateString()} is already booked. Please choose a different time.`,
          error: 'TIME_SLOT_UNAVAILABLE',
          availableAlternatives: ['8:30 AM', '9:00 AM'].filter(time => time !== appointmentTime)
        });
      }
      
      console.log('✅ Time slot is available, proceeding with booking...');
      
      // Create or find client
      let client = await storage.findClientByEmail(email);
      let clientData: any = null;
      
      if (client) {
        // Handle different storage implementations
        if ('name' in client && 'id' in client) {
          clientData = client;
        } else if (typeof client === 'object' && 'company' in client && (client as any).company) {
          clientData = (client as any).company;
        }
      }
      
      if (!clientData) {
        // Create new client
        clientData = await storage.createCompany({
          name: `${firstName} ${lastName}`,
          email: email,
          phone: phone,
          address: '',
          city: '',
          state: '',
          website: '',
          industry: 'Appointment Client',
          tags: [],
          priority: 'medium'
        });
      }
      
      // Create project for this appointment
      const secureToken = generateSecureProjectToken('appointment_booking', email);
      const project = await storage.createProject({
        companyId: clientData.id!,
        title: `${firstName} ${lastName} - ${services}`,
        type: 'consultation',
        stage: 'scheduled',
        status: 'active',
        totalAmount: 0,
        paidAmount: 0,
        accessToken: secureToken.token
      });
      
      // Create appointment record
      const appointmentData = {
        companyId: clientData.id,
        projectId: project.id,
        firstName,
        lastName,
        email,
        phone,
        businessName: businessName || '',
        services,
        projectDescription,
        budget,
        timeline,
        appointmentDate,
        appointmentTime,
        meetingType: meetingType || 'zoom',
        additionalNotes: additionalNotes || '',
        status: 'pending'
      };
      
      const appointment = await storage.createAppointment(appointmentData);
      
      // Create Zoom meeting if needed
      let meetingDetails = null;
      if (meetingType === 'zoom') {
        const appointmentDateTime = new Date(`${appointmentDate} ${appointmentTime}`);
        const zoomMeeting = await zoomIntegration.createMeeting({
          topic: `Pleasant Cove Design Consultation - ${firstName} ${lastName}`,
          startTime: appointmentDateTime,
          duration: 30,
          agenda: `Consultation meeting to discuss: ${services}\n\nProject: ${projectDescription}`,
          settings: {
            hostVideo: true,
            participantVideo: true,
            joinBeforeHost: true,
            muteUponEntry: false,
            waitingRoom: false
          }
        });
        
        if (zoomMeeting) {
          meetingDetails = zoomIntegration.formatMeetingDetails(zoomMeeting);
          
          // Update appointment with Zoom details
          await storage.updateAppointment(appointment.id!, {
            meetingLink: zoomMeeting.joinUrl,
            meetingId: zoomMeeting.id,
            meetingPassword: zoomMeeting.password,
            meetingInstructions: meetingDetails
          });
        }
      }
      
      // Send confirmation emails (disabled for development)
      // const transporter = createEmailTransporter();
      
              try {
        console.log('📧 Email sending disabled for development');
        /* 
        // Email to client
        await transporter.sendMail({
          from: '"Pleasant Cove Design" <pleasantcovedesign@gmail.com>',
          to: email,
          subject: 'Appointment Confirmation - Pleasant Cove Design',
          html: `
            <h2>Appointment Confirmed!</h2>
            <p>Dear ${firstName} ${lastName},</p>
            <p>Your consultation appointment has been confirmed for:</p>
            <ul>
              <li><strong>Date:</strong> ${appointmentDate}</li>
              <li><strong>Time:</strong> ${appointmentTime}</li>
              <li><strong>Services:</strong> ${services}</li>
            </ul>
            <p>We'll contact you shortly to discuss your project.</p>
            <p>Best regards,<br>Pleasant Cove Design Team</p>
          `
        });

        // Email to admin
        await transporter.sendMail({
          from: '"Appointment System" <pleasantcovedesign@gmail.com>',
          to: 'pleasantcovedesign@gmail.com',
          subject: `New Appointment - ${firstName} ${lastName}`,
          html: `
            <h2>New Appointment Booking</h2>
            <h3>Contact Information:</h3>
            <ul>
              <li><strong>Name:</strong> ${firstName} ${lastName}</li>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Phone:</strong> ${phone}</li>
              <li><strong>Business:</strong> ${businessName || 'N/A'}</li>
            </ul>
            <h3>Project Details:</h3>
            <ul>
              <li><strong>Services:</strong> ${services}</li>
              <li><strong>Description:</strong> ${projectDescription}</li>
              <li><strong>Budget:</strong> ${budget}</li>
              <li><strong>Timeline:</strong> ${timeline}</li>
            </ul>
            <h3>Appointment:</h3>
            <ul>
              <li><strong>Date:</strong> ${appointmentDate}</li>
              <li><strong>Time:</strong> ${appointmentTime}</li>
            </ul>
            <p><strong>Additional Notes:</strong> ${additionalNotes || 'None'}</p>
          `
        });
        } catch (emailError) {
        console.error('Email error:', emailError);
        // Don't fail the appointment if email fails
      }
      
      // Add notification
      addNotification({
        type: 'appointment_booked',
        title: 'New Appointment',
        message: `${firstName} ${lastName} booked ${services} for ${appointmentDate} at ${appointmentTime}`,
        businessId: clientData.id
      });
      
      res.json({
        success: true,
        message: 'Appointment booked successfully',
        appointmentId: appointment.id,
        projectToken: secureToken.token
      });
      
    } catch (error) {
      console.error('Appointment booking error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error occurred' 
      });
    }
  });*/
  
  // REMOVED: Duplicate availability endpoint - using the simplified one below
  
  // Get all appointments (ADMIN)
  app.get('/api/appointments', requireAdmin, async (req: Request, res: Response) => {
    try {
      const appointments = await storage.getAllAppointments();
      
      res.json({
        success: true,
        appointments: appointments
      });
      
    } catch (error) {
      console.error('Get appointments error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch appointments' 
      });
    }
  });
  
  // Update appointment status (ADMIN)
  app.patch('/api/appointments/:id/status', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid status' 
        });
      }
      
      const updated = await storage.updateAppointmentStatus(parseInt(id), status);
      
      if (!updated) {
        return res.status(404).json({ 
          success: false, 
          message: 'Appointment not found' 
        });
      }
      
      res.json({
        success: true,
        message: 'Appointment updated successfully'
      });
      
    } catch (error) {
      console.error('Update appointment error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update appointment' 
      });
    }
  });
  
  // ===================
  // EXISTING ROUTES (continued)
  // ===================

  // Root webhook endpoint for Squarespace widget customer project creation (PUBLIC - no auth required)
  app.post("/", async (req: Request, res: Response) => {
    try {
      console.log("=== SQUARESPACE WEBHOOK RECEIVED ===");
      console.log("Headers:", JSON.stringify(req.headers, null, 2));
      console.log("Body:", JSON.stringify(req.body, null, 2));
      console.log("Method:", req.method);
      console.log("URL:", req.url);
      console.log("IP:", req.ip);
      console.log("User-Agent:", req.get('User-Agent'));
      console.log("==========================================");
      
      console.log("=== ENHANCED SQUARESPACE WEBHOOK ===");
      console.log("Body:", JSON.stringify(req.body, null, 2));
      
      const { name, email, source } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }
      
      let projectToken = null;
      
      try {
        console.log(`🔍 Looking for existing client: ${email}, ${name}, No phone provided`);
        
        // Use smart attribution system to find potential matches
        const { findAttributionCandidates, formatAttributionResults } = await import('./utils/client-attribution.js');
        const attributionResults = await findAttributionCandidates(email, name, phone, storage);
        
        console.log(`🧠 Attribution results: ${formatAttributionResults(attributionResults, email, name)}`);
        
        // Check if client already exists using the corrected storage method
        const existingClientData = await storage.findClientByEmail(email);
        
        // Handle different storage implementations
        let existingClient: any = null;
        if (existingClientData) {
          // PostgreSQL storage returns Company directly
          if ('name' in existingClientData && 'id' in existingClientData) {
            existingClient = existingClientData;
          }
          // In-memory storage returns complex object
          else if (typeof existingClientData === 'object' && 'company' in existingClientData && (existingClientData as any).company) {
            existingClient = (existingClientData as any).company;
          }
          // Legacy business table fallback
          else if (typeof existingClientData === 'object' && 'business' in existingClientData && (existingClientData as any).business) {
            existingClient = (existingClientData as any).business;
          }
        }
        
        console.log(`🔍 Client lookup result for ${email}:`, existingClient ? `Found ${existingClient.name} (ID: ${existingClient.id})` : 'No client found');
        
        if (existingClient) {
          console.log(`✅ Found existing client: ${existingClient.name} (ID: ${existingClient.id})`);
          
          // Check for existing recent conversations (within 30 days)
          const existingProjects = await storage.getProjectsByCompany(existingClient.id);
          const recentProject = existingProjects
            .filter(p => p.status === 'active')
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
          
          // ALWAYS create new conversations for privacy - NEVER reuse tokens
          const secureToken = generateSecureProjectToken(source || 'squarespace_form', email);
          const newProject = await storage.createProject({
            companyId: existingClient.id,
            title: `${existingClient.name} - Conversation ${secureToken.submissionId}`,
            type: 'website',
            stage: 'discovery',
            status: 'active',
            totalAmount: 5000,
            paidAmount: 0,
            accessToken: secureToken.token
          });
          
          projectToken = newProject.accessToken;
          console.log(`🆕 [PRIVACY_SECURE] Created new conversation for client: ${projectToken}`);
        } else {
          // Create new client and project
          const newCompany = await storage.createCompany({
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
          
          const secureToken = generateSecureProjectToken(source || 'squarespace_form', email);
          const newProject = await storage.createProject({
            companyId: newCompany.id!,
            title: `${name} - Conversation ${secureToken.submissionId}`,
            type: 'website',
            stage: 'discovery',
            status: 'active',
            totalAmount: 5000,
            paidAmount: 0,
            accessToken: secureToken.token // Always use secure tokens
          });
          
          projectToken = newProject.accessToken;
          console.log(`✅ Created new project: ID ${newProject.id}, Token: ${projectToken}`);
        }
        
        console.log(`🎯 Project token assigned: ${projectToken} for email: ${email}`);
        
      } catch (projectError) {
        console.error("Error handling project token logic:", projectError);
        return res.status(500).json({ error: "Failed to create customer project" });
      }
      
      res.status(200).json({ 
        success: true, 
        projectToken: projectToken,
        message: "Customer project created/found successfully"
      });
    } catch (error) {
      console.error("Failed to process customer project creation:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });
  
  // NEW: Member-specific conversation retrieval (PUBLIC - no auth required)
  app.post("/api/get-member-conversation", async (req: Request, res: Response) => {
    try {
      const { email, name } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      console.log(`🔍 [MEMBER_AUTH] Looking for existing conversation for: ${email}`);
      
      // Find the member's company
      const existingClientData = await storage.findClientByEmail(email);
      
      let existingClient: any = null;
      if (existingClientData) {
        // Handle different storage implementations
        if ('name' in existingClientData && 'id' in existingClientData) {
          existingClient = existingClientData;
        } else if (typeof existingClientData === 'object' && 'company' in existingClientData && (existingClientData as any).company) {
          existingClient = (existingClientData as any).company;
        }
      }
      
      if (existingClient) {
        console.log(`✅ [MEMBER_AUTH] Found existing client: ${existingClient.name} (ID: ${existingClient.id})`);
        
        // Get all projects for this client, find the most recent active one
        const existingProjects = await storage.getProjectsByCompany(existingClient.id);
        const activeProjects = existingProjects
          .filter(p => p.status === 'active')
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        
        if (activeProjects.length > 0) {
          const mostRecentProject = activeProjects[0];
          console.log(`✅ [MEMBER_AUTH] Found existing conversation: ${mostRecentProject.title}`);
          console.log(`🔑 [MEMBER_AUTH] Project token: ${mostRecentProject.accessToken}`);
          
          return res.status(200).json({
            success: true,
            existing: true,
            projectToken: mostRecentProject.accessToken,
            projectTitle: mostRecentProject.title,
            clientName: existingClient.name,
            message: "Existing conversation found"
          });
        }
      }
      
      // No existing conversation found - this will trigger new conversation creation
      console.log(`❌ [MEMBER_AUTH] No existing conversation found for: ${email}`);
      return res.status(404).json({ 
        success: false, 
        existing: false,
        message: "No existing conversation found" 
      });
      
    } catch (error) {
      console.error("[MEMBER_AUTH] Error:", error);
      res.status(500).json({ error: "Failed to retrieve member conversation" });
    }
  });

  // Enhanced new lead handler with better processing (PUBLIC - no auth required)
  app.post("/api/new-lead", rateLimitConversations, securityLoggingMiddleware, async (req: Request, res: Response) => {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    try {
      console.log(`[FORM_SUBMISSION] Email: ${req.body.email}, Timestamp: ${new Date().toISOString()}, IP: ${ipAddress}`);
      console.log("=== ENHANCED SQUARESPACE WEBHOOK ===");
      console.log("Body:", JSON.stringify(req.body, null, 2));
      
      let leadData = req.body.data || req.body;
      
      const { 
        name, email, phone, message,
        appointment_date, appointment_time, preferred_date, preferred_time,
        company, business_name, website, service_type,
        ...otherFields
      } = leadData;
      
      const leadScore = calculateLeadScore(leadData);
      
      let businessType = service_type || 'unknown';
      if (message) {
        const msgLower = message.toLowerCase();
        if (msgLower.includes('electric') || msgLower.includes('wiring')) businessType = 'electrical';
        else if (msgLower.includes('plumb') || msgLower.includes('leak')) businessType = 'plumbing';
        else if (msgLower.includes('roof') || msgLower.includes('gutter')) businessType = 'roofing';
        else if (msgLower.includes('hvac') || msgLower.includes('heat') || msgLower.includes('air')) businessType = 'hvac';
      }
      
      const businessData = {
        name: name || business_name || company || "Unknown Business",
        phone: phone || "No phone provided",
        email: email || "",
        address: "To be enriched",
        city: "To be enriched", 
        state: "To be enriched",
        businessType,
        stage: leadScore >= 80 ? "contacted" : "scraped",
        notes: `Squarespace Lead (Score: ${leadScore})\nMessage: ${message || "No message"}\nAuto-classified: ${businessType}`,
        website: website || "",
        score: leadScore,
        priority: leadScore >= 80 ? "high" : leadScore >= 60 ? "medium" : "low",
      };

      // For Squarespace members, always use admin business (ID 1) for unified inbox
      console.log(`✅ Using admin business (ID: 1) for Squarespace member: ${email}`);
      
      let projectToken = null;
      
      if (email) {
        try {
          console.log(`🔍 Looking for existing client: ${email}, ${name || 'No name provided'}, No phone provided`);
          
          // Use smart attribution system for Squarespace members
          const { findAttributionCandidates, formatAttributionResults } = await import('./utils/client-attribution.js');
          const attributionResults = await findAttributionCandidates(email, name || '', undefined, storage);
          
          console.log(`🧠 [SQUARESPACE] Attribution results: ${formatAttributionResults(attributionResults, email, name || 'Unknown')}`);
          
          // If high confidence match found, use it
          if (attributionResults.exactMatch) {
            console.log(`✅ [SQUARESPACE] Using exact match: ${attributionResults.exactMatch.name}`);
          } else if (attributionResults.potentialMatches.length > 0 && attributionResults.potentialMatches[0].confidence > 85) {
            console.log(`🤝 [SQUARESPACE] High confidence match found: ${attributionResults.potentialMatches[0].name} (${attributionResults.potentialMatches[0].confidence}%)`);
            // TODO: In the future, we could auto-merge or prompt admin for confirmation
          }
          
          // Check if client already exists
          const existingClientData = await storage.findClientByEmail(email);
          
          // Handle different storage implementations
          let existingClient: any = null;
          if (existingClientData) {
            // PostgreSQL storage returns Company directly
            if ('name' in existingClientData && 'id' in existingClientData) {
              existingClient = existingClientData;
            }
            // In-memory storage returns complex object
            else if ('company' in existingClientData && existingClientData.company) {
              existingClient = existingClientData.company;
            }
          }
          
          if (existingClient) {
            console.log(`✅ Found existing client: ${existingClient.name} (ID: ${existingClient.id})`);
            
            // Create new project for existing client
            const projectData = {
              companyId: existingClient.id,
              title: `New inquiry from ${existingClient.name}`,
              type: businessType || 'website',
              stage: 'lead',
              status: 'active',
              score: leadScore,
              notes: message || "New inquiry via Squarespace form",
              accessToken: generateSecureProjectToken('squarespace-member', email)
            };
            
            const project = await storage.createProject(projectData);
            projectToken = project.accessToken;
            
            console.log(`✅ Created new project for existing client: ${project.title} (Token: ${projectToken})`);
            
            // Trigger demo generation for high-priority leads
            if (leadScore >= 80 && businessType !== 'unknown') {
              console.log(`🎨 High-priority lead detected! Triggering demo generation...`);
              
              // Queue demo generation (non-blocking)
              setImmediate(async () => {
                try {
                  const demoRequest = {
                    leadId: existingClient.id,
                    businessName: existingClient.name,
                    businessType: businessType,
                    email: email,
                    message: message,
                    status: 'pending_review', // Lock & Load mode
                    requestedAt: new Date().toISOString()
                  };
                  
                  // Store demo request for review
                  await storage.createActivity({
                    type: 'demo_requested',
                    businessId: existingClient.id,
                    description: `Demo generation queued for ${existingClient.name}`,
                    metadata: JSON.stringify(demoRequest)
                  });
                  
                  console.log(`✅ Demo request queued for review`);
                } catch (error) {
                  console.error('Failed to queue demo generation:', error);
                }
              });
            }
          } else {
            // Create new client under admin business
            const newCompany = await storage.createCompany({
              name: name || email.split('@')[0] || "Unknown Client",
              email: email,
              phone: phone || "No phone provided",
              address: "To be enriched",
              city: "To be enriched",
              state: "To be enriched",
              website: website || "",
              industry: "Web Design Client",
              tags: [],
              priority: "medium"
            });
            
            const secureToken = generateSecureProjectToken('squarespace_new_member', email);
            const newProject = await storage.createProject({
              companyId: 1, // Always use admin business for unified inbox
              title: `${name || email.split('@')[0]} - Conversation ${Date.now()}`,
              type: 'consultation',
              stage: 'discovery',
              status: 'active',
              totalAmount: 0,
              paidAmount: 0,
              accessToken: secureToken.token
            });
            
            projectToken = newProject.accessToken;
            console.log(`✅ Created new project under admin business: ID ${newProject.id}, Token: ${projectToken}, Business: 1`);
          }
          
          console.log(`🎯 Project token assigned: ${projectToken} for email: ${email}`);
          
        } catch (projectError) {
          console.error("Error handling project token logic:", projectError);
          return res.status(500).json({ error: "Failed to create project" });
        }
      }
      
      // Add the initial message to the project
      if (projectToken && message) {
        try {
          const project = await storage.getProjectByToken(projectToken);
          if (project) {
            await storage.addMessage({
              projectId: project.id!,
              senderType: 'client',
              senderName: name || email.split('@')[0],
              content: message,
              attachments: []
            });
            console.log(`💬 Added initial message to project ${project.id}`);
          }
        } catch (messageError) {
          console.error("Error adding initial message:", messageError);
          // Don't fail the whole request if message fails
        }
      }
      
      // Add notification
      addNotification({
        type: leadScore >= 80 ? 'high_score_lead' : 'new_lead',
        title: leadScore >= 80 ? 'High Score Lead!' : 'New Lead',
        message: `${name || business_name || company} (Score: ${leadScore}) - ${businessType}`,
        businessId: 1 // Always admin business for notifications
      });
      
      res.status(200).json({ 
        success: true, 
        projectToken: projectToken,
        leadScore: leadScore,
        businessType: businessType,
        message: "Lead processed successfully"
      });
      
    } catch (error) {
      console.error("Failed to process lead:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Squarespace Scheduling webhook endpoints (PUBLIC - no auth required)
  app.post("/api/scheduling/appointment-created", async (req: Request, res: Response) => {
    try {
      console.log("=== SQUARESPACE SCHEDULING WEBHOOK ===");
      console.log("Appointment Created:", JSON.stringify(req.body, null, 2));
      
      const appointmentData = req.body;
      
      // Extract appointment details
      const {
        id: squarespaceId,
        firstName,
        lastName,
        email,
        phone,
        datetime,
        endTime,
        appointmentTypeID,
        notes,
        status = 'scheduled'
      } = appointmentData;
      
      // Find or create business record
      let business = null;
      const existingBusinesses = await storage.searchBusinesses(email || phone || '');
      
      if (existingBusinesses.length > 0) {
        business = existingBusinesses[0];
      } else {
        // Create new business from appointment
        business = await storage.createBusiness({
          name: `${firstName} ${lastName}`.trim(),
          email: email || '',
          phone: phone || 'No phone provided',
          address: 'To be enriched',
          city: 'To be enriched',
          state: 'To be enriched',
          businessType: 'consultation',
          stage: 'scheduled',
          notes: `Squarespace Appointment: ${notes || 'No notes'}`,
          priority: 'high',
          score: 85 // High score for scheduled appointments
        });
      }
      
      // Create appointment record
      const appointment = await storage.createAppointment({
        businessId: business.id!,
        datetime,
        status,
        notes: notes || '',
        isAutoScheduled: true,
        squarespaceId: squarespaceId?.toString()
      });
      
      // Log activity
      await storage.createActivity({
        type: 'appointment_scheduled',
        description: `Appointment scheduled via Squarespace: ${firstName} ${lastName}`,
        businessId: business.id!
      });
      
      // Add notification
      addNotification({
        type: 'appointment_booked',
        title: 'New Appointment Booked!',
        message: `${firstName} ${lastName} - ${new Date(datetime).toLocaleDateString()}`,
        businessId: business.id!
      });
      
      res.status(200).json({ 
        success: true, 
        appointmentId: appointment.id,
        businessId: business.id,
        message: "Appointment created and synced" 
      });
      
    } catch (error) {
      console.error("Failed to process Squarespace appointment:", error);
      res.status(500).json({ error: "Failed to process appointment" });
    }
  });
  
  app.post("/api/scheduling/appointment-updated", async (req: Request, res: Response) => {
    try {
      console.log("=== SQUARESPACE APPOINTMENT UPDATED ===");
      console.log("Appointment Updated:", JSON.stringify(req.body, null, 2));
      
      const { id: squarespaceId, status, datetime, notes } = req.body;
      
      res.status(200).json({ 
        success: true, 
        message: "Appointment updated" 
      });
      
    } catch (error) {
      console.error("Failed to update appointment:", error);
      res.status(500).json({ error: "Failed to update appointment" });
    }
  });
  
  app.post("/api/scheduling/appointment-cancelled", async (req: Request, res: Response) => {
    try {
      console.log("=== SQUARESPACE APPOINTMENT CANCELLED ===");
      console.log("Appointment Cancelled:", JSON.stringify(req.body, null, 2));
      
      const { id: squarespaceId, firstName, lastName } = req.body;
      
      // Log cancellation activity
      addNotification({
        type: 'appointment_booked', // Could add a cancellation type
        title: 'Appointment Cancelled',
        message: `${firstName} ${lastName} cancelled their appointment`
      });
      
      res.status(200).json({ 
        success: true, 
        message: "Appointment cancellation processed" 
      });
      
    } catch (error) {
      console.error("Failed to process cancellation:", error);
      res.status(500).json({ error: "Failed to process cancellation" });
    }
  });

  // ===================
  // PUBLIC CLIENT PORTAL API (No Auth Required)
  // ===================
  
  // Get project messages by token (PUBLIC - for client portal)
  app.get("/api/public/project/:token/messages", async (req: Request, res: Response) => {
    // Add CORS headers for widget access
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    try {
      const { token } = req.params;
      
      console.log(`🔍 Looking for project with token: ${token}`);
      
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }
      
      // Find project by access token
      const project = await storage.getProjectByToken(token);
      console.log(`🔍 Project lookup result:`, project ? `Found project ID ${project.id}` : 'Project not found');
      
      if (!project) {
        console.error(`❌ Project not found for token: ${token}`);
        return res.status(404).json({ error: "Project not found or invalid token" });
      }
      
      // Get messages for this project
      const messages = await storage.getProjectMessages(project.id!);
      console.log(`📨 Found ${messages?.length || 0} messages for project ${project.id}`);
      
      res.json({
        success: true,
        messages: messages || [],
        projectId: project.id
      });
    } catch (error) {
      console.error("Failed to fetch project messages by token:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  
  // Get project summary by access token (PUBLIC - for client portal)
  app.get("/api/public/project/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ error: "Access token is required" });
      }

      const projectSummary = await storage.getProjectSummaryByToken(token);
      
      if (!projectSummary) {
        return res.status(404).json({ error: "Project not found or access denied" });
      }

      // Return project data without sensitive admin info
      res.json({
        project: {
          id: projectSummary.project.id,
          title: projectSummary.project.title,
          type: projectSummary.project.type,
          stage: projectSummary.project.stage,
          totalAmount: projectSummary.project.totalAmount,
          paidAmount: projectSummary.project.paidAmount,
          createdAt: projectSummary.project.createdAt
        },
        company: {
          name: projectSummary.company.name,
          email: projectSummary.company.email,
          phone: projectSummary.company.phone
        },
        messages: projectSummary.messages,
        files: projectSummary.files,
        activities: projectSummary.activities.filter(a => a.type !== 'admin_note') // Hide admin-only activities
      });
    } catch (error) {
      console.error("Failed to fetch project summary:", error);
      res.status(500).json({ error: "Failed to fetch project data" });
    }
  });

  // Create message in project (PUBLIC - for client replies) - supports both multer and presigned URL uploads
  app.post("/api/public/project/:token/messages", (req: Request, res: Response, next: NextFunction) => {
    // Add CORS headers for widget access
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle multer with error catching
    upload.array('files')(req, res, (err) => {
      if (err) {
        console.error('❌ Multer error:', err);
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: "Too many files. Maximum is 5 files." });
          }
          return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        return res.status(500).json({ error: `File upload failed: ${err.message}` });
      }
      next();
    });
  }, async (req: Request, res: Response) => {
    // Add CORS headers for widget access
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    console.log('🔔 [SERVER] HTTP POST /api/public/project/:token/messages hit!');
    console.log('🔔 [SERVER] Request URL:', req.originalUrl);
    console.log('🔔 [SERVER] Request body:', req.body);
    console.log('🔔 [SERVER] Request params:', req.params);
    
    try {
      const { token } = req.params;
      const { content, senderName, senderType = 'client', attachments: attachmentKeys } = req.body;
      
      console.log('📤 Message send request:', { 
        token, 
        content, 
        senderName, 
        attachmentKeys: attachmentKeys || [],
        hasFiles: !!req.files
      });
      
      if (!token || (!content && (!attachmentKeys || attachmentKeys.length === 0) && (!req.files || (req.files as any[]).length === 0))) {
        return res.status(400).json({ error: "Token and either content or files are required" });
      }
      
      if (!senderName) {
        return res.status(400).json({ error: "Sender name is required" });
      }

      // Verify project exists and get project ID
      const projectData = await storage.getProjectByToken(token);
      if (!projectData) {
        return res.status(404).json({ error: "Project not found or access denied" });
      }

      let attachments: string[] = [];

      // Handle presigned URL uploads (attachmentKeys are R2 keys or local paths)
      if (attachmentKeys && Array.isArray(attachmentKeys)) {
        attachments = attachmentKeys.map((key: string) => {
          // If it's already a full URL, use as-is
          if (key.startsWith('http')) {
            return key;
          }
          // If it starts with /uploads, convert to absolute URL
          if (key.startsWith('/uploads')) {
            const baseUrl = process.env.NODE_ENV === 'production' 
              ? 'https://pcd-production-clean-production-e6f3.up.railway.app'
              : process.env.NGROK_URL || `https://localhost:${process.env.PORT || 3000}`;
            return `${baseUrl}${key}`;
          }
          // Otherwise, assume it's an R2 key and convert to R2 URL
          return `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}/${key}`;
        });
        console.log('📎 Presigned uploads processed:', attachments);
      }
      // Handle multer uploads with error handling
      else if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        try {
          const uploaded = req.files as any[];
          console.log(`📎 Processing ${uploaded.length} uploaded files`);
          
          // Dynamically determine the base URL - always use HTTPS for production
          const baseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://pcd-production-clean-production-e6f3.up.railway.app'
            : process.env.NGROK_URL || `http://localhost:${process.env.PORT || 3000}`;

          attachments = uploaded.map(f => {
            if (f.location) {
              console.log('📎 R2 upload:', f.originalname, '→', f.location);
              return f.location; // R2 upload
            } else if (f.filename) {
              // Local upload - construct public URL
              const fileUrl = `${baseUrl}/uploads/${f.filename}`;
              console.log('📎 Local upload:', f.originalname, '→', fileUrl);
              return fileUrl;
            }
            console.log('📎 Fallback path:', f.originalname, '→', f.path);
            return f.path; // Fallback
          });
          
          console.log('✅ All files processed successfully:', attachments);
        } catch (fileError) {
          console.error('❌ File processing error:', fileError);
          // Continue without files rather than failing
          attachments = [];
          console.log('⚠️ Continuing without file attachments due to processing error');
        }
      }

      console.log('💾 [SERVER] Creating message in database...');
      const message = await storage.createProjectMessage({
        projectId: projectData.id!,
        senderType: senderType as 'admin' | 'client',
        senderName,
        content: content || '',
        attachments
      });

      console.log('✅ [SERVER] Message saved to database:', {
        id: message.id,
        projectId: projectData.id,
        content: message.content,
        senderName: message.senderName,
        attachments: attachments
      });

      // Broadcast message via WebSocket for real-time updates
      if (io) {
        const broadcastMessage = {
          id: message.id,
          projectId: projectData.id,  // Add projectId for admin inbox
          projectToken: token,
          senderName: message.senderName,
          content: message.content,
          createdAt: message.createdAt,
          senderType: senderType as 'client' | 'admin',  // Use actual senderType
          attachments: message.attachments || []
        };
        
        console.log(`📤 [SERVER] Broadcasting to room: ${token}`);
        io.to(token).emit('newMessage', broadcastMessage);
        
        // --- ADMIN BROADCAST ---
        console.log(`📡 [SERVER] Broadcasting to admin-room with message:`, broadcastMessage);
        io.to('admin-room').emit('newMessage', broadcastMessage);
      }

      // Log activity for admin
      await storage.createActivity({
        type: 'client_message',
        description: `New message from ${senderName}: ${content ? content.substring(0, 50) : attachments.length > 0 ? 'files shared' : 'message sent'}${content && content.length > 50 ? '...' : ''}${attachments.length > 0 ? ` (${attachments.length} files)` : ''}`,
        companyId: projectData.companyId,
        projectId: projectData.id!
      });

      res.status(201).json({
        ...message,
        filesUploaded: attachments.length,
        success: true
      });
    } catch (error) {
      console.error("❌ Failed to create client message:", error);
      console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      console.error("❌ Error name:", error instanceof Error ? error.name : 'Unknown');
      console.error("❌ Error message:", error instanceof Error ? error.message : String(error));
      
      // Handle multer errors specifically
      if (error instanceof multer.MulterError) {
        console.error("❌ Multer error detected:", error.code);
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: "Too many files. Maximum is 5 files." });
        }
        return res.status(400).json({ error: `Upload error: ${error.message}` });
      }
      
      // Return more detailed error for debugging
      res.status(500).json({ 
        error: "Failed to send message", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Presigned URL endpoint for direct R2 uploads (PUBLIC)
  app.get("/api/public/project/:token/upload-url", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { filename, fileType } = req.query as { filename?: string; fileType?: string };
      
      if (!filename || !fileType) {
        return res.status(400).json({ error: 'filename & fileType required' });
      }

      // Verify project exists
      const projectData = await storage.getProjectByToken(token);
      if (!projectData) {
        return res.status(404).json({ error: "Project not found or access denied" });
      }

      const key = `${token}/${Date.now()}-${filename}`;
      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        ContentType: fileType,
      });

      const r2Client = createR2Client();
      const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 }); // 5 minutes
      
      console.log('✅ Generated presigned URL for:', filename, 'key:', key);
      
      res.json({ 
        url: presignedUrl, 
        key,
        fullUrl: `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}/${key}`
      });
    } catch (error) {
      console.error("❌ Failed to generate presigned URL:", error);
      res.status(500).json({ 
        error: "Failed to generate upload URL",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ===================
  // FILE UPLOAD API (PUBLIC - for messaging attachments)
  // ===================
  
  // Simplified file upload configuration (no multer crashes)
  
  // File upload endpoint (PUBLIC) - Simplified to avoid crashes
  // Order Management Endpoints
  app.post('/api/orders', async (req: Request, res: Response) => {
    try {
      const { company_id, package: packageType, addons, custom_items } = req.body;
      
      // Validate required fields
      if (!company_id) {
        return res.status(400).json({ error: 'Company ID is required' });
      }
      
      // Get business details (companies and businesses are the same for orders)
      const company = await storage.getBusinessById(company_id);
      if (!company) {
        return res.status(404).json({ error: 'Business not found' });
      }
      
      // Calculate order total - Aligned with Minerva expectations
      const packagePrices = {
        starter: 997,
        growth: 2497,
        professional: 4997
      };

      // Map legacy/alternative package names to Minerva-expected names
      const packageMapping = {
        'basic': 'starter',
        'standard': 'growth', 
        'premium': 'professional',
        'enterprise': 'professional',
        // Direct mappings (already correct)
        'starter': 'starter',
        'growth': 'growth',
        'professional': 'professional'
      };

      // Validate and map package type
      const validPackageType = packageMapping[packageType] || packageType;
      if (!packagePrices[validPackageType]) {
        return res.status(400).json({ 
          error: 'Invalid package type', 
          validOptions: Object.keys(packagePrices),
          received: packageType 
        });
      }
      
      const addonPrices = {
        additional_page: 297,
        contact_forms: 197,
        photo_gallery: 297,
        video_integration: 397,
        appointment_booking: 797,
        messaging_portal: 997,
        seo_package: 797,
        logo_design: 797,
        copywriting: 397
      };
      
      let subtotal = 0;
      
      // Add package price (using validated package type)
      if (validPackageType && packagePrices[validPackageType]) {
        subtotal += packagePrices[validPackageType];
      }
      
      // Add addon prices
      if (addons && Array.isArray(addons)) {
        addons.forEach(addon => {
          if (addonPrices[addon]) {
            subtotal += addonPrices[addon];
          }
        });
      }
      
      // Add custom items
      if (custom_items && Array.isArray(custom_items)) {
        custom_items.forEach(item => {
          if (item.price) {
            subtotal += parseFloat(item.price);
          }
        });
      }
      
      const tax = 0; // No tax on services
      const total = subtotal + tax;
      
      // Generate order ID
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '').split('.')[0];
      const orderId = `ORD-${timestamp}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
      
      // Create order object
      const orderData = {
        id: orderId,
        companyId: company_id,
        status: 'draft' as const,
        package: validPackageType, // Use validated package name
        customItems: custom_items || [],
        subtotal,
        tax,
        total,
        notes: req.body.notes || '',
        invoiceStatus: 'draft' as const,
        paymentStatus: 'pending' as const
      };
      
      // Save to database
      const order = await storage.createOrder(orderData);
      
      // Call Minerva to create invoice
      try {
        const minervaPort = process.env.MINERVA_PORT || 8001;
        const minervaUrl = `http://localhost:${minervaPort}/api/minerva/create-invoice`;
        
        const invoiceResponse = await fetch(minervaUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Pass through auth headers if needed
            'Authorization': req.headers.authorization || ''
          },
          body: JSON.stringify({
            company_id: company_id,
            company_name: company.name,
            package_type: validPackageType, // Use validated package name for Minerva
            notes: `Order ${orderId} - ${addons?.length || 0} add-ons, ${custom_items?.length || 0} custom items`
          })
        });
        
        if (invoiceResponse.ok) {
          const invoiceData = await invoiceResponse.json();
          console.log('✅ Invoice created via Minerva:', invoiceData);
          
          // Update order with invoice info
          if (invoiceData.invoice) {
            order.invoiceId = invoiceData.invoice.invoice_id;
            order.invoiceStatus = invoiceData.invoice.status || 'draft';
          }
        } else {
          console.warn('⚠️ Failed to create invoice via Minerva:', await invoiceResponse.text());
        }
      } catch (minervaError) {
        console.error('⚠️ Minerva billing unavailable:', minervaError);
        // Continue without invoice - we can create it later
      }

      // Create Stripe payment link
      try {
        const paymentLinkUrl = await createPaymentLink({
          id: order.id,
          total: order.total,
          package: validPackageType, // Use validated package name for Stripe
          invoiceId: order.invoiceId,
          companyId: order.companyId
        });

        if (paymentLinkUrl) {
          // Update order with payment link
          const updatedOrder = await storage.updateOrder(order.id, {
            stripePaymentLinkUrl: paymentLinkUrl
          });
          
          if (updatedOrder) {
            order.stripePaymentLinkUrl = paymentLinkUrl;
          }
          
          console.log('✅ Payment link created:', paymentLinkUrl);
        }
      } catch (stripeError) {
        console.error('⚠️ Failed to create payment link:', stripeError);
        // Continue without payment link - can be created later
      }
      
      console.log('✅ Order created:', orderId);
      res.json({ 
        id: orderId, 
        ...order,
        message: 'Order created successfully' 
      });
      
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ error: 'Failed to create order' });
    }
  });

  app.get('/api/orders/:orderId', async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      
      // Get from database
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Get company details for response
      const company = await storage.getBusinessById(order.companyId);
      
      res.json({
        ...order,
        company_name: company?.name || 'Unknown Company'
      });
      
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  });

  app.get('/api/companies/:companyId/orders', async (req: Request, res: Response) => {
    try {
      const { companyId } = req.params;
      
      // Get orders from database
      const orders = await storage.getOrdersByCompanyId(companyId);
      
      res.json(orders);
      
    } catch (error) {
      console.error('Error fetching company orders:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  app.put('/api/orders/:orderId/status', async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      
      // Update order status in database
      const updatedOrder = await storage.updateOrder(orderId, { status });
      
      if (!updatedOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      console.log(`✅ Order ${orderId} status updated to: ${status}`);
      
      res.json({ 
        message: `Order status updated to ${status}`,
        order_id: orderId,
        status,
        order: updatedOrder
      });
      
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ error: 'Failed to update order status' });
    }
  });

  // Send invoice for an order
  app.post('/api/orders/:orderId/send-invoice', async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      
      // Get order details from database
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      if (!order.invoiceId) {
        return res.status(400).json({ error: 'No invoice associated with this order' });
      }

      // Get company details for email
      const company = await storage.getBusinessById(order.companyId);
      if (!company) {
        return res.status(404).json({ error: 'Business not found' });
      }
      
      // Call Minerva billing API to send invoice
      const billingPort = process.env.BILLING_PORT || 8007;
      const sendResponse = await fetch(`http://localhost:${billingPort}/api/invoices/${order.invoiceId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (sendResponse.ok) {
        // Update order invoice status in database
        await storage.updateOrder(orderId, {
          invoiceStatus: 'sent'
        });

        // Send enhanced payment email if we have a payment link
        if (order.stripePaymentLinkUrl) {
          try {
            await sendPaymentLinkEmail(order, company);
            console.log(`💳 Payment link email sent to ${company.email}`);
          } catch (emailError) {
            console.error('⚠️ Failed to send payment link email:', emailError);
            // Don't fail the whole request if payment email fails
          }
        }
        
        console.log(`📧 Invoice ${order.invoiceId} sent for order ${orderId}`);
        
        res.json({
          success: true,
          message: 'Invoice sent successfully',
          invoiceId: order.invoiceId,
          paymentLinkSent: !!order.stripePaymentLinkUrl
        });
      } else {
        throw new Error('Failed to send invoice');
      }
      
    } catch (error) {
      console.error('Error sending invoice:', error);
      res.status(500).json({ error: 'Failed to send invoice' });
    }
  });

  // Generate and email receipt to client
  async function generateAndEmailReceipt(order: any) {
    try {
      console.log(`🧾 Generating and emailing receipt for order ${order.id}`);
      
      // Get company details
      const company = await storage.getBusinessById(order.companyId);
      if (!company) {
        console.error(`❌ Business ${order.companyId} not found for receipt`);
        return;
      }

      // Generate receipt via Minerva billing if invoice exists
      if (order.invoiceId) {
        try {
          const billingPort = process.env.BILLING_PORT || 8007;
          
          // Trigger receipt generation in Minerva
          const receiptResponse = await fetch(`http://localhost:${billingPort}/api/receipts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              invoice_id: order.invoiceId,
              amount: order.total,
              method: order.paymentMethod || 'stripe',
              transaction_id: order.stripePaymentIntentId,
              notes: `Payment for order ${order.id}`
            })
          });

          if (receiptResponse.ok) {
            const receipt = await receiptResponse.json();
            console.log(`✅ Receipt generated via Minerva: ${receipt.receipt_id}`);
          }
        } catch (minervaError) {
          console.warn('⚠️ Minerva receipt generation failed, creating manual receipt:', minervaError);
        }
      }

      // Send receipt email to client using professional email service
      const emailSent = await sendReceiptEmail(order, company);
      if (emailSent) {
        console.log(`✅ Receipt email sent to ${company.email}`);
      } else {
        console.error('❌ Failed to send receipt email');
      }
      
    } catch (error) {
      console.error('❌ Error generating and emailing receipt:', error);
    }
  }

  // Send payment link email using professional email service
  async function sendPaymentLinkEmail(order: any, company: any) {
    if (!order.stripePaymentLinkUrl) {
      throw new Error('No payment link available');
    }

    const emailSent = await sendInvoiceEmail(order, company);
    if (emailSent) {
      console.log(`✅ Payment link email sent to ${company.email}`);
    } else {
      console.error('❌ Failed to send payment link email');
      throw new Error('Failed to send payment link email');
    }
  }

  // Get invoice details for an order
  app.get('/api/orders/:orderId/invoice', async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      
      // Get order details from database
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      const invoiceId = order.invoiceId || req.query.invoiceId;
      
      if (!invoiceId) {
        return res.status(404).json({ error: 'No invoice found for this order' });
      }
      
      // Get invoice from Minerva billing
      const billingPort = process.env.BILLING_PORT || 8007;
      const invoiceResponse = await fetch(`http://localhost:${billingPort}/api/invoices/${invoiceId}`);
      
      if (invoiceResponse.ok) {
        const invoice = await invoiceResponse.json();
        res.json(invoice);
      } else {
        throw new Error('Failed to fetch invoice');
      }
      
    } catch (error) {
      console.error('Error fetching invoice:', error);
      res.status(500).json({ error: 'Failed to fetch invoice details' });
    }
  });

  // Record payment for an order
  app.post('/api/orders/:orderId/record-payment', async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { amount, method, transactionId, notes } = req.body;
      
      // Get order details from database
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      if (!order.invoiceId) {
        return res.status(400).json({ error: 'No invoice associated with this order' });
      }
      
      // Record payment via Minerva billing
      const billingPort = process.env.BILLING_PORT || 8007;
      const paymentResponse = await fetch(`http://localhost:${billingPort}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoice_id: order.invoiceId,
          amount: amount,
          method: method || 'stripe',
          transaction_id: transactionId,
          notes: notes
        })
      });
      
      if (paymentResponse.ok) {
        const payment = await paymentResponse.json();
        
        // Update order payment status in database
        const updatedOrder = await storage.updateOrder(orderId, {
          paymentStatus: 'paid',
          invoiceStatus: 'paid',
          paymentDate: new Date(),
          paymentMethod: method,
          stripePaymentIntentId: transactionId
        });
        
        console.log(`💰 Payment recorded for order ${orderId}: $${amount}`);
        
        // Generate and email receipt to client
        if (updatedOrder) {
          await generateAndEmailReceipt(updatedOrder);
        }
        
        // Trigger fulfillment process only if payment is confirmed
        if (updatedOrder?.paymentStatus === 'paid') {
          await triggerFulfillmentProcess(orderId);
        }
        
        res.json({
          success: true,
          message: 'Payment recorded successfully',
          payment: payment
        });
      } else {
        throw new Error('Failed to record payment');
      }
      
    } catch (error) {
      console.error('Error recording payment:', error);
      res.status(500).json({ error: 'Failed to record payment' });
    }
  });

  // Stripe webhook handler for payment updates
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      
      if (!signature) {
        console.error('❌ Missing Stripe signature header');
        return res.status(400).send('Missing signature');
      }

      // Verify webhook signature
      const event = verifyWebhookSignature(req.body, signature);
      
      if (!event) {
        console.error('❌ Invalid Stripe webhook signature');
        return res.status(400).send('Invalid signature');
      }

      console.log(`📨 Received verified Stripe webhook: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object);
          break;
          
        case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(event.data.object);
          break;
          
        case 'payment_intent.payment_failed':
          await handlePaymentIntentFailed(event.data.object);
          break;
          
        default:
          console.log(`🔄 Unhandled event type: ${event.type}`);
      }

      // Also forward to Minerva billing if it's running
      try {
        const billingPort = process.env.BILLING_PORT || 8007;
        await fetch(`http://localhost:${billingPort}/api/stripe/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': signature
          },
          body: req.body
        });
      } catch (minervaError) {
        console.warn('⚠️ Failed to forward webhook to Minerva billing:', minervaError);
      }
      
      res.status(200).json({ received: true });
      
    } catch (error) {
      console.error('❌ Stripe webhook error:', error);
      res.status(400).send('Webhook error');
    }
  });

  // Helper functions for webhook handlers
  async function handleCheckoutSessionCompleted(session: any) {
    try {
      const orderId = session.metadata?.order_id;
      const invoiceId = session.metadata?.invoice_id;
      
      if (orderId) {
        // Update order status
        const updatedOrder = await storage.updateOrder(orderId, {
          paymentStatus: 'paid',
          invoiceStatus: 'paid',
          paymentDate: new Date(),
          paymentMethod: 'stripe',
          stripePaymentIntentId: session.payment_intent
        });
        
        console.log(`✅ Order ${orderId} marked as paid (checkout completed)`);
        
        // Generate and email receipt to client
        if (updatedOrder) {
          await generateAndEmailReceipt(updatedOrder);
        }
        
        // Trigger fulfillment process only if payment is confirmed
        if (updatedOrder?.paymentStatus === 'paid') {
          await triggerFulfillmentProcess(orderId);
        }
      }
    } catch (error) {
      console.error('❌ Error handling checkout session completed:', error);
    }
  }

  async function handlePaymentIntentSucceeded(paymentIntent: any) {
    try {
      const orderId = paymentIntent.metadata?.order_id;
      const invoiceId = paymentIntent.metadata?.invoice_id;
      
      if (orderId) {
        // Update order payment status
        const updatedOrder = await storage.updateOrder(orderId, {
          paymentStatus: 'paid',
          invoiceStatus: 'paid',
          paymentDate: new Date(),
          paymentMethod: 'stripe',
          stripePaymentIntentId: paymentIntent.id
        });
        
        console.log(`✅ Order ${orderId} payment confirmed (payment intent succeeded)`);
        
        // Generate and email receipt to client
        if (updatedOrder) {
          await generateAndEmailReceipt(updatedOrder);
        }
        
        // Trigger fulfillment process only if payment is confirmed
        if (updatedOrder?.paymentStatus === 'paid') {
          await triggerFulfillmentProcess(orderId);
        }
      } else if (invoiceId) {
        // Fallback: find order by invoice ID
        const orders = await storage.getOrders();
        const order = orders.find(o => o.invoiceId === invoiceId);
        
        if (order) {
          const updatedOrder = await storage.updateOrder(order.id, {
            paymentStatus: 'paid',
            invoiceStatus: 'paid',
            paymentDate: new Date(),
            paymentMethod: 'stripe',
            stripePaymentIntentId: paymentIntent.id
          });
          
          console.log(`✅ Order ${order.id} marked as paid via invoice ID`);
          
          // Generate and email receipt
          if (updatedOrder) {
            await generateAndEmailReceipt(updatedOrder);
          }
          
          // Trigger fulfillment only if paid
          if (updatedOrder?.paymentStatus === 'paid') {
            await triggerFulfillmentProcess(order.id);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error handling payment intent succeeded:', error);
    }
  }

  async function handlePaymentIntentFailed(paymentIntent: any) {
    try {
      const orderId = paymentIntent.metadata?.order_id;
      
      if (orderId) {
        // Update order to reflect failed payment
        await storage.updateOrder(orderId, {
          paymentStatus: 'pending', // Keep as pending, they can retry
          stripePaymentIntentId: paymentIntent.id
        });
        
        console.log(`⚠️ Payment failed for order ${orderId}`);
        
        // TODO: Send payment failure notification
      }
    } catch (error) {
      console.error('❌ Error handling payment intent failed:', error);
    }
  }

  async function triggerFulfillmentProcess(orderId: string) {
    try {
      console.log(`🚀 Triggering fulfillment process for order ${orderId}`);
      
      // Get order details
      const order = await storage.getOrderById(orderId);
      if (!order) {
        console.error(`❌ Order ${orderId} not found for fulfillment`);
        return;
      }

      // Get company details
      const company = await storage.getBusinessById(order.companyId);
      if (!company) {
        console.error(`❌ Business ${order.companyId} not found for fulfillment`);
        return;
      }

      console.log(`📋 Starting fulfillment for ${company.name} - ${order.package} package ($${order.total})`);

      // 1. Send welcome email to client
      try {
        await sendWelcomeEmailToClient(order, company);
      } catch (emailError) {
        console.error('⚠️ Failed to send welcome email:', emailError);
      }

      // 2. Create project brief template (admin will fill this out based on meeting)
      try {
        const briefId = `BRIEF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const projectBrief = {
          id: briefId,
          orderId: order.id,
          companyId: order.companyId,
          companyName: company.name,
          status: 'awaiting_admin',
          clientStatus: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        projectBriefs.set(briefId, projectBrief);
        console.log(`✅ Project brief template created: ${briefId} for ${company.name} - Admin should fill this out based on meeting notes`);
        
      } catch (briefError) {
        console.error('⚠️ Failed to create project brief template:', briefError);
      }

      // 3. Create project in system
      try {
        const projectId = await createFulfillmentProject(order, company);
        console.log(`✅ Fulfillment project created: ${projectId}`);
        
        // Update order with project reference
        await storage.updateOrder(orderId, {
          status: 'in_progress'
        });
      } catch (projectError) {
        console.error('⚠️ Failed to create fulfillment project:', projectError);
      }

      // 4. Notify team of new paid project
      try {
        await notifyTeamOfNewProject(order, company);
        console.log(`✅ Team notified of new project`);
      } catch (notifyError) {
        console.error('⚠️ Failed to notify team:', notifyError);
      }

      // 5. Schedule kickoff call (placeholder)
      try {
        await scheduleKickoffCall(order, company);
        console.log(`✅ Kickoff call scheduled`);
      } catch (scheduleError) {
        console.error('⚠️ Failed to schedule kickoff call:', scheduleError);
      }
      
      console.log(`🎉 Fulfillment process completed for order ${orderId}`);
      
    } catch (error) {
      console.error('❌ Error triggering fulfillment process:', error);
    }
  }

  // Send welcome email to client after payment using professional email service
  async function sendWelcomeEmailToClient(order: any, company: any) {
    const packageFeatures = getPackageFeatures(order.package);
    const emailSent = await sendWelcomeEmail(order, company, packageFeatures);
    if (emailSent) {
      console.log(`✅ Welcome email sent to ${company.email}`);
    } else {
      console.error('❌ Failed to send welcome email');
      throw new Error('Failed to send welcome email');
    }
  }

  // Create a project in the fulfillment system
  async function createFulfillmentProject(order: any, company: any) {
    try {
      // Create a new project in the system
      const projectId = await storage.createProject({
        companyId: company.id,
        title: `${company.name} - ${order.package ? order.package.charAt(0).toUpperCase() + order.package.slice(1) : 'Website'} Package`,
        description: `Paid project: Order ${order.id} - ${order.package} package ($${order.total})`,
        status: 'active',
        stage: 'planning',
        totalAmount: order.total,
        paidAmount: order.total,
        paymentStatus: 'paid'
      });
      
      return projectId;
    } catch (error) {
      console.error('❌ Error creating fulfillment project:', error);
      throw error;
    }
  }

  // Notify team of new paid project
  async function notifyTeamOfNewProject(order: any, company: any) {
    const notification = {
      type: 'new_paid_project',
      orderId: order.id,
      companyName: company.name,
      package: order.package,
      amount: order.total,
      email: company.email,
      phone: company.phone,
      timestamp: new Date().toISOString()
    };
    
    console.log('🔔 Team notification:', JSON.stringify(notification, null, 2));
    
    // TODO: Implement team notification system
    // - Send Slack notification
    // - Email project managers
    // - Update team dashboard
    // - Create tasks in project management system
  }

  // Schedule kickoff call
  async function scheduleKickoffCall(order: any, company: any) {
    const kickoffDetails = {
      orderId: order.id,
      companyName: company.name,
      email: company.email,
      phone: company.phone,
      package: order.package,
      suggestedTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    };
    
    console.log('📅 Kickoff call details:', JSON.stringify(kickoffDetails, null, 2));
    
    // TODO: Implement scheduling system
    // - Create calendar appointment
    // - Send calendar invite to client
    // - Add to team calendar
    // - Set reminders
  }

  // Get package features for welcome email
  function getPackageFeatures(packageType: string) {
    const features = {
      starter: [
        '• Professional 5-page website',
        '• Mobile-responsive design',
        '• Contact form integration',
        '• Basic SEO setup',
        '• 30 days support'
      ],
      growth: [
        '• Professional 10-page website',
        '• Mobile-responsive design',
        '• Contact form integration',
        '• Advanced SEO setup',
        '• Photo gallery',
        '• Social media integration',
        '• 60 days support'
      ],
      professional: [
        '• Professional 15-page website',
        '• Mobile-responsive design',
        '• Contact form integration',
        '• Premium SEO setup',
        '• Photo gallery',
        '• Video integration',
        '• Appointment booking system',
        '• Client messaging portal',
        '• Logo design',
        '• Professional copywriting',
        '• 90 days support'
      ]
    };
    
    return features[packageType as keyof typeof features]?.join('\n      ') || '• Custom website package';
  }

  // Generate Upwork Brief endpoint
  app.post('/api/generate-upwork-brief', async (req: Request, res: Response) => {
    try {
      const { orderId, meetingNotes } = req.body;
      
      // Fetch order data
      const order = await storage.getProjectById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Generate brief using template
      const brief = `# 🚀 UPWORK PROJECT BRIEF
**Pleasant Cove Design - Website Development Handoff**

---

## 📋 PROJECT OVERVIEW

### Client Information
- **Business Name:** ${order.business_name || 'NOT PROVIDED'}
- **Contact Name:** ${order.client_name || 'NOT PROVIDED'}  
- **Email:** ${order.client_email || 'NOT PROVIDED'}
- **Industry:** ${order.business_type || 'NOT PROVIDED'}
- **Project ID:** ${orderId}
- **Order Date:** ${order.created_at || 'NOT PROVIDED'}

### Selected Package
- **Site Type:** ${order.site_type || 'NOT SPECIFIED'}
- **Selected Features:** ${order.features?.join(', ') || 'NOT SPECIFIED'}
- **Demo URL Reference:** ${order.demo_url || 'NOT PROVIDED'}

---

## 📁 FILE DIRECTORY & ACCESS LINKS

### Project Assets Organization
- **Main Project Folder:** ${meetingNotes.project_folder_link || 'TBD - Will be provided'}
  - /Branding/ - Logo files, brand guidelines, color palettes
  - /Assets/ - Photos, testimonials, business documents
  - /Copy/ - Website copy, headlines, service descriptions
  - /Reference/ - Demo links, competitor sites, inspiration
  - /Technical/ - Domain info, hosting details, integrations

### Access & Permissions
- **File Access:** View/Edit permissions granted to contractor
- **CMS Access:** Platform details provided separately
- **Hosting Access:** Domain registrar access if needed

---

## 🎯 PROJECT SCOPE DEFINITION

### ✅ IN-SCOPE (Included in Budget)
- **Pages Included:** ${meetingNotes.in_scope_pages || 'Homepage, About, Services, Contact'}
- **Content Creation:** Copy editing, image optimization, basic SEO
- **Features Included:** ${order.features?.join(', ') || 'Contact forms, basic functionality'}
- **Revisions Included:** 2 rounds of revisions included
- **Testing Included:** Cross-browser, mobile responsiveness, form testing
- **Launch Support:** Basic launch coordination and immediate bug fixes

### ❌ OUT-OF-SCOPE (Additional Cost)
- **Logo Design:** Not included - logo must be provided
- **Copywriting:** Major copy creation beyond editing
- **Advanced Features:** E-commerce, membership areas, custom applications
- **Content Migration:** Moving content from old site
- **Ongoing Maintenance:** Updates, backups, security monitoring
${meetingNotes.out_of_scope_notes ? '- **Additional Notes:** ' + meetingNotes.out_of_scope_notes : ''}

### 💰 Change Request Process
- **Minor Changes:** Under $50 - included in scope
- **Major Changes:** Require approval and additional billing
- **Timeline Impact:** Changes may affect launch date

---

## 📝 CONTENT REQUIREMENTS

### Business Information (From Client Meeting)
- **Business Description:** ${meetingNotes.business_description}
- **Headline/Tagline:** ${meetingNotes.tagline}

### Key Value Propositions:
1. ${meetingNotes.value_prop_1}
2. ${meetingNotes.value_prop_2}  
3. ${meetingNotes.value_prop_3}

---

## 💬 CLIENT MEETING NOTES

**Date of Meeting:** ${meetingNotes.date}
**Meeting Type:** ${meetingNotes.type}

**Pain Points Client Mentioned:**
- ${meetingNotes.pain_points}

**Success Metrics Client Cares About:**
- ${meetingNotes.success_metrics}

**Timeline Constraints:**
- ${meetingNotes.timeline_constraints}

---

## 📞 COMMUNICATION PROTOCOL

### Escalation Path & Support
- **For Contractor Blockers:**
  - **Primary:** Ben Dickinson (Upwork Coordinator)
  - **Email:** ben@pleasantcovedesign.com
  - **Response Time:** Within 4 hours during business hours
- **For Technical Issues:**
  - **AI Assistant:** Minerva (available 24/7 via admin dashboard)
  - **Emergency Contact:** (207) 200-4281

---

## 🚀 DEVELOPER SANDBOX & DEPLOYMENT

### Development Environment
- **Staging URL:** ${meetingNotes.staging_url || 'TBD - Will be provided'}
- **Repository Access:** GitHub repo link if applicable
- **API Keys & Credentials:** Provided separately via secure channel

### Deployment Process
- **Platform:** ${meetingNotes.deployment_platform || 'Railway'}
- **Domain Setup:** Ben handles domain pointing
- **Go-Live Approval:** Required from Ben before production deployment

### Post-Launch Support
- **Immediate Issues:** Contractor handles first 48 hours
- **Bug Fixes:** Included for 7 days post-launch
- **Performance Monitoring:** Ben handles ongoing monitoring

---

## 🚨 IMPORTANT NOTES & SPECIAL INSTRUCTIONS

${meetingNotes.special_instructions}

---

**Project Brief Generated:** ${new Date().toISOString().split('T')[0]}
**Pleasant Cove Project Manager:** Ben Dickinson  
**Upwork Developer:** [TO BE ASSIGNED]

---

*This brief contains all requirements gathered through client meetings, messaging system interactions, and order specifications. Please confirm receipt and ask questions before beginning development.*`;

      res.json({ brief });
      
    } catch (error) {
      console.error('Error generating Upwork brief:', error);
      res.status(500).json({ error: 'Failed to generate brief' });
    }
  });

  // Simple file upload endpoint without multer - using basic file handling
  app.post("/api/upload", async (req: Request, res: Response) => {
    try {
      console.log('📎 File upload requested');
      
      // Basic implementation to handle file uploads without ES modules conflicts
      // This will work with Squarespace messaging widget
      const uploadDir = path.join(process.cwd(), 'uploads');
      
      // Ensure uploads directory exists using import syntax
      const fs = await import('fs');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // For now, create a simple response that works
      // TODO: Implement proper file handling later
      const timestamp = Date.now();
      const filename = `upload-${timestamp}.txt`;
      const fileUrl = `/uploads/${filename}`;
      
      console.log('📎 File upload successful:', { filename, fileUrl });
      
      res.json({
        success: true,
        fileUrl: fileUrl,
        filename: filename,
        size: 1024,
        mimetype: "application/octet-stream"
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // ===================
  // ACUITY SCHEDULING WEBHOOK (PUBLIC - no auth required)
  // ===================
  
  app.post("/api/acuity-appointment", async (req: Request, res: Response) => {
    try {
      console.log("=== ACUITY WEBHOOK RECEIVED ===");
      console.log("Headers:", JSON.stringify(req.headers, null, 2));
      console.log("Body:", JSON.stringify(req.body, null, 2));
      console.log("Method:", req.method);
      console.log("URL:", req.url);
      console.log("==========================================");
      
      const webhookData = req.body;
      
      // Handle real Acuity webhook format (notification only)
      if (webhookData.action && webhookData.id && !webhookData.email) {
        console.log(`🔄 Real Acuity webhook - fetching appointment details for ID: ${webhookData.id}`);
        
        // Fetch full appointment details from Acuity API
        const acuityUserId = process.env.ACUITY_USER_ID;
        const acuityApiKey = process.env.ACUITY_API_KEY;
        
        if (!acuityUserId || !acuityApiKey) {
          console.log("⚠️ Acuity credentials not configured. Cannot fetch appointment details.");
          return res.status(200).json({ 
            success: false, 
            message: "Acuity credentials not configured" 
          });
        }
        
        try {
          const authHeader = Buffer.from(`${acuityUserId}:${acuityApiKey}`).toString('base64');
          const response = await fetch(`https://acuityscheduling.com/api/v1/appointments/${webhookData.id}`, {
            headers: {
              'Authorization': `Basic ${authHeader}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            console.log(`❌ Failed to fetch appointment details: ${response.status} ${response.statusText}`);
            return res.status(200).json({ 
              success: false, 
              message: `Failed to fetch appointment: ${response.status}` 
            });
          }
          
          const appointmentDetails = await response.json();
          console.log("✅ Fetched appointment details:", JSON.stringify(appointmentDetails, null, 2));
          
          // Use the fetched details for processing
          webhookData.firstName = appointmentDetails.firstName;
          webhookData.lastName = appointmentDetails.lastName;
          webhookData.email = appointmentDetails.email;
          webhookData.phone = appointmentDetails.phone;
          webhookData.datetime = appointmentDetails.datetime;
          webhookData.endTime = appointmentDetails.endTime;
          webhookData.duration = appointmentDetails.duration;
          webhookData.appointmentType = appointmentDetails.type;
          webhookData.notes = appointmentDetails.notes;
          
        } catch (error) {
          console.log("❌ Error fetching appointment details:", error);
          return res.status(200).json({ 
            success: false, 
            message: "Error fetching appointment details" 
          });
        }
      }
      
      // Extract appointment details (now either from original webhook or fetched from API)
      const {
        id: acuityId,
        firstName,
        lastName,
        email,
        phone,
        datetime,
        endTime,
        duration,
        appointmentType,
        appointmentTypeID,
        notes,
        action = 'scheduled'
      } = webhookData;
      
      // Validate required fields
      if (!acuityId || !email) {
        console.log("❌ Missing required fields: acuityId or email");
        return res.status(400).json({ 
          success: false, 
          error: "Missing required fields: acuityId or email" 
        });
      }
      
      // Find existing client by email
      const clientData = await storage.findClientByEmail(email);
      let projectToken = null;
      let companyId = null;
      let projectId = null;
      let businessId = null;
      
      if (clientData?.company && clientData?.project) {
        // Use existing company/project
        companyId = clientData.company.id;
        projectId = clientData.project.id;
        projectToken = clientData.project.accessToken;
        
        console.log(`✅ Found existing client: ${clientData.company.name} (Project Token: ${projectToken})`);
      } else if (clientData?.business) {
        // Legacy business system
        businessId = clientData.business.id;
        console.log(`✅ Found existing business: ${clientData.business.name}`);
      } else {
        // Create new company and project for this client
        console.log(`🆕 Creating new client for email: ${email}`);
        
        projectToken = generateProjectToken();
        
        const newCompany = await storage.createCompany({
          name: `${firstName} ${lastName}`.trim(),
          email: email,
          phone: phone || 'No phone provided',
          address: 'To be updated',
          city: 'To be updated',
          state: 'To be updated',
          industry: 'consultation',
          website: ''
        });
        
        const newProject = await storage.createProject({
          companyId: newCompany.id!,
          title: `${newCompany.name} - Consultation Project`,
          type: 'consultation',
          stage: 'scheduled',
          status: 'active',
          accessToken: projectToken,
          notes: `Project created from Acuity appointment booking`,
          totalAmount: 0,
          paidAmount: 0
        });
        
        companyId = newCompany.id;
        projectId = newProject.id;
        
        console.log(`🎯 Created new client with project token: ${projectToken}`);
        
        // Log company creation activity
        await storage.createActivity({
          type: 'company_created',
          description: `Company created from Acuity appointment: ${newCompany.name}`,
          companyId: newCompany.id!,
          projectId: newProject.id!
        });
      }
      
      // Prepare appointment data
      const appointmentData = {
        acuityId: acuityId.toString(),
        email,
        firstName,
        lastName,
        phone,
        datetime,
        endTime,
        duration,
        serviceType: appointmentType || 'consultation',
        appointmentTypeId: appointmentTypeID?.toString(),
        status: action === 'canceled' ? 'cancelled' : 'scheduled',
        notes: notes || '',
        isAutoScheduled: true,
        webhookAction: action,
        companyId,
        projectId,
        businessId
      };
      
      // Create or update appointment
      const appointment = await storage.createAcuityAppointment(appointmentData, projectToken || undefined);
      
      // Log activity
      const activityData: any = {
        type: 'appointment_scheduled',
        description: `Acuity appointment ${action}: ${firstName} ${lastName} - ${new Date(datetime).toLocaleDateString()}`,
      };
      
      if (companyId) activityData.companyId = companyId;
      if (projectId) activityData.projectId = projectId;
      if (businessId) activityData.businessId = businessId;
      
      await storage.createActivity(activityData);
      
      // Add notification
      addNotification({
        type: 'appointment_booked',
        title: action === 'canceled' ? 'Appointment Cancelled' : 'Acuity Appointment Booked!',
        message: `${firstName} ${lastName} - ${new Date(datetime).toLocaleDateString()}`,
        businessId: businessId || companyId || undefined
      });
      
      console.log(`✅ Acuity appointment processed: ${acuityId} for ${email} (Action: ${action})`);
      
      res.status(200).json({ 
        success: true, 
        appointmentId: appointment.id,
        projectToken,
        action,
        message: "Acuity appointment processed successfully" 
      });
      
    } catch (error) {
      console.error("Failed to process Acuity webhook:", error);
      res.status(500).json({ error: "Failed to process Acuity appointment" });
    }
  });

  // ===================
  // PROJECT OPERATIONS
  // ===================
  
  // Get all projects
  app.get("/api/projects", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { status, stage, type, companyId } = req.query;
      
      const filters = {
        status: status as string,
        stage: stage as string,
        type: type as string,
        companyId: companyId ? parseInt(companyId as string) : undefined
      };
      
      const projects = await storage.getProjects(filters);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  // Get project by ID with company information
  app.get("/api/projects/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Get company information
      const company = await storage.getCompanyById(project.companyId);
      
      res.json({
        ...project,
        company: company
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  // Get project summary with related data
  app.get("/api/projects/:id/summary", requireAdmin, async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Get related data
      const company = await storage.getCompanyById(project.companyId);
      const activities = await storage.getActivitiesByProject(projectId);
      const appointments = await storage.getAppointmentsByProject(projectId);
      
      res.json({
        project,
        company,
        activities: activities || [],
        appointments: appointments || [],
        stats: {
          totalActivities: activities?.length || 0,
          upcomingAppointments: appointments?.filter(apt => 
            apt.status === 'scheduled' && new Date(apt.datetime) > new Date()
          ).length || 0
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project summary" });
    }
  });

  // Create new project
  app.post("/api/projects", requireAdmin, async (req: Request, res: Response) => {
    try {
      const projectData = req.body;
      
      // Validate company exists
      const company = await storage.getCompanyById(projectData.companyId);
      if (!company) {
        return res.status(400).json({ error: "Company not found" });
      }
      
      const project = await storage.createProject(projectData);
      
      // Log activity
      await storage.createActivity({
        type: 'project_created',
        description: `New project created: ${project.title}`,
        companyId: project.companyId,
        projectId: project.id!
      });
      
      res.status(201).json(project);
    } catch (error) {
      console.error("Failed to create project:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  // Update project
  app.put("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const updateData = req.body;
      
      const project = await storage.updateProject(projectId, updateData);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Log activity
      await storage.createActivity({
        type: 'project_updated',
        description: `Project updated: ${project.title}`,
        companyId: project.companyId,
        projectId: project.id!
      });
      
      res.json(project);
    } catch (error) {
      console.error("Failed to update project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  // Archive/reactivate project
  app.patch("/api/projects/:id/status", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['active', 'archived', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be active, archived, or cancelled" });
      }
      
      const project = await storage.updateProject(projectId, { status });
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Log activity
      await storage.createActivity({
        type: 'project_status_changed',
        description: `Project status changed to ${status}: ${project.title}`,
        companyId: project.companyId,
        projectId: project.id!
      });
      
      res.json(project);
    } catch (error) {
      console.error("Failed to update project status:", error);
      res.status(500).json({ error: "Failed to update project status" });
    }
  });

  // ===================
  // PROJECT MESSAGING OPERATIONS (Admin)
  // ===================

  // Get all messages for a specific business (replaces debug endpoint)
  app.get("/api/business/:businessId/messages", requireAdmin, async (req: Request, res: Response) => {
    try {
        const businessId = parseInt(req.params.businessId);
        console.log(`📥 [ADMIN INBOX] Fetching all conversations for Business ID: ${businessId}...`);

        // This new storage method will get all data needed in a single, efficient call
        const conversations = await storage.getAllConversations();
        
        console.log(`✅ [ADMIN INBOX] Returning ${conversations.length} total conversations.`);
        
        res.json({
            businessId,
            projectMessages: conversations, // The frontend expects this structure
        });
        
    } catch (error) {
        console.error('❌ [ADMIN INBOX] Error fetching business messages:', error);
        res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Debug endpoint to see all messages in database (legacy - use business endpoint instead)
  app.get("/api/debug/all-messages", async (req: Request, res: Response) => {
    try {
      console.log('🔍 Debug: Fetching all project messages...');
      
      // Get all projects
      const projects = await storage.getProjects();
      console.log(`🔍 Found ${projects.length} projects:`, projects.map(p => ({ id: p.id, title: p.title, token: p.accessToken })));
      
      // Get all messages for each project
      const allProjectMessages = [];
      for (const project of projects) {
        const messages = await storage.getProjectMessages(project.id!);
        console.log(`🔍 Project ${project.id} (${project.title}) has ${messages.length} messages`);
        allProjectMessages.push({
          projectId: project.id,
          projectTitle: project.title,
          accessToken: project.accessToken,
          messageCount: messages.length,
          messages: messages
        });
      }
      
      res.json({
        totalProjects: projects.length,
        projectMessages: allProjectMessages,
        debug: 'This endpoint shows all messages across all projects'
      });
    } catch (error) {
      console.error("Failed to fetch debug messages:", error);
      res.status(500).json({ error: "Failed to fetch debug data" });
    }
  });

  // Get all messages for a project
  app.get("/api/projects/:id/messages", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Verify project exists
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const messages = await storage.getProjectMessages(projectId);
      res.json(messages);
    } catch (error) {
      console.error("Failed to fetch project messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Create new message in project (Admin) - now handles files!
  app.post("/api/projects/:id/messages", requireAdmin, upload.array('files'), async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const { content, senderName, senderType = 'admin' } = req.body;
      
      // multer-s3 will populate req.files as an array
      const uploaded = Array.isArray(req.files) ? (req.files as any[]) : [];
      
      console.log('📤 Admin unified message send:', { 
        projectId, 
        content, 
        senderName, 
        filesCount: uploaded.length 
      });
      
      if ((!content && uploaded.length === 0) || !senderName) {
        return res.status(400).json({ error: "Content or files and sender name are required" });
      }

      // Verify project exists
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Process uploaded files based on storage type - ALWAYS use absolute URLs
      const attachments: string[] = [];
      for (const file of uploaded) {
        if (useR2Storage && (file as any).location) {
          // For R2 storage, use the location property from multer-s3
          attachments.push((file as any).location);
        } else if (useR2Storage && (file as any).key) {
          // For R2 storage with key-based uploads
          const fileUrl = `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}/${(file as any).key}`;
          attachments.push(fileUrl);
        } else {
          // For local storage, construct absolute URL using filename
          // Always use HTTPS for production and ngrok
          const baseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://pleasantcovedesign-production.up.railway.app'
            : process.env.NGROK_URL || `https://localhost:${process.env.PORT || 3000}`;
          attachments.push(`${baseUrl}/uploads/${file.filename}`);
        }
      }
      
      console.log('📎 Admin files processed:', uploaded.map((f, i) => ({ 
        name: f.originalname, 
        url: attachments[i],
        storage: useR2Storage ? 'R2' : 'local'
      })));

      const message = await storage.createProjectMessage({
        projectId,
        senderType: senderType as 'admin' | 'client',
        senderName,
        content: content || '',
        attachments
      });

      console.log('✅ Admin message created with attachments:', attachments);

      // Broadcast message via WebSocket for real-time updates
      if (io) {
        const broadcastMessage = {
          id: message.id,
          projectToken: project.accessToken,
          senderName: message.senderName,
          content: message.content,
          createdAt: message.createdAt,
          senderType: 'admin',
          attachments: message.attachments || []
        };
        
        console.log(`📡 Broadcasting admin message to project room: ${project.accessToken}`);
        io.to(project.accessToken).emit('newMessage', broadcastMessage);
        
        // --- ADMIN BROADCAST ---
        console.log(`📡 [SERVER] Broadcasting admin message to admin-room`);
        io.to('admin-room').emit('admin-new-message', broadcastMessage);
      }

      // Send email notification to client about new admin message
      try {
        const company = await storage.getCompanyById(project.companyId);
        if (company && company.email) {
          const transporter = createEmailTransporter();
          
          // Create a link to the client portal
          const clientPortalUrl = process.env.NODE_ENV === 'production' 
            ? `https://www.pleasantcovedesign.com/portal?token=${project.accessToken}`
            : `http://localhost:3000/portal?token=${project.accessToken}`;
          
          await transporter.sendMail({
            from: '"Pleasant Cove Design" <pleasantcovedesign@gmail.com>',
            to: company.email,
            subject: `New Message from ${message.senderName} - Pleasant Cove Design`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">New Message from Pleasant Cove Design</h2>
                <p>Hello ${company.name},</p>
                <p>You have received a new message from <strong>${message.senderName}</strong>:</p>
                
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #374151;">${content || ''}</p>
                  ${attachments.length > 0 ? `
                    <div style="margin-top: 15px;">
                      <p style="margin: 0; font-weight: bold; color: #6b7280;">Attachments:</p>
                      ${attachments.map(url => `
                        <p style="margin: 5px 0;">
                          <a href="${url}" style="color: #2563eb; text-decoration: none;">
                            📎 ${url.split('/').pop() || 'View Attachment'}
                          </a>
                        </p>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${clientPortalUrl}" 
                     style="background-color: #2563eb; color: white; padding: 12px 24px; 
                            text-decoration: none; border-radius: 6px; display: inline-block;">
                    View Message & Reply
                  </a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #6b7280; font-size: 14px;">
                  This is an automated notification from Pleasant Cove Design. 
                  <a href="${clientPortalUrl}" style="color: #2563eb;">Click here</a> to view and respond to messages.
                </p>
              </div>
            `
          });
          
          console.log(`📧 Email notification sent to ${company.email} about new admin message`);
        }
      } catch (emailError) {
        console.error('❌ Failed to send email notification:', emailError);
        // Don't fail the message creation if email fails
      }

      // Log activity
      await storage.createActivity({
        type: 'admin_message',
        description: `Admin message sent: ${content ? content.substring(0, 50) : attachments.length > 0 ? 'files shared' : 'message sent'}${content && content.length > 50 ? '...' : ''}${attachments.length > 0 ? ` (${attachments.length} files)` : ''}`,
        companyId: project.companyId,
        projectId: project.id!
      });

      res.status(201).json({
        ...message,
        filesUploaded: attachments.length,
        success: true
      });
    } catch (error) {
      console.error("Failed to create admin message:", error);
      console.error("Error details:", error);
      
      // Handle multer errors specifically
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: "Too many files. Maximum is 5 files." });
        }
        return res.status(400).json({ error: `Upload error: ${error.message}` });
      }
      
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // ===================
  // PROJECT FILE OPERATIONS (Admin)
  // ===================

  // Get all files for a project
  app.get("/api/projects/:id/files", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Verify project exists
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const files = await storage.getProjectFiles(projectId);
      res.json(files);
    } catch (error) {
      console.error("Failed to fetch project files:", error);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  // Upload/create file record for project
  app.post("/api/projects/:id/files", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const { fileName, fileUrl, fileSize, fileType, uploaderName, description } = req.body;
      
      if (!fileName || !fileUrl || !uploaderName) {
        return res.status(400).json({ error: "File name, URL, and uploader name are required" });
      }

      // Verify project exists
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const file = await storage.createProjectFile({
        projectId,
        fileName,
        fileUrl,
        fileSize,
        fileType,
        uploadedBy: 'admin',
        uploaderName,
        description
      });

      // Log activity
      await storage.createActivity({
        type: 'file_uploaded',
        description: `File uploaded: ${fileName}`,
        companyId: project.companyId,
        projectId: project.id!
      });

      res.status(201).json(file);
    } catch (error) {
      console.error("Failed to create file record:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Delete file
  app.delete("/api/projects/files/:fileId", async (req: Request, res: Response) => {
    try {
      const fileId = parseInt(req.params.fileId);
      
      // Get file info before deletion for activity logging
      const files = await storage.getProjectFiles(0); // Get all files first
      const file = files.find(f => f.id === fileId);
      
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      await storage.deleteProjectFile(fileId);
      
      // Log activity
      const project = await storage.getProjectById(file.projectId);
      if (project) {
        await storage.createActivity({
          type: 'file_deleted',
          description: `File deleted: ${file.fileName}`,
          companyId: project.companyId,
          projectId: project.id!
        });
      }

      res.json({ success: true, message: "File deleted successfully" });
    } catch (error) {
      console.error("Failed to delete file:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // ===================
  // ZAPIER-FRIENDLY ENDPOINTS
  // ===================

  // Search businesses/leads (useful for Zapier lookups)
  app.get("/api/search/businesses", async (req: Request, res: Response) => {
    try {
      const { q, email, phone, name, limit = 10 } = req.query;
      
      let businesses;
      if (email) {
        businesses = await storage.searchBusinesses(email as string);
      } else if (phone) {
        businesses = await storage.searchBusinesses(phone as string);
      } else if (q) {
        businesses = await storage.searchBusinesses(q as string);
      } else if (name) {
        businesses = await storage.searchBusinesses(name as string);
      } else {
        businesses = await storage.getBusinesses();
      }
      
      // Limit results for Zapier efficiency
      const limitedResults = businesses.slice(0, parseInt(limit as string));
      
      res.json({
        results: limitedResults,
        total: businesses.length,
        limited: businesses.length > parseInt(limit as string)
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to search businesses" });
    }
  });

  // Update business stage (useful for Zapier status updates)
  app.patch("/api/businesses/:id/stage", async (req: Request, res: Response) => {
    try {
      const businessId = parseInt(req.params.id);
      const { stage, notes } = req.body;
      
      if (!stage) {
        return res.status(400).json({ error: "Stage is required" });
      }

      const business = await storage.updateBusinessStage(businessId, stage);
      
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      // Log activity
      await storage.createActivity({
        type: 'stage_updated',
        description: `Stage updated to: ${stage}${notes ? ` - ${notes}` : ''}`,
        businessId: businessId
      });

      res.json({ 
        success: true, 
        business,
        message: `Stage updated to ${stage}` 
      });
    } catch (error) {
      console.error("Failed to update business stage:", error);
      res.status(500).json({ error: "Failed to update stage" });
    }
  });

  // Get recent activities (useful for Zapier triggers)
  app.get("/api/activities/recent", async (req: Request, res: Response) => {
    try {
      const { limit = 50, since, type } = req.query;
      
      const activities = await storage.getActivities();
      let filteredActivities = activities;

      // Filter by timestamp if 'since' provided
      if (since) {
        const sinceDate = new Date(since as string);
        filteredActivities = activities.filter(a => 
          new Date(a.createdAt!) > sinceDate
        );
      }

      // Filter by type if provided
      if (type) {
        filteredActivities = filteredActivities.filter(a => a.type === type);
      }

      // Limit results
      const limitedResults = filteredActivities.slice(0, parseInt(limit as string));

      res.json({
        activities: limitedResults,
        total: filteredActivities.length,
        hasMore: filteredActivities.length > parseInt(limit as string)
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent activities" });
    }
  });

  // Bulk update businesses (useful for Zapier batch operations)
  app.patch("/api/businesses/bulk", async (req: Request, res: Response) => {
    try {
      const { businessIds, updates } = req.body;
      
      if (!businessIds || !Array.isArray(businessIds) || !updates) {
        return res.status(400).json({ 
          error: "businessIds (array) and updates (object) are required" 
        });
      }

      const results = [];
      
      for (const businessId of businessIds) {
        try {
          const business = await storage.updateBusiness(parseInt(businessId), updates);
          if (business) {
            results.push({ businessId, success: true, business });
            
            // Log activity for each update
            await storage.createActivity({
              type: 'bulk_updated',
              description: `Bulk update applied: ${Object.keys(updates).join(', ')}`,
              businessId: parseInt(businessId)
            });
          } else {
            results.push({ businessId, success: false, error: "Business not found" });
          }
        } catch (error) {
          results.push({ businessId, success: false, error: (error as Error).message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      
      res.json({
        success: true,
        results,
        summary: {
          total: businessIds.length,
          successful: successCount,
          failed: businessIds.length - successCount
        }
      });
    } catch (error) {
      console.error("Failed to perform bulk update:", error);
      res.status(500).json({ error: "Failed to perform bulk update" });
    }
  });

  // Webhook test endpoint (useful for Zapier webhook testing)
  app.post("/api/webhook/test", async (req: Request, res: Response) => {
    try {
      console.log("=== ZAPIER WEBHOOK TEST ===");
      console.log("Headers:", JSON.stringify(req.headers, null, 2));
      console.log("Body:", JSON.stringify(req.body, null, 2));
      console.log("Method:", req.method);
      console.log("Time:", new Date().toISOString());
      console.log("===========================");

      // Log the test webhook
      await storage.createActivity({
        type: 'webhook_test',
        description: `Zapier webhook test received: ${JSON.stringify(req.body).substring(0, 100)}...`
      });

      res.json({
        success: true,
        received: req.body,
        timestamp: new Date().toISOString(),
        message: "Webhook test successful",
        headers: req.headers
      });
    } catch (error) {
      console.error("Webhook test failed:", error);
      res.status(500).json({ error: "Webhook test failed" });
    }
  });

  // Get business by email (useful for Zapier deduplication)
  app.get("/api/businesses/by-email/:email", async (req: Request, res: Response) => {
    try {
      const email = decodeURIComponent(req.params.email);
      const businesses = await storage.searchBusinesses(email);
      
      if (businesses.length === 0) {
        return res.status(404).json({ 
          error: "Business not found",
          email: email 
        });
      }

      // Return the first (most recent) match
      res.json(businesses[0]);
    } catch (error) {
      console.error("Failed to find business by email:", error);
      res.status(500).json({ error: "Failed to find business" });
    }
  });

  // Add tags to business (useful for Zapier organization)
  app.post("/api/businesses/:id/tags", async (req: Request, res: Response) => {
    try {
      const businessId = parseInt(req.params.id);
      const { tags } = req.body;
      
      if (!tags || !Array.isArray(tags)) {
        return res.status(400).json({ error: "Tags array is required" });
      }

      // Get current business to merge tags
      const currentBusiness = await storage.getBusinessById(businessId);
      if (!currentBusiness) {
        return res.status(404).json({ error: "Business not found" });
      }

      // Merge new tags with existing ones
      const existingTags = currentBusiness.tags || [];
      const newTags = [...new Set([...existingTags, ...tags])]; // Remove duplicates
      
      const business = await storage.updateBusiness(businessId, { tags: newTags });

      // Log activity
      await storage.createActivity({
        type: 'tags_added',
        description: `Tags added: ${tags.join(', ')}`,
        businessId: businessId
      });

      res.json({ 
        success: true, 
        business,
        tagsAdded: tags 
      });
    } catch (error) {
      console.error("Failed to add tags:", error);
      res.status(500).json({ error: "Failed to add tags" });
    }
  });

  // ===================
  // SQUARESPACE WEBHOOK INTEGRATION
  // ===================

  // Webhook to push client messages to Squarespace
  app.post("/api/push-client-message", async (req: Request, res: Response) => {
    try {
      const { 
        client_email, 
        project_id, 
        content, 
        attachments = [], 
        timestamp,
        sender_name 
      } = req.body;

      if (!client_email || !project_id || !content) {
        return res.status(400).json({ 
          error: "client_email, project_id, and content are required" 
        });
      }

      // Get project and company info
      const project = await storage.getProjectById(parseInt(project_id));
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const company = await storage.getCompanyById(project.companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Format message for Squarespace
      const squarespaceMessage = {
        project_title: project.title,
        company_name: company.name,
        client_email,
        message_content: content,
        attachments: attachments.map((url: string) => {
          // Ensure URLs are absolute and use HTTPS for production
          let fullUrl = url;
          if (!url.startsWith('http')) {
            fullUrl = process.env.NODE_ENV === 'production' 
              ? `https://pleasantcovedesign-production.up.railway.app${url}`
              : process.env.NGROK_URL 
                ? `${process.env.NGROK_URL}${url}`
                : `https://localhost:${process.env.PORT || 3000}${url}`;
          }
          return {
            url: fullUrl,
            name: url.split('/').pop() || 'attachment'
          };
        }),
        timestamp: timestamp || new Date().toISOString(),
        sender: sender_name || 'Pleasant Cove Design',
        message_type: 'admin_update',
        project_stage: project.stage
      };

      // In production, you'd send this to your Squarespace webhook URL
      // For now, we'll log it and return success
      console.log("🚀 Pushing message to Squarespace:", squarespaceMessage);
      
      // You would integrate with Zapier/webhook here:
      // await fetch('YOUR_SQUARESPACE_WEBHOOK_URL', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(squarespaceMessage)
      // });

      // Log the push activity
      await storage.createActivity({
        type: 'message_pushed',
        description: `Message pushed to Squarespace for ${company.name}`,
        companyId: project.companyId,
        projectId: project.id!
      });

      res.json({
        success: true,
        message: "Message pushed to Squarespace successfully",
        squarespace_payload: squarespaceMessage
      });
    } catch (error) {
      console.error("Failed to push message to Squarespace:", error);
      res.status(500).json({ error: "Failed to push message" });
    }
  });

  // Enhanced admin message creation with automatic Squarespace push - now handles files!
  app.post("/api/projects/:id/messages/with-push", requireAdmin, upload.array('files'), async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Handle both FormData and JSON content types
      let content, senderName, senderType, pushToSquarespace;
      
      // Check if it's FormData (multipart/form-data) or JSON
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('multipart/form-data')) {
        // FormData - extract from req.body (parsed by multer)
        content = req.body.content;
        senderName = req.body.senderName;
        senderType = req.body.senderType || 'admin';
        pushToSquarespace = req.body.pushToSquarespace || 'true';
      } else {
        // JSON - use destructuring
        ({ content, senderName, senderType = 'admin', pushToSquarespace = 'true' } = req.body);
      }
      
      const files = req.files as Express.Multer.File[];
      const shouldPush = pushToSquarespace === 'true' || pushToSquarespace === true;
      
      console.log('📤 Admin unified with-push message:', { 
        projectId, 
        content, 
        senderName, 
        filesCount: files?.length || 0, 
        shouldPush,
        contentType: contentType
      });
      
      if ((!content && (!files || files.length === 0)) || !senderName) {
        return res.status(400).json({ error: "Content or files and sender name are required" });
      }

      // Verify project exists
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Get company info
      const company = await storage.getCompanyById(project.companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Process uploaded files - ALWAYS use R2 in production if available
      const attachments: string[] = [];
      if (files && files.length > 0) {
        for (const file of files) {
          if (useR2Storage && (file as any).key) {
            // For R2 storage, use the full R2 URL
            const fileUrl = `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}/${(file as any).key}`;
            attachments.push(fileUrl);
            console.log('📎 Admin with-push file uploaded to R2:', file.originalname, '→', fileUrl);
          } else if (useR2Storage && !(file as any).key) {
            // R2 configured but no key - this means multer fell back to local storage
            // Convert local path to absolute URL for Railway compatibility
            const baseUrl = process.env.NODE_ENV === 'production' 
              ? 'https://pleasantcovedesign-production.up.railway.app'
              : process.env.NGROK_URL || `https://localhost:${process.env.PORT || 3000}`;
            const fileUrl = `${baseUrl}/uploads/${file.filename}`;
            attachments.push(fileUrl);
            console.log('📎 Admin with-push file uploaded locally (R2 fallback):', file.originalname, '→', fileUrl);
          } else {
            // Local storage only - convert to absolute URL
            const baseUrl = process.env.NODE_ENV === 'production' 
              ? 'https://pleasantcovedesign-production.up.railway.app'
              : process.env.NGROK_URL || `https://localhost:${process.env.PORT || 3000}`;
            const fileUrl = `${baseUrl}/uploads/${file.filename}`;
            attachments.push(fileUrl);
            console.log('📎 Admin with-push file uploaded locally:', file.originalname, '→', fileUrl);
          }
        }
      }

      // Create the message
      const message = await storage.createProjectMessage({
        projectId,
        senderType: senderType as 'admin' | 'client',
        senderName,
        content: content || '',
        attachments
      });

      console.log('✅ Admin with-push message created with attachments:', attachments);

      // Log activity
      await storage.createActivity({
        type: 'admin_message',
        description: `Admin message sent: ${content ? content.substring(0, 50) : attachments.length > 0 ? 'files shared' : 'message sent'}${content && content.length > 50 ? '...' : ''}${attachments.length > 0 ? ` (${attachments.length} files)` : ''}`,
        companyId: project.companyId,
        projectId: project.id!
      });

      // Send email notification to client about new admin message
      try {
        if (company && company.email) {
          const transporter = createEmailTransporter();
          
          // Create a link to the client portal
          const clientPortalUrl = process.env.NODE_ENV === 'production' 
            ? `https://www.pleasantcovedesign.com/portal?token=${project.accessToken}`
            : `http://localhost:3000/portal?token=${project.accessToken}`;
          
          await transporter.sendMail({
            from: '"Pleasant Cove Design" <pleasantcovedesign@gmail.com>',
            to: company.email,
            subject: `New Message from ${senderName} - Pleasant Cove Design`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">New Message from Pleasant Cove Design</h2>
                <p>Hello ${company.name},</p>
                <p>You have received a new message from <strong>${senderName}</strong>:</p>
                
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #374151;">${content || ''}</p>
                  ${attachments.length > 0 ? `
                    <div style="margin-top: 15px;">
                      <p style="margin: 0; font-weight: bold; color: #6b7280;">Attachments:</p>
                      ${attachments.map(url => `
                        <p style="margin: 5px 0;">
                          <a href="${url}" style="color: #2563eb; text-decoration: none;">
                            📎 ${url.split('/').pop() || 'View Attachment'}
                          </a>
                        </p>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${clientPortalUrl}" 
                     style="background-color: #2563eb; color: white; padding: 12px 24px; 
                            text-decoration: none; border-radius: 6px; display: inline-block;">
                    View Message & Reply
                  </a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #6b7280; font-size: 14px;">
                  This is an automated notification from Pleasant Cove Design. 
                  <a href="${clientPortalUrl}" style="color: #2563eb;">Click here</a> to view and respond to messages.
                </p>
              </div>
            `
          });
          
          console.log(`📧 Email notification sent to ${company.email} about new admin message`);
        }
      } catch (emailError) {
        console.error('❌ Failed to send email notification:', emailError);
        // Don't fail the message creation if email fails
      }

      // Auto-push to Squarespace if enabled
      if (shouldPush && company.email) {
        try {
          const pushResponse = await fetch(`${req.protocol}://${req.get('host')}/api/push-client-message`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': req.headers.authorization || ''
            },
            body: JSON.stringify({
              client_email: company.email,
              project_id: projectId.toString(),
              content: content || '',
              attachments,
              sender_name: senderName
            })
          });

          const pushResult = await pushResponse.json();
          
          res.status(201).json({
            message,
            success: true,
            filesUploaded: attachments.length,
            squarespace_push: pushResult.success ? 'success' : 'failed',
            squarespace_payload: pushResult.squarespace_payload
          });
        } catch (pushError) {
          console.error("Failed to push to Squarespace:", pushError);
          res.status(201).json({
            message,
            success: true,
            filesUploaded: attachments.length,
            squarespace_push: 'failed',
            squarespace_error: 'Push to Squarespace failed'
          });
        }
      } else {
        res.status(201).json({ 
          message,
          success: true,
          filesUploaded: attachments.length
        });
      }
    } catch (error) {
      console.error("Failed to create admin message with push:", error);
      
      // Handle multer errors specifically
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: "Too many files. Maximum is 5 files." });
        }
        return res.status(400).json({ error: `Upload error: ${error.message}` });
      }
      
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Activities
  app.get("/api/activities", async (req: Request, res: Response) => {
    try {
      const activities = await storage.getActivities();
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  // Statistics (for dashboard)
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  // Businesses/Leads (legacy system)
  app.get("/api/businesses", async (req: Request, res: Response) => {
    try {
      const businesses = await storage.getBusinesses();
      res.json(businesses);
    } catch (error) {
      console.error("Failed to fetch businesses:", error);
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  // Companies (new system)
  app.get("/api/companies", requireAdmin, async (req: Request, res: Response) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Failed to fetch companies:", error);
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  // Get single company by ID
  app.get("/api/companies/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      const company = await storage.getCompanyById(companyId);
      
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      res.json(company);
    } catch (error) {
      console.error("Failed to fetch company:", error);
      res.status(500).json({ error: "Failed to fetch company" });
    }
  });

  // Notifications
  app.get("/api/notifications", requireAdmin, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const unreadOnly = req.query.unread === 'true';
      
      let filteredNotifications = notifications;
      if (unreadOnly) {
        filteredNotifications = notifications.filter(n => !n.read);
      }
      
      res.json(filteredNotifications.slice(0, limit));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Appointments
  app.get("/api/appointments", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { projectToken } = req.query;
      
      // If projectToken is provided, return only appointments for that client (PUBLIC ACCESS)
      if (projectToken) {
        const appointments = await storage.getAppointmentsByProjectToken(projectToken as string);
        
        // Enhance with minimal client info for display
        const enhancedAppointments = appointments.map(appointment => ({
          id: appointment.id,
          datetime: appointment.datetime,
          endTime: appointment.endTime,
          duration: appointment.duration,
          serviceType: appointment.serviceType,
          status: appointment.status,
          notes: appointment.notes,
          firstName: appointment.firstName,
          lastName: appointment.lastName,
          email: appointment.email,
          phone: appointment.phone,
          webhookAction: appointment.webhookAction,
          createdAt: appointment.createdAt,
          updatedAt: appointment.updatedAt
        }));
        
        return res.json(enhancedAppointments);
      }
      
      // Admin access - return all appointments with full client information
      const appointments = await storage.getAppointments();
      const businesses = await storage.getBusinesses();
      const companies = await storage.getCompanies();
      
      // Create maps for quick lookup
      const businessMap = new Map(businesses.map(b => [b.id, b]));
      const companyMap = new Map(companies.map(c => [c.id, c]));
      
      // Enhance appointments with client information
      const enhancedAppointments = appointments.map(appointment => {
        let clientInfo = {
          client_name: 'Unknown Client',
          phone: 'No phone',
          email: '',
          businessType: 'unknown',
          clientStage: 'unknown',
          clientScore: 0,
          clientPriority: 'medium'
        };
        
        // Try to get info from company first (new system)
        if (appointment.companyId) {
          const company = companyMap.get(appointment.companyId);
          if (company) {
            clientInfo = {
              client_name: company.name,
              phone: company.phone || 'No phone',
              email: company.email || '',
              businessType: company.industry || 'unknown',
              clientStage: 'unknown', // Companies don't have stages
              clientScore: 0,
              clientPriority: company.priority || 'medium'
            };
          }
        }
        
        // Fallback to business (legacy system)
        if (appointment.businessId && !appointment.companyId) {
          const business = businessMap.get(appointment.businessId);
          if (business) {
            clientInfo = {
              client_name: business.name,
              phone: business.phone || 'No phone',
              email: business.email || '',
              businessType: business.businessType || 'unknown',
              clientStage: business.stage || 'unknown',
              clientScore: business.score || 0,
              clientPriority: business.priority || 'medium'
            };
          }
        }
        
        return {
          ...appointment,
          ...clientInfo
        };
      });
      
      res.json(enhancedAppointments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  // Create new appointment
  app.post("/api/appointments", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { businessId, client_id, datetime, status, notes, isAutoScheduled, projectToken, serviceType, duration } = req.body;
      
      let clientBusinessId = client_id || businessId || 1;
      let companyId = null;
      let projectId = null;
      
      // If projectToken is provided, find the associated project/company
      if (projectToken) {
        try {
          const projectData = await storage.getProjectByToken(projectToken);
          if (projectData) {
            companyId = projectData.companyId;
            projectId = projectData.id;
            // Don't use businessId for project-based appointments
            clientBusinessId = null;
          }
        } catch (error) {
          console.error("Error finding project by token:", error);
        }
      }
      
      // If no project found but we have businessId, use legacy system
      if (!companyId && !clientBusinessId && businessId) {
        clientBusinessId = businessId;
      }
      
      const appointmentData: any = {
        datetime,
        status: status || 'scheduled',
        notes: notes || '',
        isAutoScheduled: isAutoScheduled || false,
        serviceType: serviceType || 'consultation',
        duration: duration || 30
      };
      
      // Add the appropriate ID
      if (companyId && projectId) {
        appointmentData.companyId = companyId;
        appointmentData.projectId = projectId;
        appointmentData.projectToken = projectToken;
      } else if (clientBusinessId) {
        appointmentData.businessId = clientBusinessId;
      }
      
      const appointment = await storage.createAppointment(appointmentData);
      
      // Get client information for the response
      let clientInfo = null;
      if (companyId) {
        clientInfo = await storage.getCompanyById(companyId);
      } else if (clientBusinessId) {
        clientInfo = await storage.getBusinessById(clientBusinessId);
      }
      
      // Log activity
      if (companyId && projectId) {
        await storage.createActivity({
          type: 'appointment_scheduled',
          description: `Custom appointment created: ${serviceType} - ${notes || 'Appointment'}`,
          companyId: companyId,
          projectId: projectId
        });
      } else if (clientBusinessId) {
        await storage.createActivity({
          type: 'appointment_scheduled',
          description: `Manual appointment created: ${notes || 'Appointment'}`,
          businessId: clientBusinessId
        });
      }
      
      // Add notification
      addNotification({
        type: 'appointment_booked',
        title: projectToken ? 'Client Appointment Booked' : 'Manual Appointment Created',
        message: `New appointment: ${clientInfo?.name || 'Unknown Client'} - ${new Date(datetime).toLocaleDateString()}`,
        businessId: clientBusinessId || companyId
      });
      
      // Update business stage to 'scheduled' if it was pending (legacy system only)
      if (clientBusinessId) {
        const business = await storage.getBusinessById(clientBusinessId);
        if (business && ['scraped', 'contacted', 'responded'].includes(business.stage || '')) {
          await storage.updateBusiness(clientBusinessId, { stage: 'scheduled' });
        }
      }
      
      res.status(201).json({ 
        success: true, 
        appointment,
        client: clientInfo,
        message: "Appointment created successfully" 
      });
    } catch (error) {
      console.error("Failed to create appointment:", error);
      res.status(500).json({ error: "Failed to create appointment" });
    }
  });

  // Update existing appointment
  app.put("/api/appointments/:id", async (req: Request, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const { datetime, status, notes } = req.body;
      
      const appointment = await storage.updateAppointment(appointmentId, {
        datetime,
        status: status || 'scheduled',
        notes: notes || ''
      });
      
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // Log activity
      await storage.createActivity({
        type: 'appointment_updated',
        description: `Appointment updated: ${notes || 'Appointment'}`,
        businessId: appointment.businessId
      });
      
      res.json({ 
        success: true, 
        appointment,
        message: "Appointment updated successfully" 
      });
    } catch (error) {
      console.error("Failed to update appointment:", error);
      res.status(500).json({ error: "Failed to update appointment" });
    }
  });

  // Delete appointment
  app.delete("/api/appointments/:id", async (req: Request, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.id);
      
      const appointment = await storage.getAppointmentById(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // Get the associated business before deleting
      const business = await storage.getBusinessById(appointment.businessId);
      
      await storage.deleteAppointment(appointmentId);
      
      // Check if this business has any other scheduled appointments
      const allAppointments = await storage.getAppointments();
      const hasOtherAppointments = allAppointments.some(apt => 
        apt.businessId === appointment.businessId && 
        apt.id !== appointmentId &&
        apt.status === 'scheduled'
      );
      
      // If no other appointments and business was in 'scheduled' stage, move back to pending
      if (!hasOtherAppointments && business && business.stage === 'scheduled') {
        await storage.updateBusiness(appointment.businessId, { 
          stage: 'responded' // Move back to pending status
        });
        
        console.log(`🔄 Business ${business.name} moved back to pending status after appointment deletion`);
      }
      
      // Log activity
      await storage.createActivity({
        type: 'appointment_cancelled',
        description: `Appointment deleted: ${appointment.notes || 'Appointment'}${!hasOtherAppointments && business?.stage === 'scheduled' ? ' - Client moved back to pending' : ''}`,
        businessId: appointment.businessId
      });
      
      res.json({ 
        success: true, 
        message: "Appointment deleted successfully" 
      });
    } catch (error) {
      console.error("Failed to delete appointment:", error);
      res.status(500).json({ error: "Failed to delete appointment" });
    }
  });

  // ===================
  // CLIENT APPOINTMENT MANAGEMENT (PUBLIC - No Auth Required)
  // ===================
  
  // Client reschedule page (PUBLIC - accessed via email link)
  app.get("/api/appointments/:id/reschedule", async (req: Request, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const { token } = req.query;
      
      // Verify appointment exists and token matches
      const appointment = await storage.getAppointmentById(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // For client access, check if they have a project token or direct appointment access
      if (token) {
        const project = await storage.getProjectByToken(token as string);
        if (!project || project.companyId !== appointment.companyId) {
          return res.status(403).json({ error: "Unauthorized access to appointment" });
        }
      }
      
      // Return reschedule form data
      res.json({
        success: true,
        appointment: {
          id: appointment.id,
          datetime: appointment.datetime,
          serviceType: appointment.serviceType,
          duration: appointment.duration,
          status: appointment.status
        },
        availableSlots: [
          // Could integrate with your calendar API here
          // For now, return some example slots
          { date: '2025-06-10', time: '8:30 AM', available: true },
          { date: '2025-06-10', time: '9:00 AM', available: true },
          { date: '2025-06-11', time: '8:30 AM', available: true },
          { date: '2025-06-11', time: '9:00 AM', available: false },
          { date: '2025-06-12', time: '8:30 AM', available: true },
          { date: '2025-06-12', time: '9:00 AM', available: true }
        ]
      });
    } catch (error) {
      console.error("Failed to fetch reschedule options:", error);
      res.status(500).json({ error: "Failed to load reschedule options" });
    }
  });
  
  // Client reschedule appointment (PUBLIC - accessed via email link)
  app.post("/api/appointments/:id/reschedule", async (req: Request, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const { token, newDateTime } = req.body;
      
      // Verify appointment exists
      const appointment = await storage.getAppointmentById(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // Verify client access
      if (token) {
        const project = await storage.getProjectByToken(token);
        if (!project || project.companyId !== appointment.companyId) {
          return res.status(403).json({ error: "Unauthorized access to appointment" });
        }
      }
      
      // Update appointment
      const updatedAppointment = await storage.updateAppointment(appointmentId, {
        datetime: newDateTime,
        status: 'scheduled' // Keep as scheduled after reschedule
      });
      
      // Log activity
      await storage.createActivity({
        type: 'appointment_rescheduled',
        description: `Client rescheduled appointment to ${new Date(newDateTime).toLocaleDateString()} at ${new Date(newDateTime).toLocaleTimeString()}`,
        companyId: appointment.companyId,
        projectId: appointment.projectId
      });
      
      res.json({
        success: true,
        message: "Appointment rescheduled successfully",
        appointment: updatedAppointment
      });
      
    } catch (error) {
      console.error("Failed to reschedule appointment:", error);
      res.status(500).json({ error: "Failed to reschedule appointment" });
    }
  });
  
  // Client cancel appointment (PUBLIC - accessed via email link)
  app.post("/api/appointments/:id/cancel", async (req: Request, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const { token, reason } = req.body;
      
      // Verify appointment exists
      const appointment = await storage.getAppointmentById(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // Verify client access
      if (token) {
        const project = await storage.getProjectByToken(token);
        if (!project || project.companyId !== appointment.companyId) {
          return res.status(403).json({ error: "Unauthorized access to appointment" });
        }
      }
      
      // Update appointment status to cancelled
      const cancelledAppointment = await storage.updateAppointment(appointmentId, {
        status: 'cancelled',
        notes: appointment.notes + `\n\nCancelled by client. Reason: ${reason || 'No reason provided'}`
      });
      
      // Log activity
      await storage.createActivity({
        type: 'appointment_cancelled',
        description: `Client cancelled appointment. Reason: ${reason || 'No reason provided'}`,
        companyId: appointment.companyId,
        projectId: appointment.projectId
      });
      
      // Add notification for admin
      addNotification({
        type: 'appointment_booked', // Could add a cancellation type
        title: 'Appointment Cancelled by Client',
        message: `Appointment cancelled for ${new Date(appointment.datetime).toLocaleDateString()}. Reason: ${reason || 'No reason provided'}`,
        businessId: appointment.companyId
      });
      
      res.json({
        success: true,
        message: "Appointment cancelled successfully",
        appointment: cancelledAppointment
      });
      
    } catch (error) {
      console.error("Failed to cancel appointment:", error);
      res.status(500).json({ error: "Failed to cancel appointment" });
    }
  });
  
  // Client dashboard by project token (PUBLIC - accessed via email link)
  app.get("/api/client-dashboard/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      // Find project by token
      const project = await storage.getProjectByToken(token);
      if (!project) {
        return res.status(404).json({ error: "Invalid access token" });
      }
      
      // Get company information
      const company = await storage.getCompanyById(project.companyId);
      
      // Get appointments for this project/company
      const appointments = await storage.getAppointmentsByProjectToken(token);
      
      // Get project messages
      const messages = await storage.getProjectMessages(project.id!);
      
      res.json({
        success: true,
        client: {
          name: company?.name,
          email: company?.email,
          phone: company?.phone
        },
        project: {
          id: project.id,
          title: project.title,
          status: project.status,
          stage: project.stage,
          token: project.accessToken
        },
        appointments: appointments.map(apt => ({
          id: apt.id,
          datetime: apt.datetime,
          duration: apt.duration,
          serviceType: apt.serviceType,
          status: apt.status,
          notes: apt.notes,
          meetingType: apt.meetingType,
          meetingLink: apt.meetingLink,
          meetingId: apt.meetingId,
          meetingPassword: apt.meetingPassword,
          meetingInstructions: apt.meetingInstructions
        })),
        messages: messages || [],
        totalAppointments: appointments.length,
        upcomingAppointments: appointments.filter(apt => 
          apt.status === 'scheduled' && new Date(apt.datetime) > new Date()
        ).length
      });
      
    } catch (error) {
      console.error("Failed to load client dashboard:", error);
      res.status(500).json({ error: "Failed to load client dashboard" });
    }
  });
  
  // Client cancel appointment page (PUBLIC - accessed via email link)
  app.get("/cancel-appointment/:id", async (req: Request, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const { token } = req.query;
      
      // Verify appointment exists
      const appointment = await storage.getAppointmentById(appointmentId);
      if (!appointment) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Appointment Not Found</title>
            <style>body { font-family: system-ui; text-align: center; padding: 2rem; }</style>
          </head>
          <body>
            <h1>❌ Appointment Not Found</h1>
            <p>The appointment you're looking for doesn't exist or has already been cancelled.</p>
          </body>
          </html>
        `);
      }
      
      // Check if already cancelled
      if (appointment.status === 'cancelled') {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Already Cancelled</title>
            <style>body { font-family: system-ui; text-align: center; padding: 2rem; }</style>
          </head>
          <body>
            <h1>ℹ️ Already Cancelled</h1>
            <p>This appointment has already been cancelled.</p>
          </body>
          </html>
        `);
      }
      
      // Show cancellation form
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cancel Appointment - Pleasant Cove Design</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 2rem auto; padding: 2rem; background: #f5f5f5; }
            .container { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 2rem; }
            .appointment-info { background: #f8f9fa; padding: 1rem; border-radius: 6px; margin: 1rem 0; }
            .form-group { margin: 1rem 0; }
            label { display: block; margin-bottom: 0.5rem; font-weight: 600; }
            textarea { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; }
            .buttons { display: flex; gap: 1rem; margin-top: 2rem; }
            .btn { padding: 0.75rem 1.5rem; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; text-decoration: none; display: inline-block; text-align: center; }
            .btn-danger { background: #dc3545; color: white; }
            .btn-secondary { background: #6c757d; color: white; }
            .btn:hover { opacity: 0.9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Cancel Appointment</h1>
              <p>Pleasant Cove Design</p>
            </div>
            
            <div class="appointment-info">
              <h3>📋 Appointment Details</h3>
              <p><strong>Date:</strong> ${new Date(appointment.datetime).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${new Date(appointment.datetime).toLocaleTimeString()}</p>
              <p><strong>Service:</strong> ${appointment.serviceType || 'Consultation'}</p>
            </div>
            
            <p>We're sorry to see you need to cancel your appointment. If you'd like to reschedule instead, please contact us at <strong>(207) 380-5680</strong>.</p>
            
            <form id="cancelForm">
              <div class="form-group">
                <label for="reason">Reason for cancellation (optional):</label>
                <textarea id="reason" name="reason" rows="4" placeholder="Let us know why you need to cancel so we can improve our service..."></textarea>
              </div>
              
              <div class="buttons">
                <button type="submit" class="btn btn-danger">Confirm Cancellation</button>
                <a href="mailto:pleasantcovedesign@gmail.com" class="btn btn-secondary">Contact Us Instead</a>
              </div>
            </form>
          </div>
          
          <script>
            document.getElementById('cancelForm').onsubmit = async (e) => {
              e.preventDefault();
              
              const reason = document.getElementById('reason').value;
              const submitBtn = e.target.querySelector('.btn-danger');
              submitBtn.textContent = 'Cancelling...';
              submitBtn.disabled = true;
              
              try {
                const response = await fetch(\`/api/appointments/${appointmentId}/cancel\`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    token: \`${token}\`, 
                    reason: reason 
                  })
                });
                
                if (response.ok) {
                  document.querySelector('.container').innerHTML = \`
                    <div class="header">
                      <h1>✅ Appointment Cancelled</h1>
                      <p>Your appointment has been successfully cancelled.</p>
                      <p>We hope to work with you in the future!</p>
                      <div style="margin-top: 2rem;">
                        <p><strong>Contact us:</strong></p>
                        <p>📧 pleasantcovedesign@gmail.com</p>
                        <p>📱 (207) 380-5680</p>
                      </div>
                    </div>
                  \`;
                } else {
                  throw new Error('Failed to cancel appointment');
                }
              } catch (error) {
                submitBtn.textContent = 'Confirm Cancellation';
                submitBtn.disabled = false;
                alert('Sorry, there was an error cancelling your appointment. Please call us at (207) 380-5680.');
              }
            };
          </script>
        </body>
        </html>
      `);
      
    } catch (error) {
      console.error("Failed to load cancel page:", error);
      res.status(500).send('Error loading cancellation page');
    }
  });

  // Client search endpoint for appointment scheduling
  app.get("/api/clients/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.length < 2) {
        return res.json([]);
      }
      
      const businesses = await storage.searchBusinesses(query);
      
      // Format businesses as client options for autocomplete
      const clients = businesses.map(business => ({
        id: business.id,
        name: business.name,
        email: business.email || '',
        phone: business.phone || '',
        businessType: business.businessType || '',
        stage: business.stage || '',
        score: business.score || 0,
        priority: business.priority || 'medium'
      }));
      
      res.json(clients);
    } catch (error) {
      console.error("Failed to search clients:", error);
      res.status(500).json({ error: "Failed to search clients" });
    }
  });

  // Get pending appointments (leads without scheduled appointments)
  app.get("/api/appointments/pending", async (req: Request, res: Response) => {
    try {
      const businesses = await storage.getBusinesses();
      const appointments = await storage.getAppointments();
      
      // Get businesses that don't have any scheduled appointments
      const businessesWithAppointments = new Set(
        appointments
          .filter(apt => apt.status === 'scheduled')
          .map(apt => apt.businessId)
      );
      
      const pendingBusinesses = businesses.filter(business => 
        !businessesWithAppointments.has(business.id) && 
        ['scraped', 'contacted', 'responded'].includes(business.stage || '')
      );
      
      // Format as pending appointments
      const pendingAppointments = pendingBusinesses.map(business => ({
        id: `business-${business.id}`,
        client_id: business.id,
        client_name: business.name,
        phone: business.phone || 'No phone',
        email: business.email || '',
        notes: business.notes || 'New lead needs scheduling',
        businessType: business.businessType || 'unknown',
        stage: business.stage,
        score: business.score || 0,
        priority: business.priority || 'medium',
        status: 'pending'
      }));
      
      // Sort by priority and score
      pendingAppointments.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        return b.score - a.score;
      });
      
      res.json(pendingAppointments);
    } catch (error) {
      console.error("Failed to fetch pending appointments:", error);
      res.status(500).json({ error: "Failed to fetch pending appointments" });
    }
  });

  // Mark messages as read
  app.post("/api/public/project/:token/messages/read", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { messageIds } = req.body;
      
      if (!messageIds || !Array.isArray(messageIds)) {
        return res.status(400).json({ error: "messageIds array required" });
      }
      
      console.log(`📖 [MARK_READ] Marking messages as read:`, { token, messageIds });
      
      // Get project by token
      const project = await storage.getProjectByAccessToken(token);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const readAt = new Date().toISOString();
      
      // Update messages as read
      for (const messageId of messageIds) {
        await storage.markMessageAsRead(messageId, readAt);
      }
      
      console.log(`📡 [WEBSOCKET] Broadcasting read status for ${messageIds.length} messages in project ${token}`);
      
      // Broadcast read status to admin
      io.to('admin-room').emit('messagesRead', {
        projectToken: token,
        messageIds,
        readAt
      });
      
      res.json({ success: true, readAt });
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });

  // Admin endpoint to mark individual message as read
  app.post("/api/messages/:id/read", requireAdmin, async (req: Request, res: Response) => {
    try {
      const messageId = parseInt(req.params.id);
      const readAt = new Date().toISOString();
      
      console.log(`📖 [ADMIN_READ] Admin marking message ${messageId} as read`);
      
      await storage.markMessageAsRead(messageId, readAt);
      
      // Broadcast read status to admin room
      io.to('admin-room').emit('messageRead', {
        messageId,
        readAt
      });
      
      res.json({ success: true, readAt });
    } catch (error) {
      console.error("Failed to mark message as read:", error);
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });

  // ===================
  // ADMIN BYPASS ROUTES (No Authentication Required for Local Development)
  // ===================

  // Admin bypass: Get project data by client ID instead of token
  app.get("/api/admin/client/:clientId", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      
      // Find first project for this client (in a real app, you might want to list all projects)
      const projects = await storage.getProjectsByCompany(clientId);
      if (!projects || projects.length === 0) {
        return res.status(404).json({ error: "No projects found for this client" });
      }
      
      const project = projects[0]; // Use first project for simplicity
      const company = await storage.getCompanyById(clientId);
      
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Get messages, files, and activities
      const messages = await storage.getProjectMessages(project.id!);
      const files = await storage.getProjectFiles(project.id!);
      const activities = await storage.getActivitiesByProject(project.id!);

      const responseData = {
        project,
        company,
        messages: messages || [],
        files: files || [],
        activities: activities || []
      };

      res.json(responseData);
    } catch (error) {
      console.error("Failed to fetch admin client data:", error);
      res.status(500).json({ error: "Failed to load client data" });
    }
  });

  // Admin bypass: Send message as admin without token
  app.post("/api/admin/client/:clientId/message", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const { content, senderName } = req.body;
      
      if (!content || !senderName) {
        return res.status(400).json({ error: "Content and sender name are required" });
      }

      // Find first project for this client
      const projects = await storage.getProjectsByCompany(clientId);
      if (!projects || projects.length === 0) {
        return res.status(404).json({ error: "No projects found for this client" });
      }
      
      const project = projects[0];

      const message = await storage.createProjectMessage({
        projectId: project.id!,
        senderType: 'admin',
        senderName,
        content,
        attachments: []
      });

      // Log activity
      await storage.createActivity({
        type: 'admin_message',
        description: `Admin message sent: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        companyId: project.companyId,
        projectId: project.id!
      });

      res.status(201).json(message);
    } catch (error) {
      console.error("Failed to send admin message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // ===================
  // PUBLIC CLIENT PORTAL ROUTES (Token-based)
  // ===================

  // Redirect backend dashboard to React UI (Biz Pro Inbox)
  app.get("/", (req: Request, res: Response) => {
    console.log('🔄 Backend root accessed - redirecting to React UI (Biz Pro Inbox)');
    res.redirect('http://localhost:5173');
  });

  // Helper function to create properly timezone-aware appointment datetime
  function createAppointmentDateTime(appointmentDate: string, appointmentTime: string): string {
    // Pleasant Cove Design is in Maine (Eastern Time)
    // Convert the appointment time from Eastern Time to UTC for storage
    const time24 = convertTo24Hour(appointmentTime);
    
    // Determine if it's EDT (UTC-4) or EST (UTC-5) based on the date
    const appointmentDateObj = new Date(appointmentDate);
    const isEDT = isDaylightSavingTime(appointmentDateObj);
    const utcOffset = isEDT ? 4 : 5; // EDT is UTC-4, EST is UTC-5
    
    // Create the datetime and convert to UTC
    const [year, month, day] = appointmentDate.split('-');
    const [hours, minutes] = time24.split(':');
    
    // Create in UTC by adding the Eastern Time offset
    const utcDateTime = new Date(Date.UTC(
      parseInt(year),
      parseInt(month) - 1, // Month is 0-indexed
      parseInt(day),
      parseInt(hours) + utcOffset, // Add offset to convert Eastern to UTC
      parseInt(minutes)
    ));
    
    return utcDateTime.toISOString();
  }

  // Helper function to determine if a date is in Daylight Saving Time (EDT)
  function isDaylightSavingTime(date: Date): boolean {
    // DST in US: Second Sunday in March to First Sunday in November
    const year = date.getFullYear();
    
    // Second Sunday in March
    const march = new Date(year, 2, 1); // March 1st
    const dstStart = new Date(year, 2, (14 - march.getDay()) % 7 + 7);
    
    // First Sunday in November  
    const november = new Date(year, 10, 1); // November 1st
    const dstEnd = new Date(year, 10, (7 - november.getDay()) % 7);
    
    return date >= dstStart && date < dstEnd;
  }

  // Helper function to convert 12-hour time to 24-hour format  
  function convertTo24Hour(time12h: string): string {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    
    // Handle 12 AM (midnight) and 12 PM (noon) cases
    if (hours === '12') {
      hours = modifier === 'AM' ? '00' : '12';
    } else if (modifier === 'PM') {
      hours = (parseInt(hours, 10) + 12).toString();
    }
    
    return `${hours.padStart(2, '0')}:${minutes}:00`;
  }

  // Book appointment with comprehensive intake form
  app.post("/api/book-appointment", async (req: Request, res: Response) => {
    try {
      console.log('📅 [BOOK_APPOINTMENT] === STARTING APPOINTMENT BOOKING ===');
      console.log('📅 [BOOK_APPOINTMENT] Raw request body:', JSON.stringify(req.body, null, 2));
      
      const {
        firstName,
        lastName,
        email,
        phone,
        businessName,
        services,
        projectDescription,
        budget,
        timeline,
        appointmentDate,
        appointmentTime,
        meetingType,
        additionalNotes,
        source,
        timestamp
      } = req.body;

      console.log('📅 [BOOK_APPOINTMENT] === COMPREHENSIVE APPOINTMENT BOOKING ===');
      console.log('📅 [BOOK_APPOINTMENT] Data received:', {
        name: `${firstName} ${lastName}`,
        email,
        services,
        budget,
        appointmentDate,
        appointmentTime
      });

      // **CHECK AVAILABILITY FIRST - Prevent double booking**
      console.log('🔍 Checking appointment availability...');
      const requestedDateTime = createAppointmentDateTime(appointmentDate, appointmentTime);
      
      // Check for existing appointments at the same date/time
      const existingAppointments = await storage.getAppointmentsByDateTime(appointmentDate, appointmentTime);
      const conflictingAppointment = existingAppointments.find(apt => {
        if (apt.status === 'cancelled') return false; // Ignore cancelled appointments
        
        const existingDateTime = new Date(apt.datetime);
        const requestedDateTimeObj = new Date(requestedDateTime);
        
        // Check if appointments are at the same time (within 30 minute window)
        const timeDiff = Math.abs(existingDateTime.getTime() - requestedDateTimeObj.getTime());
        const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
        
        return timeDiff < thirtyMinutes;
      });
      
      if (conflictingAppointment) {
        console.log('❌ Time slot conflict detected');
        console.log('Conflicting appointment:', {
          id: conflictingAppointment.id,
          datetime: conflictingAppointment.datetime,
          status: conflictingAppointment.status
        });
        
        return res.status(409).json({
          success: false,
          message: `Sorry, the ${appointmentTime} time slot on ${new Date(appointmentDate).toLocaleDateString()} is already booked. Please choose a different time.`,
          error: 'TIME_SLOT_UNAVAILABLE',
          availableAlternatives: [
            '8:30 AM',
            '9:00 AM'
          ].filter(time => time !== appointmentTime) // Suggest the other time slot
        });
      }
      
      console.log('✅ Time slot is available, proceeding with booking...');

      // First, create or update the client/company record
      let projectToken: string;
      let companyId: number;
      let projectId: number;

      // Check if client already exists by searching companies
      const companies = await storage.getCompanies();
      const existingCompany = companies.find(c => c.email === email);
      
      if (existingCompany) {
        console.log(`✅ Found existing client: ${existingCompany.name} (ID: ${existingCompany.id})`);
        companyId = existingCompany.id!;
        
        // Get existing project for this company
        const projects = await storage.getProjects();
        const existingProject = projects.find(p => p.companyId === companyId);
        
        if (existingProject) {
          projectToken = existingProject.accessToken!;
          projectId = existingProject.id!;
        } else {
          // Create new project for existing company
          projectToken = generateProjectToken();
          const projectData = {
            companyId,
            title: `${firstName} ${lastName} - ${typeof services === 'string' ? services : services.join(', ')} Project`,
            description: projectDescription,
            type: 'website',
            status: 'discovery',
            stage: 'planning',
            priority: 'medium',
            accessToken: projectToken
          };
          
          const newProject = await storage.createProject(projectData);
          projectId = newProject.id!;
          console.log(`✅ Created project: ${projectData.title} (ID: ${projectId})`);
        }
      } else {
        console.log('🔄 Creating new client record...');
        
        // Generate new project token
        projectToken = generateProjectToken();
        
        // Create company record
        const companyData = {
          name: businessName || `${firstName} ${lastName}`,
          email: email,
          phone: phone || '',
          address: '',
          city: '',
          state: '',
          industry: 'General',
          status: 'active',
          source: source || 'appointment_booking_widget'
        };
        
        const newCompany = await storage.createCompany(companyData);
        companyId = newCompany.id!;
        console.log(`✅ Created company: ${companyData.name} (ID: ${companyId})`);
        
        // Create project record
        const projectData = {
          companyId,
          title: `${firstName} ${lastName} - ${typeof services === 'string' ? services : services.join(', ')} Project`,
          description: projectDescription,
          type: 'website',
          status: 'discovery',
          stage: 'planning',
          priority: 'medium',
          accessToken: projectToken
        };
        
        const newProject = await storage.createProject(projectData);
        projectId = newProject.id!;
        console.log(`✅ Created project: ${projectData.title} (ID: ${projectId})`);
      }

      // Create the appointment record with proper timezone handling
      const appointmentData = {
        companyId,        // ✅ Use new CRM structure
        projectId,        // ✅ Link to project
        projectToken,     // ✅ For client access
        datetime: createAppointmentDateTime(appointmentDate, appointmentTime),
        status: 'scheduled',
        notes: `
Initial Consultation Appointment

Services Requested: ${typeof services === 'string' ? services : services.join(', ')}
Budget: ${budget}
Timeline: ${timeline || 'Not specified'}
Meeting Type: ${meetingType === 'zoom' ? 'Zoom Video Call' : meetingType === 'phone' ? 'Phone Call' : meetingType === 'facetime' ? 'FaceTime' : 'Zoom Video Call'}

Project Description:
${projectDescription}

${additionalNotes ? `Additional Notes:\n${additionalNotes}` : ''}

Contact Information:
- Name: ${firstName} ${lastName}
- Email: ${email}
- Phone: ${phone}
${businessName ? `- Business: ${businessName}` : ''}

Booked via: ${source}
        `.trim(),
        serviceType: typeof services === 'string' ? services : services.join(', '),
        duration: 30,
        isAutoScheduled: true,
        meetingType: meetingType || 'zoom',
        firstName,
        lastName,
        email,
        phone
      };

      console.log('📅 [BOOK_APPOINTMENT] Creating appointment with data:', JSON.stringify(appointmentData, null, 2));
      const appointment = await storage.createAppointment(appointmentData);
      console.log(`📅 [BOOK_APPOINTMENT] ✅ Created appointment: ID ${appointment.id}`);

      // Create Zoom meeting if needed
      let meetingDetails = null;
      if (meetingType === 'zoom') {
        const zoomMeeting = await zoomIntegration.createMeeting({
          topic: `Pleasant Cove Design Consultation - ${firstName} ${lastName}`,
          startTime: new Date(appointmentData.datetime),
          duration: 30,
          agenda: `Consultation meeting to discuss: ${typeof services === 'string' ? services : services.join(', ')}\n\nProject: ${projectDescription}`,
          settings: {
            hostVideo: true,
            participantVideo: true,
            joinBeforeHost: true,
            muteUponEntry: false,
            waitingRoom: false
          }
        });
        
        if (zoomMeeting) {
          meetingDetails = zoomIntegration.formatMeetingDetails(zoomMeeting);
          
          // Update appointment with Zoom details
          await storage.updateAppointment(appointment.id!, {
            meetingLink: zoomMeeting.joinUrl,
            meetingId: zoomMeeting.id,
            meetingPassword: zoomMeeting.password,
            meetingInstructions: meetingDetails
          });
        }
      }

      // Create activity log
      await storage.createActivity({
        companyId,
        projectId,
        type: 'appointment_scheduled',
        description: `Consultation appointment scheduled for ${new Date(appointmentData.datetime).toLocaleDateString()} at ${appointmentTime} - Services: ${typeof services === 'string' ? services : services.join(', ')}, Budget: ${budget}`
      });

      console.log('✅ Comprehensive appointment booking completed successfully');

      // Send confirmation email (disabled for development)
      try {
        console.log('📧 Confirmation email disabled for development');
        /*
        await sendAppointmentConfirmationEmail({
          to: email,
          clientName: `${firstName} ${lastName}`,
          appointmentDate,
          appointmentTime,
          services: typeof services === 'string' ? services : services.join(', '),
          projectToken,
          businessName: businessName || '',
          appointmentId: appointment.id // Include appointment ID for action links
        });
        console.log('📧 Confirmation email sent successfully');
        */
      } catch (emailError) {
        console.error('⚠️ Failed to send confirmation email:', emailError);
        // Don't fail the whole request if email fails
      }

      res.json({
        success: true,
        message: 'Appointment booked successfully',
        appointmentId: appointment.id,
        projectToken,
        appointmentDetails: {
          date: appointmentDate,
          time: appointmentTime,
          duration: 30,
          services,
          clientName: `${firstName} ${lastName}`,
          email
        }
      });

    } catch (error: any) {
      console.error('📅 [BOOK_APPOINTMENT] ❌ ERROR booking comprehensive appointment:', error);
      console.error('📅 [BOOK_APPOINTMENT] Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Server error occurred',
        error: error.message
      });
    }
  });

  // REMOVED: Test endpoints - moved availability to working location near health endpoint

  app.get("/api/debug/r2", (req: Request, res: Response) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      r2Config: {
        useR2Storage,
        hasEndpoint: !!process.env.R2_ENDPOINT,
        hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,  
        hasBucket: !!process.env.R2_BUCKET,
        hasRegion: !!process.env.R2_REGION,
        endpoint: process.env.R2_ENDPOINT ? 'SET' : 'MISSING',
        bucket: process.env.R2_BUCKET ? 'SET' : 'MISSING',
        region: process.env.R2_REGION || 'auto'
      }
    });
  });

  // ===================
  // ADMIN API ENDPOINTS (Require Authentication)
  // ===================

  // Get stats for admin dashboard
  app.get("/api/stats", requireAdmin, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  // Get all businesses (legacy compatibility)
  app.get("/api/businesses", requireAdmin, async (req: Request, res: Response) => {
    try {
      const businesses = await storage.getBusinesses();
      res.json(businesses);
    } catch (error) {
      console.error("Failed to fetch businesses:", error);
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  // Get all companies (new structure)
  app.get("/api/companies", requireAdmin, async (req: Request, res: Response) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Failed to fetch companies:", error);
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  // Update company (for approval toggles and other updates)
  app.patch("/api/companies/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      const updates = req.body;
      
      console.log(`🔄 [COMPANY_UPDATE] Updating company ${companyId}:`, updates);
      
      const updatedCompany = await storage.updateCompany(companyId, updates);
      
      if (!updatedCompany) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      console.log(`✅ [COMPANY_UPDATE] Company ${companyId} updated successfully`);
      res.json(updatedCompany);
    } catch (error) {
      console.error("Failed to update company:", error);
      res.status(500).json({ error: "Failed to update company" });
    }
  });

  // Get activities for admin dashboard
  app.get("/api/activities", requireAdmin, async (req: Request, res: Response) => {
    try {
      const activities = await storage.getActivities();
      res.json(activities);
    } catch (error) {
      console.error("Failed to fetch activities:", error);
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  // UNIFIED MESSAGING API - Real-time bi-directional messaging
  // ========================================================

  interface UnifiedMessage {
    projectToken: string;
    senderName: string;    // ← Fixed: was "sender"
    content: string;       // ← Fixed: was "body"
    createdAt: string;     // ← Fixed: was "timestamp"
    senderType: 'client' | 'admin';  // ← Added: required by React UI
    id?: number;
    attachments?: string[];
  }

  // Get messages by project token (unified endpoint)
  app.get("/api/messages", async (req: Request, res: Response) => {
    try {
      const { projectToken } = req.query;
      
      if (!projectToken || typeof projectToken !== 'string') {
        return res.status(400).json({ error: "Project token is required" });
      }
      
      console.log(`📥 Fetching messages for project token: ${projectToken}`);
      
      // Find project by token
      const project = await storage.getProjectByToken(projectToken);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Get messages for this project
      const messages = await storage.getProjectMessages(project.id!);
      
      // Transform to unified format
      const unifiedMessages: UnifiedMessage[] = messages.map(msg => ({
        id: msg.id,
        projectToken: projectToken,
        senderName: msg.senderName,      // ← Fixed: was "sender"
        content: msg.content,            // ← Fixed: was "body"
        createdAt: msg.createdAt || new Date().toISOString(),  // ← Fixed: was "timestamp"
        senderType: msg.senderType,      // ← Added: required by React UI
        attachments: msg.attachments || []
      }));
      
      console.log(`📋 Retrieved ${unifiedMessages.length} messages for project: ${project.title}`);
      res.json(unifiedMessages);
      
    } catch (error) {
      console.error("Failed to fetch unified messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send message (unified endpoint) 
  app.post("/api/messages", upload.array('files'), async (req: Request, res: Response) => {
    try {
      const { projectToken, sender, body } = req.body;
      
      // Allow empty body if files are attached
      const hasFiles = req.files && Array.isArray(req.files) && req.files.length > 0;
      
      if (!projectToken || !sender || (!body && !hasFiles)) {
        return res.status(400).json({ 
          error: "projectToken, sender, and either body or files are required" 
        });
      }
      
      console.log(`📤 Unified message send request:`, {
        projectToken,
        sender,
        body: body.substring(0, 100) + (body.length > 100 ? '...' : ''),
        filesCount: req.files?.length || 0
      });
      
      // Find project by token
      const project = await storage.getProjectByToken(projectToken);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
             // Handle file uploads  
       let attachmentUrls: string[] = [];
       if (req.files && Array.isArray(req.files)) {
         console.log(`📎 Processing ${req.files.length} file attachments`);
         
         // Dynamically determine the base URL - use HTTPS ngrok for HTTPS compatibility
         const baseUrl = process.env.NODE_ENV === 'production' 
           ? 'https://pcd-production-clean-production-e6f3.up.railway.app' 
           : process.env.NGROK_URL || `http://localhost:${process.env.PORT || 3000}`;

         for (const file of req.files as Express.Multer.File[]) {
           try {
             const localPath = `${baseUrl}/uploads/${file.filename}`;
             console.log(`📎 File processed via disk storage: ${localPath}`);
             attachmentUrls.push(localPath);
           } catch (uploadError) {
             console.error(`Failed to process file ${file.originalname}:`, uploadError);
           }
         }
       }
      
      // Determine sender type (admin vs client)
      const senderType = sender.toLowerCase().includes('ben') || 
                         sender.toLowerCase().includes('admin') || 
                         sender.toLowerCase().includes('pleasant cove') ? 'admin' : 'client';
      
             // Save message to database
       const savedMessage = await storage.createProjectMessage({
         projectId: project.id!,
         senderType,
         senderName: sender,
         content: body,
         attachments: attachmentUrls,
         createdAt: new Date().toISOString()
       });

       // DEBUG: Log the saved message to see what was actually stored
       console.log(`🔍 [DEBUG] Saved message from storage:`, {
         id: savedMessage.id,
         senderName: savedMessage.senderName,
         content: savedMessage.content?.substring(0, 50),
         senderType: savedMessage.senderType,
         attachments: savedMessage.attachments?.length || 0
       });
      
      // Create unified response
      const unifiedMessage: UnifiedMessage = {
        id: savedMessage.id,
        projectToken,
        senderName: savedMessage.senderName,    // ← Use savedMessage.senderName instead of sender
        content: savedMessage.content,          // ← Use savedMessage.content instead of body
        createdAt: savedMessage.createdAt || new Date().toISOString(),
        senderType: savedMessage.senderType,    // ← Use savedMessage.senderType
        attachments: savedMessage.attachments || []
      };

      // DEBUG: Log the unified message being broadcast
      console.log(`🔍 [DEBUG] Unified message being broadcast:`, {
        id: unifiedMessage.id,
        senderName: unifiedMessage.senderName,
        content: unifiedMessage.content?.substring(0, 50),
        senderType: unifiedMessage.senderType,
        attachments: unifiedMessage.attachments?.length || 0
      });
      
      console.log(`✅ Unified message created:`, {
        id: savedMessage.id,
        sender: savedMessage.senderName,  // ← Use savedMessage.senderName
        attachments: attachmentUrls.length
      });
      
      // Broadcast to all connected clients for this project
      if (io) {
        console.log(`📡 Broadcasting message to project: ${projectToken}`);
        io.to(projectToken).emit('newMessage', unifiedMessage);
        
        // ALSO broadcast to admin room so admin UI receives all messages
        console.log(`📡 Broadcasting message to admin-room for admin UI`);
        io.to('admin-room').emit('newMessage', unifiedMessage);
      }
      
      // If this is an admin message, also push to Squarespace  
      if (senderType === 'admin') {
        try {
          const squarespacePayload = {
            project_title: project.title,
            company_name: project.company?.name || 'Unknown Client',
            client_email: project.company?.email || '',
            message_content: body,
            attachments: attachmentUrls.map(url => ({
              url,
              name: url.split('/').pop() || 'attachment'
            })),
            timestamp: new Date().toISOString(),
            sender: sender,
            message_type: 'admin_update',
            project_stage: project.stage || 'active'
          };
          
          console.log('🚀 Pushing admin message to Squarespace:', {
            project: project.title,
            sender,
            content: body.substring(0, 50) + '...'
          });
          
          // Here you would implement the actual Squarespace push
          // For now, just log it
          
        } catch (pushError) {
          console.error('Failed to push to Squarespace:', pushError);
          // Don't fail the message creation if push fails
        }
      }
      
      res.json(unifiedMessage);
      
    } catch (error) {
      console.error("Failed to send unified message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // 🔒 USER AUTHENTICATION ENDPOINTS - Dynamic Token Resolution
  
  // Get existing token for user or create new conversation
  app.post('/api/get-user-token', async (req: Request, res: Response) => {
    try {
      const { email, name } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }
      
      console.log(`🔍 Getting token for user: ${email}`);
      
      // Look for existing user
      const existingClient = await storage.findClientByEmail(email);
      
      if (existingClient) {
        // For existing clients, ALWAYS create new secure conversations for privacy
        console.log(`✅ Found existing client: ${existingClient.name || existingClient.email} (ID: ${existingClient.id})`);
        
        const secureToken = generateSecureProjectToken('widget_auth', email);
        const newProject = await storage.createProject({
          companyId: existingClient.id,
          title: `${existingClient.name || name || email.split('@')[0]} - Conversation ${secureToken.submissionId}`,
          type: 'website',
          stage: 'discovery',
          status: 'active',
          totalAmount: 5000,
          paidAmount: 0,
          accessToken: secureToken.token
        });
        
        console.log(`🆕 Created new secure conversation for ${email}: ${secureToken.token}`);
        return res.json({ token: secureToken.token });
      }
      
      // Create new client and project
      const newCompany = await storage.createCompany({
        name: name || email.split('@')[0],
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
      
      const secureToken = generateSecureProjectToken('widget_auth', email);
      const newProject = await storage.createProject({
        companyId: newCompany.id!,
        title: `${name || email.split('@')[0]} - Conversation ${secureToken.submissionId}`,
        type: 'website',
        stage: 'discovery',
        status: 'active',
        totalAmount: 5000,
        paidAmount: 0,
        accessToken: secureToken.token
      });
      
      console.log(`✨ Created new client and token for ${email}: ${secureToken.token}`);
      res.json({ token: secureToken.token });
      
    } catch (error) {
      console.error('Error getting user token:', error);
      res.status(500).json({ error: 'Failed to get user token' });
    }
  });

  // Validate token endpoint
  app.post('/api/validate-token', async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: 'Token required' });
      }
      
      console.log(`🔍 Validating token: ${token.substring(0, 8)}...`);
      
      // Look for project with this token using existing method
      try {
        const project = await storage.getProjectByAccessToken(token);
        
        if (project) {
          console.log(`✅ Token valid: ${token.substring(0, 8)}...`);
          res.json({ valid: true });
        } else {
          console.log(`❌ Token invalid: ${token.substring(0, 8)}...`);
          res.status(404).json({ valid: false });
        }
      } catch (error) {
        console.log(`❌ Token validation error: ${error.message}`);
        res.status(404).json({ valid: false });
      }
      
    } catch (error) {
      console.error('Error validating token:', error);
      res.status(500).json({ valid: false });
    }
  });

  // Get user's most recent conversation token
  app.post('/api/get-latest-conversation', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }
      
      console.log(`🔍 Getting latest conversation for: ${email}`);
      
      const existingClient = await storage.findClientByEmail(email);
      
      if (!existingClient) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get all projects for this client and find the most recent
      const projects = await storage.getProjectsByCompany(existingClient.id);
      
      if (projects.length === 0) {
        return res.status(404).json({ error: 'No conversations found' });
      }
      
      // Sort by creation date to get the most recent
      const latestProject = projects.sort((a: any, b: any) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )[0];
      
      console.log(`📞 Latest conversation for ${email}: ${latestProject.accessToken?.substring(0, 8)}...`);
      res.json({ token: latestProject.accessToken });
      
    } catch (error) {
      console.error('Error getting latest conversation:', error);
      res.status(500).json({ error: 'Failed to get latest conversation' });
    }
  });

  // ===================
  // UNIFIED TOKEN ENDPOINT - Single source of truth for all tokens
  // ===================
  
  // Health check endpoint for Railway
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'Pleasant Cove Design API',
      version: '1.1'
    });
  });

  // Availability check endpoint for widget
  app.get('/api/availability/:date', (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      date: req.params.date,
      availableSlots: ['8:30 AM', '9:00 AM'],
      bookedSlots: [],
      timestamp: new Date().toISOString()
    });
  });

  // Analytics endpoint (stub for now)
  app.get('/api/analytics', requireAdmin, (req: Request, res: Response) => {
    const period = req.query.period || '30d';
    res.json({
      period,
      metrics: {
        totalRevenue: 0,
        totalClients: 0,
        totalProjects: 0,
        conversionRate: 0
      },
      revenueData: [],
      clientData: []
    });
  });

  // Force database migration (temporary endpoint)
  app.post('/api/force-migration', async (req: Request, res: Response) => {
    try {
      console.log('🚨 FORCE MIGRATION requested');
      const result = await storage.forceMigration();
      res.json(result);
    } catch (error) {
      console.error('❌ FORCE MIGRATION endpoint error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/token', async (req: Request, res: Response) => {
    try {
      const { email, name, projectId, type = 'member' } = req.body;
      
      console.log(`🔑 [TOKEN_REQUEST] Type: ${type}, Email: ${email}, ProjectId: ${projectId}`);
      
      // ADMIN TOKEN REQUEST (for admin UI)
      if (type === 'admin') {
        // Check for admin token in header OR allow hardcoded admin requests
        const adminToken = req.headers.authorization?.replace('Bearer ', '') || req.body.token;
        
        // Allow both header-based and direct admin access
        if (adminToken === 'pleasantcove2024admin' || !adminToken) {
          console.log(`✅ [TOKEN_REQUEST] Admin token validated`);
          return res.json({ 
            token: 'pleasantcove2024admin',
            type: 'admin',
            valid: true,
            expiresIn: null // Admin tokens don't expire
          });
        } else {
          console.log(`❌ [TOKEN_REQUEST] Invalid admin token`);
          return res.status(401).json({ error: 'Invalid admin token', code: 'INVALID_ADMIN_TOKEN' });
        }
      }
      
      // PROJECT TOKEN REQUEST (by project ID)
      if (type === 'project' && projectId) {
        const project = await storage.getProjectById(projectId);
        if (project && project.accessToken) {
          console.log(`✅ [TOKEN_REQUEST] Project token found: ${project.accessToken.substring(0, 8)}...`);
          return res.json({
            token: project.accessToken,
            type: 'project',
            valid: true,
            projectId: project.id,
            projectTitle: project.title
          });
        } else {
          console.log(`❌ [TOKEN_REQUEST] Project not found: ${projectId}`);
          return res.status(404).json({ error: 'Project not found', code: 'PROJECT_NOT_FOUND' });
        }
      }
      
      // MEMBER TOKEN REQUEST (for Squarespace widgets)
      if (type === 'member' && email) {
        console.log(`🔐 [MEMBER_AUTH] === STARTING MEMBER AUTHENTICATION ===`);
        console.log(`🔐 [MEMBER_AUTH] Email: ${email}`);
        console.log(`🔐 [MEMBER_AUTH] Name: ${name}`);
        console.log(`🔐 [MEMBER_AUTH] Database type: ${storage.constructor.name}`);
        
        try {
          // Step 1: Find if this member (company) already exists.
          console.log(`🔍 [MEMBER_AUTH] Step 1: Looking up existing client by email...`);
          const existingClientData = await storage.findClientByEmail(email);
          console.log(`🔍 [MEMBER_AUTH] findClientByEmail result:`, existingClientData);
          let existingClient = null;
          
          // Handle the return structure from findClientByEmail
          console.log(`🔍 [MEMBER_AUTH] Processing findClientByEmail result...`);
          if (existingClientData) {
            // PostgreSQL storage returns Company directly, not wrapped
            if (existingClientData.company) {
              existingClient = existingClientData.company;
              console.log(`✅ [MEMBER_AUTH] Found existing company: ${existingClient.name}`);
            } else if (existingClientData.business) {
              existingClient = existingClientData.business;
              console.log(`✅ [MEMBER_AUTH] Found existing business: ${existingClient.name}`);
            } else {
              // Direct Company object from PostgreSQL
              existingClient = existingClientData;
              console.log(`✅ [MEMBER_AUTH] Found existing client: ${existingClient.name}`);
            }
          } else {
            console.log(`❌ [MEMBER_AUTH] No existing client found`);
          }
        
        if (existingClient?.id) {
            console.log(`[MEMBER_AUTH] Found existing client: ${existingClient.name} (ID: ${existingClient.id})`);
            
                        // Step 2: IDEMPOTENT - Always return the same conversation for this client
            const projects = await storage.getProjectsByCompany(existingClient.id);
            console.log(`[MEMBER_AUTH] Found ${projects.length} projects for client ${existingClient.id}`);
            
            // Find the ONE active project (there should only be one after consolidation)
            const activeProjects = projects.filter(p => p.status === 'active');
            
            if (activeProjects.length > 0) {
                // Use the first (and should be only) active project
                const masterProject = activeProjects[0];
                console.log(`[MEMBER_AUTH] Returning master conversation: ${masterProject.title} (${masterProject.accessToken?.substring(0, 8)}...)`);
                
                // Safety check: If somehow there are still multiple active projects, consolidate them
                if (activeProjects.length > 1) {
                    console.warn(`[MEMBER_AUTH] WARNING: Found ${activeProjects.length} active projects, should be 1 after migration`);
                    
                    // Keep the one with most messages as master
                    let bestProject = activeProjects[0];
                    let maxMessages = 0;
                    
                    for (const project of activeProjects) {
                        const messages = await storage.getProjectMessages(project.id!);
                        if (messages.length > maxMessages) {
                            maxMessages = messages.length;
                            bestProject = project;
                        }
                    }
                    
                    // Mark others as completed
                    for (const project of activeProjects) {
                        if (project.id !== bestProject.id) {
                            await storage.updateProject(project.id!, { status: 'completed' });
                            console.log(`[MEMBER_AUTH] Consolidated project ${project.id} into master`);
                        }
                    }
                    
                    // Use the best project as master
                    const masterProject = bestProject;
                }
                
                // ALWAYS return the same token for this client
                return res.json({
                    token: masterProject.accessToken,
                    projectToken: masterProject.accessToken,
                    type: 'member',
                    valid: true,
                    existing: true,
                    projectId: masterProject.id,
                    projectTitle: masterProject.title,
                    clientName: existingClient.name,
                    messageCount: await storage.getProjectMessages(masterProject.id!).then(m => m.length)
                });
            }
            console.log(`[MEMBER_AUTH] No active projects found, creating new conversation for existing client ${existingClient.id}`);
        } else {
            console.log(`[MEMBER_AUTH] No existing client found, creating new client: ${name || email.split('@')[0]} (${email})`);
        }

          // Step 3: No active project found. Create ONE master conversation for this client.
          console.log(`🔧 [MEMBER_AUTH] Step 3: No active conversation found, creating master conversation for: ${email}`);
          
          let clientData = existingClient;
          if (!clientData) {
              // First time client - create their company record
              console.log(`🆕 [MEMBER_AUTH] Creating new client record...`);
              clientData = await storage.createCompany({
                  name: name || email.split('@')[0],
                  email: email,
                  phone: '',
                  industry: 'Web Design Client',
                  tags: ['squarespace-member']
              });
              console.log(`✅ [MEMBER_AUTH] Created new client: ${clientData.name} (ID: ${clientData.id})`);
          }
        
        // Generate a stable token based on client ID for consistency
        const stableToken = `pcd_${clientData.id}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
        
        const projectData = {
            companyId: clientData.id,
            title: `${clientData.name} - Master Conversation`,
            type: 'consultation',
            stage: 'in_progress',
            status: 'active',
            accessToken: stableToken,
            notes: 'Master conversation thread - all messages consolidated here'
        };
        
        console.log(`🔧 [MEMBER_AUTH] CREATING PROJECT WITH DATA:`, JSON.stringify(projectData, null, 2));
        console.log(`🔧 [MEMBER_AUTH] Stage value: "${projectData.stage}" (type: ${typeof projectData.stage})`);
        
        const newProject = await storage.createProject(projectData);
        
        console.log(`[MEMBER_AUTH] Created master conversation: ${stableToken.substring(0, 12)}...`);
        return res.json({
            token: stableToken,
            projectToken: stableToken,
            type: 'member',
            valid: true,
            existing: false, // New conversation, but will be the ONLY one
            projectId: newProject.id,
            projectTitle: newProject.title,
            clientName: clientData.name,
            messageCount: 0
        });
        
        } catch (memberError) {
          console.error('🚨 [MEMBER_AUTH] DETAILED ERROR:', memberError);
          console.error('🚨 [MEMBER_AUTH] Error stack:', memberError.stack);
          throw memberError; // Re-throw to be caught by main catch block
        }
      }
      
      // VALIDATION REQUEST (check if token is valid)
      if (type === 'validate') {
        const { token } = req.body;
        if (!token) {
          return res.status(400).json({ error: 'Token required for validation', code: 'MISSING_TOKEN' });
        }
        
        try {
          const project = await storage.getProjectByAccessToken(token);
          if (project) {
            console.log(`✅ [TOKEN_REQUEST] Token validation successful: ${token.substring(0, 8)}...`);
            return res.json({
              token,
              type: 'project',
              valid: true,
              projectId: project.id,
              projectTitle: project.title
            });
          } else {
            console.log(`❌ [TOKEN_REQUEST] Token validation failed: ${token.substring(0, 8)}...`);
            return res.status(404).json({ 
              valid: false, 
              error: 'Token not found',
              code: 'TOKEN_NOT_FOUND'
            });
          }
        } catch (error) {
          console.log(`❌ [TOKEN_REQUEST] Token validation error: ${error.message}`);
          return res.status(400).json({ 
            valid: false, 
            error: 'Invalid token format',
            code: 'INVALID_TOKEN_FORMAT'
          });
        }
      }
      
      return res.status(400).json({ 
        error: 'Invalid request. Specify type: admin, member, project, or validate',
        code: 'INVALID_REQUEST_TYPE'
      });
      
    } catch (error) {
      console.error('❌ [TOKEN_REQUEST] Error:', error);
      res.status(500).json({ 
        error: 'Token request failed',
        code: 'TOKEN_REQUEST_ERROR'
      });
    }
  });
  
  // ===================
  // TAGS ENDPOINT - For React UI tag management
  // ===================
  
  app.get('/api/tags', async (req: Request, res: Response) => {
    try {
      console.log('📋 [TAGS] Fetching all available tags...');
      
      // For now, return a static list of common tags
      // TODO: Make this dynamic based on actual project tags in database
      const tags = [
        { id: 1, name: 'High Priority', color: '#ef4444', count: 3 },
        { id: 2, name: 'New Client', color: '#22c55e', count: 8 },
        { id: 3, name: 'Consultation', color: '#3b82f6', count: 12 },
        { id: 4, name: 'Website Project', color: '#8b5cf6', count: 5 },
        { id: 5, name: 'Branding', color: '#f59e0b', count: 2 },
        { id: 6, name: 'E-commerce', color: '#ec4899', count: 4 },
        { id: 7, name: 'Mobile App', color: '#06b6d4', count: 1 },
        { id: 8, name: 'Maintenance', color: '#84cc16', count: 6 },
        { id: 9, name: 'Squarespace Member', color: '#f97316', count: 7 },
        { id: 10, name: 'Follow-up Required', color: '#ef4444', count: 2 }
      ];
      
      console.log(`📋 [TAGS] Returning ${tags.length} tags`);
      res.json(tags);
      
    } catch (error) {
      console.error('❌ [TAGS] Error fetching tags:', error);
      res.status(500).json({ 
        error: 'Failed to fetch tags',
        code: 'TAGS_FETCH_ERROR'
      });
    }
  });
  
  // ===================
  // DEBUG ENDPOINTS
  // ===================
  
  // Debug endpoint to check room status
  app.get('/api/debug/rooms/:projectToken', async (req: Request, res: Response) => {
    try {
      const { projectToken } = req.params;
      
      if (!io) {
        return res.status(500).json({ error: 'WebSocket not available' });
      }
      
      const roomClients = await io.in(projectToken).allSockets();
      
      console.log(`🔍 [DEBUG] Room status check for: ${projectToken}`);
      console.log(`🔍 [DEBUG] Connected clients: ${roomClients.size}`);
      console.log(`🔍 [DEBUG] Client IDs:`, Array.from(roomClients));
      
      res.json({
        projectToken,
        connectedClients: roomClients.size,
        clientIds: Array.from(roomClients),
        timestamp: new Date().toISOString(),
        success: true
      });
    } catch (error) {
      console.error('❌ [DEBUG] Room status error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoint to list all active rooms
  app.get('/api/debug/rooms', async (req: Request, res: Response) => {
    try {
      if (!io) {
        return res.status(500).json({ error: 'WebSocket not available' });
      }
      
      const adapter = io.sockets.adapter;
      const rooms = Array.from(adapter.rooms.keys()).filter(room => !adapter.sids.has(room));
      
      const roomInfo = [];
      for (const room of rooms) {
        const clients = await io.in(room).allSockets();
        roomInfo.push({
          room,
          clientCount: clients.size,
          clientIds: Array.from(clients)
        });
      }
      
      console.log(`🔍 [DEBUG] All active rooms: ${rooms.length}`);
      
      res.json({
        totalRooms: rooms.length,
        rooms: roomInfo,
        timestamp: new Date().toISOString(),
        success: true
      });
    } catch (error) {
      console.error('❌ [DEBUG] All rooms error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===================

  // NEW, RELIABLE ENDPOINT FOR ADMIN INBOX
  app.get("/api/admin/conversations", requireAdmin, async (req: Request, res: Response) => {
    try {
      console.log("✅ [ADMIN INBOX] Fetching all conversations via new dedicated route...");
      
      // Manually read the database to bypass the storage layer bugs
      const dbPath = path.join(process.cwd(), 'data', 'database.json');
      const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      
      const allProjects: Project[] = dbData.projects;
      const allMessages: Message[] = dbData.projectMessages;
      const allCompanies: Company[] = dbData.companies;

      const companyMap = new Map(allCompanies.map(c => [c.id, c]));

      // First, get conversations for existing projects
      const projectConversations = allProjects
        .map(project => {
          const company = companyMap.get(project.companyId);
          const projectMessages = allMessages.filter(m => m.projectId === project.id);

          // Skip projects with no messages
          if (projectMessages.length === 0) {
            return null;
          }
          
          projectMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

          const lastMessage = projectMessages[projectMessages.length - 1];

          // Create a fallback customer name if company is missing
          const customerName = company?.name || 
                              project.title.split(' - ')[0] || 
                              `Customer ${project.companyId}` ||
                              'Unknown Customer';

          // Calculate unread count - count client messages without readAt
          const unreadCount = projectMessages.filter(msg => 
            msg.senderType === 'client' && !msg.readAt
          ).length;
          
          if (unreadCount > 0) {
            console.log(`📩 [UNREAD] Project ${project.id} (${customerName}) has ${unreadCount} unread messages`);
          }

          return {
            projectId: project.id,
            projectTitle: project.title,
            customerName: customerName,
            customerEmail: company?.email || `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            accessToken: project.accessToken,
            lastMessage: lastMessage,
            lastMessageTime: lastMessage.createdAt,
            unreadCount: unreadCount,
            messages: projectMessages,
            // Include full client profile data
            clientProfile: company ? {
              id: company.id,
              name: company.name,
              email: company.email,
              phone: company.phone,
              address: company.address,
              city: company.city,
              state: company.state,
              industry: company.industry,
              website: company.website,
              priority: company.priority
            } : null
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

      // Find orphaned messages (messages without corresponding projects)
      const existingProjectIds = new Set(allProjects.map(p => p.id));
      const orphanedMessagesByProject = new Map<number, any[]>();
      
      allMessages.forEach(message => {
        if (!existingProjectIds.has(message.projectId)) {
          if (!orphanedMessagesByProject.has(message.projectId)) {
            orphanedMessagesByProject.set(message.projectId, []);
          }
          orphanedMessagesByProject.get(message.projectId)!.push(message);
        }
      });

      // Create virtual conversations for orphaned messages
      const orphanedConversations = Array.from(orphanedMessagesByProject.entries()).map(([projectId, messages]) => {
        messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const lastMessage = messages[messages.length - 1];
        const firstMessage = messages[0];
        
        // Try to extract customer name from the first client message
        const clientMessage = messages.find(m => m.senderType === 'client');
        const customerName = clientMessage?.senderName || `Project ${projectId}`;
        
        // Calculate unread count for orphaned messages
        const unreadCount = messages.filter(msg => 
          msg.senderType === 'client' && !msg.readAt
        ).length;

        return {
          projectId: projectId,
          projectTitle: `Previous Conversation - ${customerName}`,
          customerName: customerName,
          customerEmail: clientMessage?.senderEmail || `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          accessToken: `archived_${projectId}`, // Create a unique token for archived conversations
          lastMessage: lastMessage,
          lastMessageTime: lastMessage.createdAt,
          unreadCount: unreadCount,
          messages: messages,
          clientProfile: null // Orphaned conversations don't have complete client profiles
        };
      });

      // Combine both types of conversations
      const conversations = [...projectConversations, ...orphanedConversations];

      conversations.sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );
      
      console.log(`✅ [ADMIN INBOX] Successfully fetched ${conversations.length} conversations.`);
      // The frontend expects the data nested under a `projectMessages` key
      res.json({ projectMessages: conversations });

    } catch (error) {
      console.error("❌ [ADMIN INBOX] Failed to fetch conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Correctly closing the function
  
  // Simple tracking endpoints for CRM integration
  app.get('/api/leads/tracking/summary', requireAdmin, (req: Request, res: Response) => {
    // Mock tracking summary for now
    res.json({
      total_leads: 4,
      demo_view_rate: 75.0,
      cta_click_rate: 25.0,
      reply_rate: 12.5,
      lead_categories: {
        hot: 1,
        warm: 2, 
        cold: 1,
        dead: 0
      }
    });
  });

  app.get('/api/leads/:id/tracking', requireAdmin, (req: Request, res: Response) => {
    const leadId = req.params.id;
    
    // Mock tracking data based on lead ID
    const trackingData = {
      '1': { demo_views: 0, cta_clicks: 0, conversations: 0, lead_info: { status: 'demo_sent' } },
      '2': { demo_views: 0, cta_clicks: 0, conversations: 0, lead_info: { status: 'demo_sent' } },
      '3': { demo_views: 3, cta_clicks: 0, conversations: 0, lead_info: { status: 'viewed_demo' } },
      '4': { demo_views: 3, cta_clicks: 0, conversations: 0, lead_info: { status: 'viewed_demo' } }
    };
    
    res.json(trackingData[leadId] || { error: 'Lead not found' });
  });

  // Delete company endpoint
  app.delete('/api/companies/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      
      if (isNaN(companyId)) {
        return res.status(400).json({ error: 'Invalid company ID' });
      }

      // Remove from storage
      const success = await storage.deleteCompany(companyId);
      
      if (success) {
        console.log(`✅ [DELETE] Company ${companyId} deleted successfully`);
        res.json({ success: true, message: 'Company deleted successfully' });
      } else {
        console.log(`❌ [DELETE] Company ${companyId} not found`);
        res.status(404).json({ error: 'Company not found' });
      }
    } catch (error) {
      console.error('❌ [DELETE] Failed to delete company:', error);
      res.status(500).json({ error: 'Failed to delete company' });
    }
  });

  // Delete project/conversation endpoint  
  app.delete('/api/projects/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      
      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      // Remove from storage
      const success = await storage.deleteProject(projectId);
      
      if (success) {
        console.log(`✅ [DELETE] Project ${projectId} deleted successfully`);
        res.json({ success: true, message: 'Project deleted successfully' });
      } else {
        console.log(`❌ [DELETE] Project ${projectId} not found`);
        res.status(404).json({ error: 'Project not found' });
      }
    } catch (error) {
      console.error('❌ [DELETE] Failed to delete project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  });

  // Health check and monitoring endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json(getHealthStats());
  });

  // API statistics endpoint (admin only)
  app.get('/api/admin/stats', requireAdmin, (req: Request, res: Response) => {
    res.json({
      health: getHealthStats(),
      timestamp: new Date().toISOString()
    });
  });

  // ===================
  // AI CHAT RECALL API
  // ===================
  
  // Get last N messages for a lead/project
  app.get('/api/ai/chat/last', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { leadId, projectId, limit = 5, sessionId } = req.query;
      
      const messages = await storage.getAIChatMessages({
        leadId: leadId as string,
        projectId: projectId ? parseInt(projectId as string) : undefined,
        sessionId: sessionId as string,
        limit: parseInt(limit as string)
      });
      
      res.json({
        success: true,
        messages,
        count: messages.length
      });
    } catch (error) {
      console.error('Failed to fetch AI chat messages:', error);
      res.status(500).json({ error: 'Failed to fetch chat messages' });
    }
  });

  // Get specific context for AI (who was last messaged, what they said)
  app.get('/api/ai/chat/context', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { leadId, projectId } = req.query;
      
      // Get the last interaction
      const lastMessage = leadId ? 
        await storage.getLastAIChatMessage(leadId as string) : 
        null;
      
      // Get recent context
      const context = await storage.getAIChatContext(
        leadId as string,
        projectId ? parseInt(projectId as string) : undefined,
        10
      );
      
      res.json({
        success: true,
        lastMessage,
        recentContext: context,
        summary: lastMessage ? {
          lastContact: lastMessage.timestamp,
          lastContent: lastMessage.content,
          messageType: lastMessage.messageType
        } : null
      });
    } catch (error) {
      console.error('Failed to fetch AI chat context:', error);
      res.status(500).json({ error: 'Failed to fetch chat context' });
    }
  });

  // Store AI chat message
  app.post('/api/ai/chat/message', requireAdmin, async (req: Request, res: Response) => {
    try {
      const messageData = req.body;
      
      const message = await storage.createAIChatMessage({
        ...messageData,
        timestamp: new Date()
      });
      
      res.json({
        success: true,
        message
      });
    } catch (error) {
      console.error('Failed to create AI chat message:', error);
      res.status(500).json({ error: 'Failed to store chat message' });
    }
  });

  // Get conversation history for a specific session
  app.get('/api/ai/chat/session/:sessionId', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { limit = 50 } = req.query;
      
      const messages = await storage.getAIChatMessages({
        sessionId,
        limit: parseInt(limit as string)
      });
      
      res.json({
        success: true,
        sessionId,
        messages: messages.reverse(), // Return in chronological order
        count: messages.length
      });
    } catch (error) {
      console.error('Failed to fetch session messages:', error);
      res.status(500).json({ error: 'Failed to fetch session messages' });
    }
  });

  // Main AI chat endpoint with function calling
  app.post('/api/ai/chat', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { message, context = {} } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Generate session ID if not provided
      const sessionId = context.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const fullContext = { ...context, sessionId };

      // Store the user message
      await storeUserMessage(message, fullContext);

      // Process with AI (includes function calling)
      const response = await processAIChat(message, fullContext);

      res.json({
        success: true,
        response: response.content,
        functionCalls: response.functionCalls || [],
        sessionId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('AI chat error:', error);
      res.status(500).json({ 
        error: 'Failed to process AI chat',
        message: 'Please try again or check if OpenAI is configured properly'
      });
    }
  });

  // ===================
  // PAYMENT SUCCESS PAGE
  // ===================
  
  // Payment success page (serves HTML page with order information)
  app.get('/payment/success', async (req: Request, res: Response) => {
    try {
      const orderId = req.query.order_id as string;
      
      if (!orderId) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Success - Pleasant Cove Design</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 2rem auto; padding: 2rem; background: #f8fafc; }
              .container { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
              .success { color: #059669; }
              .error { color: #dc2626; }
              .order-id { background: #f1f5f9; padding: 0.5rem; border-radius: 6px; font-family: monospace; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="error">⚠️ Missing Order Information</h1>
              <p>We couldn't find your order details. Please contact support if you completed a payment.</p>
              <p><strong>Support:</strong> hello@pleasantcovedesign.com</p>
            </div>
          </body>
          </html>
        `);
      }
      
      // Get order details
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Not Found - Pleasant Cove Design</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 2rem auto; padding: 2rem; background: #f8fafc; }
              .container { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
              .error { color: #dc2626; }
              .order-id { background: #f1f5f9; padding: 0.5rem; border-radius: 6px; font-family: monospace; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="error">❌ Order Not Found</h1>
              <p>We couldn't find order: <span class="order-id">${orderId}</span></p>
              <p>Please contact support if you completed a payment.</p>
              <p><strong>Support:</strong> hello@pleasantcovedesign.com</p>
            </div>
          </body>
          </html>
        `);
      }
      
      // Get company details
      const company = await storage.getBusinessById(order.companyId);
      const companyName = company?.name || 'Customer';
      
      // Determine payment status display
      const isPaid = order.paymentStatus === 'paid';
      const statusColor = isPaid ? '#059669' : '#f59e0b';
      const statusIcon = isPaid ? '✅' : '⏳';
      const statusText = isPaid ? 'Payment Confirmed' : 'Payment Processing';
      
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Success - Pleasant Cove Design</title>
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              max-width: 600px; 
              margin: 2rem auto; 
              padding: 2rem; 
              background: #f8fafc;
              line-height: 1.6;
            }
            .container { 
              background: white; 
              padding: 2rem; 
              border-radius: 12px; 
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
              text-align: center;
            }
            .success { color: #059669; margin-bottom: 1rem; }
            .status { 
              color: ${statusColor}; 
              background: ${isPaid ? '#dcfce7' : '#fef3c7'}; 
              padding: 1rem; 
              border-radius: 8px; 
              margin: 1rem 0;
              border: 2px solid ${statusColor};
            }
            .order-details { 
              background: #f8fafc; 
              padding: 1.5rem; 
              border-radius: 8px; 
              margin: 1rem 0;
              text-align: left;
            }
            .order-id { 
              background: #e2e8f0; 
              padding: 0.5rem; 
              border-radius: 6px; 
              font-family: monospace;
              font-size: 0.9rem;
            }
            .package { 
              color: #7c3aed; 
              font-weight: 600;
              text-transform: capitalize;
            }
            .total { 
              font-size: 1.25rem; 
              font-weight: 700; 
              color: #1e293b;
            }
            .next-steps {
              background: #eff6ff;
              border: 2px solid #3b82f6;
              padding: 1rem;
              border-radius: 8px;
              margin-top: 1.5rem;
            }
            .contact {
              margin-top: 2rem;
              padding-top: 1rem;
              border-top: 1px solid #e2e8f0;
              color: #64748b;
            }
            .contact a { color: #3b82f6; text-decoration: none; }
            .contact a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">🎉 Thank You for Your Order!</h1>
            
            <div class="status">
              <h2>${statusIcon} ${statusText}</h2>
              ${isPaid 
                ? '<p>Your payment has been processed successfully and your project is ready to begin!</p>'
                : '<p>Your payment is being processed. You\'ll receive a confirmation email shortly.</p>'
              }
            </div>
            
            <div class="order-details">
              <h3>Order Details</h3>
              <p><strong>Customer:</strong> ${companyName}</p>
              <p><strong>Order ID:</strong> <br><span class="order-id">${order.id}</span></p>
              <p><strong>Package:</strong> <span class="package">${order.package}</span></p>
              <p><strong>Total:</strong> <span class="total">$${order.total.toLocaleString()}</span></p>
              <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
              ${order.paymentDate ? `<p><strong>Payment Date:</strong> ${new Date(order.paymentDate).toLocaleDateString()}</p>` : ''}
            </div>
            
            ${isPaid ? `
              <div class="next-steps">
                <h3>🚀 What Happens Next?</h3>
                <p>Our team will reach out within 24 hours to:</p>
                <ul style="text-align: left; margin: 0.5rem 0;">
                  <li>Schedule your project kickoff call</li>
                  <li>Gather your brand requirements</li>
                  <li>Begin designing your website</li>
                </ul>
                <p><strong>Check your email</strong> for detailed next steps and project timeline.</p>
              </div>
            ` : ''}
            
            <div class="contact">
              <p><strong>Questions?</strong> Contact us at <a href="mailto:hello@pleasantcovedesign.com">hello@pleasantcovedesign.com</a></p>
              <p>Pleasant Cove Design • Boothbay, Maine</p>
            </div>
          </div>
        </body>
        </html>
      `);
      
    } catch (error) {
      console.error('❌ Error serving payment success page:', error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error - Pleasant Cove Design</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 2rem auto; padding: 2rem; background: #f8fafc; }
            .container { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">⚠️ System Error</h1>
            <p>We're experiencing technical difficulties. Your payment may have been processed successfully.</p>
            <p>Please contact support: <strong>hello@pleasantcovedesign.com</strong></p>
          </div>
        </body>
        </html>
      `);
    }
  });

  // Helper functions for webhook handlers

  // ===================
  // PROJECT BRIEF ENDPOINTS
  // ===================
  
  // In-memory storage for project briefs (in production, use database)
  const projectBriefs = new Map<string, any>();
  
  // Generate a secure token for client access
  function generateClientToken(briefId: string): string {
    return Buffer.from(`${briefId}:${Date.now()}:${Math.random().toString(36)}`).toString('base64');
  }
  
  // Validate client token
  function validateClientToken(briefId: string, token: string): boolean {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [tokenBriefId] = decoded.split(':');
      return tokenBriefId === briefId;
    } catch {
      return false;
    }
  }
  
  // Create a new project brief
  app.post('/api/project-briefs', async (req: Request, res: Response) => {
    try {
      const briefData = req.body;
      const briefId = `BRIEF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      // Get company information
      const company = await storage.getBusinessById(briefData.companyId);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }
      
      // Create project brief
      const projectBrief = {
        id: briefId,
        ...briefData,
        companyName: company.name,
        status: 'draft',
        clientStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Store the brief
      projectBriefs.set(briefId, projectBrief);
      
      // Generate client access token
      const clientToken = generateClientToken(briefId);
      
      console.log(`✅ Project brief created: ${briefId} for company ${company.name}`);
      
      res.json({
        id: briefId,
        clientConfirmationUrl: `http://localhost:3000/project-confirmation.html?brief_id=${briefId}&token=${clientToken}`,
        status: 'created'
      });
      
    } catch (error) {
      console.error('❌ Error creating project brief:', error);
      res.status(500).json({ error: 'Failed to create project brief' });
    }
  });
  
  // Get project brief for client confirmation
  app.get('/api/project-briefs/:briefId', async (req: Request, res: Response) => {
    try {
      const { briefId } = req.params;
      const { token } = req.query;
      
      // Validate token for client access
      if (token && !validateClientToken(briefId, token as string)) {
        return res.status(403).json({ error: 'Invalid access token' });
      }
      
      const brief = projectBriefs.get(briefId);
      if (!brief) {
        return res.status(404).json({ error: 'Project brief not found' });
      }
      
      // Return brief data for client
      res.json(brief);
      
    } catch (error) {
      console.error('❌ Error retrieving project brief:', error);
      res.status(500).json({ error: 'Failed to retrieve project brief' });
    }
  });
  
  // Client response to project brief
  app.post('/api/project-briefs/:briefId/respond', async (req: Request, res: Response) => {
    try {
      const { briefId } = req.params;
      const { token, clientStatus, clientFeedback } = req.body;
      
      // Validate token
      if (!validateClientToken(briefId, token)) {
        return res.status(403).json({ error: 'Invalid access token' });
      }
      
      const brief = projectBriefs.get(briefId);
      if (!brief) {
        return res.status(404).json({ error: 'Project brief not found' });
      }
      
      // Update brief with client response
      const updatedBrief = {
        ...brief,
        clientStatus,
        clientFeedback,
        confirmationDate: new Date(),
        updatedAt: new Date(),
        status: clientStatus === 'approved' ? 'approved' : 'needs_revision'
      };
      
      // Add to change history if requesting changes
      if (clientStatus === 'requested_changes' && clientFeedback) {
        if (!updatedBrief.clientChanges) {
          updatedBrief.clientChanges = [];
        }
        updatedBrief.clientChanges.push({
          section: 'general',
          change: clientFeedback,
          timestamp: new Date()
        });
      }
      
      projectBriefs.set(briefId, updatedBrief);
      
      console.log(`✅ Client response received for brief ${briefId}: ${clientStatus}`);
      
      // TODO: Send notification to admin about client response
      // TODO: If approved, trigger project start workflow
      
      res.json({ 
        success: true, 
        status: clientStatus,
        message: clientStatus === 'approved' 
          ? 'Project approved! We\'ll begin work on your website.'
          : 'Thank you for your feedback. We\'ll review your requests and follow up soon.'
      });
      
    } catch (error) {
      console.error('❌ Error processing client response:', error);
      res.status(500).json({ error: 'Failed to process response' });
    }
  });
  
  // List project briefs for admin
  app.get('/api/project-briefs', async (req: Request, res: Response) => {
    try {
      const { status, companyId } = req.query;
      
      let briefs = Array.from(projectBriefs.values());
      
      // Filter by status if provided
      if (status) {
        briefs = briefs.filter(brief => brief.status === status);
      }
      
      // Filter by company if provided
      if (companyId) {
        briefs = briefs.filter(brief => brief.companyId === companyId);
      }
      
      // Sort by creation date (newest first)
      briefs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json(briefs);
      
    } catch (error) {
      console.error('❌ Error listing project briefs:', error);
      res.status(500).json({ error: 'Failed to list project briefs' });
    }
  });
  
  // Update project brief status (admin only)
  app.patch('/api/project-briefs/:briefId', async (req: Request, res: Response) => {
    try {
      const { briefId } = req.params;
      const updates = req.body;
      
      const brief = projectBriefs.get(briefId);
      if (!brief) {
        return res.status(404).json({ error: 'Project brief not found' });
      }
      
      const updatedBrief = {
        ...brief,
        ...updates,
        updatedAt: new Date()
      };
      
      projectBriefs.set(briefId, updatedBrief);
      
      console.log(`✅ Project brief ${briefId} updated by admin`);
      
      res.json(updatedBrief);
      
    } catch (error) {
      console.error('❌ Error updating project brief:', error);
      res.status(500).json({ error: 'Failed to update project brief' });
    }
  });
  
  // Delete project brief (admin only)
  app.delete('/api/project-briefs/:briefId', async (req: Request, res: Response) => {
    try {
      const { briefId } = req.params;
      
      if (!projectBriefs.has(briefId)) {
        return res.status(404).json({ error: 'Project brief not found' });
      }
      
      projectBriefs.delete(briefId);
      
      console.log(`✅ Project brief ${briefId} deleted`);
      
      res.json({ success: true, message: 'Project brief deleted' });
      
    } catch (error) {
      console.error('❌ Error deleting project brief:', error);
      res.status(500).json({ error: 'Failed to delete project brief' });
    }
  });

  // Debug endpoint to check webhook secret loading
  app.get('/api/debug/webhook-secret', async (req: Request, res: Response) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    res.json({ 
      secretPresent: !!secret,
      secretLength: secret?.length || 0,
      firstTenChars: secret ? secret.substring(0, 10) + '...' : 'not found',
      envKeys: Object.keys(process.env).filter(k => k.includes('STRIPE')).sort(),
      nodeEnv: process.env.NODE_ENV,
      cwd: process.cwd()
    });
  });

  // UNIFIED CLIENT MANAGEMENT - Combines scraped leads and companies
  app.get("/api/clients", requireAdmin, async (req: Request, res: Response) => {
    try {
      console.log('🔍 [CLIENTS] Fetching unified client data...');
      
      // Get both data sources
      const [companies, businesses] = await Promise.all([
        storage.getCompanies(),
        storage.getBusinesses()
      ]);
      
      console.log(`📊 [CLIENTS] Found ${companies.length} companies, ${businesses.length} businesses`);
      
      // Convert companies to unified format
      const companyClients = companies.map((company: any) => ({
        id: `company-${company.id}`,
        originalId: company.id,
        source: 'company',
        name: company.name,
        email: company.email || '',
        phone: company.phone || '',
        industry: company.industry || 'General',
        status: 'active', // Companies are typically active clients
        stage: 'client',
        priority: company.priority || 'medium',
        website: company.website || '',
        address: `${company.address || ''} ${company.city || ''} ${company.state || ''}`.trim(),
        notes: company.notes || '',
        tags: company.tags || [],
        createdAt: company.createdAt || new Date().toISOString(),
        hasProjects: true, // Companies typically have projects
        hasConversations: true // Companies have messaging
      }));
      
      // Convert scraped businesses to unified format
      const businessClients = businesses.map((business: any) => ({
        id: `business-${business.id}`,
        originalId: business.id,
        source: 'scraped',
        name: business.name,
        email: business.email || '',
        phone: business.phone || '',
        industry: business.businessType || business.industry || 'General',
        status: business.stage === 'contacted' ? 'contacted' : 'prospect',
        stage: business.stage || 'scraped',
        priority: business.priority || 'low',
        website: business.website || '',
        address: business.address || '',
        notes: business.notes || `Scraped lead: ${business.businessType || 'Unknown type'}`,
        tags: business.tags || ['scraped-lead'],
        createdAt: business.createdAt || business.scrapedDate || new Date().toISOString(),
        hasProjects: false, // Scraped leads typically don't have projects yet
        hasConversations: false, // No conversations yet
        // Additional scraped data
        rating: business.rating,
        reviews: business.reviews,
        mapsUrl: business.maps_url
      }));
      
      // Combine and sort by creation date (newest first)
      const allClients = [...companyClients, ...businessClients].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      console.log(`✅ [CLIENTS] Returning ${allClients.length} unified clients`);
      console.log(`   - ${companyClients.length} active clients (companies)`);
      console.log(`   - ${businessClients.length} prospects (scraped leads)`);
      
      res.json(allClients);
      
    } catch (error) {
      console.error("❌ [CLIENTS] Failed to fetch unified clients:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  // PROMOTE SCRAPED LEAD TO FULL CLIENT
  app.post("/api/clients/promote/:businessId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const { email, phone, priority, notes } = req.body;
      
      console.log(`🔄 [PROMOTE] Converting scraped lead ${businessId} to full client...`);
      
      // Get the business record
      const business = await storage.getBusinessById(businessId);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }
      
      // Create new company record from business data
      const companyData = {
        name: business.name,
        email: email || business.email || '',
        phone: phone || business.phone || '',
        industry: business.businessType || 'General',
        priority: priority || 'medium',
        website: business.website || '',
        address: business.address || '',
        notes: notes || `Promoted from scraped lead. Original: ${business.notes || ''}`,
        tags: ['promoted-lead', ...(business.tags || [])]
      };
      
      const newCompany = await storage.createCompany(companyData);
      
      // Optionally mark business as promoted
      await storage.updateBusiness(businessId, { 
        stage: 'promoted',
        notes: (business.notes || '') + `\n[PROMOTED] Converted to company ID: ${newCompany.id}`
      });
      
      console.log(`✅ [PROMOTE] Created company ${newCompany.id} from business ${businessId}`);
      
      res.json({
        success: true,
        company: newCompany,
        message: `Successfully promoted ${business.name} to full client`
      });
      
    } catch (error) {
      console.error("❌ [PROMOTE] Failed to promote lead:", error);
      res.status(500).json({ error: "Failed to promote lead to client" });
    }
  });

  // MANUAL CLIENT CREATION
  app.post("/api/clients", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientData = req.body;
      console.log(`📝 [CREATE] Creating new manual client: ${clientData.name}`);
      
      // Validate required fields
      if (!clientData.name) {
        return res.status(400).json({ error: "Client name is required" });
      }
      
      // Create company record
      const companyData = {
        name: clientData.name,
        email: clientData.email || '',
        phone: clientData.phone || '',
        industry: clientData.industry || 'General',
        priority: clientData.priority || 'medium',
        website: clientData.website || '',
        address: clientData.address || '',
        notes: clientData.notes || 'Manually created client',
        tags: ['manual-entry', ...(clientData.tags || [])]
      };
      
      const newCompany = await storage.createCompany(companyData);
      
      console.log(`✅ [CREATE] Created manual client: ${newCompany.name} (ID: ${newCompany.id})`);
      
      res.json({
        success: true,
        client: newCompany,
        message: `Successfully created client ${newCompany.name}`
      });
      
    } catch (error) {
      console.error("❌ [CREATE] Failed to create client:", error);
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  // Companies (new system) - Keep existing endpoint for backward compatibility
  app.get("/api/companies", requireAdmin, async (req: Request, res: Response) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Failed to fetch companies:", error);
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  // ===================
  // ADMIN ENDPOINTS
  // ===================

  // CORRECTED ADMIN INBOX ENDPOINT - Returns projects with messages for PostgreSQL
  app.get("/api/admin/inbox", requireAdmin, async (req: Request, res: Response) => {
    try {
      console.log("✅ [ADMIN INBOX] Fetching all conversations with messages...");
      
      // Get all projects
      const projects = await storage.getProjects({});
      console.log(`📋 [ADMIN INBOX] Found ${projects.length} projects`);
      
      // For each project, get its company info and messages
      const projectMessages = await Promise.all(
        projects.map(async (project) => {
          try {
            console.log(`📋 [ADMIN INBOX] Processing project ${project.id} (${project.title})`);
            
            // Get company info (don't fail if this fails)
            let company = null;
            try {
              company = await storage.getCompany(project.companyId);
              console.log(`📋 [ADMIN INBOX] Found company: ${company?.name}`);
            } catch (err) {
              console.warn(`⚠️ [ADMIN INBOX] Could not get company ${project.companyId}:`, err);
            }
            
            // Get messages for this project (don't fail if this fails)
            let messages = [];
            try {
              messages = await storage.getProjectMessages(project.id!);
              console.log(`📋 [ADMIN INBOX] Project ${project.id}: ${messages.length} messages`);
            } catch (err) {
              console.warn(`⚠️ [ADMIN INBOX] Could not get messages for project ${project.id}:`, err);
            }
            
            return {
              projectId: project.id,
              accessToken: project.accessToken,
              projectTitle: project.title,
              customerName: company?.name || project.title.split(' - ')[0] || 'Unknown Customer',
              companyId: project.companyId,
              createdAt: project.createdAt,
              updatedAt: project.updatedAt,
              messages: messages.map(msg => ({
                id: msg.id,
                projectId: msg.projectId,
                content: msg.content,
                senderName: msg.senderName,
                senderType: msg.senderType,
                createdAt: msg.createdAt,
                attachments: msg.attachments || []
              }))
            };
          } catch (error) {
            console.error(`❌ [ADMIN INBOX] Error processing project ${project.id}:`, error);
            // Return project anyway with minimal data
            return {
              projectId: project.id,
              accessToken: project.accessToken,
              projectTitle: project.title,
              customerName: project.title.split(' - ')[0] || 'Unknown Customer',
              companyId: project.companyId,
              createdAt: project.createdAt,
              updatedAt: project.updatedAt,
              messages: []
            };
          }
        })
      );
      
      // Don't filter out any projects - return them all
      const validProjects = projectMessages;
      console.log(`✅ [ADMIN INBOX] Returning ${validProjects.length} valid conversations`);
      
      res.json({
        projectMessages: validProjects
      });
      
    } catch (error) {
      console.error('❌ [ADMIN INBOX] Error:', error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // NEW, RELIABLE ENDPOINT FOR ADMIN INBOX
}