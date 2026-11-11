"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Segmented } from "@/components/ui/segmented";

export type CardStatusFilter = "all" | "planned" | "in_progress";
export type CardView = "both" | "goals" | "features";

/**
 * The roadmap's toolbar, built like the backlog's: search, which cards by
 * status, which kinds, and the colours' legend on the right.
 */
export function RoadmapToolbar({
  query,
  onQuery,
  status,
  onStatus,
  view,
  onView,
  message,
}: {
  query: string;
  onQuery: (q: string) => void;
  status: CardStatusFilter;
  onStatus: (s: CardStatusFilter) => void;
  view: CardView;
  onView: (v: CardView) => void;
  message?: React.ReactNode;
}) {
  const t = useTranslations("roadmap");
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
        {t("statusLabel")}
        <Segmented<CardStatusFilter>
          name="roadmap-status"
          label={t("statusLabel")}
          value={status}
          options={(["all", "planned", "in_progress"] as const).map((v) => ({
            value: v,
            label: t(`status.${v}`),
          }))}
          onChange={onStatus}
        />
      </span>
      <span className="flex items-center gap-2 text-[12px] text-slate">
        {t("viewLabel")}
        <Segmented<CardView>
          name="roadmap-view"
          label={t("viewLabel")}
          value={view}
          options={(["both", "goals", "features"] as const).map((v) => ({
            value: v,
            label: t(`view.${v}`),
          }))}
          onChange={onView}
        />
      </span>
      <span className="flex-1" />
      <div className="flex items-center gap-5 text-[12px] text-slate">
        {message}
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-business" aria-hidden />
          {t("legendBusiness")}
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-technical" aria-hidden />
          {t("legendTechnical")}
        </span>
      </div>
    </div>
  );
}
