import mongoose, { Schema, Model } from "mongoose";

export interface IDocAttachment {
  id: string;            // local id (timestamp + suffix)
  key: string;           // S3 object key (used for delete)
  url: string;           // public S3 URL
  name: string;          // original filename
  contentType: string;
  size: number;
  uploadedBy: string;    // fixedUserId
  uploadedAt: Date;
}

export interface IBinayahDocument {
  _id: string;
  title: string;
  content: Record<string, unknown> | null;
  createdBy: string;
  updatedBy: string | null;
  pipelineId: string | null;
  attachments: IDocAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IDocAttachment>(
  {
    id: { type: String, required: true },
    key: { type: String, required: true },
    url: { type: String, required: true },
    name: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const BinayahDocumentSchema = new Schema<IBinayahDocument>(
  {
    title: { type: String, default: "untitled" },
    content: { type: Schema.Types.Mixed, default: null },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, default: null },
    pipelineId: { type: String, default: null },
    attachments: { type: [AttachmentSchema], default: [] },
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
