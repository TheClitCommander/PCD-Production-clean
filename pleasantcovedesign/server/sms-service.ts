/**
 * Simple Twilio SMS service wrapper.
 *
 * Supported env vars (either API Key or Auth Token auth):
 * - TWILIO_ACCOUNT_SID (required for both modes)
 * - TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET (preferred)
 * - or TWILIO_AUTH_TOKEN (legacy)
 * - TWILIO_FROM_NUMBER (required to send)
 */
export interface SmsRequest {
  to: string;
  body: string;
}

function createTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  // Lazy import to avoid requiring dependency at module load if not installed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const twilio = require('twilio');

  if (!accountSid) {
    return null;
  }

  if (apiKeySid && apiKeySecret) {
    return twilio(apiKeySid, apiKeySecret, { accountSid });
  }

  if (authToken) {
    return twilio(accountSid, authToken);
  }

  return null;
}

export async function sendSMS({ to, body }: SmsRequest): Promise<{ success: boolean; sid?: string; simulated?: boolean; error?: string }>
{
  const from = process.env.TWILIO_FROM_NUMBER;
  const client = createTwilioClient();

  if (!from || !client) {
    // Simulate in absence of credentials for safety
    console.log('📱 [SIMULATION] SMS would be sent', { to, from, body });
    return { success: true, simulated: true };
  }

  try {
    const msg: any = await client.messages.create({
      to,
      from,
      body,
    });
    console.log(`✅ SMS sent to ${to} (sid: ${msg.sid})`);
    return { success: true, sid: msg.sid };
  } catch (error: any) {
    console.error('❌ Failed to send SMS:', error?.message || error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

export function smsProviderStatus() {
  const status = {
    hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
    hasApiKey: !!process.env.TWILIO_API_KEY_SID && !!process.env.TWILIO_API_KEY_SECRET,
    hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
    hasFrom: !!process.env.TWILIO_FROM_NUMBER,
  };
  return status;
}


