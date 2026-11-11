"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import type { BoardCard, BoardColumn, BoardMilestone } from "@/lib/roadmap-view";
import { MilestoneChip } from "./milestone-chip";
import { RoadmapCard } from "./roadmap-card";
import type { useBoardDrag } from "./use-board-drag";

/** Green while there is room, amber close to full, red beyond what the tempo can carry. */
export function loadTone(pct: number | null) {
  if (pct === null) return null;
  if (pct > 100) return "danger";
  if (pct >= 85) return "warning";
  return "success";
}

const BAR = { success: "bg-success", warning: "bg-warning", danger: "bg-danger" } as const;

/**
 * One period on the roadmap: its name, how full it is against the average
 * tempo, its events, its cards and the milestones placed in it. Cards and
 * milestones dropped here land where they are aimed; the board decides
 * what a drop means.
 */
export function RoadmapColumn({
  col,
  index,
  columns,
  cards,
  milestones,
  pending,
  drag,
  onMoveCard,
  onPlaceMilestone,
  onRemoveEvent,
}: {
  col: BoardColumn;
  columns: BoardColumn[];
  cards: BoardCard[];
  milestones: BoardMilestone[];
  index: number;
  pending: boolean;
  drag: ReturnType<typeof useBoardDrag>;
  onMoveCard: (card: BoardCard, column: number) => void;
  onPlaceMilestone: (m: BoardMilestone, column: number | null) => void;
  onRemoveEvent: (eventId: string) => void;
}) {
  const t = useTranslations("roadmap");
  const tone = loadTone(col.pct);
  const unplanned = col.kind === "unplanned";
  // The last column is "not yet planned": cards can go there, milestones then go unplaced.
  const area = drag.area(index, ["item", "milestone"]);

  return (
    <section
      aria-label={col.label}
      onDragOver={area.onDragOver}
      onDrop={area.onDrop}
      className={cn(
        "flex min-h-56 min-w-0 flex-col gap-2.5 rounded-lg p-3 transition-colors",
        unplanned ? "border border-dashed border-hairline bg-transparent" : "bg-sand/70",
        area.over && "bg-sand ring-2 ring-ink/20",
      )}
    >
      <header className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className={cn("text-[14px] font-semibold", unplanned ? "text-slate" : "text-ink")}>
            {col.label}
          </h3>
          {/* What is planned against what the tempo can carry here, both in points. */}
          <span
            className={cn(
              "text-[12px] tabular",
              tone === "danger" ? "font-semibold text-danger" : "text-slate",
            )}
          >
            {col.capacity === null
              ? t("points", { points: col.load.toLocaleString("da-DK") })
              : t("pointsOf", {
                  points: col.load.toLocaleString("da-DK"),
                  capacity: col.capacity.toLocaleString("da-DK"),
                })}
          </span>
        </div>
        {tone && (
          <>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface">
              <div
                className={cn("h-full rounded-full", BAR[tone])}
                style={{ width: `${Math.min(100, col.pct ?? 0)}%` }}
              />
            </div>
          </>
        )}
        {!tone && col.range && <span className="text-[11px] text-slate tabular">{col.range}</span>}
      </header>

      {col.events.length > 0 && (
        <ul className="flex flex-col gap-1">
          {col.events.map((ev) => (
            <li
              key={ev.id}
              className="flex items-center justify-between gap-1 rounded-md border border-hairline bg-surface px-2 py-1 text-[11px]"
            >
              <span>
                {col.kind === "far" && <span className="text-slate">{ev.quarter} · </span>}
                {ev.title}
              </span>
              <button
                type="button"
                aria-label={t("removeEvent", { title: ev.title })}
                className="rounded p-0.5 text-slate hover:bg-sand hover:text-ink"
                onClick={() => onRemoveEvent(ev.id)}
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ul className="flex flex-col gap-1.5">
        {cards.map((card) => (
          <RoadmapCard
            key={card.id}
            card={card}
            columns={columns}
            onMove={onMoveCard}
            pending={pending}
            drag={drag.piece("item", card.id, index)}
          />
        ))}
      </ul>

      {milestones.length > 0 && (
        <ul className="mt-auto flex flex-col gap-1.5 pt-1">
          {milestones.map((m) => (
            <MilestoneChip
              key={m.id}
              milestone={m}
              columns={columns}
              onPlace={onPlaceMilestone}
              pending={pending}
              drag={drag.piece("milestone", m.id, index)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
