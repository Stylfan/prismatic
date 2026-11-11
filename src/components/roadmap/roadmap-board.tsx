"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { arrangeBoardAction, removeEventAction } from "@/actions/roadmap";
import { StatusMessage, useStatus } from "@/components/ui/status";
import type { BoardCard, BoardColumn, BoardMilestone } from "@/lib/roadmap-view";
import { GoalBand } from "./goal-band";
import { RoadmapColumn } from "./roadmap-column";
import { RoadmapToolbar, type CardStatusFilter, type CardView } from "./roadmap-toolbar";
import { UnplacedMilestones } from "./unplaced-milestones";
import { UnplannedCards } from "./unplanned-cards";
import { useBoardDrag, type DropAim, type Where } from "./use-board-drag";

/** Puts an element just before or after another, or after the last of its column. */
function insert<T extends { id: string; column: number | null }>(
  list: T[],
  moved: T,
  aim: DropAim,
): T[] {
  const rest = list.filter((x) => x.id !== moved.id);
  let at = aim ? rest.findIndex((x) => x.id === aim.id) : -1;
  if (at >= 0 && aim?.place === "after") at += 1;
  if (at < 0) at = rest.map((x) => x.column).lastIndexOf(moved.column) + 1 || rest.length;
  rest.splice(at, 0, moved);
  return rest;
}

/**
 * The roadmap: the panel for a quarter's events beside what is not yet on
 * the roadmap (milestones not placed, goals and features not planned),
 * then the near quarters and below them the far half-years. Cards and milestones are dragged
 * between columns and up and down within one; each also has a list to
 * move it with the keyboard. Moves show at once and are saved behind.
 */
