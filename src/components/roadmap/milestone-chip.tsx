"use client";

import { Flag, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import type { BoardColumn, BoardMilestone } from "@/lib/roadmap-view";

/**
 * A milestone on the roadmap: the manager drags it to the column where it
 * should be reached. When some of its own work is planned later, it says so.
 */
export function MilestoneChip({
  milestone,
  columns,
  onPlace,
  pending,
}: {
  milestone: BoardMilestone;
  columns: BoardColumn[];
  onPlace: (milestone: BoardMilestone, column: number | null) => void;
  pending: boolean;
}) {
  const t = useTranslations("roadmap");
  const warn = milestone.later.length > 0;
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(
          "text/plain",
          JSON.stringify({ type: "milestone", id: milestone.id }),
        );
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "group relative flex cursor-grab flex-col gap-1 rounded-md px-2.5 py-2 active:cursor-grabbing",
        warn ? "border border-warning bg-warning-soft text-ink" : "bg-ink text-paper",
        pending && "opacity-60",
      )}
    >
      <p className="flex items-start gap-2 text-[12px] font-semibold leading-snug">
        <Flag className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          {milestone.code} · {milestone.title}
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
