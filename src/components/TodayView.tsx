"use client";

import { useState, useRef, useCallback } from "react";
import { T } from "@/lib/themes";
import { type UserType } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";
import { useModel } from "@/lib/contexts/ModelContext";

interface StageEntry {
  stageId: string;
  displayName: string;
  status: string;
  pipelineName: string;
  pipelineColor: string;
}

const STATUS_PRIORITY: Record<string, number> = {
  "in-progress": 0,
  "planned": 1,
  "active": 2,
  "concept": 3,
  "blocked": 4,
};

const STATUS_COLORS: Record<string, string> = {
  "in-progress": "amber",
  "planned": "cyan",
  "active": "green",
  "concept": "purple",
  "blocked": "red",
};

interface TodayViewProps {
  t: T;
  stages: StageEntry[];
  currentUser: string;
  users: UserType[];
  ck: Record<string, string>;
}

export default function TodayView({ t, stages, currentUser, users, ck }: TodayViewProps) {
  const { handleClaim, claims, setStageStatusDirect, stageNameOverrides, comments } = useModel();

  // Comment popover state
  const [commentOpen, setCommentOpen] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const { addComment: modelAddComment } = useModel();

  const addComment = useCallback((sid: string) => {
    const val = commentInput[sid]?.trim();
    if (!val) return;
    modelAddComment(sid, val, () => setCommentInput(prev => ({ ...prev, [sid]: "" })));
  }, [commentInput, modelAddComment]);

  // Swipe gesture state per row
  const pointerData = useRef<Record<string, { startX: number; startY: number; startTime: number; pointerId: number; el: HTMLDivElement }>>({});

  const statusColor = (status: string) => {
    const colorKey = STATUS_COLORS[status] || "slate";
    return ck[colorKey] || t.textDim;
  };

  const isClaimed = (stageId: string) => (claims[stageId] || []).includes(currentUser);

  if (stages.length === 0) {
    return (
      <div style={{ padding: "48px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 13, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", lineHeight: 1.8 }}>
          // nothing on your plate yet<br />— claim something
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
      {stages.map(stage => {
        const claimed = isClaimed(stage.stageId);
        const stColor = statusColor(stage.status);
        const displayName = stageNameOverrides[stage.stageId] || stage.displayName;
        const cmts = comments[stage.stageId] || [];
        const isCommentOpen = commentOpen === stage.stageId;

        return (
          <TodayRow
            key={stage.stageId}
            stageId={stage.stageId}
            displayName={displayName}
            status={stage.status}
            pipelineName={stage.pipelineName}
            pipelineColor={stage.pipelineColor}
            stColor={stColor}
            claimed={claimed}
            currentUser={currentUser}
            isCommentOpen={isCommentOpen}
            commentInput={commentInput[stage.stageId] || ""}
            commentCount={cmts.length}
            comments={cmts.slice(-5)}
            users={users}
            t={t}
            onClaim={() => handleClaim(stage.stageId)}
            onMarkDone={() => setStageStatusDirect(stage.stageId, "active")}
            onOpenComment={() => setCommentOpen(isCommentOpen ? null : stage.stageId)}
            onCloseComment={() => setCommentOpen(null)}
            onCommentInput={v => setCommentInput(prev => ({ ...prev, [stage.stageId]: v }))}
            onSendComment={() => addComment(stage.stageId)}
            pointerData={pointerData}
          />
        );
      })}
    </div>
  );
}

interface CommentItem {
  id: number;
  text: string;
  by: string;
  time: string;
}

function TodayRow({
  stageId, displayName, status, pipelineName, pipelineColor, stColor,
  claimed, currentUser, isCommentOpen, commentInput, commentCount, comments, users, t,
  onClaim, onMarkDone, onOpenComment, onCloseComment, onCommentInput, onSendComment,
  pointerData,
}: {
  stageId: string; displayName: string; status: string; pipelineName: string;
  pipelineColor: string; stColor: string; claimed: boolean; currentUser: string;
  isCommentOpen: boolean; commentInput: string; commentCount: number;
  comments: CommentItem[]; users: UserType[]; t: T;
  onClaim: () => void; onMarkDone: () => void; onOpenComment: () => void; onCloseComment: () => void;
  onCommentInput: (v: string) => void; onSendComment: () => void;
  pointerData: React.MutableRefObject<Record<string, { startX: number; startY: number; startTime: number; pointerId: number; el: HTMLDivElement }>>;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [swipeDelta, setSwipeDelta] = useState(0);
  const SWIPE_THRESHOLD = 40;
  const VERTICAL_CANCEL = 10;

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!rowRef.current) return;
    pointerData.current[stageId] = {
      startX: e.clientX, startY: e.clientY,
      startTime: Date.now(), pointerId: e.pointerId,
      el: rowRef.current,
    };
    rowRef.current.setPointerCapture(e.pointerId);
  }, [stageId, pointerData]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const data = pointerData.current[stageId];
    if (!data || data.pointerId !== e.pointerId) return;
    const dx = e.clientX - data.startX;
    const dy = Math.abs(e.clientY - data.startY);
    // Cancel if vertical scroll intent detected
    if (dy > VERTICAL_CANCEL && Math.abs(dx) < dy) {
      delete pointerData.current[stageId];
      setSwipeDelta(0);
      return;
    }
    setSwipeDelta(dx);
  }, [stageId, pointerData]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const data = pointerData.current[stageId];
    if (!data || data.pointerId !== e.pointerId) return;
    const dx = e.clientX - data.startX;
    const elapsed = Date.now() - data.startTime;
    delete pointerData.current[stageId];
    setSwipeDelta(0);

    if (Math.abs(dx) >= SWIPE_THRESHOLD && elapsed < 400) {
      if (dx > 0) {
        // Right swipe: toggle claim
        onClaim();
      } else {
        // Left swipe: open comment
        onOpenComment();
      }
    }
  }, [stageId, pointerData, onClaim, onOpenComment]);

  // Primary action button
  let actionBtn: React.ReactNode = null;
  if (!claimed) {
    actionBtn = (
      <button onClick={onClaim} style={actionBtnStyle(pipelineColor)}>
        + claim
      </button>
    );
  } else if (status === "in-progress") {
    actionBtn = (
      <button onClick={onMarkDone} style={actionBtnStyle(t.green)}>
        mark done
      </button>
    );
  } else {
    actionBtn = (
      <button onClick={onOpenComment} style={actionBtnStyle(t.textMuted)}>
        view
      </button>
    );
  }

  return (
    <div>
      <div
        ref={rowRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={e => { delete pointerData.current[stageId]; setSwipeDelta(0); }}
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          touchAction: "pan-y", // allow vertical scroll, capture horizontal
          userSelect: "none",
          transform: swipeDelta ? `translateX(${Math.sign(swipeDelta) * Math.min(Math.abs(swipeDelta), 60)}px) rotate(${Math.sign(swipeDelta) * Math.min(Math.abs(swipeDelta) * 0.04, 2)}deg)` : "none",
          transition: swipeDelta === 0 ? "transform 0.15s ease" : "none",
          boxShadow: pipelineColor ? `inset 3px 0 0 ${pipelineColor}` : undefined,
          position: "relative",
        }}
      >
        {/* Left: title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName}
          </div>
          <div style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: stColor, flexShrink: 0 }} />
            <span style={{ color: stColor, fontWeight: 700 }}>{status}</span>
            <span>·</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pipelineName}</span>
          </div>
        </div>

        {/* Comment count if any */}
        {commentCount > 0 && (
          <button
            onClick={e => { e.stopPropagation(); onOpenComment(); }}
            style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "3px 7px", cursor: "pointer", fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 3 }}
          >
            💬 {commentCount}
          </button>
        )}

        {/* Primary action */}
        {actionBtn}
      </div>

      {/* Comment popover inline */}
      {isCommentOpen && (
        <div onClick={e => e.stopPropagation()} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "10px 14px", marginTop: -4 }}>
          {comments.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 120, overflowY: "auto", marginBottom: 8 }}>
              {comments.map(c => {
                const u = users.find(u => u.id === c.by);
                return (
                  <div key={c.id} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                    {u && <AvatarC user={u} size={18} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: u?.color || t.text, fontWeight: 700 }}>{u?.name || c.by}</div>
                      <div style={{ fontSize: 12, color: t.text }}>{c.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={commentInput}
              onChange={e => onCommentInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onSendComment(); } if (e.key === "Escape") onCloseComment(); }}
              placeholder="// comment..."
              autoFocus
              style={{ flex: 1, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", fontSize: 12, color: t.text, fontFamily: "var(--font-dm-mono), monospace", outline: "none" }}
            />
            <button onClick={onSendComment} style={{ background: t.accent, border: "none", borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 12, color: "#fff", fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>send</button>
          </div>
        </div>
      )}
    </div>
  );
}

function actionBtnStyle(color: string): React.CSSProperties {
  return {
    background: color + "18",
    border: `1px solid ${color}55`,
    borderRadius: 8,
    padding: "5px 10px",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 700,
    color,
    fontFamily: "var(--font-dm-mono), monospace",
    whiteSpace: "nowrap",
    flexShrink: 0,
  };
}
