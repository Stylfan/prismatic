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
}: {
  card: BoardCard;
  columns: BoardColumn[];
  onMove: (card: BoardCard, column: number) => void;
  pending: boolean;
  drag: Piece;
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
      className={cn(
        "group relative flex cursor-grab flex-col gap-1.5 rounded-md border border-hairline border-l-[3px] bg-surface px-2.5 py-2 transition-shadow hover:shadow-[0_1px_3px_rgba(31,45,51,0.12)] active:cursor-grabbing",
        card.track === "technical" ? "border-l-technical" : "border-l-business",
        pending && "opacity-60",
        drag.mark,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "rounded px-1.5 py-px text-[10px] font-semibold tracking-[0.04em]",
            isGoal
              ? card.track === "technical"
                ? "bg-technical-soft text-technical"
                : "bg-business-soft text-business"
              : "text-slate",
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
      <p className={cn("text-[13px] leading-snug", isGoal ? "font-semibold" : "font-medium")}>
        {card.title}
      </p>
      {(card.overdue ||
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
