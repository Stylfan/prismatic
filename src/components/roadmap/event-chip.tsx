"use client";

import { CalendarDays, X } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * An activity or event in a quarter, drawn like a milestone: a dark badge
 * on the left, here with a calendar mark instead of a code, then the name.
 */
export function EventChip({
  event,
  showQuarter,
  onRemove,
}: {
  event: { id: string; title: string; quarter: string };
  /** In a half-year column, which of its quarters the event is in. */
  showQuarter: boolean;
  onRemove: () => void;
}) {
  const t = useTranslations("roadmap");
  return (
    <li className="group flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-2 py-1.5">
      <span
        className="flex h-4 shrink-0 items-center rounded-full bg-ink px-1.5 text-paper"
        title={t("eventMark")}
      >
        <CalendarDays className="size-2.5" aria-label={t("eventMark")} />
      </span>
      <span className="min-w-0 flex-1 text-[12px] leading-snug font-medium text-ink">
        {showQuarter && <span className="font-normal text-slate">{event.quarter} · </span>}
        {event.title}
      </span>
      <button
        type="button"
        aria-label={t("removeEvent", { title: event.title })}
        className="rounded p-0.5 text-slate opacity-0 transition-opacity group-hover:opacity-100 hover:bg-sand hover:text-ink focus:opacity-100"
        onClick={onRemove}
      >
        <X className="size-3" aria-hidden />
      </button>
    </li>
  );
}
