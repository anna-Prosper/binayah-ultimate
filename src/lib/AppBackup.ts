import mongoose from "mongoose";

const BackupCollectionSummarySchema = new mongoose.Schema(
  {
    collectionName: { type: String, required: true },
    count: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const AppBackupRunSchema = new mongoose.Schema({
  backupId: { type: String, required: true, unique: true, index: true },
  workspaceId: { type: String, default: "main", index: true },
  collections: { type: [BackupCollectionSummarySchema], default: [] },
  sourceUpdatedAt: { type: Date },
  snapshotAt: { type: Date, default: Date.now, index: true },
});

const AppBackupItemSchema = new mongoose.Schema({
  backupId: { type: String, required: true, index: true },
  collectionName: { type: String, required: true, index: true },
  sourceId: { type: mongoose.Schema.Types.Mixed },
  doc: { type: mongoose.Schema.Types.Mixed, required: true },
  snapshotAt: { type: Date, default: Date.now, index: true },
});

AppBackupItemSchema.index({ backupId: 1, collectionName: 1 });

export const AppBackupRun =
  mongoose.models?.AppBackupRun || mongoose.model("AppBackupRun", AppBackupRunSchema);

export const AppBackupItem =
  mongoose.models?.AppBackupItem || mongoose.model("AppBackupItem", AppBackupItemSchema);
