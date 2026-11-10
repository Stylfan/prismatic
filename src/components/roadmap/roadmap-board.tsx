"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { moveItemAction, placeMilestoneAction, removeEventAction } from "@/actions/roadmap";
import { StatusMessage, useStatus } from "@/components/ui/status";
import { cn } from "@/lib/cn";
import type { BoardCard, BoardColumn, BoardMilestone } from "@/lib/roadmap-view";
import { MilestoneChip } from "./milestone-chip";
import { RoadmapCard } from "./roadmap-card";

type View = "both" | "goals" | "features";

/**
 * The roadmap: near quarters, far half-years and "Endnu ikke planlagt".
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
        <fieldset className="flex rounded-full border border-hairline p-0.5">
          <legend className="sr-only">{t("viewLabel")}</legend>
          {(["both", "goals", "features"] as const).map((v) => (
            <label
              key={v}
              className={cn(
                "cursor-pointer rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ink",
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
            <span className="h-3 w-1 bg-business" aria-hidden />
            {t("legendBusiness")}
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-1 bg-technical" aria-hidden />
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

      <div>
        <div
          className="grid gap-px overflow-hidden rounded-lg border border-hairline bg-hairline"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
        >
          {columns.map((col, i) => (
            <section
              key={col.key}
              aria-label={col.label}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (over !== i) setOver(i);
              }}
              onDragLeave={() => setOver((o) => (o === i ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(i, e.dataTransfer.getData("text/plain"));
              }}
              className={cn(
                "flex min-h-[420px] flex-col gap-3 p-3 transition-colors",
                col.kind === "unplanned" ? "bg-paper" : "bg-surface",
                over === i && "bg-sand",
              )}
            >
              <header className="flex flex-col gap-0.5 border-b border-hairline-soft pb-2">
                <span className="text-[10px] font-bold tracking-[0.14em] text-bronze-deep uppercase">
                  {t(`kind.${col.kind}`)}
                </span>
                <h3 className="text-[14px] font-semibold leading-snug">{col.label}</h3>
                {col.range && <span className="tabular text-[11px] text-slate">{col.range}</span>}
                <span className="tabular mt-1 text-[11px] font-semibold text-ink">
                  {col.pct === null
                    ? t("planned", { points: col.load.toLocaleString("da-DK") })
                    : t("plannedPct", { points: col.load.toLocaleString("da-DK"), pct: col.pct })}
                </span>
              </header>
              {col.events.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {col.events.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex items-center justify-between gap-1 rounded bg-sand px-2 py-1 text-[11px]"
                    >
                      <span>
                        {col.kind === "far" && <span className="text-slate">{ev.quarter} · </span>}
                        {ev.title}
                      </span>
                      <button
                        type="button"
                        aria-label={t("removeEvent", { title: ev.title })}
                        className="rounded p-0.5 text-slate hover:bg-surface hover:text-ink"
                        onClick={() => save(() => removeEventAction({ eventId: ev.id }))}
                      >
                        <X className="size-3" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <ul className="flex flex-col gap-2">
                {visible
                  .filter((c) => c.column === i)
                  .map((card) => (
                    <RoadmapCard
                      key={card.id}
                      card={card}
                      columns={columns}
                      onMove={moveCard}
                      pending={pending}
                    />
                  ))}
              </ul>
              {milestones.some((m) => m.column === i) && (
                <ul className="mt-auto flex flex-col gap-2 border-t border-hairline-soft pt-3">
                  {milestones
                    .filter((m) => m.column === i)
                    .map((m) => (
                      <MilestoneChip
                        key={m.id}
                        milestone={m}
                        columns={columns}
                        onPlace={placeMilestone}
                        pending={pending}
                      />
                    ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
