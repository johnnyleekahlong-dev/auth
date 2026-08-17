import { Request, Response } from 'express';
import EventType from '../models/EventType';
import WebhookEndpoint from '../models/WebhookEndpoint';
import { fireEventNow } from '../webhooks';

const KEY_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

function isValidPayloadTemplate(
  template: unknown,
): template is Record<string, string> {
  if (
    typeof template !== 'object' ||
    template === null ||
    Array.isArray(template)
  )
    return false;
  return Object.entries(template).every(
    ([k, v]) => typeof k === 'string' && k.length > 0 && typeof v === 'string',
  );
}

// GET /admin/event-types
export const listEventTypes = async (_req: Request, res: Response) => {
  try {
    const eventTypes = await EventType.find().sort({ isBuiltIn: -1, key: 1 });
    return res.status(200).json({ success: true, eventTypes });
  } catch (error: any) {
    console.error('Error in listEventTypes:', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// GET /admin/event-types/:key
export const getEventType = async (req: Request, res: Response) => {
  try {
    const eventType = await EventType.findOne({ key: req.params.key });
    if (!eventType) {
      return res
        .status(404)
        .json({ success: false, message: 'Event type not found' });
    }
    return res.status(200).json({ success: true, eventType });
  } catch (error: any) {
    console.error('Error in getEventType:', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// POST /admin/event-types  { key, label, description?, availableFields?, payloadTemplate? }
// Always creates a custom (isBuiltIn: false) event type — built-ins are
// only ever created by the startup seed in webhooks/seedEventTypes.ts,
// since they need a matching call site in the actual code.
export const createEventType = async (req: Request, res: Response) => {
  try {
    const { key, label, description, availableFields, payloadTemplate } =
      req.body;

    if (!key || !KEY_PATTERN.test(key)) {
      return res.status(400).json({
        success: false,
        message:
          'key must be lowercase, dot-separated segments, e.g. "order.shipped"',
      });
    }
    if (!label) {
      return res
        .status(400)
        .json({ success: false, message: 'label is required' });
    }
    if (availableFields !== undefined && !Array.isArray(availableFields)) {
      return res.status(400).json({
        success: false,
        message: 'availableFields must be an array of strings',
      });
    }
    if (
      payloadTemplate !== undefined &&
      !isValidPayloadTemplate(payloadTemplate)
    ) {
      return res.status(400).json({
        success: false,
        message: 'payloadTemplate must be an object of string -> string',
      });
    }

    const existing = await EventType.findOne({ key });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An event type with that key already exists',
      });
    }

    const eventType = await EventType.create({
      key,
      label,
      description,
      availableFields: availableFields || [],
      payloadTemplate,
      isBuiltIn: false,
    });

    return res.status(201).json({ success: true, eventType });
  } catch (error: any) {
    console.error('Error in createEventType:', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// PATCH /admin/event-types/:key  { label?, description?, availableFields?, payloadTemplate? }
// `key` itself is immutable (it's what endpoints subscribe by and what
// dispatchWebhookEvent is called with from code — renaming it would
// silently break both). For built-ins, availableFields is also locked:
// it reflects what the actual call site provides, not something the
// dashboard can change. Everything else is editable for both kinds,
// including payloadTemplate on a built-in — that's the actual
// "customize the payload shape" feature.
export const updateEventType = async (req: Request, res: Response) => {
  try {
    const { label, description, availableFields, payloadTemplate } = req.body;
    const eventType = await EventType.findOne({ key: req.params.key });

    if (!eventType) {
      return res
        .status(404)
        .json({ success: false, message: 'Event type not found' });
    }

    if (label !== undefined) eventType.label = label;
    if (description !== undefined) eventType.description = description;

    if (availableFields !== undefined) {
      if (eventType.isBuiltIn) {
        return res.status(400).json({
          success: false,
          message:
            'availableFields is fixed by the code for built-in event types',
        });
      }
      if (!Array.isArray(availableFields)) {
        return res.status(400).json({
          success: false,
          message: 'availableFields must be an array of strings',
        });
      }
      eventType.availableFields = availableFields;
    }

    if (payloadTemplate !== undefined) {
      if (
        payloadTemplate !== null &&
        !isValidPayloadTemplate(payloadTemplate)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'payloadTemplate must be an object of string -> string, or null to clear it',
        });
      }
      // null explicitly clears it back to "send full context" default —
      // Mongoose won't unset a Mixed field from `undefined` alone.
      eventType.payloadTemplate =
        payloadTemplate === null ? undefined : payloadTemplate;
    }

    await eventType.save();
    return res.status(200).json({ success: true, eventType });
  } catch (error: any) {
    console.error('Error in updateEventType:', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// DELETE /admin/event-types/:key
// Built-ins can't be deleted — they'd just get re-created by the seed on
// the next restart anyway, since a real call site still fires them.
// Deleting a custom type also unsubscribes it from any endpoint
// currently listing it, so nothing is left pointing at a dead key.
export const deleteEventType = async (req: Request, res: Response) => {
  try {
    const eventType = await EventType.findOne({ key: req.params.key });
    if (!eventType) {
      return res
        .status(404)
        .json({ success: false, message: 'Event type not found' });
    }
    if (eventType.isBuiltIn) {
      return res.status(400).json({
        success: false,
        message: 'Built-in event types cannot be deleted',
      });
    }

    await EventType.deleteOne({ key: eventType.key });
    await WebhookEndpoint.updateMany(
      { events: eventType.key },
      { $pull: { events: eventType.key } },
    );

    return res
      .status(200)
      .json({ success: true, message: 'Event type deleted' });
  } catch (error: any) {
    console.error('Error in deleteEventType:', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// POST /admin/event-types/:key/fire  { context? }
// Manually dispatches this event right now with an admin-supplied context
// object, and waits for the result — mainly for custom event types
// (which have no real code trigger), but works for built-ins too as a way
// to test a payload template with sample data without waiting for the
// real trigger to happen.
export const fireEventType = async (req: Request, res: Response) => {
  try {
    const eventType = await EventType.findOne({ key: req.params.key });
    if (!eventType) {
      return res
        .status(404)
        .json({ success: false, message: 'Event type not found' });
    }

    const context =
      req.body.context && typeof req.body.context === 'object'
        ? req.body.context
        : {};
    const result = await fireEventNow(eventType.key, context);

    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error in fireEventType:', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};
