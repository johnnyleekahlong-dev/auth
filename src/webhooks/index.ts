import crypto from 'crypto';
import WebhookEndpoint from '../models/WebhookEndpoint';
import WebhookDelivery from '../models/WebhookDelivery';
import EventType from '../models/EventType';

// Signs and POSTs `body` to a single endpoint, records the attempt, and
// updates the endpoint's lastDelivery* summary fields. Used both by the
// fire-and-forget dispatch below and by the admin "send test" action,
// which wants the same signing/logging behavior but for one endpoint,
// synchronously, so it can return the result to the caller.
async function deliverTo(
  endpoint: InstanceType<typeof WebhookEndpoint>,
  event: string,
  data: unknown,
) {
  const body = JSON.stringify({ type: event, data });
  const timestamp = Date.now().toString();

  // Sign exactly the bytes being sent — the receiver must verify against
  // this same raw string, not a re-serialized version of the parsed JSON.
  const signature = crypto
    .createHmac('sha256', endpoint.secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  const startedAt = Date.now();
  let success = false;
  let statusCode: number | undefined;
  let error: string | undefined;

  try {
    const res = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-timestamp': timestamp,
        'x-webhook-signature': signature,
      },
      body,
    });
    statusCode = res.status;
    success = res.ok;
    if (!res.ok) error = `Endpoint responded with ${res.status}`;
  } catch (err: any) {
    error = err?.message || 'Request failed';
  }

  const durationMs = Date.now() - startedAt;

  await Promise.all([
    WebhookDelivery.create({
      endpoint: endpoint._id,
      event,
      success,
      statusCode,
      error,
      durationMs,
    }),
    WebhookEndpoint.findByIdAndUpdate(endpoint._id, {
      lastDeliveryAt: new Date(),
      lastDeliverySuccess: success,
    }),
  ]);

  return { success, statusCode, error, durationMs };
}

// Resolves a single template string against a context object. A value
// that's *exactly* "{{field}}" (nothing else) returns context.field as-is
// — preserves type, so a template can pass through an object/number/bool
// untouched. Anything with {{field}} embedded in a longer string gets
// that field stringified and substituted in place (multiple placeholders
// allowed). Unknown fields resolve to an empty string rather than
// throwing — a stale template referencing a removed field degrades
// quietly instead of breaking delivery.
function resolveTemplateValue(
  template: string,
  context: Record<string, any>,
): unknown {
  const exact = template.match(/^\{\{\s*([\w.]+)\s*\}\}$/);
  if (exact) return context[exact[1]];

  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, field) => {
    const value = context[field];
    return value === undefined || value === null ? '' : String(value);
  });
}

// Reshapes `context` into the output payload per the event type's
// template. No template configured (the default) means "send the raw
// context through unchanged" — this is exactly the old behavior, so
// existing endpoints keep working with zero configuration.
function applyPayloadTemplate(
  template: Record<string, string> | undefined,
  context: unknown,
): unknown {
  if (!template || Object.keys(template).length === 0) return context;
  if (typeof context !== 'object' || context === null) return context;

  const ctx = context as Record<string, any>;
  const result: Record<string, unknown> = {};
  for (const [outputField, expr] of Object.entries(template)) {
    result[outputField] = resolveTemplateValue(expr, ctx);
  }
  return result;
}

// Fire-and-forget dispatch to every active endpoint subscribed to
// `eventKey`. Failures are logged (both to WebhookDelivery and console)
// but never thrown — a broken downstream integration shouldn't block the
// request that triggered it (login, account creation, etc).
export async function dispatchWebhookEvent(eventKey: string, context: unknown) {
  try {
    const eventType = await EventType.findOne({ key: eventKey });
    const payload = applyPayloadTemplate(eventType?.payloadTemplate, context);

    const endpoints = await WebhookEndpoint.find({
      isActive: true,
      events: eventKey,
    });
    await Promise.allSettled(
      endpoints.map((ep) => deliverTo(ep, eventKey, payload)),
    );
  } catch (err: any) {
    console.error(`Failed to dispatch ${eventKey} webhooks:`, err.message);
  }
}

// Same as dispatchWebhookEvent, but awaited and returns per-endpoint
// results instead of firing blind — used by the admin "fire event"
// action (mainly for custom event types, which have no real code trigger
// of their own) so the dashboard can show what actually happened.
export async function fireEventNow(eventKey: string, context: unknown) {
  const eventType = await EventType.findOne({ key: eventKey });
  const payload = applyPayloadTemplate(eventType?.payloadTemplate, context);

  const endpoints = await WebhookEndpoint.find({
    isActive: true,
    events: eventKey,
  });
  const results = await Promise.all(
    endpoints.map(async (ep: any) => ({
      endpointId: ep._id.toString(),
      url: ep.url,
      ...(await deliverTo(ep, eventKey, payload)),
    })),
  );

  return { deliveredTo: results.length, results };
}

// Used by the admin "send test" action on a webhook endpoint — delivers a
// synthetic payload to one specific endpoint right away, bypassing
// event-type/subscription lookup entirely (you're explicitly testing
// this one endpoint's connectivity, not simulating a real event).
export async function sendTestWebhook(
  endpoint: InstanceType<typeof WebhookEndpoint>,
) {
  return deliverTo(endpoint, 'webhook.test', {
    message: 'This is a test delivery from your auth service admin dashboard.',
    sentAt: new Date().toISOString(),
  });
}
