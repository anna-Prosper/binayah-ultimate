import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAuthUser extends Document {
  email: string;
  passwordHash: string;
  fixedUserId: string;
  // Master switch — if false, no emails of any kind (immediate or digest)
  emailNotifications: boolean;
  // Per-event opt-outs (default true). All keys are optional —
  // a missing field is treated as true for backwards compatibility.
  notifyMention?: boolean;
  notifyApproved?: boolean;
  notifyAssigned?: boolean;
  notifyClaim?: boolean;
  notifyStatus?: boolean;
  notifyComment?: boolean;
  notifySubtask?: boolean;
  createdAt: Date;
}

const AuthUserSchema = new Schema<IAuthUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  fixedUserId: { type: String, required: true },
  emailNotifications: { type: Boolean, default: true },
  notifyMention: { type: Boolean, default: true },
  notifyApproved: { type: Boolean, default: true },
  notifyAssigned: { type: Boolean, default: true },
  notifyClaim: { type: Boolean, default: true },
  notifyStatus: { type: Boolean, default: true },
  notifyComment: { type: Boolean, default: true },
  notifySubtask: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// Avoid model re-registration in Next.js hot reload
const AuthUser: Model<IAuthUser> =
  (mongoose.models.AuthUser as Model<IAuthUser>) ||
  mongoose.model<IAuthUser>("AuthUser", AuthUserSchema);

export default AuthUser;
