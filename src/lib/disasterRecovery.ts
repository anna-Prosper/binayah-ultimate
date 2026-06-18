import crypto from "node:crypto";
import zlib from "node:zlib";
import { promisify } from "node:util";
import mongoose from "mongoose";
import {
  CopyObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import PipelineStateBackup from "@/lib/PipelineStateBackup";
import { AppBackupItem, AppBackupRun } from "@/lib/AppBackup";
import { BACKUP_RETAIN_DAYS } from "@/lib/constants";

const gzip = promisify(zlib.gzip);

const WORKSPACE = { workspaceId: "main" };
const BACKUP_INSERT_BATCH_SIZE = 500;
const BACKED_UP_COLLECTIONS = [
  "pipelinestates",
  "authusers",
  "binayahdocuments",
  "chatmessages",
  "zoomcallcaches",
  "digestentries",
] as const;

type BackedUpCollectionName = typeof BACKED_UP_COLLECTIONS[number];

type CollectionBackup = {
  collectionName: BackedUpCollectionName;
  count: number;
  docs: Record<string, unknown>[];
};

type AttachmentBackupItem = {
  sourceKey: string;
  backupKey: string | null;
  copied: boolean;
  error?: string;
};

type DisasterRecoveryArtifact = {
  version: 1;
  backupId: string;
  createdAt: string;
  source: {
    workspaceId: string;
    mongoDatabase: string | null;
    liveS3Bucket: string | null;
  };
  collections: CollectionBackup[];
  attachments: AttachmentBackupItem[];
};

type BackupConfig = {
  liveBucket: string | null;
  backupBucket: string | null;
  backupPrefix: string;
  region: string;
};

export type DisasterRecoveryBackupResult = {
  ok: true;
  backupId: string;
  snapshotId: string;
  artifactKey: string | null;
  artifactBytes: number;
  collections: Array<{ collectionName: string; count: number }>;
  attachments: {
    discovered: number;
    copied: number;
    failed: number;
  };
  offsite: {
    enabled: boolean;
    bucket: string | null;
    key: string | null;
  };
  pruned: {
    pipelineState: number;
    appRuns: number;
    appItems: number;
  };
};

function backupConfig(): BackupConfig {
  return {
    liveBucket: process.env.AWS_S3_BUCKET || null,
    backupBucket: process.env.BACKUP_S3_BUCKET || process.env.DR_S3_BUCKET || null,
    backupPrefix: (process.env.BACKUP_S3_PREFIX || "disaster-recovery").replace(/^\/+|\/+$/g, ""),
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1",
  };
}

function s3Client(region: string) {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY not configured");
  }
  return new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
}

function jsonRoundTrip<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function databaseName(): string | null {
  return mongoose.connection.db?.databaseName ?? null;
}

