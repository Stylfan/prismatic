"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { arrangeItemsAction } from "@/actions/items";

/**
 * Where each goal and feature stands while the user rearranges the tree.
 * A place is a key: "g:<milestone id>" for a milestone's goals and
 * "f:<goal id>" for a goal's features ("none" for without). A move shows
 * at once and is saved behind; a refresh from the server replaces the
 * local copy, and a failed save puts it back.
 */
export type Places = Record<string, string[]>;

const target = (key: string) => {
  const [kind, rest] = [key.slice(0, 1), key.slice(2)];
  const id = rest === "none" ? null : rest;
  return kind === "g"
    ? ({ kind: "goal", milestoneId: id } as const)
    : ({ kind: "feature", parentId: id } as const);
};

export function useItemOrder(programId: string, places: Places) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [orders, setOrders] = useState<Places>(places);
  const [synced, setSynced] = useState(places);
  const [failed, setFailed] = useState(false);

  // A refresh from the server replaces the optimistic copy.
  if (synced !== places) {
    setSynced(places);
    setOrders(places);
  }

  const save = (next: Places, key: string) => {
    const before = orders;
    setOrders(next);
    setFailed(false);
    startTransition(async () => {
      const result = await arrangeItemsAction({ programId, ...target(key), ids: next[key] });
      if (!result.ok) {
        setOrders(before);
        setFailed(true);
      }
      router.refresh();
    });
  };

  /**
   * Moves an item from one place to another (or the same), just before or
   * after another item there, or last when there is none to aim at.
   */
  const move = (
    id: string,
    from: string,
    to: string,
    aim: { id: string; place: "before" | "after" } | null,
  ) => {
    if (aim?.id === id) return;
    const next = { ...orders, [from]: (orders[from] ?? []).filter((x) => x !== id) };
    const list = (next[to] ?? []).filter((x) => x !== id);
    const at = aim ? list.indexOf(aim.id) : -1;
    if (at < 0) list.push(id);
    else list.splice(aim?.place === "before" ? at : at + 1, 0, id);
    next[to] = list;
    save(next, to);
  };

  /** Moves an item one place up or down within its place, for the keyboard. */
  const step = (key: string, id: string, delta: -1 | 1) => {
    const list = [...(orders[key] ?? [])];
    const at = list.indexOf(id);
    const to = at + delta;
    if (at < 0 || to < 0 || to >= list.length) return;
    [list[at], list[to]] = [list[to]!, list[at]!];
    save({ ...orders, [key]: list }, key);
  };

  return { orderOf: (key: string) => orders[key] ?? [], move, step, pending, failed };
}
