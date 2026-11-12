"use client";

import { useTranslations } from "next-intl";
import { RemoveMilestone } from "@/components/program/remove-milestone";

/** A milestone's name and its own progress, the same figure and bar as on the overview. */
export function GroupHeader({
  label,
  progress,
  milestoneId,
}: {
  label: string;
  /** Given for a real milestone, which can then be deleted from here. */
  milestoneId?: string;
  progress?: { own: number; done: number };
}) {
  const t = useTranslations("backlog.groups");
  const fmt = (n: number) => Math.round(n).toLocaleString("da-DK");
  const share = progress && progress.own > 0 ? Math.min(1, progress.done / progress.own) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-center gap-1">
          <h2 className="text-[14px] font-semibold text-ink">{label}</h2>
          {milestoneId && <RemoveMilestone milestoneId={milestoneId} name={label} />}
        </div>
        {progress && progress.own > 0 && (
          <span className="text-[12px] text-slate tabular">
            {t("progress", {
              pct: Math.round(share * 100),
              done: fmt(progress.done),
              own: fmt(progress.own),
            })}
          </span>
        )}
      </div>
      {progress && progress.own > 0 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-sand">
          <div className="h-full rounded-full bg-ink" style={{ width: `${share * 100}%` }} />
        </div>
      )}
    </div>
  );
}
