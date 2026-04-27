import mongoose from "mongoose";

const schema = new mongoose.Schema({
  workspaceId: { type: String, default: "main", unique: true },
  state: { type: mongoose.Schema.Types.Mixed, default: {} },
  // lockedPipelines: REMOVED in v3 — was stored inside state.lockedPipelines. Mongoose drops unknown fields on read.
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models?.PipelineState || mongoose.model("PipelineState", schema);
