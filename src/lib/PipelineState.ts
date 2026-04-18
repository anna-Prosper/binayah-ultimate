import mongoose from "mongoose";

const schema = new mongoose.Schema({
  workspaceId: { type: String, default: "main", unique: true },
  state: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models?.PipelineState || mongoose.model("PipelineState", schema);
