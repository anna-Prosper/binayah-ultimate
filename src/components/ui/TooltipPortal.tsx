"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface TooltipState {
  text: string;
  x: number;
  y: number;
  pos: "above" | "below";
}

export function TooltipPortal() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const getAnchor = (target: EventTarget | null): HTMLElement | null => {
      let el = target as HTMLElement | null;
      while (el && el !== document.body) {
        if (el.dataset?.tooltip) return el;
        el = el.parentElement;
      }
      return null;
    };

    const show = (e: MouseEvent) => {
      const anchor = getAnchor(e.target);
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      // Auto-place: if element is in top half of viewport → below; else → above.
      const pos = rect.top < window.innerHeight * 0.5 ? "below" : "above";
      setTooltip({
        text: anchor.dataset.tooltip!,
        x: rect.left + rect.width / 2,
        y: pos === "below" ? rect.bottom : rect.top,
        pos,
      });
    };

    const hide = (e: MouseEvent) => {
      const anchor = getAnchor(e.target);
      if (!anchor) return;
      if (!anchor.contains(e.relatedTarget as Node | null)) {
        setTooltip(null);
      }
    };

    const clear = () => setTooltip(null);

    document.addEventListener("mouseover", show);
    document.addEventListener("mouseout", hide);
    window.addEventListener("scroll", clear, { passive: true, capture: true });
    window.addEventListener("blur", clear);
    return () => {
      document.removeEventListener("mouseover", show);
      document.removeEventListener("mouseout", hide);
      window.removeEventListener("scroll", clear, { capture: true });
      window.removeEventListener("blur", clear);
    };
  }, []);

  if (!mounted || !tooltip) return null;

  const GAP = 8;
  const style: React.CSSProperties = {
    position: "fixed",
    left: tooltip.x,
    transform: "translateX(-50%)",
    zIndex: 99999,
    pointerEvents: "none",
    background: "rgba(20, 20, 28, 0.96)",
    color: "#fff",
    padding: "6px 8px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.25,
    whiteSpace: "nowrap",
    maxWidth: 280,
    boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
    fontFamily: "var(--font-dm-sans, sans-serif)",
    ...(tooltip.pos === "below"
      ? { top: tooltip.y + GAP }
      : { top: tooltip.y - GAP, transform: "translateX(-50%) translateY(-100%)" }),
  };

  return createPortal(<div style={style}>{tooltip.text}</div>, document.body);
}
