import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';

// Ensure environment variables are loaded - find .env in project root
// CommonJS __dirname is available by default
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
dotenv.config({ path: resolve(projectRoot, '.env') });

// Debug: Check if .env file exists and log its path
const envPath = resolve(projectRoot, '.env');
console.log('🔧 Loading .env from:', envPath);

// Initialize Stripe with API key from environment
const stripeApiKey = process.env.STRIPE_SECRET_KEY;

if (!stripeApiKey) {
  console.warn('⚠️ STRIPE_SECRET_KEY not found in environment variables');
  console.warn('💡 For production, set STRIPE_SECRET_KEY in your .env file');
}

// Initialize Stripe client (will be null if no API key)
export const stripe = stripeApiKey ? new Stripe(stripeApiKey, {
  apiVersion: '2025-06-30.basil'
}) : null;

// Stripe configuration - make webhook secret lazy loaded
export const STRIPE_CONFIG = {
  get webhookSecret() {
    // Lazy load the webhook secret when accessed, not at module load time
    return process.env.STRIPE_WEBHOOK_SECRET;
  },
  enabled: !!stripeApiKey,
  currency: 'usd',
  successUrl: process.env.STRIPE_SUCCESS_URL || 'https://pleasantcovedesign.com/payment/success',
  cancelUrl: process.env.STRIPE_CANCEL_URL || 'https://pleasantcovedesign.com/payment/cancel'
};

// Debug logging for webhook secret - called when webhook is actually used
export const debugWebhookConfig = () => {
  const secret = STRIPE_CONFIG.webhookSecret;
  console.log('🔧 Stripe Webhook Debug:');
  console.log('  - API Key present:', !!stripeApiKey);
  console.log('  - Webhook Secret present:', !!secret);
  console.log('  - Webhook Secret first 10 chars:', secret ? secret.substring(0, 10) + '...' : 'undefined');
};

/**
 * Create a Stripe payment link for an order
 */
export async function createPaymentLink(order: {
  id: string;
  total: number;
  package?: string;
  invoiceId?: string;
  companyId: string;
}): Promise<string | null> {
  if (!stripe) {
    console.warn('⚠️ Stripe not configured - cannot create payment link');
    return null;
  }

  try {
    // Create product for this order
    const product = await stripe.products.create({
      name: `${order.package ? `${order.package.charAt(0).toUpperCase() + order.package.slice(1)} Package` : 'Website Package'} - Order ${order.id.slice(-8)}`,
      description: `Pleasant Cove Design website package for order ${order.id}`,
      metadata: {
        order_id: order.id,
        invoice_id: order.invoiceId || '',
        company_id: order.companyId
      }
    });

    // Create price for the product
    const price = await stripe.prices.create({
      unit_amount: Math.round(order.total * 100), // Convert to cents
      currency: STRIPE_CONFIG.currency,
      product: product.id,
      metadata: {
        order_id: order.id,
        invoice_id: order.invoiceId || ''
      }
    });

    // Create payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1
        }
      ],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${STRIPE_CONFIG.successUrl}?order_id=${order.id}`
        }
      },
      metadata: {
        order_id: order.id,
        invoice_id: order.invoiceId || '',
        company_id: order.companyId
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA']
      }
    });

    console.log(`✅ Created Stripe payment link for order ${order.id}: ${paymentLink.url}`);
    return paymentLink.url;

  } catch (error) {
    console.error('❌ Failed to create Stripe payment link:', error);
    return null;
  }
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event | null {
  // Debug webhook configuration when verification is attempted
  debugWebhookConfig();
  
  if (!stripe || !STRIPE_CONFIG.webhookSecret) {
    console.warn('⚠️ Stripe webhook verification not configured');
    return null;
  }

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      STRIPE_CONFIG.webhookSecret
    );
    return event;
  } catch (error) {
    console.error('❌ Stripe webhook signature verification failed:', error);
    return null;
  }
}

/**
 * Get payment status from Stripe
 */
export async function getPaymentStatus(paymentIntentId: string): Promise<string | null> {
  if (!stripe) {
    return null;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent.status;
  } catch (error) {
    console.error('❌ Failed to get payment status:', error);
    return null;
  }
}

// Export configuration for other modules
export { STRIPE_CONFIG as default }; 