"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createItemAction } from "@/actions/items";
import { cn } from "@/lib/cn";
import { AddRow } from "./add-row";
import { BacklogToolbar, type StatusFilter } from "./backlog-toolbar";
import { GroupHeader } from "./group-header";
import { ItemEditor } from "./item-editor";
import { TREE_COLS, TreeRow } from "./tree-row";
import type { BacklogOptions, ItemView } from "./types";
import { useDragArrange } from "./use-drag-arrange";

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

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  // Where every goal and feature stands, in the order the server keeps.
  const places = useMemo(() => {
    const out: Record<string, string[]> = { "f:none": [] };
    for (const g of groups) out["g:" + g.key] = g.goalIds;
    for (const i of items) {
      if (i.kind === "goal") out["f:" + i.id] ??= [];
      else (out["f:" + (i.parentId ?? "none")] ??= []).push(i.id);
    }
    return out;
  }, [groups, items]);
  const arrange = useDragArrange(programId, places);
  const inPlace = (key: string) =>
    arrange
      .orderOf(key)
      .map((id) => byId.get(id))
      .filter((x): x is ItemView => !!x);
  const featuresOf = (goalId: string) => inPlace("f:" + goalId);
  const loose = inPlace("f:none");
  const q = query.trim().toLowerCase();
  const fitsStatus = (i: ItemView) =>
    filter === "all" || (filter === "open" ? i.status !== "done" : i.status === "done");
  const fitsQuery = (i: ItemView) => q === "" || i.title.toLowerCase().includes(q);
  const filtering = filter !== "all" || q !== "";
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;

  const addFeature = (goalId: string) => (title: string) =>
    createItemAction({ programId, kind: "feature", title, parentId: goalId, milestoneId: null });
  const unfold = (id: string) => setUnfolded((prev) => new Set(prev).add(id));
  const toggle = (id: string) =>
    setUnfolded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const featureRow = (f: ItemView, key: string, depth: 0 | 1) => {
    const drag = arrange.item(f.id, "feature", key);
    return (
      <div key={f.id} {...drag}>
        <TreeRow
          item={f}
          depth={depth}
          handle={arrange.grip(f.id, key, f.title)}
          selected={selectedId === f.id}
          onSelect={() => setSelectedId(f.id)}
        />
      </div>
    );
  };

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
        {...arrange.item(goal.id, "goal", "g:" + groupKey)}
        className={cn(
          "border-b border-hairline last:border-b-0",
          arrange.item(goal.id, "goal", "g:" + groupKey).className,
        )}
      >
        <div {...arrange.into("f:" + goal.id, "feature", () => unfold(goal.id))}>
          <TreeRow
            item={goal}
            depth={0}
            handle={arrange.grip(goal.id, "g:" + groupKey, goal.title)}
            selected={selectedId === goal.id}
            onSelect={() => setSelectedId(goal.id)}
            expanded={open}
            onToggle={kids.length > 0 || !goalsOnly ? () => toggle(goal.id) : undefined}
            meta={
              kids.length > 0
                ? t("featureMeta", { done: doneCount, count: kids.length })
                : undefined
            }
          />
          {open && (
            <>
              {shown.map((f) => featureRow(f, "f:" + goal.id, 1))}
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
      </div>
    );
  };

  const looseShown = goalsOnly ? [] : loose.filter((f) => fitsStatus(f) && fitsQuery(f));
  const blocks = groups
    .map((g) => {
      const goals = inPlace("g:" + g.key);
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
      {arrange.failed && <p className="text-[13px] text-danger">{t("reorderFailed")}</p>}

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
              <div
                {...arrange.into("g:" + group.key, "goal")}
                className={cn(
                  "overflow-hidden rounded-lg border border-hairline bg-surface",
                  arrange.into("g:" + group.key, "goal").className,
                )}
              >
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
              <div
                {...arrange.into("f:none", "feature")}
                className={cn(
                  "overflow-hidden rounded-lg border border-hairline bg-surface",
                  arrange.into("f:none", "feature").className,
                )}
              >
                {looseShown.map((f) => featureRow(f, "f:none", 0))}
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
