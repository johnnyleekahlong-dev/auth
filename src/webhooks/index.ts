// utils/webhooks.ts (Express/auth service)
import crypto from 'crypto';

type UserCreatedPayload = {
  authUserId: string;
  name: string;
  email: string;
};

export async function sendUserCreatedWebhook(data: UserCreatedPayload) {
  const body = JSON.stringify({ type: 'user.created', data });
  const timestamp = Date.now().toString();

  // Sign exactly the bytes being sent — the receiver must verify against
  // this same raw string, not a re-serialized version of the parsed JSON.
  const signature = crypto
    .createHmac('sha256', process.env.AUTH_WEBHOOK_SECRET!)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  try {
    await fetch(`${process.env.ASSET_MANAGEMENT_API}/api/webhooks/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-timestamp': timestamp,
        'x-webhook-signature': signature,
      },
      body,
    });
  } catch (err) {
    console.error('Failed to send user.created webhook:', err);
    // Not rethrown — a failed sync shouldn't block account verification.
  }
}
