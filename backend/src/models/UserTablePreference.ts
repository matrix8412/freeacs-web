import { Schema, model, type InferSchemaType } from 'mongoose';

const userTablePreferenceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tableKey: { type: String, required: true, trim: true, maxlength: 100 },
    visibleColumns: { type: [String], default: [] }
  },
  { timestamps: true }
);

userTablePreferenceSchema.index({ userId: 1, tableKey: 1 }, { unique: true });

export type UserTablePreferenceDocument = InferSchemaType<typeof userTablePreferenceSchema> & { _id: string };
export const UserTablePreference = model('UserTablePreference', userTablePreferenceSchema);

