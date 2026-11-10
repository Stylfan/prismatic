import { getTranslations } from "next-intl/server";
import type { ChangeControl } from "@/domain/report";

/**
 * Change control: the manager's own words first, then what the data says
 * changed since the last edition — on the roadmap, in the risks and in
 * the milestones' forecast.
 */
export async function ReportChanges({
  text,
  changes,
  first,
}: {
  text: string;
  changes: ChangeControl;
  first: boolean;
}) {
  const t = await getTranslations("report.changes");
  const fmt = (n: number | null) => (n === null ? "–" : n.toLocaleString("da-DK"));
  const none = changes.items.length + changes.risks.length + changes.milestones.length === 0;

  return (
    <div className="grid grid-cols-2 gap-8">
      <div className="flex flex-col gap-3">
        {text ? (
          <p className="text-sm leading-relaxed whitespace-pre-line">{text}</p>
        ) : (
          <p className="text-sm text-slate">{t("noText")}</p>
        )}
      </div>
      <div className="flex flex-col gap-4 text-[13px]">
        {first && <p className="text-slate">{t("first")}</p>}
        {!first && none && <p className="text-slate">{t("none")}</p>}
        {changes.items.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-bold tracking-[0.12em] text-slate uppercase">
              {t("roadmap")}
            </p>
            <ul className="flex flex-col gap-1">
              {changes.items.map((c) => (
                <li key={`${c.kind}-${c.id}`}>
                  {c.kind === "added" && t(c.split ? "split" : "added", { title: c.title })}
                  {c.kind === "removed" && t("removed", { title: c.title })}
                  {c.kind === "done" && t("done", { title: c.title })}
                  {c.kind === "moved" &&
                    t("moved", {
                      title: c.title,
                      from: c.from ?? t("unplanned"),
                      to: c.to ?? t("unplanned"),
                    })}
                  {c.kind === "reestimated" &&
                    t("reestimated", { title: c.title, from: fmt(c.from), to: fmt(c.to) })}
                </li>
              ))}
            </ul>
          </div>
        )}
        {changes.milestones.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-bold tracking-[0.12em] text-slate uppercase">
              {t("forecast")}
            </p>
            <ul className="flex flex-col gap-1">
              {changes.milestones.map((m) => (
                <li key={m.code}>
                  {t("milestone", { code: m.code, from: m.from ?? "–", to: m.to ?? "–" })}
                </li>
              ))}
            </ul>
          </div>
        )}
        {changes.risks.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-bold tracking-[0.12em] text-slate uppercase">
              {t("risks")}
            </p>
            <ul className="flex flex-col gap-1">
              {changes.risks.map((r) => (
                <li key={`${r.kind}-${r.number}`}>
                  {r.kind === "new" && t("riskNew", { number: r.number, title: r.title })}
                  {r.kind === "closed" && t("riskClosed", { number: r.number, title: r.title })}
                  {r.kind === "moved" &&
                    t("riskMoved", {
                      number: r.number,
                      from: `${r.from[0]}/${r.from[1]}`,
                      to: `${r.to[0]}/${r.to[1]}`,
                    })}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
