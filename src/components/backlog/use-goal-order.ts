"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rankGoalsAction } from "@/actions/items";
import type { BacklogGroup } from "./backlog-board";

/**
 * The order of each milestone's business goals while the user rearranges
 * them: a move shows at once and is saved behind; a refresh from the
 * server replaces the local copy, and a failed save puts it back.
 */
export function useGoalOrder(programId: string, groups: BacklogGroup[]) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const fromServer = () => Object.fromEntries(groups.map((g) => [g.key, g.goalIds]));
  const [orders, setOrders] = useState<Record<string, string[]>>(fromServer);
  const [synced, setSynced] = useState(groups);
  const [failed, setFailed] = useState(false);

  // A refresh from the server replaces the optimistic copy.
  if (synced !== groups) {
    setSynced(groups);
    setOrders(fromServer());
  }

  const save = (key: string, goalIds: string[]) => {
    const before = orders;
    setOrders({ ...orders, [key]: goalIds });
    setFailed(false);
    startTransition(async () => {
      const result = await rankGoalsAction({
        programId,
        milestoneId: key === "none" ? null : key,
        goalIds,
      });
      if (!result.ok) {
        setOrders(before);
        setFailed(true);
      }
      router.refresh();
    });
  };

  /** Moves a goal to just before or after another goal of the same milestone. */
  const move = (key: string, id: string, targetId: string, place: "before" | "after") => {
    const list = (orders[key] ?? []).filter((x) => x !== id);
    const at = list.indexOf(targetId);
    if (at < 0 || id === targetId) return;
    list.splice(place === "before" ? at : at + 1, 0, id);
    save(key, list);
  };

  /** Moves a goal one place up or down, for the keyboard. */
  const step = (key: string, id: string, delta: -1 | 1) => {
    const list = [...(orders[key] ?? [])];
    const at = list.indexOf(id);
    const to = at + delta;
    if (at < 0 || to < 0 || to >= list.length) return;
    [list[at], list[to]] = [list[to]!, list[at]!];
    save(key, list);
  };

  return { orderOf: (key: string) => orders[key] ?? [], move, step, pending, failed };
}
