import { Schema, model, type InferSchemaType } from 'mongoose';

const appSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);
export type AppSettingDocument = InferSchemaType<typeof appSettingSchema> & { _id: string };
export const AppSetting = model('AppSetting', appSettingSchema);
