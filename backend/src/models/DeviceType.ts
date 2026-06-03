import { Schema, model, type InferSchemaType } from 'mongoose';

const deviceTypeSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    imageDataUrl: { type: String, default: '' }
  },
  { timestamps: true }
);

export type DeviceTypeDocument = InferSchemaType<typeof deviceTypeSchema> & { _id: string };
export const DeviceType = model('DeviceType', deviceTypeSchema);
