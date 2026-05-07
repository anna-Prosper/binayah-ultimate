import mongoose from "mongoose";

/**
 * Daily snapshots of `pipeline_state.state` for disaster recovery.
 * Written by /api/cron/backup once a day; old entries (>14 days) auto-pruned
 * during the same cron run. Each snapshot stores the full state JSON plus the
 * source doc's updatedAt so we can correlate with the live record.
 */
const schema = new mongoose.Schema({
  workspaceId: { type: String, default: "main", index: true },
  state: { type: mongoose.Schema.Types.Mixed, default: {} },
  // updatedAt of the source PipelineState doc at the time of snapshot.
  sourceUpdatedAt: { type: Date },
  // When this snapshot was written.
  snapshotAt: { type: Date, default: Date.now, index: true },
});

export default mongoose.models?.PipelineStateBackup || mongoose.model("PipelineStateBackup", schema);
