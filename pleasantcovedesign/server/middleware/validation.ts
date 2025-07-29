import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Base validation schemas
const companyIdSchema = z.number().positive().int();
const companyNameSchema = z.string().min(1).max(100).trim();
const industrySchema = z.string().min(1).max(50).trim();
const phoneSchema = z.string().regex(/^[\+]?[1-9][\d]{0,15}$/).optional();
const emailSchema = z.string().email().optional();
const styleSchema = z.enum(['storefront', 'stylized']).default('storefront');
const packageSchema = z.enum(['starter', 'growth', 'professional']).default('starter');

// Minerva API validation schemas
export const minervaSchemas = {
  generateDemo: z.object({
    company_id: companyIdSchema.optional(),
    company_name: companyNameSchema,
    industry: industrySchema,
    phone: phoneSchema,
    email: emailSchema,
    style: styleSchema.optional(),
    demo_type: z.enum(['storefront', 'stylized', 'both']).optional()
  }),

  generateBothStyles: z.object({
    company_id: companyIdSchema,
    company_name: companyNameSchema,
    industry: industrySchema
  }),

  smartOutreach: z.object({
    company_id: companyIdSchema,
    company_name: companyNameSchema,
    industry: industrySchema,
    phone: phoneSchema,
    email: emailSchema
  }),

  createInvoice: z.object({
    company_id: companyIdSchema,
    company_name: companyNameSchema,
    package_type: packageSchema,
    notes: z.string().max(500).optional()
  }),

  analyzeLead: z.object({
    company_id: companyIdSchema,
    company_name: companyNameSchema,
    industry: industrySchema,
    phone: phoneSchema,
    email: emailSchema,
    website: z.string().url().optional()
  })
};

// Company/Project validation schemas
export const companySchemas = {
  create: z.object({
    name: companyNameSchema,
    email: emailSchema,
    phone: phoneSchema,
    industry: industrySchema,
    website: z.string().url().optional(),
    address: z.string().max(200).optional(),
    notes: z.string().max(1000).optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    stage: z.enum(['scraped', 'contacted', 'responded', 'scheduled', 'quoted', 'sold']).default('scraped')
  }),

  update: z.object({
    name: companyNameSchema.optional(),
    email: emailSchema,
    phone: phoneSchema,
    industry: industrySchema.optional(),
    website: z.string().url().optional(),
    address: z.string().max(200).optional(),
    notes: z.string().max(1000).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    stage: z.enum(['scraped', 'contacted', 'responded', 'scheduled', 'quoted', 'sold']).optional()
  })
};

// Project validation schemas
export const projectSchemas = {
  create: z.object({
    company_id: companyIdSchema,
    title: z.string().min(1).max(100).trim(),
    description: z.string().max(1000).optional(),
    project_type: z.enum(['website', 'ecommerce', 'seo', 'branding', 'consultation']).default('website'),
    status: z.enum(['planning', 'in_progress', 'review', 'completed', 'cancelled']).default('planning'),
    budget: z.number().min(0).optional(),
    deadline: z.string().datetime().optional()
  })
};

// Authentication validation schemas
export const authSchemas = {
  devLogin: z.object({
    email: emailSchema,
    role: z.enum(['admin', 'user']).default('admin')
  })
};

// Appointment validation schemas
export const appointmentSchemas = {
  book: z.object({
    company_name: companyNameSchema,
    contact_name: z.string().min(1).max(100).trim(),
    email: z.string().email(),
    phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/),
    date: z.string().datetime(),
    time_slot: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    meeting_type: z.enum(['phone', 'zoom', 'facetime', 'in_person']).default('phone'),
    business_type: industrySchema,
    budget: z.string().max(50).optional(),
    timeline: z.string().max(100).optional(),
    additional_notes: z.string().max(500).optional()
  })
};

// Validation middleware factory
export function validateSchema(schema: z.ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validatedData = schema.parse(req.body);
      
      // Replace request body with validated and sanitized data
      req.body = validatedData;
      
      console.log(`✅ Validation passed for ${req.method} ${req.path}`);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        console.error(`❌ Validation failed for ${req.method} ${req.path}:`, formattedErrors);

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Request data is invalid',
          details: formattedErrors
        });
      }

      console.error('❌ Validation middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Validation error',
        message: 'Internal validation error'
      });
    }
  };
}

// Quick validation helpers for specific endpoints
export const validate = {
  // Minerva endpoints
  minervaDemo: validateSchema(minervaSchemas.generateDemo),
  minervaBothStyles: validateSchema(minervaSchemas.generateBothStyles),
  minervaOutreach: validateSchema(minervaSchemas.smartOutreach),
  minervaInvoice: validateSchema(minervaSchemas.createInvoice),
  minervaAnalyzeLead: validateSchema(minervaSchemas.analyzeLead),

  // Company endpoints
  createCompany: validateSchema(companySchemas.create),
  updateCompany: validateSchema(companySchemas.update),

  // Project endpoints
  createProject: validateSchema(projectSchemas.create),

  // Auth endpoints
  devLogin: validateSchema(authSchemas.devLogin),

  // Appointment endpoints
  bookAppointment: validateSchema(appointmentSchemas.book)
};

// Sanitization helpers
export const sanitize = {
  // Remove potentially harmful HTML/script tags
  cleanString(str: string): string {
    return str
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  },

  // Clean phone number for consistent format
  cleanPhone(phone: string): string {
    return phone.replace(/[^\d+]/g, '');
  },

  // Normalize email to lowercase
  cleanEmail(email: string): string {
    return email.toLowerCase().trim();
  }
}; 