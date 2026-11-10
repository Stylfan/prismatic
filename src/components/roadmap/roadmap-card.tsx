"use client";

import { Plug, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import type { BoardColumn, BoardCard } from "@/lib/roadmap-view";

/**
 * A card on the roadmap. It can be dragged to another column, or moved
 * with its own "Flyt til" list, so the board works without a mouse too.
 */
export function RoadmapCard({
  card,
  columns,
  onMove,
  pending,
}: {
  card: BoardCard;
  columns: BoardColumn[];
  onMove: (card: BoardCard, column: number) => void;
  pending: boolean;
}) {
  const t = useTranslations("roadmap");
  const tb = useTranslations("backlog");
  const isGoal = card.kind === "goal";
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({ type: "item", id: card.id }));
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "group flex cursor-grab flex-col gap-2 rounded-md border border-hairline border-l-[3px] bg-surface p-3 active:cursor-grabbing",
        card.track === "technical" ? "border-l-technical" : "border-l-business",
        pending && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "rounded-sm px-1.5 py-0.5 text-[10px] font-bold tracking-[0.08em]",
            isGoal ? "bg-ink text-paper" : "border border-hairline text-slate",
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
            <span className="rounded-full bg-ink px-2 py-0.5 font-semibold text-paper">
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
        className="h-7 w-full cursor-pointer rounded border border-transparent bg-transparent text-[11px] text-slate opacity-0 transition-opacity group-hover:border-hairline group-hover:opacity-100 focus:border-ink focus:opacity-100"
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
