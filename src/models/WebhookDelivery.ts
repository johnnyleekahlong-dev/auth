import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IWebhookDelivery extends Document {
  endpoint: Types.ObjectId;
  event: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  durationMs?: number;
  createdAt: Date;
}

const webhookDeliverySchema = new Schema<IWebhookDelivery>(
  {
    endpoint: {
      type: Schema.Types.ObjectId,
      ref: 'WebhookEndpoint',
      required: true,
      index: true,
    },
    event: { type: String, required: true },
    success: { type: Boolean, required: true },
    statusCode: Number,
    error: String,
    durationMs: Number,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export default mongoose.model<IWebhookDelivery>(
  'WebhookDelivery',
  webhookDeliverySchema,
);
