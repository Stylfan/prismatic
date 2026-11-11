"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import type { BoardCard, BoardColumn } from "@/lib/roadmap-view";
import { RoadmapCard } from "./roadmap-card";
import type { useBoardDrag } from "./use-board-drag";

/**
 * The goals and features not yet planned, one under the other, like the
 * milestones not yet placed. They are dragged from here to a quarter, and
 * a planned card dragged back here is unplanned again.
 */
export function UnplannedCards({
  index,
  cards,
  columns,
  pending,
  drag,
  focusOf,
  onPick,
  editorFor,
}: {
  /** The board's "not yet planned" column. */
  index: number;
  cards: BoardCard[];
  columns: BoardColumn[];
  pending: boolean;
  drag: ReturnType<typeof useBoardDrag>;
  focusOf: (card: BoardCard) => "on" | "dim" | null;
  onPick: (card: BoardCard) => void;
  editorFor: (card: BoardCard) => React.ReactNode;
}) {
  const t = useTranslations("roadmap.unplannedList");
  const area = drag.area(index, ["item"]);
  const points = columns[index]?.load ?? 0;
  return (
    <section aria-labelledby="unplanned-title" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 id="unplanned-title" className="text-[15px] font-semibold text-ink">
            {t("title")}
          </h2>
          <p className="text-[13px] leading-relaxed text-slate">{t("lead")}</p>
        </div>
        {points > 0 && (
          <span className="shrink-0 text-[12px] text-slate tabular">
            {t("points", { points: points.toLocaleString("da-DK") })}
          </span>
        )}
      </div>
      <div
        onDragOver={area.onDragOver}
        onDrop={area.onDrop}
        className={cn(
          "flex flex-col rounded-lg border border-dashed border-hairline p-3 transition-colors",
          area.over && "bg-sand ring-2 ring-ink/20",
        )}
      >
        {cards.length === 0 ? (
          <p className="text-[13px] text-slate">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {cards.map((card) => (
              <RoadmapCard
                key={card.id}
                card={card}
                pending={pending}
                drag={drag.piece("item", card.id, index)}
                compact
                focus={focusOf(card)}
                onPick={() => onPick(card)}
                editor={editorFor(card)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
