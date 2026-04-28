"use client";
import { useState, useCallback } from "react";

export interface UndoOp {
  id: number;          // timestamp
  label: string;       // "archived 'test stage'" — shown in tooltip
  inverse: () => void; // function that undoes the op
  ts: number;          // when op happened
}

const MAX_STACK = 5;

export function useUndoStack() {
  const [stack, setStack] = useState<UndoOp[]>([]);

  const push = useCallback((op: Omit<UndoOp, "id" | "ts">) => {
    const full: UndoOp = { ...op, id: Date.now(), ts: Date.now() };
    setStack(prev => [full, ...prev].slice(0, MAX_STACK));
    return full;
  }, []);

  const undo = useCallback(() => {
    setStack(prev => {
      if (prev.length === 0) return prev;
      const [head, ...rest] = prev;
      head.inverse();
      return rest;
    });
  }, []);

  const removeById = useCallback((id: number) => {
    setStack(prev => prev.filter(op => op.id !== id));
  }, []);

  const peek = stack[0] || null;
  return { stack, push, undo, peek, removeById };
}
