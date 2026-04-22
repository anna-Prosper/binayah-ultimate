import mongoose, { Schema, Model } from "mongoose";

export interface IBinayahDocument {
  _id: string;
  title: string;
  content: Record<string, unknown> | null;
  createdBy: string;
  pipelineId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const BinayahDocumentSchema = new Schema<IBinayahDocument>(
  {
    title: { type: String, default: "untitled" },
    content: { type: Schema.Types.Mixed, default: null },
    createdBy: { type: String, required: true },
    pipelineId: { type: String, default: null },
  },
  { timestamps: true }
);

// Index for list sort (newest first) and pipeline filter
BinayahDocumentSchema.index({ updatedAt: -1 });
BinayahDocumentSchema.index({ pipelineId: 1 });

const BinayahDocument: Model<IBinayahDocument> =
  mongoose.models.BinayahDocument ??
  mongoose.model<IBinayahDocument>("BinayahDocument", BinayahDocumentSchema);

export default BinayahDocument;
