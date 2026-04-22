import mongoose from "mongoose";

const schema = new mongoose.Schema({
  workspaceId: { type: String, default: "main", unique: true },
  state: { type: mongoose.Schema.Types.Mixed, default: {} },
  // lockedPipelines: stored inside state.lockedPipelines as string[] via the Mixed field
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models?.PipelineState || mongoose.model("PipelineState", schema);
