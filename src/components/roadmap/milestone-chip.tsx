"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { RemoveMilestone } from "@/components/program/remove-milestone";
import type { BoardColumn, BoardMilestone } from "@/lib/roadmap-view";
import type { useBoardDrag } from "./use-board-drag";

type Piece = ReturnType<ReturnType<typeof useBoardDrag>["piece"]>;

/**
 * A milestone on the roadmap: the manager drags it to the column where it
 * should be reached. When some of its own work is planned later, it says so.
 */
export function MilestoneChip({
  milestone,
  columns,
  onPlace,
  pending,
  drag,
}: {
  milestone: BoardMilestone;
  columns: BoardColumn[];
  onPlace: (milestone: BoardMilestone, column: number | null) => void;
  pending: boolean;
  drag: Piece;
}) {
  const t = useTranslations("roadmap");
  const warn = milestone.later.length > 0;
  return (
    <li
      draggable={drag.draggable}
      onDragStart={drag.onDragStart}
      onDragEnd={drag.onDragEnd}
      onDragOver={drag.onDragOver}
      onDrop={drag.onDrop}
      className={cn(
        "group relative flex cursor-grab flex-col gap-1 rounded-lg border bg-surface px-2 py-1.5 active:cursor-grabbing",
        warn ? "border-warning bg-warning-soft" : "border-hairline",
        pending && "opacity-60",
        drag.mark,
      )}
    >
      {/* The same mark as in the forecast chart: the code in a dark badge, then the name. */}
      <p className="flex items-center gap-1.5 text-[12px] leading-snug font-medium text-ink">
        <span className="shrink-0 rounded-full bg-ink px-1.5 text-[10px] leading-4 font-semibold text-paper tabular">
          {milestone.code}
        </span>
        <span className="min-w-0 flex-1">{milestone.title}</span>
        <span className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <RemoveMilestone
            milestoneId={milestone.id}
            name={`${milestone.code}: ${milestone.title}`}
          />
        </span>
      </p>
      {warn && (
        <p className="flex items-start gap-1.5 text-[11px] text-warning">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
          {t("milestoneLater", { count: milestone.later.length })}
        </p>
      )}
      <label className="sr-only" htmlFor={`place-${milestone.id}`}>
        {t("placeMilestone", { code: milestone.code })}
      </label>
      <select
        id={`place-${milestone.id}`}
        value={milestone.column === null ? "" : String(milestone.column)}
        disabled={pending}
        onChange={(e) => onPlace(milestone, e.target.value === "" ? null : Number(e.target.value))}
        className="absolute right-1.5 bottom-1.5 h-6 max-w-[70%] cursor-pointer rounded border border-hairline bg-surface text-[11px] text-ink opacity-0 transition-opacity group-hover:opacity-100 focus:border-ink focus:opacity-100"
      >
        <option value="">{t("notPlaced")}</option>
        {columns.slice(0, -1).map((c, i) => (
          <option key={c.key} value={i}>
            {t("moveOption", { column: c.label })}
          </option>
        ))}
      </select>
    </li>
  );
}
