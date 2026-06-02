import { Schema, model, type InferSchemaType } from 'mongoose';

const deviceAuthorizationSchema = new Schema(
  {
    deviceId: { type: String, required: true, unique: true, trim: true },
    firstAuthorizedAt: { type: Date, required: true, default: Date.now }
  },
  { timestamps: true }
);

export type DeviceAuthorizationDocument = InferSchemaType<typeof deviceAuthorizationSchema> & { _id: string };
export const DeviceAuthorization = model('DeviceAuthorization', deviceAuthorizationSchema);

