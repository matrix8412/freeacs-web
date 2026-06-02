import { Schema, model, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    passwordHash: { type: String, required: true },
    groupIds: [{ type: Schema.Types.ObjectId, ref: 'Group' }],
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);
userSchema.set('toJSON', {
  transform(_doc, ret) {
    const output = ret as Record<string, unknown>;
    delete output.passwordHash;
    delete output.__v;
    return ret;
  }
});

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: string };
export const User = model('User', userSchema);
