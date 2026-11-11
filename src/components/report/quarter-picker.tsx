"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Option } from "@/components/backlog/types";
import { Select } from "@/components/ui/controls";

/**
 * Which quarter the report is for. Every part of the page follows it: the
 * texts, the goals, the preview and what is published.
 */
export function QuarterPicker({
  programId,
  quarters,
  value,
}: {
  programId: string;
  quarters: Option[];
  value: number;
}) {
  const t = useTranslations("report.quarter");
  const router = useRouter();
  return (
    <label className="flex items-center gap-3 text-[13px] text-slate">
      {t("label")}
      <Select
        value={String(value)}
        onChange={(e) => router.push(`/programs/${programId}/report?q=${e.target.value}`)}
        className="w-56 text-[14px] font-semibold text-ink"
      >
        {quarters.map((q) => (
          <option key={q.value} value={q.value}>
            {q.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
