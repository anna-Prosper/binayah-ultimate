/**
 * Aggregation-pipeline builders for comment / comment-reaction writes.
 *
 * The comment routes used to interpolate the stage name straight into a MongoDB dotted
 * path (`state.comments.${stage}`, `state.commentReactions.${stage}::${id}.${emoji}`). That
 * breaks for a stage whose name contains "." (e.g. "Fix binayah.com issues") — Mongo reads
 * the dot as a path separator — which is why `validateStageKey` had to reject dotted names,
 * leaving those stages un-commentable.
 *
 * These builders address the field by NAME via `$setField`/`$getField`/`$unsetField` with a
 * `$literal`, so the stage name is stored/read verbatim — dots and all — and never parsed as
 * a path. Verified end-to-end against the live server (MongoDB 8.0) through Mongoose 9.4.1.
 *
 * All of these are aggregation-PIPELINE updates: pass them as the update array with
 * `{ updatePipeline: true }` (Mongoose throws "Cannot pass an array to query updates"
 * otherwise). `$$NOW` writes `updatedAt` as a proper Date.
 */

type Pipeline = Record<string, unknown>[];

// The stage's comment array, defaulting to [] when the stage (or state.comments) is absent.
const commentArrayExpr = (stage: string) => ({
  $ifNull: [{ $getField: { field: { $literal: stage }, input: "$state.comments" } }, []],
});

/** Append a comment to a stage, keeping only the most recent 100 (mirrors $push $slice:-100). */
export function buildAddCommentPipeline(stage: string, comment: Record<string, unknown>): Pipeline {
  return [{
    $set: {
      "state.comments": {
        $setField: {
          field: { $literal: stage },
          input: { $ifNull: ["$state.comments", {}] },
          // $literal wraps the comment so a text starting with "$" isn't read as a field path.
          value: { $slice: [{ $concatArrays: [commentArrayExpr(stage), [{ $literal: comment }]] }, -100] },
        },
      },
      updatedAt: "$$NOW",
    },
  }];
}

/** Replace one comment's text (no-op if the id isn't present). */
export function buildEditCommentPipeline(stage: string, commentId: number, newText: string): Pipeline {
  return [{
    $set: {
      "state.comments": {
        $setField: {
          field: { $literal: stage },
          input: { $ifNull: ["$state.comments", {}] },
          value: {
            $map: {
              input: commentArrayExpr(stage),
              as: "c",
              in: { $cond: [{ $eq: ["$$c.id", commentId] }, { $mergeObjects: ["$$c", { text: { $literal: newText } }] }, "$$c"] },
            },
          },
        },
      },
      updatedAt: "$$NOW",
    },
  }];
}

/** Remove one comment from a stage AND drop its reactions entry. */
export function buildDeleteCommentPipeline(stage: string, commentId: number): Pipeline {
  return [
    {
      $set: {
        "state.comments": {
          $setField: {
            field: { $literal: stage },
            input: { $ifNull: ["$state.comments", {}] },
            value: { $filter: { input: commentArrayExpr(stage), as: "c", cond: { $ne: ["$$c.id", commentId] } } },
          },
        },
        updatedAt: "$$NOW",
      },
    },
    {
      $set: {
        "state.commentReactions": {
          $unsetField: {
            field: { $literal: `${stage}::${commentId}` },
            input: { $ifNull: ["$state.commentReactions", {}] },
          },
        },
      },
    },
  ];
}

/** Toggle `userId` in `commentReactions[reactionKey][emoji]` (add if absent, remove if present). */
export function buildToggleReactionPipeline(reactionKey: string, emoji: string, userId: string): Pipeline {
  // `emoji` is validated against a fixed allow-list (REACTIONS) upstream, so it is safe to use
  // as a literal object key here; only the reactionKey (which embeds the stage name) can carry
  // a "." and is addressed via $setField/$getField.
  const emojiObj: Record<string, unknown> = {
    [emoji]: {
      $let: {
        vars: { cur: { $ifNull: [{ $getField: { field: { $literal: emoji }, input: "$$obj" } }, []] } },
        in: {
          $cond: [
            { $in: [userId, "$$cur"] },
            { $filter: { input: "$$cur", as: "u", cond: { $ne: ["$$u", userId] } } },
            { $concatArrays: ["$$cur", [userId]] },
          ],
        },
      },
    },
  };
  return [{
    $set: {
      "state.commentReactions": {
        $setField: {
          field: { $literal: reactionKey },
          input: { $ifNull: ["$state.commentReactions", {}] },
          value: {
            $let: {
              vars: { obj: { $ifNull: [{ $getField: { field: { $literal: reactionKey }, input: "$state.commentReactions" } }, {}] } },
              in: { $mergeObjects: ["$$obj", emojiObj] },
            },
          },
        },
      },
      updatedAt: "$$NOW",
    },
  }];
}
