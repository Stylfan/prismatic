"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Segmented } from "@/components/ui/segmented";
import { AddMilestone } from "@/components/program/add-milestone";
import { AddGoal } from "./add-goal";
import type { BacklogOptions } from "./types";

export type StatusFilter = "open" | "all" | "done";

/** The backlog's toolbar: search, the status and view filters, and a new business goal. */
export function BacklogToolbar({
  programId,
  options,
  query,
  onQuery,
  filter,
  onFilter,
  goalsOnly,
  onGoalsOnly,
}: {
  programId: string;
  options: BacklogOptions;
  query: string;
  onQuery: (q: string) => void;
  filter: StatusFilter;
  onFilter: (f: StatusFilter) => void;
  goalsOnly: boolean;
  onGoalsOnly: (g: boolean) => void;
}) {
  const t = useTranslations("backlog.board");
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <label className="relative">
        <span className="sr-only">{t("search")}</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={t("search")}
          className="h-8 w-60 rounded-md border border-hairline bg-surface pr-2 pl-8 text-[13px] text-ink placeholder:text-slate/70 focus:border-ink focus:outline-none"
        />
      </label>
      <span className="flex items-center gap-2 text-[12px] text-slate">
        {t("status")}
        <Segmented<StatusFilter>
          name="backlog-status"
          label={t("status")}
          value={filter}
          options={(["open", "all", "done"] as const).map((v) => ({
            value: v,
            label: t(`filter.${v}`),
          }))}
          onChange={onFilter}
        />
      </span>
      <span className="flex items-center gap-2 text-[12px] text-slate">
        {t("show")}
        <Segmented<"tree" | "goals">
          name="backlog-view"
          label={t("show")}
          value={goalsOnly ? "goals" : "tree"}
          options={[
            { value: "tree", label: t("tree") },
            { value: "goals", label: t("goalsOnly") },
          ]}
          onChange={(v) => onGoalsOnly(v === "goals")}
        />
      </span>
      <span className="flex-1" />
      <AddMilestone programId={programId} />
      <AddGoal programId={programId} options={options} />
    </div>
  );
}
