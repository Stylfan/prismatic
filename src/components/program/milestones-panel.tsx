"use client";

import { useTranslations } from "next-intl";
import { StatusMessage, useStatus } from "@/components/ui/status";
import { MilestoneRow, type MilestoneRowView } from "./milestone-row";

/**
 * The programme's milestones in order, one line each, each building on the
 * ones before it. A new one is added with the button by the heading.
 */
export function MilestonesPanel({ milestones }: { milestones: MilestoneRowView[] }) {
  const t = useTranslations("milestones");
  const [status, setStatus] = useStatus();

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg border border-hairline bg-surface px-4">
        {milestones.length === 0 ? (
          <p className="py-4 text-sm text-slate">{t("emptyShort")}</p>
        ) : (
          <ol className="flex flex-col divide-y divide-hairline-soft">
            {milestones.map((m, i) => (
              <MilestoneRow
                key={m.id}
                milestone={m}
                first={i === 0}
                last={i === milestones.length - 1}
                onStatus={setStatus}
              />
            ))}
          </ol>
        )}
      </div>
      <StatusMessage status={status} />
    </div>
  );
}
