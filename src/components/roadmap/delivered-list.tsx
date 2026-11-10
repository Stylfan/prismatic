import { getTranslations } from "next-intl/server";
import type { ItemView } from "@/components/backlog/types";
import { cn } from "@/lib/cn";

/**
 * Delivered work, grouped by the quarter it closed in, newest first: what
 * used to be on the roadmap and is now done, as the steering group saw it
 * on "Færdiggjort arbejde".
 */
export async function DeliveredList({
  groups,
}: {
  groups: Array<{ quarter: string; items: ItemView[] }>;
}) {
  const t = await getTranslations("roadmap.delivered");
  const tb = await getTranslations("backlog");
  if (groups.length === 0) return <p className="text-sm text-slate">{t("empty")}</p>;
  return (
    <div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline">
      {groups.map((g) => (
        <section
          key={g.quarter}
          aria-label={g.quarter}
          className="flex flex-col gap-2 bg-surface p-3"
        >
          <h3 className="border-b border-hairline-soft pb-2 text-[14px] font-semibold">
            {g.quarter}
            <span className="tabular ml-2 text-[11px] font-normal text-slate">
              {t("points", {
                points: g.items.reduce((s, i) => s + (i.points ?? 0), 0).toLocaleString("da-DK"),
              })}
            </span>
          </h3>
          <ul className="flex flex-col gap-2">
            {g.items.map((i) => (
              <li
                key={i.id}
                className={cn(
                  "rounded-md border border-hairline border-l-[3px] p-2.5",
                  i.track === "technical" ? "border-l-technical" : "border-l-business",
                )}
              >
                <p className="flex items-center justify-between gap-2 text-[11px] text-slate">
                  <span className="font-bold tracking-[0.08em]">
                    {i.kind === "goal" ? tb("kind.goal") : tb("kind.feature")}
                  </span>
                  <span className="tabular">
                    {i.size && <span className="mr-1 font-semibold text-ink">{i.size}</span>}
                    {i.points?.toLocaleString("da-DK") ?? "–"}
                  </span>
                </p>
                <p className="mt-1 text-[13px] font-medium">{i.title}</p>
                {i.doneNote && <p className="mt-1 text-[11px] text-slate">{i.doneNote}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
