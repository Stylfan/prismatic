"use client";

import { useState, type DragEvent } from "react";
import { cn } from "@/lib/cn";

/** A column by its index, or the list of milestones not yet placed. */
export type Where = number | "unplaced";
export type DragKind = "item" | "milestone";
export type Dragged = { kind: DragKind; id: string };
export type DropAim = { id: string; place: "before" | "after" } | null;

const BEFORE = "shadow-[inset_0_2px_0_var(--color-ink)]";
const AFTER = "shadow-[inset_0_-2px_0_var(--color-ink)]";

/**
 * Drag and drop on the roadmap. A card or a milestone dropped on another
 * of its kind lands just before or after it; dropped elsewhere in a column
 * (or in the unplaced list) it lands last there. The board decides what a
 * drop means; this keeps track of what is dragged and where it would land.
 */
export function useBoardDrag(onDrop: (dragged: Dragged, where: Where, aim: DropAim) => void) {
  const [dragging, setDragging] = useState<Dragged | null>(null);
  const [aim, setAim] = useState<{
    where: Where;
    id: string | null;
    place: "before" | "after";
  } | null>(null);

  const reset = () => {
    setDragging(null);
    setAim(null);
  };
  const aimAt = (where: Where, id: string | null, place: "before" | "after") => {
    if (aim?.where !== where || aim.id !== id || aim.place !== place) setAim({ where, id, place });
  };
  const finish = (e: DragEvent, where: Where) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragging) {
      const at = aim && aim.where === where && aim.id ? { id: aim.id, place: aim.place } : null;
      onDrop(dragging, where, at);
    }
    reset();
  };

  /** A card or milestone: dragged by itself, and a place to drop its own kind before or after. */
  const piece = (kind: DragKind, id: string, where: Where) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
      setDragging({ kind, id });
    },
    onDragEnd: reset,
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (dragging?.kind !== kind) return;
      e.preventDefault();
      e.stopPropagation();
      if (dragging.id === id) return setAim(null);
      const box = e.currentTarget.getBoundingClientRect();
      aimAt(where, id, e.clientY < box.top + box.height / 2 ? "before" : "after");
    },
    onDrop: (e: DragEvent) => {
      if (dragging?.kind === kind) finish(e, where);
    },
    mark: cn(
      dragging?.id === id && "opacity-50",
      aim?.id === id && (aim.place === "before" ? BEFORE : AFTER),
    ),
  });

  /** A column or the unplaced list: takes the kinds it accepts, last. */
  const area = (where: Where, accepts: DragKind[]) => ({
    onDragOver: (e: DragEvent) => {
      if (!dragging || !accepts.includes(dragging.kind)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      aimAt(where, null, "after");
    },
    onDrop: (e: DragEvent) => {
      if (dragging && accepts.includes(dragging.kind)) finish(e, where);
    },
    over: aim?.where === where && aim.id === null,
  });

  return { piece, area };
}
