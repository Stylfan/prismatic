import { getTranslations } from "next-intl/server";
import { ItemRow } from "./item-row";
import type { BacklogOptions, ItemView } from "./types";

type Group = { key: string; label: string; goals: ItemView[]; progress?: MilestoneProgress };

/** A milestone's own points and what is done of them. */
export type MilestoneProgress = { own: number; done: number };

/**
 * The backlog grouped the way the programme is built: each milestone with
 * its business goals and their features underneath, then goals without a
 * milestone, then features without a goal. Gaps are visible as groups of
 * their own rather than hidden.
 */
export async function BacklogList({
  items,
  options,
  milestones,
  progress = {},
}: {
  items: ItemView[];
  options: BacklogOptions;
  milestones: Array<{ id: string; seq: number; title: string }>;
  progress?: Record<string, MilestoneProgress>;
}) {
  const t = await getTranslations("backlog.groups");
  const tm = await getTranslations("milestones");
  const goals = items.filter((i) => i.kind === "goal");
  const featuresOf = (goalId: string) =>
    items.filter((i) => i.kind === "feature" && i.parentId === goalId);
  const loose = items.filter((i) => i.kind === "feature" && i.parentId === null);

  const groups: Group[] = milestones.map((m) => ({
    key: m.id,
    label: t("milestone", { code: tm("code", { seq: m.seq }), title: m.title }),
    goals: goals.filter((g) => g.milestoneId === m.id),
    progress: progress[m.id],
  }));
  const orphans = goals.filter((g) => g.milestoneId === null);
  if (orphans.length > 0) groups.push({ key: "none", label: t("noMilestone"), goals: orphans });

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-hairline p-8 text-sm text-slate">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-3" aria-label={group.label}>
          <GroupHeader label={group.label} progress={group.progress} />
          {group.goals.length === 0 ? (
            <p className="text-sm text-slate">{t("emptyGroup")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {group.goals.map((goal) => (
                <li
                  key={goal.id}
                  className="overflow-hidden rounded-lg border border-hairline bg-surface"
                >
                  <ul className="divide-y divide-hairline-soft">
                    <ItemRow item={goal} options={options} />
                    {featuresOf(goal.id).map((f) => (
                      <ItemRow key={f.id} item={f} options={options} />
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {loose.length > 0 && (
        <section className="flex flex-col gap-3" aria-label={t("looseFeatures")}>
          <GroupHeader label={t("looseFeatures")} />
          <ul className="divide-y divide-hairline-soft overflow-hidden rounded-lg border border-hairline bg-surface">
            {loose.map((f) => (
              <ItemRow key={f.id} item={f} options={options} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** A group's name, and for a milestone its own progress: the same figure and bar as on the overview. */
async function GroupHeader({ label, progress }: { label: string; progress?: MilestoneProgress }) {
  const t = await getTranslations("backlog.groups");
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
