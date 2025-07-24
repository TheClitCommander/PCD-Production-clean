import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { generateToken, verifyToken, authenticate, requireAdmin, AuthenticatedRequest } from '../../middleware/auth';

// Extend the Express Request type for testing
interface TestRequest extends Partial<Request> {
  headers?: any;
  user?: any;
}

describe('Auth Middleware', () => {
  let mockRequest: TestRequest;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
    };
    mockNext = jest.fn() as NextFunction;
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = {
        id: '123',
        email: 'test@example.com',
        role: 'user' as const,
      };
      const token = generateToken(payload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should generate different tokens for different payloads', () => {
      const token1 = generateToken({ id: '1', email: 'user1@test.com', role: 'user' });
      const token2 = generateToken({ id: '2', email: 'user2@test.com', role: 'admin' });
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const payload = {
        id: '123',
        email: 'test@example.com',
        role: 'admin' as const,
      };
      const token = generateToken(payload);
      const decoded = verifyToken(token);
      
      expect(decoded).toBeTruthy();
      expect(decoded?.id).toBe(payload.id);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.role).toBe(payload.role);
    });

    it('should return null for invalid token', () => {
      const decoded = verifyToken('invalid-token');
      expect(decoded).toBeNull();
    });

    it('should return null for malformed token', () => {
      // Test with a token that has been tampered with
      const payload = { id: '123', email: 'test@test.com', role: 'user' as const };
      const token = generateToken(payload);
      const tamperedToken = token.slice(0, -10) + 'tampered';
      
      const decoded = verifyToken(tamperedToken);
      expect(decoded).toBeNull();
    });
  });

  describe('authenticate', () => {
    it('should authenticate valid Bearer token', () => {
      const payload = {
        id: '123',
        email: 'test@example.com',
        role: 'user' as const,
      };
      const token = generateToken(payload);
      
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe(payload.id);
      expect(mockRequest.user?.email).toBe(payload.email);
      expect(mockRequest.user?.role).toBe(payload.role);
    });

    it('should reject missing authorization header', () => {
      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        message: 'No valid token provided',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token format', () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token',
      };

      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        message: 'No valid token provided',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token',
        message: 'Token verification failed',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin users', () => {
      mockRequest.user = {
        id: '123',
        email: 'admin@example.com',
        role: 'admin',
        permissions: [],
      };

      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject non-admin users', () => {
      mockRequest.user = {
        id: '123',
        email: 'user@example.com',
        role: 'user',
        permissions: [],
      };

      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Admin access required',
        message: 'This action requires administrator privileges',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject when no user is authenticated', () => {
      mockRequest.user = undefined;

      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Admin access required',
        message: 'This action requires administrator privileges',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
}); 