"use client";

import { ChevronRight, Plug, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import type { ItemView } from "./types";

/** One grid for the header and every row, so the columns stand under each other. */
export const TREE_COLS =
  "grid grid-cols-[1rem_1.25rem_minmax(0,1fr)_12.5rem_2.5rem_4rem_6rem_1.25rem] items-center gap-x-3";

const STATUS_STYLE = {
  planned: "border border-hairline text-slate",
  in_progress: "bg-technical-soft text-technical",
  done: "bg-success-soft text-success",
} as const;

/**
 * A business goal or a feature in the backlog tree. A goal can be dragged
 * by its grip and fold its features away; a click on the row opens it in
 * the side panel.
 */
export function TreeRow({
  item,
  depth,
  selected,
  onSelect,
  expanded,
  onToggle,
  meta,
  handle,
}: {
  item: ItemView;
  depth: 0 | 1;
  selected: boolean;
  onSelect: () => void;
  expanded?: boolean;
  onToggle?: () => void;
  meta?: string;
  /** The grip a goal is dragged by; features have none. */
  handle?: React.ReactNode;
}) {
  const t = useTranslations("backlog");
  const isGoal = item.kind === "goal";
  const done = item.status === "done";
  return (
    <div
      className={cn(
        TREE_COLS,
        "cursor-pointer border-b border-hairline-soft px-3 py-2 text-[13px] transition-colors last:border-b-0",
        isGoal ? "bg-paper/60" : "bg-surface",
        selected ? "bg-technical-soft/60" : "hover:bg-sand/50",
      )}
      onClick={onSelect}
    >
      <span className="flex justify-center">{handle}</span>
      <span className="flex justify-center">
        {onToggle ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={t(expanded ? "board.fold" : "board.unfold", { title: item.title })}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="rounded p-0.5 text-slate hover:bg-sand hover:text-ink"
          >
            <ChevronRight
              className={cn("size-3.5 transition-transform", expanded && "rotate-90")}
              aria-hidden
            />
          </button>
        ) : null}
      </span>
      <span className={cn("flex min-w-0 items-baseline gap-2", depth === 1 && "pl-5")}>
        <button
          type="button"
          className={cn(
            "min-w-0 truncate text-left",
            isGoal ? "font-semibold text-ink" : "text-ink",
            done && "text-slate",
          )}
          aria-label={t("row.edit", { title: item.title })}
          aria-pressed={selected}
        >
          {item.title}
        </button>
        {/* The title keeps its room; the small count gives way first. */}
        {meta && (
          <span className="min-w-0 shrink-[100] truncate text-[12px] text-slate">{meta}</span>
        )}
        {item.integration && (
          <Plug
            className="size-3.5 shrink-0 self-center text-slate"
            aria-label={t("row.integration")}
          />
        )}
      </span>
      <span className="truncate text-[12px] text-slate">
        {done && item.doneQuarterLabel
          ? t("row.doneIn", { period: item.doneQuarterLabel })
          : (item.periodLabel ?? t("row.unplanned"))}
      </span>
      <span className="text-[12px] font-semibold text-ink tabular">{item.size ?? ""}</span>
      <span className="text-right text-ink tabular">
        {item.points === null ? (
          <span className="text-slate">–</span>
        ) : (
          item.points.toLocaleString("da-DK")
        )}
      </span>
      <span>
        <span
          className={cn(
            "inline-block rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
            STATUS_STYLE[item.status],
          )}
        >
          {t(`status.${item.status}`)}
        </span>
      </span>
      <span className="flex justify-center">
        {item.warnings.length > 0 && (
          <TriangleAlert
            className="size-3.5 text-warning"
            aria-label={t("board.warnings", { count: item.warnings.length })}
          />
        )}
      </span>
    </div>
  );
}
