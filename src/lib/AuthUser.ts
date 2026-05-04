import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAuthUser extends Document {
  email: string;
  passwordHash: string;
  fixedUserId: string;
  // Master switch — if false, no emails of any kind (immediate or digest)
  emailNotifications: boolean;
  inAppNotifications: boolean;
  // Per-event opt-outs (default true). All keys are optional —
  // a missing field is treated as true for backwards compatibility.
  notifyMention?: boolean;
  notifyApproved?: boolean;
  notifyAssigned?: boolean;
  notifyClaim?: boolean;
  notifyStatus?: boolean;
  notifyComment?: boolean;
  notifySubtask?: boolean;
  notifyReminder?: boolean;
  notifyRequest?: boolean;
  notifyDue?: boolean;
  notifyChat?: boolean;
  notifyDm?: boolean;
  notifyBug?: boolean;
  notifyOther?: boolean;
  inAppMention?: boolean;
  inAppApproved?: boolean;
  inAppAssigned?: boolean;
  inAppClaim?: boolean;
  inAppStatus?: boolean;
  inAppComment?: boolean;
  inAppSubtask?: boolean;
  inAppReminder?: boolean;
  inAppRequest?: boolean;
  inAppDue?: boolean;
  inAppChat?: boolean;
  inAppDm?: boolean;
  inAppBug?: boolean;
  inAppOther?: boolean;
  createdAt: Date;
}

const AuthUserSchema = new Schema<IAuthUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  fixedUserId: { type: String, required: true },
  emailNotifications: { type: Boolean, default: true },
  inAppNotifications: { type: Boolean, default: true },
  notifyMention: { type: Boolean, default: true },
  notifyApproved: { type: Boolean, default: true },
  notifyAssigned: { type: Boolean, default: true },
  notifyClaim: { type: Boolean, default: true },
  notifyStatus: { type: Boolean, default: true },
  notifyComment: { type: Boolean, default: true },
  notifySubtask: { type: Boolean, default: true },
  notifyReminder: { type: Boolean, default: true },
  notifyRequest: { type: Boolean, default: true },
  notifyDue: { type: Boolean, default: true },
  notifyChat: { type: Boolean, default: true },
  notifyDm: { type: Boolean, default: true },
  notifyBug: { type: Boolean, default: true },
  notifyOther: { type: Boolean, default: true },
  inAppMention: { type: Boolean, default: true },
  inAppApproved: { type: Boolean, default: true },
  inAppAssigned: { type: Boolean, default: true },
  inAppClaim: { type: Boolean, default: true },
  inAppStatus: { type: Boolean, default: true },
  inAppComment: { type: Boolean, default: true },
  inAppSubtask: { type: Boolean, default: true },
  inAppReminder: { type: Boolean, default: true },
  inAppRequest: { type: Boolean, default: true },
  inAppDue: { type: Boolean, default: true },
  inAppChat: { type: Boolean, default: true },
  inAppDm: { type: Boolean, default: true },
  inAppBug: { type: Boolean, default: true },
  inAppOther: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// Avoid model re-registration in Next.js hot reload
const AuthUser: Model<IAuthUser> =
  (mongoose.models.AuthUser as Model<IAuthUser>) ||
  mongoose.model<IAuthUser>("AuthUser", AuthUserSchema);

export default AuthUser;