function encodeCopySource(bucket: string, key: string): string {
  return `${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function listBackupArtifactKeys(): Promise<string[]> {
  const config = backupConfig();
  if (!config.backupBucket) return [];
  const client = s3Client(config.region);
  const prefix = `${config.backupPrefix}/runs/`;
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const page = await client.send(new ListObjectsV2Command({
      Bucket: config.backupBucket,
      Prefix: prefix,
      ContinuationToken: token,
    }));
    for (const item of page.Contents ?? []) {
      if (item.Key?.endsWith("/artifact.json.gz")) keys.push(item.Key);
    }
    token = page.NextContinuationToken;
  } while (token);
  return keys.sort();
}

export async function listDisasterRecoveryBackups(): Promise<Array<{ backupId: string; artifactKey: string; createdAt: string | null }>> {
  const keys = await listBackupArtifactKeys();
  return keys.map(key => {
    const match = key.match(/\/runs\/([^/]+)\/artifact\.json\.gz$/);
    const backupId = match?.[1] ?? key;
    const timestamp = backupId.split("-").slice(0, 2).join("-");
    return { backupId, artifactKey: key, createdAt: timestamp || null };
  }).reverse();
}

async function loadCollectionsFromMongo(): Promise<CollectionBackup[]> {
  const db = PipelineState.db.db;
  if (!db) throw new Error("Mongo database handle is not available");

  const collections: CollectionBackup[] = [];
  for (const collectionName of BACKED_UP_COLLECTIONS) {
    const docs = await db.collection(collectionName).find({}).toArray();
    collections.push({
      collectionName,
      count: docs.length,
      docs: jsonRoundTrip(docs),
    });
  }
  return collections;
}

function collectAttachmentKeys(collections: CollectionBackup[]): string[] {
  const docs = collections.find(c => c.collectionName === "binayahdocuments")?.docs ?? [];
  const keys = new Set<string>();
  for (const doc of docs) {
    const attachments = Array.isArray(doc.attachments) ? doc.attachments : [];
    for (const attachment of attachments) {
      if (
        attachment &&
        typeof attachment === "object" &&
        "key" in attachment &&
        typeof attachment.key === "string" &&
        attachment.key
      ) {
        keys.add(attachment.key);
      }
    }
  }
  return Array.from(keys).sort();
}

async function copyAttachmentsToBackup(
  backupId: string,
  attachmentKeys: string[],
  config: BackupConfig,
): Promise<AttachmentBackupItem[]> {
  if (!config.liveBucket || !config.backupBucket) {
    return attachmentKeys.map(sourceKey => ({ sourceKey, backupKey: null, copied: false, error: "backup S3 bucket is not configured" }));
  }

  const client = s3Client(config.region);
  const items: AttachmentBackupItem[] = [];
  for (const sourceKey of attachmentKeys) {
    const backupKey = `${config.backupPrefix}/runs/${backupId}/attachments/${sourceKey}`;
    try {
      await client.send(new CopyObjectCommand({
        Bucket: config.backupBucket,
        Key: backupKey,
        CopySource: encodeCopySource(config.liveBucket, sourceKey),
        MetadataDirective: "COPY",
      }));
      items.push({ sourceKey, backupKey, copied: true });
    } catch (err) {
      items.push({ sourceKey, backupKey, copied: false, error: (err as Error).message });
    }
  }
  return items;
}

async function writeArtifactToS3(
  artifact: DisasterRecoveryArtifact,
  config: BackupConfig,
): Promise<{ key: string | null; bytes: number }> {
  const compressed = await gzip(Buffer.from(JSON.stringify(artifact)));
  if (!config.backupBucket) return { key: null, bytes: compressed.length };

  const key = `${config.backupPrefix}/runs/${artifact.backupId}/artifact.json.gz`;
  await s3Client(config.region).send(new PutObjectCommand({
    Bucket: config.backupBucket,
    Key: key,
    Body: compressed,
    ContentType: "application/json",
    ContentEncoding: "gzip",
    Metadata: {
      backupId: artifact.backupId,
      kind: "binayah-disaster-recovery",
      version: String(artifact.version),
    },
  }));
  return { key, bytes: compressed.length };
}

async function writeMongoBackupIndexes(
  backupId: string,
  collections: CollectionBackup[],
  sourceUpdatedAt: Date | undefined,
): Promise<Array<{ collectionName: string; count: number }>> {
  const summaries = collections.map(({ collectionName, count }) => ({ collectionName, count }));
  for (const collection of collections) {
    for (let i = 0; i < collection.docs.length; i += BACKUP_INSERT_BATCH_SIZE) {
      const batch = collection.docs.slice(i, i + BACKUP_INSERT_BATCH_SIZE).map(doc => ({
        backupId,
        collectionName: collection.collectionName,
        sourceId: doc._id,
        doc,
        snapshotAt: new Date(),
      }));
      if (batch.length > 0) await AppBackupItem.insertMany(batch, { ordered: false });
    }
  }
  await AppBackupRun.create({
    backupId,
    workspaceId: WORKSPACE.workspaceId,
    collections: summaries,
    sourceUpdatedAt,
    snapshotAt: new Date(),
  });
  return summaries;
}

async function pruneOldMongoBackups() {
  const cutoff = new Date(Date.now() - BACKUP_RETAIN_DAYS * 24 * 60 * 60 * 1000);
  const [pipelineState, appRuns, appItems] = await Promise.all([
    PipelineStateBackup.deleteMany({ snapshotAt: { $lt: cutoff } }),
    AppBackupRun.deleteMany({ snapshotAt: { $lt: cutoff } }),
    AppBackupItem.deleteMany({ snapshotAt: { $lt: cutoff } }),
  ]);
  return {
    pipelineState: pipelineState.deletedCount ?? 0,
    appRuns: appRuns.deletedCount ?? 0,
    appItems: appItems.deletedCount ?? 0,
  };
}

export async function createDisasterRecoveryBackup(): Promise<DisasterRecoveryBackupResult | { ok: true; snapshotted: false; reason: string }> {
  await connectMongo();
  const live = await PipelineState.findOne(WORKSPACE).lean() as
    | { state?: Record<string, unknown>; updatedAt?: Date }
    | null;
  if (!live) return { ok: true, snapshotted: false, reason: "no live doc" };

  const snapshotAt = new Date();
  const backupId = `${snapshotAt.toISOString().replace(/[:.]/g, "-")}-${crypto.randomBytes(6).toString("hex")}`;
  const config = backupConfig();
  const snap = await PipelineStateBackup.create({
    workspaceId: WORKSPACE.workspaceId,
    state: live.state ?? {},
    sourceUpdatedAt: live.updatedAt,
    snapshotAt,
  });
  const collections = await loadCollectionsFromMongo();
  const attachmentKeys = collectAttachmentKeys(collections);
  const attachments = await copyAttachmentsToBackup(backupId, attachmentKeys, config);
  const artifact: DisasterRecoveryArtifact = {
    version: 1,
    backupId,
    createdAt: snapshotAt.toISOString(),
    source: {
      workspaceId: WORKSPACE.workspaceId,
      mongoDatabase: databaseName(),
      liveS3Bucket: config.liveBucket,
    },
    collections,
    attachments,
  };
  const artifactWrite = await writeArtifactToS3(artifact, config);
  const summaries = await writeMongoBackupIndexes(backupId, collections, live.updatedAt);
  const pruned = await pruneOldMongoBackups();

  return {
    ok: true,
    backupId,
    snapshotId: String(snap._id),
    artifactKey: artifactWrite.key,
    artifactBytes: artifactWrite.bytes,
    collections: summaries,
    attachments: {
      discovered: attachments.length,
      copied: attachments.filter(a => a.copied).length,
      failed: attachments.filter(a => !a.copied).length,
    },
    offsite: {
      enabled: Boolean(config.backupBucket && artifactWrite.key),
      bucket: config.backupBucket,
      key: artifactWrite.key,
    },
    pruned,
  };
}
