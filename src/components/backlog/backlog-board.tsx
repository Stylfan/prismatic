"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { createItemAction } from "@/actions/items";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/cn";
import { AddGoal } from "./add-goal";
import { AddRow } from "./add-row";
import { ItemEditor } from "./item-editor";
import { TREE_COLS, TreeRow } from "./tree-row";
import type { BacklogOptions, ItemView } from "./types";

export type BacklogGroup = {
  key: string;
  label: string;
  progress?: { own: number; done: number };
  goalIds: string[];
};

type StatusFilter = "open" | "all" | "done";

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
  const [folded, setFolded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    setFolded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const goalBlock = (goal: ItemView) => {
    const kids = featuresOf(goal.id);
    const shown = kids.filter((k) => fitsStatus(k) && (fitsQuery(k) || fitsQuery(goal)));
    const visible = (fitsStatus(goal) && fitsQuery(goal)) || shown.length > 0;
    if (!visible) return null;
    const hiddenDone =
      filter === "open" ? kids.filter((k) => k.status === "done" && fitsQuery(k)).length : 0;
    const open = !goalsOnly && !folded.has(goal.id);
    const doneCount = kids.filter((k) => k.status === "done").length;
    return (
      <div key={goal.id} className="border-b border-hairline last:border-b-0">
        <TreeRow
          item={goal}
          depth={0}
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
                <span className="pl-5">{t("hiddenDone", { count: hiddenDone })}</span>
              </button>
            )}
            <AddRow
              indent
              label={t("addFeature", { title: goal.title })}
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
      const goals = g.goalIds.map((id) => byId.get(id)).filter((x): x is ItemView => !!x);
      const rendered = goals.map(goalBlock).filter(Boolean);
      return { group: g, rendered, empty: goals.length === 0 };
    })
    .filter((b) => b.rendered.length > 0 || (!filtering && b.empty));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="relative">
          <span className="sr-only">{t("search")}</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            className="h-8 w-60 rounded-md border border-hairline bg-surface pr-2 pl-8 text-[13px] text-ink placeholder:text-slate/70 focus:border-ink focus:outline-none"
          />
        </label>
        <span className="flex items-center gap-2 text-[12px] text-slate">
          {t("status")}
          <Segmented<StatusFilter>
            name="backlog-status"
            label={t("status")}
            value={filter}
            options={(["open", "all", "done"] as const).map((v) => ({
              value: v,
              label: t(`filter.${v}`),
            }))}
            onChange={setFilter}
          />
        </span>
        <span className="flex items-center gap-2 text-[12px] text-slate">
          {t("show")}
          <Segmented<"tree" | "goals">
            name="backlog-view"
            label={t("show")}
            value={goalsOnly ? "goals" : "tree"}
            options={[
              { value: "tree", label: t("tree") },
              { value: "goals", label: t("goalsOnly") },
            ]}
            onChange={(v) => setGoalsOnly(v === "goals")}
          />
        </span>
        <span className="flex-1" />
        <AddGoal programId={programId} options={options} />
      </div>

      <div
        className={cn("grid items-start gap-4", selected && "lg:grid-cols-[minmax(0,1fr)_22rem]")}
      >
        <div className="flex min-w-0 flex-col gap-5">
          <div className={cn(TREE_COLS, "px-3 text-[12px] text-slate")} aria-hidden>
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

/** A milestone's name and its own progress, the same figure and bar as on the overview. */
function GroupHeader({
  label,
  progress,
}: {
  label: string;
  progress?: { own: number; done: number };
}) {
  const t = useTranslations("backlog.groups");
  const fmt = (n: number) => Math.round(n).toLocaleString("da-DK");
  const share = progress && progress.own > 0 ? Math.min(1, progress.done / progress.own) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[14px] font-semibold text-ink">{label}</h2>
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
