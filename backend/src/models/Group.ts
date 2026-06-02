import { Schema, model, type InferSchemaType } from 'mongoose';

const groupSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 500 },
    permissions: { type: [String], default: [] },
    system: { type: Boolean, default: false }
  },
  { timestamps: true }
);
export type GroupDocument = InferSchemaType<typeof groupSchema> & { _id: string };
export const Group = model('Group', groupSchema);
