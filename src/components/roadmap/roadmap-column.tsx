"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import type { BoardCard, BoardColumn, BoardMilestone } from "@/lib/roadmap-view";
import { EventChip } from "./event-chip";
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
  focusOf,
  onPick,
  editorFor,
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
  focusOf: (card: BoardCard) => "on" | "dim" | null;
  onPick: (card: BoardCard) => void;
  editorFor: (card: BoardCard) => React.ReactNode;
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
      <header className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <h3
          title={col.label}
          className={cn("text-[14px] font-semibold", unplanned ? "text-slate" : "text-ink")}
        >
          {col.label}
        </h3>
        {/* What is planned against what the tempo can carry here, both in points. */}
        <span
          className={cn(
            "text-[11px] whitespace-nowrap tabular",
            tone === "danger" ? "font-semibold text-danger" : "text-slate",
          )}
        >
          {col.capacity === null
            ? t("points", { points: col.load.toLocaleString("da-DK") })
            : t("pointsOf", {
                points: col.load.toLocaleString("da-DK"),
                capacity: col.capacity.toLocaleString("da-DK"),
                pct: col.pct ?? 0,
              })}
        </span>
      </header>

      <ul className="flex flex-col gap-1.5">
        {cards.map((card) => (
          <RoadmapCard
            key={card.id}
            card={card}
            pending={pending}
            drag={drag.piece("item", card.id, index)}
            focus={focusOf(card)}
            onPick={() => onPick(card)}
            editor={editorFor(card)}
          />
        ))}
      </ul>

      {(milestones.length > 0 || col.events.length > 0) && (
        <ul className="mt-auto flex flex-col gap-1.5 pt-1">
          {col.events.map((ev) => (
            <EventChip
              key={ev.id}
              event={ev}
              showQuarter={col.kind === "far"}
              onRemove={() => onRemoveEvent(ev.id)}
            />
          ))}
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
