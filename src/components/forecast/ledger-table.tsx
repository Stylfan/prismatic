"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { saveQuarterAction } from "@/actions/quarters";
import { Input } from "@/components/ui/controls";
import { StatusMessage, useStatus, type Status } from "@/components/ui/status";
import { cn } from "@/lib/cn";
import type { LedgerRow } from "@/lib/forecast-view";

/**
 * The quarter ledger. Each quarter has a capacity and a number of points:
 * delivered once it has ended, planned before. The number is computed from
 * the backlog and can be typed over; an empty field goes back to the
 * computed one. A row saves when a field loses focus with a changed value.
 */
export function LedgerTable({ programId, rows }: { programId: string; rows: LedgerRow[] }) {
  const t = useTranslations("forecast.ledger");
  const [status, setStatus] = useStatus();
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-hairline bg-paper text-[11px] font-bold tracking-[0.12em] text-slate uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">
                {t("quarter")}
              </th>
              <th scope="col" className="w-28 px-4 py-3">
                {t("capacity")}
              </th>
              <th scope="col" className="w-48 px-4 py-3">
                {t("points")}
              </th>
              <th scope="col" className="w-32 px-4 py-3 text-right">
                {t("velocity")}
              </th>
              <th scope="col" className="px-4 py-3">
                {t("comment")}
              </th>
              <th scope="col" className="w-12 px-2 py-3">
                <span className="sr-only">{t("reset")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-soft">
            {rows.map((row) => (
              <LedgerRowView key={row.index} programId={programId} row={row} onStatus={setStatus} />
            ))}
          </tbody>
        </table>
      </div>
      <StatusMessage status={status} />
    </div>
  );
}

function LedgerRowView({
  programId,
  row,
  onStatus,
}: {
  programId: string;
  row: LedgerRow;
  onStatus: (s: Status) => void;
}) {
  const t = useTranslations("forecast.ledger");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const initial = {
    capacity: String(row.capacityPct),
    points: row.override?.toString() ?? "",
    comment: row.comment,
  };
  const [v, setV] = useState(initial);
  const id = (name: string) => `q${row.index}-${name}`;

  const save = (next: typeof v) => {
    if (JSON.stringify(next) === JSON.stringify(initial)) return;
    const capacity = Math.round(Number(next.capacity));
    const points = next.points.trim() === "" ? null : Math.round(Number(next.points));
    if (
      !Number.isFinite(capacity) ||
      capacity < 0 ||
      capacity > 300 ||
      (points !== null && !(points >= 0))
    ) {
      setV(initial);
      return;
    }
    startTransition(async () => {
      const result = await saveQuarterAction({
        programId,
        quarterIndex: row.index,
        capacityPct: capacity,
        deliveredOverride: row.phase === "past" ? points : null,
        plannedOverride: row.phase === "past" ? null : points,
        comment: next.comment,
      });
      if (!result.ok) {
        setV(initial);
        return onStatus({ kind: "error", text: errors(result.error) });
      }
      onStatus({ kind: "ok", text: t("saved", { quarter: row.label }) });
      router.refresh();
    });
  };

  const blurSave = () => save(v);
  const changed = row.capacityPct !== 100 || row.override !== null || row.comment !== "";

  return (
    <tr className={cn(row.phase === "current" && "bg-sand/50")}>
      <th scope="row" className="px-4 py-2.5 align-top font-semibold">
        {row.label}
        <span className="tabular block text-[11px] font-normal text-slate">{row.range}</span>
        {row.events.length > 0 && (
          <span className="block text-[11px] font-normal text-bronze-deep">
            {row.events.join(" · ")}
          </span>
        )}
      </th>
      <td className="px-4 py-2.5 align-top">
        <label htmlFor={id("cap")} className="sr-only">
          {t("capacityFor", { quarter: row.label })}
        </label>
        <div className="flex items-center gap-1.5">
          <Input
            id={id("cap")}
            type="number"
            min={0}
            max={300}
            className="tabular h-9 w-20"
            value={v.capacity}
            onChange={(e) => setV({ ...v, capacity: e.target.value })}
            onBlur={blurSave}
          />
          <span className="text-slate">%</span>
        </div>
      </td>
      <td className="px-4 py-2.5 align-top">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <label htmlFor={id("pts")} className="sr-only">
            {row.phase === "past"
              ? t("deliveredFor", { quarter: row.label })
              : t("plannedFor", { quarter: row.label })}
          </label>
          <Input
            id={id("pts")}
            type="number"
            min={0}
            className="tabular h-9 w-28"
            placeholder={t("computed", { points: row.computed.toLocaleString("da-DK") })}
            value={v.points}
            onChange={(e) => setV({ ...v, points: e.target.value })}
            onBlur={blurSave}
          />
          <span className="text-[12px] text-slate">
            {row.phase === "past" ? t("delivered") : t("planned")}
          </span>
          {row.phase === "current" && row.deliveredSoFar > 0 && (
            <span className="basis-full text-[11px] text-slate">
              {t("soFar", { points: row.deliveredSoFar.toLocaleString("da-DK") })}
            </span>
          )}
        </div>
      </td>
      <td className="tabular px-4 py-2.5 text-right align-top">
        {row.velocity !== null ? Math.round(row.velocity).toLocaleString("da-DK") : ""}
      </td>
      <td className="px-4 py-2.5 align-top">
        <label htmlFor={id("note")} className="sr-only">
          {t("commentFor", { quarter: row.label })}
        </label>
        <Input
          id={id("note")}
          maxLength={300}
          className="h-9"
          value={v.comment}
          onChange={(e) => setV({ ...v, comment: e.target.value })}
          onBlur={blurSave}
        />
      </td>
      <td className="px-2 py-2.5 align-top">
        {changed && (
          <button
            type="button"
            aria-label={t("resetFor", { quarter: row.label })}
            className="rounded p-2 text-slate hover:bg-sand hover:text-ink"
            onClick={() => {
              const reset = { capacity: "100", points: "", comment: "" };
              setV(reset);
              save(reset);
            }}
          >
            <RotateCcw className="size-4" aria-hidden />
          </button>
        )}
      </td>
    </tr>
  );
}
