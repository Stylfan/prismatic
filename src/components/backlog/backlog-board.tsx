"use client";

import { useMemo, useState } from "react";
import { GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { createItemAction } from "@/actions/items";
import { cn } from "@/lib/cn";
import { AddRow } from "./add-row";
import { BacklogToolbar, type StatusFilter } from "./backlog-toolbar";
import { GroupHeader } from "./group-header";
import { ItemEditor } from "./item-editor";
import { TREE_COLS, TreeRow } from "./tree-row";
import type { BacklogOptions, ItemView } from "./types";
import { useGoalOrder } from "./use-goal-order";

export type BacklogGroup = {
  key: string;
  label: string;
  progress?: { own: number; done: number };
  goalIds: string[];
};

/**
 * The backlog as a tree, the way backlog tools lay it out: each milestone
 * with its business goals, each goal with its features folded under it and
 * a row to add one more right there. Filters at the top keep finished work
 * out of the way; a click on a row opens it in a panel beside the list.
 */
export function BacklogBoard({
  programId,
  items,
  groups,
  options,
}: {
  programId: string;
  items: ItemView[];
  groups: BacklogGroup[];
  options: BacklogOptions;
}) {
  const t = useTranslations("backlog.board");
  const [filter, setFilter] = useState<StatusFilter>("open");
  const [query, setQuery] = useState("");
  const [goalsOnly, setGoalsOnly] = useState(false);
  // Goals start folded; a goal opens to show its features and the row to add one.
  const [unfolded, setUnfolded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Dragging goals to rank them: the grip arms a goal, the drop says where it lands.
  const order = useGoalOrder(programId, groups);
  const [armed, setArmed] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ key: string; id: string } | null>(null);
  const [dropAt, setDropAt] = useState<{ id: string; place: "before" | "after" } | null>(null);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const featuresOf = (goalId: string) =>
    items.filter((i) => i.kind === "feature" && i.parentId === goalId);
  const loose = items.filter((i) => i.kind === "feature" && i.parentId === null);
  const q = query.trim().toLowerCase();
  const fitsStatus = (i: ItemView) =>
    filter === "all" || (filter === "open" ? i.status !== "done" : i.status === "done");
  const fitsQuery = (i: ItemView) => q === "" || i.title.toLowerCase().includes(q);
  const filtering = filter !== "all" || q !== "";
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;

  const addFeature = (goalId: string) => (title: string) =>
    createItemAction({ programId, kind: "feature", title, parentId: goalId, milestoneId: null });
  const toggle = (id: string) =>
    setUnfolded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const goalBlock = (goal: ItemView, groupKey: string) => {
    const kids = featuresOf(goal.id);
    const shown = kids.filter((k) => fitsStatus(k) && (fitsQuery(k) || fitsQuery(goal)));
    const visible = (fitsStatus(goal) && fitsQuery(goal)) || shown.length > 0;
    if (!visible) return null;
    const hiddenDone =
      filter === "open" ? kids.filter((k) => k.status === "done" && fitsQuery(k)).length : 0;
    // A search or the finished filter opens the goals it finds something under.
    const open =
      !goalsOnly &&
      (unfolded.has(goal.id) || ((q !== "" || filter === "done") && shown.length > 0));
    const doneCount = kids.filter((k) => k.status === "done").length;
    return (
      <div
        key={goal.id}
        draggable
        onDragStart={(e) => {
          // Only the grip starts a drag; anywhere else in the row stays a click.
          if (armed !== goal.id) return e.preventDefault();
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", goal.id);
          setDragging({ key: groupKey, id: goal.id });
        }}
        onDragEnd={() => {
          setDragging(null);
          setDropAt(null);
          setArmed(null);
        }}
        onDragOver={(e) => {
          if (!dragging || dragging.key !== groupKey || dragging.id === goal.id) return;
          e.preventDefault();
          const box = e.currentTarget.getBoundingClientRect();
          const place = e.clientY < box.top + box.height / 2 ? "before" : "after";
          if (dropAt?.id !== goal.id || dropAt.place !== place) setDropAt({ id: goal.id, place });
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (dragging && dropAt) order.move(groupKey, dragging.id, dropAt.id, dropAt.place);
          setDragging(null);
          setDropAt(null);
          setArmed(null);
        }}
        className={cn(
          "border-b border-hairline last:border-b-0",
          dragging?.id === goal.id && "opacity-50",
          dropAt?.id === goal.id &&
            (dropAt.place === "before"
              ? "shadow-[inset_0_2px_0_var(--color-ink)]"
              : "shadow-[inset_0_-2px_0_var(--color-ink)]"),
        )}
      >
        <TreeRow
          item={goal}
          depth={0}
          handle={
            <button
              type="button"
              aria-label={t("reorder", { title: goal.title })}
              title={t("reorderHint")}
              onPointerDown={() => setArmed(goal.id)}
              onPointerUp={() => !dragging && setArmed(null)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                  e.preventDefault();
                  order.step(groupKey, goal.id, e.key === "ArrowUp" ? -1 : 1);
                }
              }}
              className="cursor-grab rounded p-0.5 text-slate/60 hover:bg-sand hover:text-ink active:cursor-grabbing"
            >
              <GripVertical className="size-3.5" aria-hidden />
            </button>
          }
          selected={selectedId === goal.id}
          onSelect={() => setSelectedId(goal.id)}
          expanded={open}
          onToggle={kids.length > 0 || !goalsOnly ? () => toggle(goal.id) : undefined}
          meta={
            kids.length > 0 ? t("featureMeta", { done: doneCount, count: kids.length }) : undefined
          }
        />
        {open && (
          <>
            {shown.map((f) => (
              <TreeRow
                key={f.id}
                item={f}
                depth={1}
                selected={selectedId === f.id}
                onSelect={() => setSelectedId(f.id)}
              />
            ))}
            {hiddenDone > 0 && (
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={cn(
                  TREE_COLS,
                  "w-full border-b border-hairline-soft bg-surface px-3 py-1.5 text-left text-[12px] text-slate hover:text-ink",
                )}
              >
                <span />
                <span />
                <span className="pl-5">{t("hiddenDone", { count: hiddenDone })}</span>
              </button>
            )}
            <AddRow
              indent
              label={t("addFeature")}
              placeholder={t("featurePlaceholder")}
              create={addFeature(goal.id)}
            />
          </>
        )}
      </div>
    );
  };

  const looseShown = goalsOnly ? [] : loose.filter((f) => fitsStatus(f) && fitsQuery(f));
  const blocks = groups
    .map((g) => {
      const goals = order
        .orderOf(g.key)
        .map((id) => byId.get(id))
        .filter((x): x is ItemView => !!x);
      const rendered = goals.map((goal) => goalBlock(goal, g.key)).filter(Boolean);
      return { group: g, rendered, empty: goals.length === 0 };
    })
    .filter((b) => b.rendered.length > 0 || (!filtering && b.empty));

  return (
    <div className="flex flex-col gap-4">
      <BacklogToolbar
        programId={programId}
        options={options}
        query={query}
        onQuery={setQuery}
        filter={filter}
        onFilter={setFilter}
        goalsOnly={goalsOnly}
        onGoalsOnly={setGoalsOnly}
      />
      {order.failed && <p className="text-[13px] text-danger">{t("reorderFailed")}</p>}

      <div
        className={cn("grid items-start gap-4", selected && "lg:grid-cols-[minmax(0,1fr)_22rem]")}
      >
        <div className="flex min-w-0 flex-col gap-5">
          <div className={cn(TREE_COLS, "px-3 text-[12px] text-slate")} aria-hidden>
            <span />
            <span />
            <span>{t("col.title")}</span>
            <span>{t("col.period")}</span>
            <span>{t("col.size")}</span>
            <span className="text-right">{t("col.points")}</span>
            <span>{t("col.status")}</span>
            <span />
          </div>
          {blocks.map(({ group, rendered }) => (
            <section key={group.key} aria-label={group.label} className="flex flex-col gap-2">
              <GroupHeader label={group.label} progress={group.progress} />
              <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
                {rendered.length > 0 ? (
                  rendered
                ) : (
                  <p className="px-4 py-3 text-[13px] text-slate">{t("emptyGroup")}</p>
                )}
              </div>
            </section>
          ))}
          {looseShown.length > 0 && (
            <section aria-label={t("loose")} className="flex flex-col gap-2">
              <GroupHeader label={t("loose")} />
              <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
                {looseShown.map((f) => (
                  <TreeRow
                    key={f.id}
                    item={f}
                    depth={0}
                    selected={selectedId === f.id}
                    onSelect={() => setSelectedId(f.id)}
                  />
                ))}
              </div>
            </section>
          )}
          {blocks.length === 0 && looseShown.length === 0 && (
            <p className="rounded-lg border border-dashed border-hairline p-6 text-[13px] text-slate">
              {items.length === 0 ? t("empty") : t("noResults")}
            </p>
          )}
        </div>

        {selected && (
          <aside className="rounded-lg border border-hairline bg-surface p-4 lg:sticky lg:top-18 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            <ItemEditor
              key={selected.id}
              item={selected}
              options={options}
              onClose={() => setSelectedId(null)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
