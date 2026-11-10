import { getTranslations } from "next-intl/server";
import type { Period } from "@/domain/periods";
import { formatDate, formatPeriodLabel } from "./period-label";

/**
 * The roadmap's columns as the settings lay them out today: quarters near
 * at hand, half-years further out, and the column for what is not yet
 * planned. The board itself arrives with business goals and features.
 */
export async function ColumnsPreview({ columns }: { columns: Period[] }) {
  const t = await getTranslations("program");
  const periods = await getTranslations("periods");
  return (
    <ol className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-4 lg:grid-cols-7">
      {columns.map((c) => (
        <li key={c.index} className="flex flex-col gap-1 bg-surface p-4">
          <span className="text-[11px] font-bold tracking-[0.14em] text-bronze-deep uppercase">
            {c.span === 1 ? t("kindQuarter") : t("kindHalf")}
          </span>
          <span className="text-sm font-semibold">{formatPeriodLabel(periods, c.label)}</span>
          <span className="tabular text-xs text-slate">
            {t("range", { start: formatDate(c.start), end: formatDate(c.end) })}
          </span>
        </li>
      ))}
      <li className="flex flex-col gap-1 bg-paper p-4">
        <span className="text-[11px] font-bold tracking-[0.14em] text-slate uppercase">
          {t("unplannedHint")}
        </span>
        <span className="text-sm font-semibold">{t("unplanned")}</span>
      </li>
    </ol>
  );
}
