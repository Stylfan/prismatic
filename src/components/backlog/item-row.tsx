"use client";

import { useState } from "react";
import { ChevronDown, Plug, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { ItemEditor } from "./item-editor";
import type { BacklogOptions, ItemView } from "./types";

/**
 * One business goal or feature as a row: its track as a coloured edge,
 * kind, title, where it is planned or when it closed, size and points,
 * status and whether anything needs attention. The row opens into the
 * editor in place, so the list never loses its context.
 */
export function ItemRow({ item, options }: { item: ItemView; options: BacklogOptions }) {
  const t = useTranslations("backlog");
  const [open, setOpen] = useState(false);
  const isGoal = item.kind === "goal";
  const editorId = `editor-${item.id}`;

  return (
    <li className={cn("bg-surface", isGoal ? "" : "pl-10")}>
      <div
        className={cn(
          "flex items-stretch border-l-[3px]",
          item.track === "technical" ? "border-technical" : "border-business",
        )}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-controls={editorId}
          aria-label={t("row.edit", { title: item.title })}
          onClick={() => setOpen((v) => !v)}
          className="grid flex-1 grid-cols-[7rem_minmax(0,1fr)_8rem_10rem_1rem] items-center gap-x-4 gap-y-0.5 px-4 py-2 text-left transition-colors hover:bg-paper"
        >
          <span
            className={cn(
              "w-28 shrink-0 rounded py-0.5 text-center text-[11px] font-medium",
              isGoal
                ? item.track === "technical"
                  ? "bg-technical-soft text-technical"
                  : "bg-business-soft text-business"
                : "text-slate",
            )}
            title={isGoal ? t("kind.goalLong") : t("kind.featureLong")}
          >
            {isGoal ? t("kind.goal") : t("kind.feature")}
          </span>
          <span className="flex min-w-0 flex-col">
            <span
              className={cn(
                "truncate text-sm",
                isGoal ? "font-semibold" : "font-medium",
                item.status === "done" && "text-slate line-through decoration-hairline",
              )}
            >
              {item.title}
            </span>
            <span className="truncate text-xs text-slate">
              {item.status === "done" && item.doneQuarterLabel
                ? t("row.doneIn", { period: item.doneQuarterLabel })
                : (item.periodLabel ?? t("row.unplanned"))}
              {isGoal &&
                ` · ${t("row.features", { count: item.featureCount ?? 0 })}` +
                  (item.featureCount
                    ? ` · ${t("row.featureProgress", { done: item.donePoints ?? 0, total: item.featurePoints ?? 0 })}`
                    : "")}
            </span>
          </span>
          <span className="tabular text-right text-[13px]">
            {item.size && <span className="mr-2 font-semibold">{item.size}</span>}
            <span className={item.points === null ? "text-slate" : ""}>
              {item.points === null
                ? t("row.noPoints")
                : t("row.points", { points: item.points.toLocaleString("da-DK") })}
            </span>
          </span>
          <span className="flex items-center justify-end gap-2">
            {item.integration && (
              <Plug className="size-4 text-slate" aria-label={t("row.integration")} />
            )}
            {item.warnings.length > 0 && (
              <TriangleAlert
                className="size-4 text-warning"
                aria-label={item.warnings.length.toString()}
              />
            )}
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                item.status === "done" && "bg-success-soft text-success",
                item.status === "in_progress" && "bg-technical-soft text-technical",
                item.status === "planned" && "border border-hairline text-slate",
              )}
            >
              {t(`status.${item.status}`)}
            </span>
          </span>
          <ChevronDown
            className={cn("size-4 text-slate transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </div>
      {open && (
        <div id={editorId} className="border-t border-hairline-soft bg-paper/60 px-4 py-5 sm:px-6">
          <ItemEditor item={item} options={options} onClose={() => setOpen(false)} />
        </div>
      )}
    </li>
  );
}
