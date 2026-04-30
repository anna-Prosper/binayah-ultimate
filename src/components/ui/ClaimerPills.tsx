"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { type T } from "@/lib/themes";
import { type UserType } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";

/**
 * Unified claimer display: pill-shaped (avatar + first name) for the first 1-2,
 * collapses overflow into +N. Clicking any pill opens a portal-rendered popup
 * with the user's full name, role, and total points — same UX as the pipeline
 * card claimer tooltip.
 */
interface Props {
  /** ordered list of fixedUserIds who claim this stage/subtask */
  claimerIds: string[];
  /** all users (used for resolving id → name/color/avatar) */
  users: UserType[];
  /** size of avatar in the pill */
  size?: number;
  /** max pills shown explicitly before collapsing into +N */
  maxVisible?: number;
  /** style variant — "pill" shows name, "avatar" shows just avatar */
  variant?: "pill" | "avatar";
  /** function returning total points for a user (from useModel) */
  getPoints?: (uid: string) => number;
  t: T;
}

export default function ClaimerPills({
  claimerIds,
  users,
  size = 18,
  maxVisible = 2,
  variant = "pill",
  getPoints,
  t,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<{ left: number; top: number; bottom: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!openId) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest?.("[data-claimer-popup]")) return;
      if (containerRef.current && !containerRef.current.contains(target as Node)) {
        setOpenId(null);
      }
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [openId]);

  if (claimerIds.length === 0) return null;

  const ownerUsers = claimerIds.map(id => users.find(u => u.id === id)).filter(Boolean) as UserType[];
  if (ownerUsers.length === 0) return null;
  const visible = ownerUsers.slice(0, maxVisible);
  const overflow = ownerUsers.length - visible.length;

  const handleClick = (e: React.MouseEvent, uid: string) => {
    e.stopPropagation();
    if (openId === uid) { setOpenId(null); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setAnchorRect({ left: rect.left, top: rect.top, bottom: rect.bottom, width: rect.width });
    setOpenId(uid);
  };

  const openUser = openId ? users.find(u => u.id === openId) : null;
  const totalClaimers = ownerUsers.length;

  return (
    <div ref={containerRef} style={{ display: "inline-flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
      {visible.map(u => {
        if (variant === "pill") {
          return (
            <span
              key={u.id}
              onClick={e => handleClick(e, u.id)}
              data-no-close
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: u.color + "18",
                border: `1px solid ${u.color}55`,
                borderRadius: 12,
                padding: "2px 8px 2px 2px",
                cursor: "pointer",
                transition: "transform 0.12s, box-shadow 0.12s",
                transform: openId === u.id ? "scale(1.05)" : "scale(1)",
              }}
              title={u.name}
            >
              <AvatarC user={u} size={size} />
              <span style={{ fontSize: 11, fontWeight: 700, color: u.color, fontFamily: "var(--font-dm-mono), monospace" }}>{u.name.split(" ")[0]}</span>
            </span>
          );
        }
        return (
          <span
            key={u.id}
            onClick={e => handleClick(e, u.id)}
            data-no-close
            style={{
              cursor: "pointer",
              borderRadius: "50%",
              transition: "transform 0.12s",
              transform: openId === u.id ? "scale(1.15)" : "scale(1)",
              display: "inline-block",
            }}
            title={u.name}
          >
            <AvatarC user={u} size={size} />
          </span>
        );
      })}
      {overflow > 0 && (
        <span
          title={ownerUsers.slice(maxVisible).map(u => u.name).join(", ")}
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: t.textMuted,
            background: t.bgHover || t.bgSoft,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: "2px 8px",
            fontFamily: "var(--font-dm-mono), monospace",
          }}
        >+{overflow}</span>
      )}

      {/* Portal-rendered popup */}
      {openUser && anchorRect && typeof document !== "undefined" && createPortal(
        <div
          data-claimer-popup
          onClick={e => e.stopPropagation()}
          style={{
            position: "fixed",
            top: anchorRect.bottom + 8,
            left: anchorRect.left + anchorRect.width / 2,
            transform: "translateX(-50%)",
            background: t.bgCard,
            border: `1.5px solid ${openUser.color}44`,
            borderRadius: 12,
            padding: "10px 14px",
            minWidth: 160,
            boxShadow: t.shadowLg,
            zIndex: 9999,
            animation: "fadeIn 0.12s ease",
            whiteSpace: "nowrap" as const,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <AvatarC user={openUser} size={32} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: openUser.color }}>{openUser.name}</div>
              <div style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>{openUser.role}</div>
            </div>
          </div>
          {getPoints && (
            <div style={{ fontSize: 11, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700 }}>{getPoints(openId!)}pts total</div>
          )}
          {totalClaimers > 1 && (
            <div style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 2 }}>
              ÷ split between {totalClaimers} co-owners
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
