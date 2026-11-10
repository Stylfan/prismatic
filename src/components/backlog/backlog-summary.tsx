import { getTranslations } from "next-intl/server";
import type { ItemView } from "./types";

/**
 * The backlog in four numbers. Points in total follow the forecast's rule:
 * every goal's scope, plus the features that stand without a goal.
 */
export async function BacklogSummary({ items }: { items: ItemView[] }) {
  const t = await getTranslations("backlog.summary");
  const goals = items.filter((i) => i.kind === "goal");
  const features = items.filter((i) => i.kind === "feature");
  const loose = features.filter((f) => f.parentId === null);
  const scope =
    goals.reduce((s, g) => s + (g.points ?? 0), 0) + loose.reduce((s, f) => s + (f.points ?? 0), 0);
  const delivered = features
    .filter((f) => f.status === "done")
    .reduce((s, f) => s + (f.points ?? 0), 0);
  const warnings = items.reduce((n, i) => n + i.warnings.length, 0);
  const fmt = (n: number) => n.toLocaleString("da-DK");

  const tiles = [
    { label: t("goals"), value: fmt(goals.length) },
    {
      label: t("features"),
      value: fmt(features.length),
      note: t("featuresDone", {
        done: features.filter((f) => f.status === "done").length,
        total: features.length,
      }),
    },
    { label: t("scope"), value: fmt(scope) },
    { label: t("delivered"), value: fmt(delivered), note: t("deliveredOf", { total: fmt(scope) }) },
    {
      label: t("warnings"),
      value: fmt(warnings),
      note: warnings === 0 ? t("warningsNone") : t("warningsSome"),
      alert: warnings > 0,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-5">
      {tiles.map((tile) => (
        <div key={tile.label} className="flex flex-col gap-1 bg-surface p-4">
          <dt className="text-[11px] font-bold tracking-[0.14em] text-slate uppercase">
            {tile.label}
          </dt>
          <dd
            className={
              tile.alert
                ? "tabular text-2xl font-semibold text-warning"
                : "tabular text-2xl font-semibold"
            }
          >
            {tile.value}
          </dd>
          {tile.note && <dd className="text-xs text-slate">{tile.note}</dd>}
        </div>
      ))}
    </dl>
  );
}
