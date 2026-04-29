/**
 * NotifyLog — persistent record of recently-sent notifications.
 *
 * Replaces the old in-memory Map (which reset on every Vercel cold start
 * and let duplicates leak through within the rate-limit window). Same
 * key shape (`fixedUserId:stageKey:eventType`), same 5-minute window.
 *
 * MongoDB TTL index expires documents after WINDOW_MS so the collection
 * stays small without manual cleanup.
 */
import mongoose, { Document, Model, Schema } from "mongoose";

export interface INotifyLog extends Document {
  key: string;
  sentAt: Date;
}

const NotifyLogSchema = new Schema<INotifyLog>({
  key: { type: String, required: true, unique: true },
  // TTL: docs expire 5 minutes after sentAt
  sentAt: { type: Date, required: true, default: Date.now, expires: 300 },
});

const NotifyLog: Model<INotifyLog> =
  (mongoose.models.NotifyLog as Model<INotifyLog>) ||
  mongoose.model<INotifyLog>("NotifyLog", NotifyLogSchema);

export default NotifyLog;
