// @ts-nocheck
import { storage } from './storage';
import { sendEmail } from './email-service';
import type { Proposal, Company, Order } from '../shared/schema';
import { nanoid } from 'nanoid';

/**
 * ProposalService - Core business logic for proposal workflow
 * Handles state transitions: draft → sent → accepted/rejected
 */

export class ProposalServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ProposalServiceError';
  }
}

/**
 * Send a proposal to a client (draft → sent)
 */
export async function sendProposal(id: string): Promise<Proposal> {
  console.log(`📤 Sending proposal ${id}...`);
  
  const proposal = await storage.getProposalById(id);
  if (!proposal) {
    throw new ProposalServiceError('Proposal not found', 'PROPOSAL_NOT_FOUND');
  }

  // Validate current status
  if (proposal.status !== 'draft') {
    throw new ProposalServiceError(
      `Cannot send proposal with status "${proposal.status}". Must be "draft".`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  // Validate proposal has required data
  if (!proposal.lineItems || proposal.lineItems.length === 0) {
    throw new ProposalServiceError(
      'Cannot send proposal without line items',
      'MISSING_LINE_ITEMS'
    );
  }

  if (proposal.totalAmount <= 0) {
    throw new ProposalServiceError(
      'Cannot send proposal with zero or negative total',
      'INVALID_TOTAL'
    );
  }

  // Get lead information
  const lead = await storage.getCompanyById(proposal.leadId);
  if (!lead) {
    throw new ProposalServiceError('Lead not found for proposal', 'LEAD_NOT_FOUND');
  }

  if (!lead.email) {
    throw new ProposalServiceError('Lead must have email address to send proposal', 'MISSING_EMAIL');
  }

  // Update proposal status
  const updatedProposal = await storage.updateProposal(id, {
    status: 'sent'
  });

  if (!updatedProposal) {
    throw new ProposalServiceError('Failed to update proposal status', 'UPDATE_FAILED');
  }

  // Send notification email
  try {
    await sendProposalNotification(updatedProposal, lead);
    console.log(`✅ Proposal ${id} sent successfully to ${lead.email}`);
  } catch (emailError) {
    console.warn(`⚠️ Proposal status updated but email failed for ${id}:`, emailError);
    // Don't throw here - proposal was successfully sent even if email failed
  }

  return updatedProposal;
}

/**
 * Accept a proposal (sent → accepted)
 * Creates order and converts lead to client
 */
export async function acceptProposal(id: string): Promise<Proposal> {
  console.log(`✅ Accepting proposal ${id}...`);
  
  const proposal = await storage.getProposalById(id);
  if (!proposal) {
    throw new ProposalServiceError('Proposal not found', 'PROPOSAL_NOT_FOUND');
  }

  // Validate current status
  if (proposal.status !== 'sent') {
    throw new ProposalServiceError(
      `Cannot accept proposal with status "${proposal.status}". Must be "sent".`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  // Get lead information
  const lead = await storage.getCompanyById(proposal.leadId);
  if (!lead) {
    throw new ProposalServiceError('Lead not found for proposal', 'LEAD_NOT_FOUND');
  }

  // Update proposal status
  const updatedProposal = await storage.updateProposal(id, {
    status: 'accepted'
  });

  if (!updatedProposal) {
    throw new ProposalServiceError('Failed to update proposal status', 'UPDATE_FAILED');
  }

  // Create order from proposal
  try {
    const order = await createOrderFromProposal(updatedProposal, lead);
    console.log(`📋 Order ${order.id} created from proposal ${id}`);
  } catch (orderError) {
    console.error(`❌ Failed to create order from proposal ${id}:`, orderError);
    // Revert proposal status on order creation failure
    await storage.updateProposal(id, { status: 'sent' });
    throw new ProposalServiceError('Failed to create order from proposal', 'ORDER_CREATION_FAILED');
  }

  // TODO: Convert lead to client (when client management is implemented)
  // TODO: Send welcome email (when email templates are ready)

  console.log(`✅ Proposal ${id} accepted and order created`);
  return updatedProposal;
}

/**
 * Reject a proposal (sent → rejected)
 */
export async function rejectProposal(id: string): Promise<Proposal> {
  console.log(`❌ Rejecting proposal ${id}...`);
  
  const proposal = await storage.getProposalById(id);
  if (!proposal) {
    throw new ProposalServiceError('Proposal not found', 'PROPOSAL_NOT_FOUND');
  }

  // Validate current status
  if (proposal.status !== 'sent') {
    throw new ProposalServiceError(
      `Cannot reject proposal with status "${proposal.status}". Must be "sent".`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  // Update proposal status
  const updatedProposal = await storage.updateProposal(id, {
    status: 'rejected'
  });

  if (!updatedProposal) {
    throw new ProposalServiceError('Failed to update proposal status', 'UPDATE_FAILED');
  }

  console.log(`✅ Proposal ${id} rejected`);
  return updatedProposal;
}

/**
 * Send proposal notification email to client
 */
async function sendProposalNotification(proposal: Proposal, lead: Company): Promise<void> {
  const proposalUrl = `${process.env.FRONTEND_URL || 'https://pleasantcovedesign.com'}/proposals/${proposal.id}`;
  
  const subject = `Your Website Proposal from Pleasant Cove Design`;
  
  const text = `
Hi ${lead.name || 'there'},

Thank you for your interest in Pleasant Cove Design! We've prepared a custom proposal for your website project.

Proposal Summary:
- Total Investment: $${proposal.totalAmount.toLocaleString()}
- ${proposal.lineItems.length} service${proposal.lineItems.length > 1 ? 's' : ''} included

To review and respond to your proposal, please visit:
${proposalUrl}

If you have any questions, please don't hesitate to reach out.

Best regards,
The Pleasant Cove Design Team

---
This proposal is valid for 30 days from the date sent.
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Your Website Proposal</h2>
      
      <p>Hi ${lead.name || 'there'},</p>
      
      <p>Thank you for your interest in Pleasant Cove Design! We've prepared a custom proposal for your website project.</p>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1e40af;">Proposal Summary</h3>
        <p><strong>Total Investment:</strong> $${proposal.totalAmount.toLocaleString()}</p>
        <p><strong>Services:</strong> ${proposal.lineItems.length} service${proposal.lineItems.length > 1 ? 's' : ''} included</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${proposalUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Review Your Proposal
        </a>
      </div>
      
      <p>If you have any questions, please don't hesitate to reach out.</p>
      
      <p>Best regards,<br>The Pleasant Cove Design Team</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #6b7280;">This proposal is valid for 30 days from the date sent.</p>
    </div>
  `;

  await sendEmail({
    to: lead.email!,
    subject,
    text,
    html
  });
}

/**
 * Create an order from an accepted proposal
 */
async function createOrderFromProposal(proposal: Proposal, lead: Company): Promise<Order> {
  const orderId = nanoid();
  
  // Convert proposal line items to order format
  const customItems = proposal.lineItems.map(item => ({
    id: nanoid(),
    orderId: orderId,
    description: item.description,
    category: 'custom' as const,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total
  }));

  const orderData = {
    id: orderId,
    companyId: proposal.leadId.toString(),
    status: 'draft' as const,
    package: undefined, // Custom proposal, no package
    customItems: customItems,
    subtotal: proposal.totalAmount,
    tax: 0, // TODO: Calculate tax based on location
    total: proposal.totalAmount,
    notes: `Order created from proposal ${proposal.id}. ${proposal.notes || ''}`.trim(),
    invoiceStatus: 'draft' as const,
    paymentStatus: 'pending' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const order = await storage.createOrder(orderData);
  return order;
}

/**
 * Validate proposal data for business rules
 */
export function validateProposalForSending(proposal: Proposal): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!proposal.lineItems || proposal.lineItems.length === 0) {
    errors.push('Proposal must have at least one line item');
  }

  if (proposal.totalAmount <= 0) {
    errors.push('Proposal total must be greater than zero');
  }

  // Validate line items
  proposal.lineItems?.forEach((item, index) => {
    if (!item.description?.trim()) {
      errors.push(`Line item ${index + 1}: Description is required`);
    }
    if (item.quantity <= 0) {
      errors.push(`Line item ${index + 1}: Quantity must be greater than zero`);
    }
    if (item.unitPrice <= 0) {
      errors.push(`Line item ${index + 1}: Unit price must be greater than zero`);
    }
    if (item.total !== item.quantity * item.unitPrice) {
      errors.push(`Line item ${index + 1}: Total does not match quantity × unit price`);
    }
  });

  // Validate total matches sum of line items
  const calculatedTotal = proposal.lineItems?.reduce((sum, item) => sum + item.total, 0) || 0;
  if (Math.abs(calculatedTotal - proposal.totalAmount) > 0.01) {
    errors.push('Proposal total does not match sum of line items');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}