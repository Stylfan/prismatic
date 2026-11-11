"use client";

import { useState, type DragEvent } from "react";
import { GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { useItemOrder, type Places } from "./use-item-order";

type Kind = "goal" | "feature";
type Aim = { key: string; id: string | null; place: "before" | "after" };

const BEFORE = "shadow-[inset_0_2px_0_var(--color-ink)]";
const AFTER = "shadow-[inset_0_-2px_0_var(--color-ink)]";
const INTO = "shadow-[inset_0_0_0_2px_var(--color-technical)]";

/**
 * Drag and drop for the backlog tree. Goals move within and between
 * milestones, features within and between goals. Only the grip starts a
 * drag, so a click anywhere else on a row still opens it. A drop on an
 * item lands just before or after it; a drop on a goal or a milestone's
 * box lands last in it. The arrow keys on the grip move one place.
 */
export function useDragArrange(programId: string, places: Places) {
  const t = useTranslations("backlog.board");
  const order = useItemOrder(programId, places);
  const [armed, setArmed] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; kind: Kind; from: string } | null>(null);
  const [aim, setAim] = useState<Aim | null>(null);

  const reset = () => {
    setDragging(null);
    setAim(null);
    setArmed(null);
  };
  const aimAt = (next: Aim) => {
    if (aim?.key !== next.key || aim.id !== next.id || aim.place !== next.place) setAim(next);
  };
  const drop = (e: DragEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragging && aim) {
      const at = aim.id ? { id: aim.id, place: aim.place } : null;
      order.move(dragging.id, dragging.from, key, at);
    }
    reset();
  };

  /** The handle a row is dragged by. */
  const grip = (id: string, key: string, title: string) => (
    <button
      type="button"
      aria-label={t("reorder", { title })}
      title={t("reorderHint")}
      onPointerDown={() => setArmed(id)}
      onPointerUp={() => !dragging && setArmed(null)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          order.step(key, id, e.key === "ArrowUp" ? -1 : 1);
        }
      }}
      className="cursor-grab rounded p-0.5 text-slate/60 hover:bg-sand hover:text-ink active:cursor-grabbing"
    >
      <GripVertical className="size-3.5" aria-hidden />
    </button>
  );

  /** A goal or a feature that can be dragged, and dropped before or after. */
  const item = (id: string, kind: Kind, key: string) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.stopPropagation();
      if (armed !== id) return e.preventDefault();
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
      setDragging({ id, kind, from: key });
    },
    onDragEnd: reset,
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (dragging?.kind !== kind) return;
      e.preventDefault();
      e.stopPropagation();
      if (dragging.id === id) return setAim(null);
      const box = e.currentTarget.getBoundingClientRect();
      aimAt({ key, id, place: e.clientY < box.top + box.height / 2 ? "before" : "after" });
    },
    onDrop: (e: DragEvent) => {
      if (dragging?.kind === kind) drop(e, key);
    },
    className: cn(
      dragging?.id === id && "opacity-50",
      aim?.id === id && (aim.place === "before" ? BEFORE : AFTER),
    ),
  });

  /** A goal or a milestone's box that takes an item of the kind, last. */
  const into = (key: string, kind: Kind, onInto?: () => void) => ({
    onDragOver: (e: DragEvent) => {
      if (dragging?.kind !== kind) return;
      e.preventDefault();
      e.stopPropagation();
      aimAt({ key, id: null, place: "after" });
    },
    onDrop: (e: DragEvent) => {
      if (dragging?.kind !== kind) return;
      drop(e, key);
      onInto?.();
    },
    className: cn(aim?.key === key && aim.id === null && INTO),
  });

  return { orderOf: order.orderOf, failed: order.failed, grip, item, into };
}
