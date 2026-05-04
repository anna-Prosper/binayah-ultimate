import mongoose from "mongoose";

const schema = new mongoose.Schema({
  workspaceId: { type: String, default: "main" },
  threadId: { type: String, default: "team" },
  id: { type: Number, required: true },       // Date.now() — used for SSE gap-fill
  userId: { type: String, required: true },
  text: { type: String, required: true },
  attachments: { type: mongoose.Schema.Types.Mixed, default: [] },
  time: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

schema.index({ workspaceId: 1, threadId: 1, id: 1 });
schema.index({ workspaceId: 1, createdAt: -1 });

export default mongoose.models?.ChatMessage || mongoose.model("ChatMessage", schema);
