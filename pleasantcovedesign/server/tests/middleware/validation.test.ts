import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { 
  validateSchema, 
  minervaSchemas, 
  companySchemas, 
  projectSchemas, 
  authSchemas, 
  appointmentSchemas,
  validate, 
  sanitize 
} from '../../middleware/validation';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      method: 'POST',
      path: '/test',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
    };
    mockNext = jest.fn() as NextFunction;
  });

  describe('validateSchema', () => {
    it('should pass validation with valid data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const middleware = validateSchema(schema);

      mockRequest.body = { name: 'Test User', age: 25 };
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const middleware = validateSchema(schema);

      mockRequest.body = { name: 'Test User', age: 'not a number' };
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
          message: 'Request data is invalid',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'age',
              message: expect.any(String),
            }),
          ]),
        })
      );
    });

    it('should sanitize data during validation', () => {
      const schema = z.object({
        email: z.string().email().transform(s => s.toLowerCase()),
        name: z.string().trim(),
      });
      const middleware = validateSchema(schema);

      mockRequest.body = { 
        email: 'TEST@EXAMPLE.COM', 
        name: '  John Doe  ' 
      };
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body.email).toBe('test@example.com');
      expect(mockRequest.body.name).toBe('John Doe');
    });
  });

  describe('Minerva validation schemas', () => {
    it('should validate demo generation request', () => {
      const validData = {
        company_id: 123,
        company_name: 'Test Company',
        industry: 'plumbing',
        style: 'storefront',
      };

      const result = minervaSchemas.generateDemo.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should reject invalid demo generation request', () => {
      const invalidData = {
        company_id: 'not a number',
        company_name: '',
        industry: 'invalid-industry',
        style: 'invalid-style',
      };

      const result = minervaSchemas.generateDemo.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate smart outreach request', () => {
      const validData = {
        company_id: 123,
        company_name: 'Test Company',
        industry: 'plumbing',
        phone: '2073805680',
        email: 'test@example.com',
      };

      const result = minervaSchemas.smartOutreach.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate create invoice request', () => {
      const validData = {
        company_id: 123,
        company_name: 'Test Company',
        package_type: 'starter',
        notes: 'Initial invoice for website project',
      };

      const result = minervaSchemas.createInvoice.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Company and Project schemas', () => {
    it('should validate company creation', () => {
      const validCompany = {
        name: 'Test Business',
        phone: '2073805680',
        email: 'test@example.com',
        industry: 'retail',
        address: '123 Main St',
        website: 'https://example.com',
        notes: 'Test notes',
      };

      const result = companySchemas.create.safeParse(validCompany);
      expect(result.success).toBe(true);
    });

    it('should validate project creation', () => {
      const validProject = {
        company_id: 123,
        title: 'Website Redesign',
        description: 'Complete redesign of company website',
        project_type: 'website',
        status: 'planning',
        budget: 5000,
      };

      const result = projectSchemas.create.safeParse(validProject);
      expect(result.success).toBe(true);
    });
  });

  describe('Authentication schemas', () => {
    it('should validate dev login request', () => {
      const validDevLogin = {
        email: 'test@example.com',
        role: 'admin' as const,
      };

      const result = authSchemas.devLogin.safeParse(validDevLogin);
      expect(result.success).toBe(true);
    });

    it('should default role to admin in dev login', () => {
      const devLoginWithoutRole = {
        email: 'test@example.com',
      };

      const result = authSchemas.devLogin.safeParse(devLoginWithoutRole);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('admin');
      }
    });
  });

  describe('Appointment schemas', () => {
    it('should validate appointment booking', () => {
      const validAppointment = {
        company_name: 'Test Business',
        contact_name: 'John Doe',
        email: 'john@example.com',
        phone: '2073805680',
        date: '2024-12-25T00:00:00Z',
        time_slot: '14:00',
        meeting_type: 'zoom',
        business_type: 'retail',
        budget: '5000-10000',
        timeline: '2-3 months',
        additional_notes: 'Looking for modern design',
      };

      const result = appointmentSchemas.book.safeParse(validAppointment);
      expect(result.success).toBe(true);
    });

    it('should reject invalid meeting type', () => {
      const invalidAppointment = {
        company_name: 'Test Business',
        contact_name: 'John Doe',
        email: 'john@example.com',
        phone: '2073805680',
        date: '2024-12-25T00:00:00Z',
        time_slot: '14:00',
        meeting_type: 'invalid-type',
        business_type: 'retail',
      };

      const result = appointmentSchemas.book.safeParse(invalidAppointment);
      expect(result.success).toBe(false);
    });
  });

  describe('sanitize helpers', () => {
    it('should sanitize phone numbers', () => {
      expect(sanitize.cleanPhone('+1 (207) 380-5680')).toBe('+12073805680');
      expect(sanitize.cleanPhone('207.380.5680')).toBe('2073805680');
      expect(sanitize.cleanPhone('207-380-5680')).toBe('2073805680');
    });

    it('should sanitize email addresses', () => {
      expect(sanitize.cleanEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
      expect(sanitize.cleanEmail('  test@example.com  ')).toBe('test@example.com');
    });

    it('should sanitize text input', () => {
      const html = '<script>alert("xss")</script>Hello';
      const cleaned = sanitize.cleanString(html);
      expect(cleaned).toBe('Hello');
    });
  });
}); 