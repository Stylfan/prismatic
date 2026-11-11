"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { moveItemAction, placeMilestoneAction, removeEventAction } from "@/actions/roadmap";
import { StatusMessage, useStatus } from "@/components/ui/status";
import { cn } from "@/lib/cn";
import type { BoardCard, BoardColumn, BoardMilestone } from "@/lib/roadmap-view";
import { MilestoneChip } from "./milestone-chip";
import { RoadmapColumn } from "./roadmap-column";

type View = "both" | "goals" | "features";

/**
 * The roadmap: the near quarters in a row of their own, and below them the
 * far half-years and "Endnu ikke planlagt", so both get the full width.
 * Cards and milestones are dragged between columns; each also has a list
 * to move it with the keyboard. Moves show at once and are saved behind.
 */
export function RoadmapBoard({
  columns,
  cards: initialCards,
  milestones: initialMilestones,
}: {
  columns: BoardColumn[];
  cards: BoardCard[];
  milestones: BoardMilestone[];
}) {
  const t = useTranslations("roadmap");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [view, setView] = useState<View>("both");
  const [cards, setCards] = useState(initialCards);
  const [milestones, setMilestones] = useState(initialMilestones);
  const [synced, setSynced] = useState({ cards: initialCards, milestones: initialMilestones });
  const [over, setOver] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();

  // A refresh from the server replaces the optimistic copy.
  if (synced.cards !== initialCards || synced.milestones !== initialMilestones) {
    setSynced({ cards: initialCards, milestones: initialMilestones });
    setCards(initialCards);
    setMilestones(initialMilestones);
  }

  const save = (call: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await call();
      if (!result.ok) {
        setStatus({ kind: "error", text: errors((result.error ?? "generic") as "generic") });
        setCards(initialCards);
        setMilestones(initialMilestones);
      }
      router.refresh();
    });

  const moveCard = (card: BoardCard, column: number) => {
    const c = columns[column]!;
    setCards((list) => list.map((x) => (x.id === card.id ? { ...x, column, overdue: false } : x)));
    save(() =>
      moveItemAction({ itemId: card.id, periodIndex: c.periodIndex, periodSpan: c.periodSpan }),
    );
  };

  const placeMilestone = (m: BoardMilestone, column: number | null) => {
    const c = column === null ? null : columns[column]!;
    setMilestones((list) => list.map((x) => (x.id === m.id ? { ...x, column } : x)));
    save(() =>
      placeMilestoneAction({
        milestoneId: m.id,
        periodIndex: c?.periodIndex ?? null,
        periodSpan: c?.periodSpan ?? 1,
      }),
    );
  };

  const onDrop = (column: number, raw: string) => {
    setOver(null);
    let payload: { type?: string; id?: string };
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    if (payload.type === "item") {
      const card = cards.find((c) => c.id === payload.id);
      if (card && card.column !== column) moveCard(card, column);
    } else if (payload.type === "milestone") {
      const m = milestones.find((x) => x.id === payload.id);
      // A milestone is reached in a period; "not yet planned" means not placed.
      const target = column === columns.length - 1 ? null : column;
      if (m && m.column !== target) placeMilestone(m, target);
    }
  };

  const visible = cards.filter(
    (c) => view === "both" || (view === "goals" ? c.kind === "goal" : c.kind === "feature"),
  );
  const unplaced = milestones.filter((m) => m.column === null);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <fieldset className="flex rounded-md border border-hairline bg-surface p-0.5">
          <legend className="sr-only">{t("viewLabel")}</legend>
          {(["both", "goals", "features"] as const).map((v) => (
            <label
              key={v}
              className={cn(
                "cursor-pointer rounded px-3 py-1 text-[13px] font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ink",
                view === v ? "bg-ink text-paper" : "text-slate hover:text-ink",
              )}
            >
              <input
                type="radio"
                name="roadmap-view"
                className="sr-only"
                checked={view === v}
                onChange={() => setView(v)}
              />
              {t(`view.${v}`)}
            </label>
          ))}
        </fieldset>
        <div className="flex items-center gap-5 text-[12px] text-slate">
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm bg-business" aria-hidden />
            {t("legendBusiness")}
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm bg-technical" aria-hidden />
            {t("legendTechnical")}
          </span>
          <StatusMessage status={status} />
        </div>
      </div>

      {unplaced.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-hairline p-3">
          <p className="text-[12px] font-semibold text-slate">{t("unplacedMilestones")}</p>
          <ul className="grid grid-cols-4 gap-2">
            {unplaced.map((m) => (
              <MilestoneChip
                key={m.id}
                milestone={m}
                columns={columns}
                onPlace={placeMilestone}
                pending={pending}
              />
            ))}
          </ul>
        </div>
      )}

      {(["near", "far"] as const).map((band) => {
        const inBand = columns
          .map((col, i) => ({ col, i }))
          .filter(({ col }) => (band === "near" ? col.kind === "near" : col.kind !== "near"));
        if (inBand.length === 0) return null;
        return (
          <div key={band} className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold tracking-[0.12em] text-slate uppercase">
              {t(`band.${band}`)}
            </h3>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${inBand.length}, minmax(0, 1fr))` }}
            >
              {inBand.map(({ col, i }) => (
                <RoadmapColumn
                  key={col.key}
                  col={col}
                  columns={columns}
                  cards={visible.filter((c) => c.column === i)}
                  milestones={milestones.filter((m) => m.column === i)}
                  over={over === i}
                  pending={pending}
                  onOver={() => over !== i && setOver(i)}
                  onLeave={() => setOver((o) => (o === i ? null : o))}
                  onDrop={(raw) => onDrop(i, raw)}
                  onMoveCard={moveCard}
                  onPlaceMilestone={placeMilestone}
                  onRemoveEvent={(eventId) => save(() => removeEventAction({ eventId }))}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