export function RoadmapBoard({
  programId,
  columns,
  cards: initialCards,
  milestones: initialMilestones,
  eventsPanel,
}: {
  programId: string;
  columns: BoardColumn[];
  cards: BoardCard[];
  milestones: BoardMilestone[];
  eventsPanel: React.ReactNode;
}) {
  const t = useTranslations("roadmap");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CardStatusFilter>("all");
  const [view, setView] = useState<CardView>("both");
  const [cards, setCards] = useState(initialCards);
  const [milestones, setMilestones] = useState(initialMilestones);
  const [synced, setSynced] = useState({ cards: initialCards, milestones: initialMilestones });
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  // A business goal the manager clicked: its features stand out and a thread links them.
  const [focus, setFocus] = useState<string | null>(null);
  useEffect(() => {
    const clear = (e: KeyboardEvent) => e.key === "Escape" && setFocus(null);
    window.addEventListener("keydown", clear);
    return () => window.removeEventListener("keydown", clear);
  }, []);

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

  const moveCard = (card: BoardCard, column: number, aim: DropAim = null) => {
    const c = columns[column]!;
    const same = card.column === column;
    const next = insert(cards, { ...card, column, overdue: same && card.overdue }, aim);
    setCards(next);
    // Within its own column a card keeps its period; elsewhere it takes the column's.
    const period = same ? card : c;
    save(() =>
      arrangeBoardAction({
        programId,
        kind: "item",
        movedId: card.id,
        ids: next.filter((x) => x.column === column).map((x) => x.id),
        periodIndex: period.periodIndex,
        periodSpan: period.periodSpan,
      }),
    );
  };

  const placeMilestone = (m: BoardMilestone, column: number | null, aim: DropAim = null) => {
    const c = column === null ? null : columns[column]!;
    const same = m.column === column;
    const next = insert(milestones, { ...m, column }, aim);
    setMilestones(next);
    const period = same
      ? m
      : { periodIndex: c?.periodIndex ?? null, periodSpan: c?.periodSpan ?? 1 };
    save(() =>
      arrangeBoardAction({
        programId,
        kind: "milestone",
        movedId: m.id,
        ids: next.filter((x) => x.column === column).map((x) => x.id),
        periodIndex: period.periodIndex,
        periodSpan: period.periodSpan,
      }),
    );
  };

  const drag = useBoardDrag((dragged, where: Where, aim) => {
    if (dragged.kind === "item") {
      const card = cards.find((c) => c.id === dragged.id);
      if (card && where !== "unplaced") moveCard(card, where, aim);
      return;
    }
    const m = milestones.find((x) => x.id === dragged.id);
    // A milestone is reached in a period; "not yet planned" means not placed.
    const target = where === "unplaced" || where === columns.length - 1 ? null : where;
    if (m) placeMilestone(m, target, target === null && where !== "unplaced" ? null : aim);
  });

  const q = query.trim().toLowerCase();
  const visible = cards.filter(
    (c) =>
      (view === "both" || (view === "goals" ? c.kind === "goal" : c.kind === "feature")) &&
      (statusFilter === "all" || c.status === statusFilter) &&
      (q === "" || c.title.toLowerCase().includes(q)),
  );

  const unplannedAt = columns.length - 1;
  const goalOf = (c: BoardCard) => (c.kind === "goal" ? c.id : c.parentId);
  const pick = (c: BoardCard) => {
    const goal = goalOf(c);
    setFocus((f) => (goal === null || f === goal ? null : goal));
  };
  const focusOf = (c: BoardCard) =>
    focus === null ? null : goalOf(c) === focus ? ("on" as const) : ("dim" as const);
  const family = focus === null ? [] : cards.filter((c) => goalOf(c) === focus);
  const focusGoal = family.find((c) => c.kind === "goal") ?? null;
  const goalColumn = focusGoal && focusGoal.column !== unplannedAt ? focusGoal.column : null;
  const featureCount = (i: number) =>
    family.filter((c) => c.kind === "feature" && c.column === i).length;
  const reached = family.map((c) => c.column).filter((i) => i !== unplannedAt);
  const span = reached.length > 0 ? { from: Math.min(...reached), to: Math.max(...reached) } : null;

  return (
    <div className="flex flex-col gap-6">
      <RoadmapToolbar
        query={query}
        onQuery={setQuery}
        status={statusFilter}
        onStatus={setStatusFilter}
        view={view}
        onView={setView}
        message={
          <>
            <StatusMessage status={status} />
            {focusGoal && (
              <button
                type="button"
                onClick={() => setFocus(null)}
                className="flex items-center gap-1 rounded-md border border-hairline bg-surface px-2 py-1 text-ink hover:bg-sand"
              >
                <X className="size-3" aria-hidden />
                {t("focus.clear")}
              </button>
            )}
          </>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-2">
        {eventsPanel}
        <div className="flex flex-col gap-6">
          <UnplacedMilestones
            milestones={milestones.filter((m) => m.column === null)}
            columns={columns}
            pending={pending}
            drag={drag}
            onPlace={placeMilestone}
          />
          <UnplannedCards
            index={unplannedAt}
            cards={visible.filter((c) => c.column === unplannedAt)}
            columns={columns}
            pending={pending}
            drag={drag}
            onMove={(card, column) => moveCard(card, column)}
            focusOf={focusOf}
            onPick={pick}
          />
        </div>
      </div>

      {(["near", "far"] as const).map((band) => {
        const inBand = columns.map((col, i) => ({ col, i })).filter(({ col }) => col.kind === band);
        if (inBand.length === 0) return null;
        return (
          <div key={band} className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold tracking-[0.12em] text-slate uppercase">
              {t(`band.${band}`)}
            </h3>
            <GoalBand
              indexes={inBand.map(({ i }) => i)}
              featureCount={featureCount}
              goalColumn={goalColumn}
              span={span}
            />
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${inBand.length}, minmax(0, 1fr))` }}
            >
              {inBand.map(({ col, i }) => (
                <RoadmapColumn
                  key={col.key}
                  col={col}
                  index={i}
                  columns={columns}
                  cards={visible.filter((c) => c.column === i)}
                  milestones={milestones.filter((m) => m.column === i)}
                  pending={pending}
                  drag={drag}
                  onMoveCard={(card, column) => moveCard(card, column)}
                  focusOf={focusOf}
                  onPick={pick}
                  onPlaceMilestone={(m, column) => placeMilestone(m, column)}
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
