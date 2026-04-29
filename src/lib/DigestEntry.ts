/**
 * DigestEntry — pending notification waiting to be rolled into the next daily digest.
 *
 * One doc per (recipient, event). The cron at /api/cron/digest:
 *   1. Pulls all entries newer than 24h grouped by recipient
 *   2. Renders one email per recipient summarizing the bucket
 *   3. Deletes those entries
 */
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IDigestEntry extends Document {
  recipientId: string;       // fixedUserId
  eventType: string;
  stageKey: string;
  pipelineName: string;
  workspaceName: string;
  actorName: string;
  detail: string;            // human-readable line ("Anna marked Foo → active")
  points?: number;
  createdAt: Date;
}

const DigestEntrySchema = new Schema<IDigestEntry>({
  recipientId: { type: String, required: true, index: true },
  eventType: { type: String, required: true },
  stageKey: { type: String, required: true },
  pipelineName: { type: String, default: "" },
  workspaceName: { type: String, default: "" },
  actorName: { type: String, default: "" },
  detail: { type: String, default: "" },
  points: { type: Number, default: 0 },
  // 7-day safety TTL — cron should drain in 24h, this just prevents pile-up if cron fails
  createdAt: { type: Date, required: true, default: Date.now, expires: 60 * 60 * 24 * 7 },
});

const DigestEntry: Model<IDigestEntry> =
  (mongoose.models.DigestEntry as Model<IDigestEntry>) ||
  mongoose.model<IDigestEntry>("DigestEntry", DigestEntrySchema);

export default DigestEntry;
