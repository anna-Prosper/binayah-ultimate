import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAuthUser extends Document {
  email: string;
  passwordHash: string;
  fixedUserId: string;
  emailNotifications: boolean;
  createdAt: Date;
}

const AuthUserSchema = new Schema<IAuthUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  fixedUserId: { type: String, required: true },
  emailNotifications: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// Avoid model re-registration in Next.js hot reload
const AuthUser: Model<IAuthUser> =
  (mongoose.models.AuthUser as Model<IAuthUser>) ||
  mongoose.model<IAuthUser>("AuthUser", AuthUserSchema);

export default AuthUser;
