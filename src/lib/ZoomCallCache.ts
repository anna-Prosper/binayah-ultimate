import mongoose from "mongoose";

const schema = new mongoose.Schema({
  key: { type: String, default: "main", unique: true },
  meetings: { type: mongoose.Schema.Types.Mixed, default: [] },
  proposals: { type: mongoose.Schema.Types.Mixed, default: [] },
  processedUUIDs: { type: [String], default: [] }, // track which meeting instances were already extracted
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models?.ZoomCallCache ||
  mongoose.model("ZoomCallCache", schema);
