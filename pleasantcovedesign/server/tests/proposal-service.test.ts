// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { sendProposal, acceptProposal, rejectProposal, ProposalServiceError, validateProposalForSending } from '../proposal-service';

// Mock dependencies
jest.mock('../storage');
jest.mock('../email-service');

import { storage } from '../storage';
import { sendEmail } from '../email-service';

// Mock storage methods
const mockStorage = {
  getProposalById: jest.fn(),
  updateProposal: jest.fn(),
  getCompanyById: jest.fn(),
  createOrder: jest.fn()
};

// Mock email service
const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;

// Replace storage with mock
Object.assign(storage, mockStorage);

describe('ProposalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendProposal', () => {
    const mockProposal = {
      id: 'proposal-123',
      leadId: 104,
      status: 'draft',
      totalAmount: 3000,
      lineItems: [
        { description: 'Website Design', quantity: 1, unitPrice: 2500, total: 2500 },
        { description: 'Logo Design', quantity: 1, unitPrice: 500, total: 500 }
      ],
      notes: 'Test proposal',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockLead = {
      id: 104,
      name: 'Test Company',
      email: 'test@example.com',
      phone: '555-0123'
    };

    it('should successfully send a draft proposal', async () => {
      // Setup mocks
      mockStorage.getProposalById.mockResolvedValue(mockProposal);
      mockStorage.getCompanyById.mockResolvedValue(mockLead);
      mockStorage.updateProposal.mockResolvedValue({ ...mockProposal, status: 'sent' });
      mockSendEmail.mockResolvedValue(true);

      // Execute
      const result = await sendProposal('proposal-123');

      // Verify
      expect(result.status).toBe('sent');
      expect(mockStorage.getProposalById).toHaveBeenCalledWith('proposal-123');
      expect(mockStorage.getCompanyById).toHaveBeenCalledWith(104);
      expect(mockStorage.updateProposal).toHaveBeenCalledWith('proposal-123', { status: 'sent' });
      expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'test@example.com',
        subject: expect.stringContaining('Your Website Proposal from Pleasant Cove Design')
      }));
    });

    it('should throw error if proposal not found', async () => {
      mockStorage.getProposalById.mockResolvedValue(null);

      await expect(sendProposal('invalid-id')).rejects.toThrow(ProposalServiceError);
      await expect(sendProposal('invalid-id')).rejects.toMatchObject({
        code: 'PROPOSAL_NOT_FOUND'
      });
    });

    it('should throw error if proposal is not in draft status', async () => {
      mockStorage.getProposalById.mockResolvedValue({ ...mockProposal, status: 'sent' });

      await expect(sendProposal('proposal-123')).rejects.toThrow(ProposalServiceError);
      await expect(sendProposal('proposal-123')).rejects.toMatchObject({
        code: 'INVALID_STATUS_TRANSITION'
      });
    });

    it('should throw error if proposal has no line items', async () => {
      mockStorage.getProposalById.mockResolvedValue({ ...mockProposal, lineItems: [] });

      await expect(sendProposal('proposal-123')).rejects.toThrow(ProposalServiceError);
      await expect(sendProposal('proposal-123')).rejects.toMatchObject({
        code: 'MISSING_LINE_ITEMS'
      });
    });

    it('should throw error if proposal total is zero', async () => {
      mockStorage.getProposalById.mockResolvedValue({ ...mockProposal, totalAmount: 0 });

      await expect(sendProposal('proposal-123')).rejects.toThrow(ProposalServiceError);
      await expect(sendProposal('proposal-123')).rejects.toMatchObject({
        code: 'INVALID_TOTAL'
      });
    });

    it('should throw error if lead has no email', async () => {
      mockStorage.getProposalById.mockResolvedValue(mockProposal);
      mockStorage.getCompanyById.mockResolvedValue({ ...mockLead, email: null });

      await expect(sendProposal('proposal-123')).rejects.toThrow(ProposalServiceError);
      await expect(sendProposal('proposal-123')).rejects.toMatchObject({
        code: 'MISSING_EMAIL'
      });
    });

    it('should continue if email fails but status update succeeds', async () => {
      mockStorage.getProposalById.mockResolvedValue(mockProposal);
      mockStorage.getCompanyById.mockResolvedValue(mockLead);
      mockStorage.updateProposal.mockResolvedValue({ ...mockProposal, status: 'sent' });
      mockSendEmail.mockRejectedValue(new Error('Email failed'));

      const result = await sendProposal('proposal-123');

      expect(result.status).toBe('sent');
      expect(mockStorage.updateProposal).toHaveBeenCalled();
    });
  });

  describe('acceptProposal', () => {
    const mockProposal = {
      id: 'proposal-123',
      leadId: 104,
      status: 'sent',
      totalAmount: 3000,
      lineItems: [
        { description: 'Website Design', quantity: 1, unitPrice: 2500, total: 2500 },
        { description: 'Logo Design', quantity: 1, unitPrice: 500, total: 500 }
      ],
      notes: 'Test proposal',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockLead = {
      id: 104,
      name: 'Test Company',
      email: 'test@example.com'
    };

    const mockOrder = {
      id: 'order-456',
      companyId: '104',
      status: 'draft'
    };

    it('should successfully accept a sent proposal', async () => {
      mockStorage.getProposalById.mockResolvedValue(mockProposal);
      mockStorage.getCompanyById.mockResolvedValue(mockLead);
      mockStorage.updateProposal.mockResolvedValue({ ...mockProposal, status: 'accepted' });
      mockStorage.createOrder.mockResolvedValue(mockOrder);

      const result = await acceptProposal('proposal-123');

      expect(result.status).toBe('accepted');
      expect(mockStorage.updateProposal).toHaveBeenCalledWith('proposal-123', { status: 'accepted' });
      expect(mockStorage.createOrder).toHaveBeenCalledWith(expect.objectContaining({
        companyId: '104',
        status: 'draft',
        total: 3000
      }));
    });

    it('should throw error if proposal is not in sent status', async () => {
      mockStorage.getProposalById.mockResolvedValue({ ...mockProposal, status: 'draft' });

      await expect(acceptProposal('proposal-123')).rejects.toThrow(ProposalServiceError);
      await expect(acceptProposal('proposal-123')).rejects.toMatchObject({
        code: 'INVALID_STATUS_TRANSITION'
      });
    });

    it('should revert status if order creation fails', async () => {
      mockStorage.getProposalById.mockResolvedValue(mockProposal);
      mockStorage.getCompanyById.mockResolvedValue(mockLead);
      mockStorage.updateProposal.mockResolvedValue({ ...mockProposal, status: 'accepted' });
      mockStorage.createOrder.mockRejectedValue(new Error('Order creation failed'));

      await expect(acceptProposal('proposal-123')).rejects.toThrow(ProposalServiceError);
      await expect(acceptProposal('proposal-123')).rejects.toMatchObject({
        code: 'ORDER_CREATION_FAILED'
      });

      // Should attempt to revert status
      expect(mockStorage.updateProposal).toHaveBeenCalledWith('proposal-123', { status: 'sent' });
    });
  });

  describe('rejectProposal', () => {
    const mockProposal = {
      id: 'proposal-123',
      leadId: 104,
      status: 'sent',
      totalAmount: 3000,
      lineItems: [
        { description: 'Website Design', quantity: 1, unitPrice: 2500, total: 2500 }
      ],
      notes: 'Test proposal',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should successfully reject a sent proposal', async () => {
      mockStorage.getProposalById.mockResolvedValue(mockProposal);
      mockStorage.updateProposal.mockResolvedValue({ ...mockProposal, status: 'rejected' });

      const result = await rejectProposal('proposal-123');

      expect(result.status).toBe('rejected');
      expect(mockStorage.updateProposal).toHaveBeenCalledWith('proposal-123', { status: 'rejected' });
    });

    it('should throw error if proposal is not in sent status', async () => {
      mockStorage.getProposalById.mockResolvedValue({ ...mockProposal, status: 'draft' });

      await expect(rejectProposal('proposal-123')).rejects.toThrow(ProposalServiceError);
      await expect(rejectProposal('proposal-123')).rejects.toMatchObject({
        code: 'INVALID_STATUS_TRANSITION'
      });
    });
  });

  describe('validateProposalForSending', () => {
    const validProposal = {
      id: 'proposal-123',
      leadId: 104,
      status: 'draft' as const,
      totalAmount: 3000,
      lineItems: [
        { description: 'Website Design', quantity: 1, unitPrice: 2500, total: 2500 },
        { description: 'Logo Design', quantity: 1, unitPrice: 500, total: 500 }
      ],
      notes: 'Test proposal',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should validate a correct proposal', () => {
      const result = validateProposalForSending(validProposal);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject proposal with no line items', () => {
      const proposal = { ...validProposal, lineItems: [] };
      const result = validateProposalForSending(proposal);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Proposal must have at least one line item');
    });

    it('should reject proposal with zero total', () => {
      const proposal = { ...validProposal, totalAmount: 0 };
      const result = validateProposalForSending(proposal);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Proposal total must be greater than zero');
    });

    it('should reject line items with missing descriptions', () => {
      const proposal = {
        ...validProposal,
        lineItems: [{ description: '', quantity: 1, unitPrice: 100, total: 100 }]
      };
      const result = validateProposalForSending(proposal);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Line item 1: Description is required');
    });

    it('should reject line items with incorrect totals', () => {
      const proposal = {
        ...validProposal,
        lineItems: [{ description: 'Test', quantity: 2, unitPrice: 100, total: 150 }] // Should be 200
      };
      const result = validateProposalForSending(proposal);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Line item 1: Total does not match quantity × unit price');
    });

    it('should reject proposal where total does not match sum of line items', () => {
      const proposal = {
        ...validProposal,
        totalAmount: 2000, // Should be 3000
        lineItems: [
          { description: 'Website', quantity: 1, unitPrice: 2500, total: 2500 },
          { description: 'Logo', quantity: 1, unitPrice: 500, total: 500 }
        ]
      };
      const result = validateProposalForSending(proposal);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Proposal total does not match sum of line items');
    });
  });
});