"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

/**
 * The thread from a chosen business goal's first feature to the goal
 * itself, drawn over one row of the roadmap: a dashed line through the
 * quarters it spans, a blue dot with the number of its features where
 * they lie, and a green mark where the goal is. Two rows (near and far)
 * each draw their own part, so the line runs on from one to the next.
 */
export function GoalBand({
  indexes,
  featureCount,
  goalColumn,
  span,
  slots,
}: {
  /** The board's column indexes in this row, left to right. */
  indexes: number[];
  featureCount: (column: number) => number;
  goalColumn: number | null;
  /** The first and last column the thread reaches, over the whole board. */
  span: { from: number; to: number } | null;
  /** Columns in the row's grid, when a last row of half-years is not full. */
  slots?: number;
}) {
  const t = useTranslations("roadmap.focus");
  if (!span) return null;
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${slots ?? indexes.length}, minmax(0, 1fr))` }}
      aria-hidden
    >
      {indexes.map((i, k) => {
        const inside = i >= span.from && i <= span.to;
        const count = featureCount(i);
        const isGoal = i === goalColumn;
        // From the middle of the first column to the middle of the last, through the gaps.
        const left = i === span.from ? "50%" : k === 0 ? "0" : "-6px";
        const right = i === span.to ? "50%" : k === indexes.length - 1 ? "0" : "-6px";
        return (
          <div key={i} className="relative h-6">
            {inside && span.from !== span.to && (
              <div
                className="absolute top-1/2 border-t-2 border-dashed border-goal"
                style={{ left, right }}
              />
            )}
            {count > 0 && (
              <span
                title={t("features", { count })}
                className={cn(
                  "absolute top-1/2 flex h-5 min-w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-feature px-1 text-[11px] font-semibold text-paper tabular",
                  isGoal ? "left-[calc(50%-13px)]" : "left-1/2",
                )}
              >
                {count}
              </span>
            )}
            {isGoal && (
              <span
                title={t("goal")}
                className={cn(
                  "absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] bg-goal",
                  count > 0 ? "left-[calc(50%+13px)]" : "left-1/2",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
