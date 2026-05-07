/**
 * Zod schema for the PATCH /api/pipeline-state body.
 * Applied at the API layer before the merge logic runs — provides structured
 * validation with clear error messages rather than ad-hoc string checks.
 *
 * Rules:
 * - All fields are optional (partial PATCH — only send what changed).
 * - String lengths are capped at the constants from src/lib/constants.ts.
 * - Nested maps use z.record() so keys remain dynamic.
 * - The schema is intentionally permissive on nested shape to avoid re-validating
 *   sub-documents here (that belongs in domain validators like validateSubtasks).
 */

import { z } from "zod";
import {
  MAX_BODY_TEXT_LEN,
  MAX_SUBTASK_TEXT_LEN,
  MAX_SUBTASKS_PER_STAGE,
  MAX_ACTIVITY_LOG,
} from "@/lib/constants";

const StringMap = z.record(z.string(), z.unknown());
const StringSet = z.array(z.string());

const SubtaskItemSchema = z.object({
  id: z.number().int(),
  text: z.string().max(MAX_SUBTASK_TEXT_LEN),
  done: z.boolean(),
  by: z.string(),
  points: z.number().optional(),
});

export const PatchBodySchema = z.object({
  // Canonical ownership map
  owners: z.record(z.string(), z.array(z.string())).optional(),
  claims: z.record(z.string(), z.array(z.string())).optional(),
  assignments: z.record(z.string(), z.array(z.string())).optional(),

  // Approval / archive sets
  approvedStages: StringSet.optional(),
  approvedSubtasks: StringSet.optional(),
  approvedPipelines: StringSet.optional(),
  archivedStages: StringSet.optional(),
  archivedPipelines: StringSet.optional(),
  archivedSubtasks: StringSet.optional(),

  // Stage & pipeline overrides
  stageStatusOverrides: z.record(z.string(), z.string()).optional(),
  stageDescOverrides: z.record(z.string(), z.string()).optional(),
  stageDueDates: z.record(z.string(), z.string()).optional(),
  stageNameOverrides: z.record(z.string(), z.string()).optional(),
  stagePriorities: z.record(z.string(), z.enum(["NOW", "HIGH", "MEDIUM", "LOW"])).optional(),
  stagePointsOverride: z.record(z.string(), z.number().int().min(0).max(10_000)).optional(),
  stageImages: z.record(z.string(), z.array(z.string())).optional(),

  pipeDescOverrides: z.record(z.string(), z.string()).optional(),
  pipeMetaOverrides: z.record(z.string(), z.object({
    name: z.string().optional(),
    priority: z.string().optional(),
  })).optional(),

  // Subtasks: map of stageId → array
  subtasks: z.record(z.string(), z.array(SubtaskItemSchema).max(MAX_SUBTASKS_PER_STAGE)).optional(),

  // Subtask overrides
  subtaskStages: z.record(z.string(), z.string()).optional(),
  subtaskDescOverrides: z.record(z.string(), z.string()).optional(),
  subtaskDueDates: z.record(z.string(), z.string()).optional(),

  // Custom structure
  customStages: z.record(z.string(), z.array(z.string())).optional(),
  customPipelines: z.array(z.unknown()).optional(),

  // Reactions (nested maps)
  reactions: z.record(z.string(), z.record(z.string(), z.array(z.string()))).optional(),
  commentReactions: StringMap.optional(),

  // Per-user notification state. notifReads is userId → last-read ms timestamp;
  // notifDismissed is userId → array of explicitly dismissed item ids.
  notifReads: z.record(z.string(), z.number()).optional(),
  notifDismissed: z.record(z.string(), z.array(z.string())).optional(),
  notifReadIds: z.record(z.string(), z.array(z.string())).optional(),

  // Arrays of objects with stable ids
  reminders: z.array(z.object({
    id: z.number().int(),
    title: z.string().max(140),
    body: z.string().max(1000).optional().default(""),
    createdBy: z.string(),
    recipientIds: z.array(z.string()),
    remindAt: z.string(),
    createdAt: z.number(),
    emailedTo: z.array(z.string()).optional(),
    dismissedBy: z.array(z.string()).optional(),
  })).optional(),

  notes: z.array(z.object({
    id: z.number().int(),
    title: z.string().max(120),
    body: z.string().max(MAX_BODY_TEXT_LEN),
    by: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
    workspaceId: z.string().optional(),
    pinnedTo: z.string().optional(),
    color: z.string().optional(),
  })).optional(),

  bugs: z.array(z.object({
    id: z.number().int(),
    title: z.string().max(160),
    body: z.string().max(2000),
    steps: z.string().optional(),
    expected: z.string().optional(),
    actual: z.string().optional(),
    type: z.enum(["bug", "test", "qa"]),
    severity: z.enum(["low", "medium", "high", "critical"]),
    status: z.enum(["open", "triage", "testing", "fixed", "closed"]),
    ownerId: z.string().optional(),
    createdBy: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
    workspaceId: z.string().optional(),
    linkedTask: z.string().optional(),
  })).optional(),

  execProposals: z.array(z.object({
    id: z.number().int(),
    title: z.string().max(120),
    body: z.string().max(1200),
    by: z.string(),
    status: z.enum(["pending", "reviewed", "rejected", "canceled"]),
    createdAt: z.number(),
    reviewedAt: z.number().optional(),
    reviewedBy: z.string().optional(),
    kind: z.enum(["strategy", "edit", "archive", "assign"]).optional(),
    target: z.string().optional(),
    requestedAction: z.string().optional(),
    requestedValue: z.string().nullable().optional(),
    requestedUserId: z.string().nullable().optional(),
  })).optional(),

  // Identity & workspace
  users: z.array(z.unknown()).optional(),
  workspaces: z.array(z.unknown()).optional(),

  // Activity (server-only append — client should not send; ignored if present)
  activityLog: z.array(z.unknown()).max(MAX_ACTIVITY_LOG).optional(),

  // Explicit delete envelope
  _deletes: z.record(z.string(), z.array(z.string())).optional(),

  // Sync timestamp
  updatedAt: z.number().optional(),
}).strict(); // reject unknown top-level keys

export type PatchBody = z.infer<typeof PatchBodySchema>;
