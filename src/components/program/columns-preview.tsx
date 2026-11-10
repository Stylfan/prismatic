"use client";

import { useTranslations } from "next-intl";
import type { PeriodModel } from "@/db/schema";
import { roadmapColumns } from "@/domain/periods";
import { formatDate, formatPeriodLabel } from "./period-label";

/**
 * The roadmap's columns as the settings being edited would lay them out:
 * the near horizon in quarters, the far horizon in three half-years, and
 * the column for what is not yet planned. It follows the form as you type.
 */
export function ColumnsPreview({
  model,
  startDate,
  quarterHorizon,
  today,
}: {
  model: PeriodModel;
  startDate: string;
  quarterHorizon: number;
  today: string;
}) {
  const t = useTranslations("program");
  const periods = useTranslations("periods");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return null;
  const columns = roadmapColumns({ model, startDate }, today, quarterHorizon);
  const near = columns.filter((c) => c.span === 1).length;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] font-medium">{t("columnsTitle")}</p>
      <ol
        className="grid gap-px overflow-hidden rounded-lg border border-hairline bg-hairline"
        style={{ gridTemplateColumns: `repeat(${columns.length + 1}, minmax(0, 1fr))` }}
      >
        {columns.map((c) => (
          <li key={c.index} className="flex flex-col gap-1 bg-surface p-3">
            <span className="text-[10px] font-bold tracking-[0.14em] text-bronze-deep uppercase">
              {c.span === 1 ? t("nearHorizon") : t("farHorizon")}
            </span>
            <span className="text-[13px] font-semibold">{formatPeriodLabel(periods, c.label)}</span>
            <span className="tabular text-[11px] text-slate">
              {t("range", { start: formatDate(c.start), end: formatDate(c.end) })}
            </span>
          </li>
        ))}
        <li className="flex flex-col gap-1 bg-paper p-3">
          <span className="text-[10px] font-bold tracking-[0.14em] text-slate uppercase">
            {t("unplannedHint")}
          </span>
          <span className="text-[13px] font-semibold">{t("unplanned")}</span>
        </li>
      </ol>
      {near > quarterHorizon && (
        <p className="text-xs text-slate">{t("columnsExtra", { count: near - quarterHorizon })}</p>
      )}
    </div>
  );
}
