"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Warning } from "@/domain/backlog";

/** A card's warnings in words. They point at what does not hang together; none of them blocks. */
export function WarningList({ warnings }: { warnings: Warning[] }) {
  const t = useTranslations("backlog.warnings");
  if (warnings.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1">
      {warnings.map((w) => (
        <li key={w.kind} className="flex items-start gap-2 text-[13px] text-warning">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {w.kind === "deviation"
            ? t("deviation", {
                featurePoints: w.featurePoints.toLocaleString("da-DK"),
                estimate: w.estimate.toLocaleString("da-DK"),
                pct: w.pct,
              })
            : w.kind === "noGoal"
              ? t("noGoal")
              : w.kind === "noMilestone"
                ? t("noMilestone")
                : t("notEstimated")}
        </li>
      ))}
    </ul>
  );
}
