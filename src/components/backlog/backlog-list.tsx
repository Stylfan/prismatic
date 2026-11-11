import { getTranslations } from "next-intl/server";
import { SectionLabel } from "@/components/ui/layout";
import { ItemRow } from "./item-row";
import type { BacklogOptions, ItemView } from "./types";

type Group = { key: string; label: string; goals: ItemView[] };

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
}: {
  items: ItemView[];
  options: BacklogOptions;
  milestones: Array<{ id: string; seq: number; title: string }>;
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
          <SectionLabel>{group.label}</SectionLabel>
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
          <SectionLabel>{t("looseFeatures")}</SectionLabel>
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
