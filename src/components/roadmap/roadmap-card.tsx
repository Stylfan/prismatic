"use client";

import { Plug, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import type { BoardColumn, BoardCard } from "@/lib/roadmap-view";
import type { useBoardDrag } from "./use-board-drag";

type Piece = ReturnType<ReturnType<typeof useBoardDrag>["piece"]>;

/**
 * A card on the roadmap. It can be dragged to another column or to
 * another place in its own, or moved with its own "Flyt til" list, so the
 * board works without a mouse too.
 */
export function RoadmapCard({
  card,
  columns,
  onMove,
  pending,
  drag,
  compact = false,
  focus = null,
  onPick,
}: {
  card: BoardCard;
  columns: BoardColumn[];
  onMove: (card: BoardCard, column: number) => void;
  pending: boolean;
  drag: Piece;
  /** One line, for the list of what is not yet planned. */
  compact?: boolean;
  /** While a goal is chosen: its own cards stand out, the rest step back. */
  focus?: "on" | "dim" | null;
  /** A click chooses the goal: the card's own, or a feature's goal. */
  onPick?: () => void;
}) {
  const t = useTranslations("roadmap");
  const tb = useTranslations("backlog");
  const isGoal = card.kind === "goal";
  return (
    <li
      draggable={drag.draggable}
      onDragStart={drag.onDragStart}
      onDragEnd={drag.onDragEnd}
      onDragOver={drag.onDragOver}
      onDrop={drag.onDrop}
      onClick={onPick}
      title={t("focus.hint")}
      className={cn(
        "group relative flex cursor-grab rounded-md border border-hairline border-l-[3px] bg-surface px-2.5 py-2 transition-shadow hover:shadow-[0_1px_3px_rgba(31,45,51,0.12)] active:cursor-grabbing",
        compact ? "items-center gap-2" : "flex-col gap-1.5",
        card.kind === "goal" ? "border-l-goal" : "border-l-feature",
        pending && "opacity-60",
        focus === "dim" && "opacity-35",
        focus === "on" && (isGoal ? "ring-2 ring-goal" : "ring-1 ring-feature"),
        drag.mark,
      )}
    >
      <div
        className={cn("flex items-start justify-between gap-2", compact && "order-last shrink-0")}
      >
        <span
          className={cn(
            "rounded px-1.5 py-px text-[10px] font-semibold tracking-[0.04em]",
            isGoal ? "bg-goal-soft text-goal" : "bg-feature-soft text-feature",
          )}
        >
          {isGoal ? tb("kind.goal") : tb("kind.feature")}
        </span>
        <span className="tabular text-[11px] text-slate">
          {card.size && <span className="mr-1 font-semibold text-ink">{card.size}</span>}
          {card.points !== null ? card.points.toLocaleString("da-DK") : "–"}
          {card.milestoneCode && <span className="ml-1">· {card.milestoneCode}</span>}
        </span>
      </div>
      <p
        className={cn(
          "text-[13px] leading-snug",
          isGoal ? "font-semibold" : "font-medium",
          compact && "min-w-0 flex-1 truncate",
        )}
      >
        {card.title}
      </p>
      {!compact &&
        (card.overdue ||
          card.integration ||
          card.warnings.length > 0 ||
          card.status === "in_progress") && (
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {card.status === "in_progress" && (
              <span className="rounded-full bg-technical-soft px-2 py-px font-medium text-technical">
                {tb("status.in_progress")}
              </span>
            )}
            {card.overdue && <span className="font-semibold text-danger">{t("overdue")}</span>}
            {card.integration && (
              <Plug className="size-3.5 text-slate" aria-label={tb("row.integration")} />
            )}
            {card.warnings.length > 0 && (
              <TriangleAlert className="size-3.5 text-warning" aria-label={t("hasWarnings")} />
            )}
          </div>
        )}
      <label className="sr-only" htmlFor={`move-${card.id}`}>
        {t("moveTo", { title: card.title })}
      </label>
      <select
        id={`move-${card.id}`}
        value={card.column}
        disabled={pending}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onMove(card, Number(e.target.value))}
        className="absolute right-1.5 bottom-1.5 h-6 max-w-[70%] cursor-pointer rounded border border-hairline bg-surface text-[11px] text-slate opacity-0 transition-opacity group-hover:opacity-100 focus:border-ink focus:opacity-100"
      >
        {columns.map((c, i) => (
          <option key={c.key} value={i}>
            {t("moveOption", { column: c.label })}
          </option>
        ))}
      </select>
    </li>
  );
}
