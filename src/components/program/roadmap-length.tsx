"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/controls";
import type { PeriodModel } from "@/db/schema";
import { MAX_ROADMAP_YEARS, MIN_ROADMAP_YEARS, programColumns } from "@/domain/periods";
import { formatPeriodLabel } from "./period-label";

/**
 * How far the roadmap reaches: a number of years from the current quarter,
 * one more or one fewer at a click. Under it, the shape it gives: the four
 * quarters of the near horizon, then the half-years, and where it ends.
 */
export function RoadmapLength({
  model,
  startDate,
  today,
  years,
  onChange,
}: {
  model: PeriodModel;
  startDate: string;
  today: string;
  years: number;
  onChange: (years: number) => void;
}) {
  const t = useTranslations("fields");
  const periods = useTranslations("periods");
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(startDate);
  const columns = valid ? programColumns({ model, startDate }, today, years) : [];
  const halves = columns.filter((c) => c.span === 2).length;
  const last = columns.at(-1);
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          size="icon"
          aria-label={t("roadmapLess")}
          disabled={years <= MIN_ROADMAP_YEARS}
          onClick={() => onChange(years - 1)}
        >
          <Minus className="size-4" aria-hidden />
        </Button>
        <span className="min-w-20 text-center text-[15px] font-semibold tabular">
          {t("roadmapYears", { count: years })}
        </span>
        <Button size="sm" disabled={years >= MAX_ROADMAP_YEARS} onClick={() => onChange(years + 1)}>
          <Plus className="size-4" aria-hidden />
          {t("roadmapMore")}
        </Button>
      </div>
      {last && (
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex w-full max-w-sm gap-1" aria-hidden>
            <span className="flex h-5 flex-[2] items-center justify-center rounded bg-technical-soft text-[10px] text-technical">
              {t("nearShort")}
            </span>
            {Array.from({ length: halves }, (_, k) => (
              <span key={k} className="h-5 flex-1 rounded bg-sand" />
            ))}
          </div>
          <span className="text-[12px] text-slate">
            {t("roadmapUntil", { label: formatPeriodLabel(periods, last.label) })}
          </span>
        </div>
      )}
    </div>
  );
}
