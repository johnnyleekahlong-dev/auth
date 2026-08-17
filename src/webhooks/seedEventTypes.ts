import EventType from '../models/EventType';
import { WEBHOOK_EVENT } from '../models/WebhookEndpoint';

// One entry per real call site in the codebase (see webhooks/index.ts and
// its callers) — availableFields must match exactly what that call site
// passes as context, since that's the set a payload template can draw on.
const BUILT_IN_EVENT_TYPES = [
  {
    key: WEBHOOK_EVENT.USER_CREATED,
    label: 'User created',
    description:
      'Fires on self-registration (after email verification) and when an admin creates a user directly.',
    availableFields: ['authUserId', 'name', 'email', 'source'],
  },
  {
    key: WEBHOOK_EVENT.USER_LOGIN,
    label: 'User logged in',
    description: 'Fires after a successful login.',
    availableFields: ['authUserId', 'name', 'email', 'loginAt'],
  },
  {
    key: WEBHOOK_EVENT.USER_UPDATED,
    label: 'User updated',
    description:
      'Fires when an admin changes a user\u2019s role or verification status.',
    availableFields: ['authUserId', 'email', 'changes'],
  },
  {
    key: WEBHOOK_EVENT.USER_DELETED,
    label: 'User deleted',
    description: 'Fires when an admin deletes a user.',
    availableFields: ['authUserId', 'email'],
  },
  {
    key: WEBHOOK_EVENT.USER_PASSWORD_RESET,
    label: 'Password reset',
    description: 'Fires after a user completes a password reset.',
    availableFields: ['authUserId', 'email'],
  },
];

// Upserts each built-in by key. Only touches label/description/
// availableFields (the parts the code, not the admin, owns) — an existing
// payloadTemplate an admin configured is left untouched on every restart.
export async function ensureBuiltInEventTypes() {
  await Promise.all(
    BUILT_IN_EVENT_TYPES.map((def) =>
      EventType.findOneAndUpdate(
        { key: def.key },
        {
          $set: {
            label: def.label,
            description: def.description,
            availableFields: def.availableFields,
            isBuiltIn: true,
          },
        },
        { upsert: true, new: true },
      ),
    ),
  );
}
