import mongoose, { Document, Schema } from 'mongoose';

export const WEBHOOK_EVENT = {
  USER_CREATED: 'user.created',
  USER_LOGIN: 'user.login',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_PASSWORD_RESET: 'user.password_reset',
} as const;
export type WebhookEvent = (typeof WEBHOOK_EVENT)[keyof typeof WEBHOOK_EVENT];

export interface IWebhookEndpoint extends Document {
  url: string;
  secret: string;
  events: string[];
  description?: string;
  isActive: boolean;
  lastDeliveryAt?: Date;
  lastDeliverySuccess?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const webhookEndpointSchema = new Schema<IWebhookEndpoint>(
  {
    url: { type: String, required: true },
    secret: { type: String, required: true },
    events: {
      type: [String],
      default: ['user.created'],
    },
    description: String,
    isActive: { type: Boolean, default: true },
    lastDeliveryAt: Date,
    lastDeliverySuccess: Boolean,
  },
  { timestamps: true },
);

export default mongoose.model<IWebhookEndpoint>(
  'WebhookEndpoint',
  webhookEndpointSchema,
);
