import { Request, Response } from 'express';
import crypto from 'crypto';
import WebhookEndpoint from '../models/WebhookEndpoint';
import WebhookDelivery from '../models/WebhookDelivery';
import EventType from '../models/EventType';
import { sendTestWebhook } from '../webhooks';

// Events are valid if the key exists in the EventType collection.
async function validateEvents(events: unknown): Promise<string[] | null> {
  if (!Array.isArray(events) || events.length === 0) return null;
  if (!events.every((e) => typeof e === 'string')) return null;

  const found = await EventType.find({ key: { $in: events } }).select('key');
  const foundKeys = new Set(found.map((e) => e.key));
  const allExist = events.every((e) => foundKeys.has(e));

  return allExist ? events : null;
}

// GET /admin/webhooks
export const listEndpoints = async (_req: Request, res: Response) => {
  try {
    const [endpoints, eventTypes] = await Promise.all([
      WebhookEndpoint.find().select('-secret').sort({ createdAt: -1 }),
      EventType.find().select('key label').sort({ key: 1 }),
    ]);
    return res
      .status(200)
      .json({ success: true, endpoints, availableEvents: eventTypes });
  } catch (error: any) {
    console.error('Error in listEndpoints:', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// GET /admin/webhooks/:id
export const getEndpoint = async (req: Request, res: Response) => {
  try {
    const endpoint = await WebhookEndpoint.findById(req.params.id).select(
      '-secret',
    );
    if (!endpoint) {
      return res
        .status(404)
        .json({ success: false, message: 'Webhook endpoint not found' });
    }
    return res.status(200).json({ success: true, endpoint });
  } catch (error: any) {
    console.error('Error in getEndpoint:', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// POST /admin/webhooks  { url, events, description? }
export const createEndpoint = async (req: Request, res: Response) => {
  try {
    const { url, events, description } = req.body;

    if (!url) {
      return res
        .status(400)
        .json({ success: false, message: 'url is required' });
    }
    try {
      new URL(url);
    } catch {
      return res
        .status(400)
        .json({ success: false, message: 'url must be a valid URL' });
    }

    const requestedEvents = events && events.length ? events : ['user.created'];
    const validEvents = await validateEvents(requestedEvents);
    if (!validEvents) {
      return res.status(400).json({
        success: false,
        message:
          'events must be a non-empty array of existing event type keys (see GET /admin/event-types)',
      });
    }

    const secret = crypto.randomBytes(24).toString('hex');

    const endpoint = await WebhookEndpoint.create({
      url,
      events: validEvents,
      description,
      secret,
    });

    const { secret: _omit, ...rest } = endpoint.toObject();
    return res.status(201).json({ success: true, endpoint: rest, secret });
  } catch (error: any) {
    console.error('Error in createEndpoint:', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// PATCH /admin/webhooks/:id  { url?, events?, description?, isActive? }
export const updateEndpoint = async (req: Request, res: Response) => {
  try {
    const { url, events, description, isActive } = req.body;
    const update: Record<string, unknown> = {};

    if (url !== undefined) {
      try {
        new URL(url);
      } catch {
        return res
          .status(400)
          .json({ success: false, message: 'url must be a valid URL' });
      }
      update.url = url;
    }

    if (events !== undefined) {
      const validEvents = await validateEvents(events);
      if (!validEvents) {
        return res.status(400).json({
          success: false,
          message:
            'events must be a non-empty array of existing event type keys (see GET /admin/event-types)',
        });
      }
      update.events = validEvents;
    }

    if (description !== undefined) update.description = description;
    if (isActive !== undefined) update.isActive = Boolean(isActive);

    const endpoint = await WebhookEndpoint.findByIdAndUpdate(
      req.params.id,
      update,
      {
        new: true,
      },
    ).select('-secret');

    if (!endpoint) {
      return res
        .status(404)
        .json({ success: false, message: 'Webhook endpoint not found' });
    }

    return res.status(200).json({ success: true, endpoint });
  } catch (error: any) {
    console.error('Error in updateEndpoint:', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// POST /admin/webhooks/:id/rotate-secret
export const rotateSecret = async (req: Request, res: Response) => {
  try {
    const secret = crypto.randomBytes(24).toString('hex');
    const endpoint = await WebhookEndpoint.findByIdAndUpdate(
      req.params.id,
      { secret },
      { new: true },
    ).select('-secret');

    if (!endpoint) {
      return res
        .status(404)
        .json({ success: false, message: 'Webhook endpoint not found' });
    }

    return res.status(200).json({ success: true, endpoint, secret });
  } catch (error: any) {
    console.error('Error in rotateSecret:', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// DELETE /admin/webhooks/:id
export const deleteEndpoint = async (req: Request, res: Response) => {
  try {
    const endpoint = await WebhookEndpoint.findByIdAndDelete(req.params.id);
    if (!endpoint) {
      return res
        .status(404)
        .json({ success: false, message: 'Webhook endpoint not found' });
    }
    await WebhookDelivery.deleteMany({ endpoint: endpoint._id });
    return res
      .status(200)
      .json({ success: true, message: 'Webhook endpoint deleted' });
  } catch (error: any) {
    console.error('Error in deleteEndpoint:', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// POST /admin/webhooks/:id/test
export const testEndpoint = async (req: Request, res: Response) => {
  try {
    const endpoint = await WebhookEndpoint.findById(req.params.id);
    if (!endpoint) {
      return res
        .status(404)
        .json({ success: false, message: 'Webhook endpoint not found' });
    }

    const result = await sendTestWebhook(endpoint);
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error('Error in testEndpoint:', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// GET /admin/webhooks/:id/deliveries
export const listDeliveries = async (req: Request, res: Response) => {
  try {
    const deliveries = await WebhookDelivery.find({ endpoint: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50);
    return res.status(200).json({ success: true, deliveries });
  } catch (error: any) {
    console.error('Error in listDeliveries:', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};
