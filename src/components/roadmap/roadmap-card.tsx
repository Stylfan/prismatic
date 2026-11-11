"use client";

import { Plug, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import type { BoardCard } from "@/lib/roadmap-view";
import type { useBoardDrag } from "./use-board-drag";

type Piece = ReturnType<ReturnType<typeof useBoardDrag>["piece"]>;

/**
 * A card on the roadmap, moved by dragging it to another column or to
 * another place in its own. Top left what it is, top right its size,
 * points and milestone; the title under them; bottom right its status,
 * with any warnings on the left.
 */
export function RoadmapCard({
  card,
  pending,
  drag,
  compact = false,
  focus = null,
  onPick,
  editor = null,
}: {
  card: BoardCard;
  pending: boolean;
  drag: Piece;
  /** One line, for the list of what is not yet planned. */
  compact?: boolean;
  /** While a goal is chosen: its own cards stand out, the rest step back. */
  focus?: "on" | "dim" | null;
  /** A click chooses the goal: the card's own, or a feature's goal. */
  onPick?: () => void;
  /** The card's key facts to edit, unfolded under it after a click. */
  editor?: React.ReactNode;
}) {
  const t = useTranslations("roadmap");
  const tb = useTranslations("backlog");
  const isGoal = card.kind === "goal";
  const started = card.status === "in_progress";

  const kind = (
    <span
      className={cn(
        "shrink-0 rounded px-1.5 py-px text-[10px] font-semibold tracking-[0.04em]",
        isGoal ? "bg-goal-soft text-goal" : "bg-feature-soft text-feature",
      )}
    >
      {isGoal ? tb("kind.goal") : tb("kind.feature")}
    </span>
  );
  const meta = (
    <span className="shrink-0 tabular text-[11px] text-slate">
      {card.size && <span className="mr-1 font-semibold text-ink">{card.size}</span>}
      {card.points !== null ? card.points.toLocaleString("da-DK") : "–"}
      {card.milestoneCode && <span className="ml-1">· {card.milestoneCode}</span>}
    </span>
  );
  const status = started ? (
    <span className="shrink-0 rounded-full bg-progress-soft px-2 py-px text-[11px] font-medium text-progress">
      {tb("status.in_progress")}
    </span>
  ) : (
    <span className="shrink-0 text-[11px] text-slate">{tb("status.planned")}</span>
  );

  return (
    <li
      draggable={editor ? false : drag.draggable}
      onDragStart={drag.onDragStart}
      onDragEnd={drag.onDragEnd}
      onDragOver={drag.onDragOver}
      onDrop={drag.onDrop}
      onClick={onPick}
      title={t("focus.hint")}
      className={cn(
        "flex cursor-grab rounded-md border border-hairline border-l-[3px] bg-surface px-2.5 py-2 transition-shadow hover:shadow-[0_1px_3px_rgba(31,45,51,0.12)] active:cursor-grabbing",
        compact ? "flex-wrap items-center gap-2" : "flex-col gap-1.5",
        editor && "cursor-default",
        isGoal ? "border-l-goal" : "border-l-feature",
        pending && "opacity-60",
        focus === "dim" && "opacity-35",
        focus === "on" && (isGoal ? "ring-2 ring-goal" : "ring-1 ring-feature"),
        drag.mark,
      )}
    >
      {compact ? (
        <>
          <p className="min-w-0 flex-1 truncate text-[13px] leading-snug font-medium">
            {card.title}
          </p>
          {started && status}
          {kind}
          {meta}
          {editor && <div className="basis-full">{editor}</div>}
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            {kind}
            {meta}
          </div>
          <p className={cn("text-[13px] leading-snug", isGoal ? "font-semibold" : "font-medium")}>
            {card.title}
          </p>
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="flex items-center gap-2">
              {card.overdue && <span className="font-semibold text-danger">{t("overdue")}</span>}
              {card.integration && (
                <Plug className="size-3.5 text-slate" aria-label={tb("row.integration")} />
              )}
              {card.warnings.length > 0 && (
                <TriangleAlert className="size-3.5 text-warning" aria-label={t("hasWarnings")} />
              )}
            </span>
            {status}
          </div>
          {editor}
        </>
      )}
    </li>
  );
}
