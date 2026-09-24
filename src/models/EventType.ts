import mongoose, { Document, Schema } from 'mongoose';

export interface IEventType extends Document {
  key: string;
  label: string;
  description?: string;
  availableFields: string[];
  payloadTemplate?: Record<string, string>;
  isBuiltIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const eventTypeSchema = new Schema<IEventType>(
  {
    key: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    description: String,
    availableFields: { type: [String], default: [] },
    payloadTemplate: { type: Schema.Types.Mixed, default: undefined },
    isBuiltIn: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model<IEventType>('EventType', eventTypeSchema);
