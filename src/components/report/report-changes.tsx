import { getTranslations } from "next-intl/server";
import type { ChangeControl } from "@/domain/report";

/** One change: what changed on the first line, from and to on the second. */
function Change({ title, detail }: { title: string; detail?: string }) {
  return (
    <li className="flex flex-col">
      <span className="text-ink">{title}</span>
      {detail && <span className="text-[12px] text-slate">{detail}</span>}
    </li>
  );
}

function Box({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-hairline bg-surface p-3 break-inside-avoid">
      <p className="text-[10px] font-semibold tracking-[0.1em] text-slate uppercase">{label}</p>
      <ul className="flex flex-col gap-2 text-[13px] leading-snug">{children}</ul>
    </div>
  );
}

/**
 * Changes since the last edition: the manager's own words first, as a
 * quote, then what the data says moved, in three boxes side by side: the
 * roadmap, the milestones' forecast and the risks.
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
  const arrow = (from: string, to: string) => `${from} → ${to}`;

  return (
    <div className="flex flex-col gap-4">
      {text ? (
        <p className="max-w-4xl border-l-[3px] border-slate/40 pl-4 text-[14px] leading-relaxed whitespace-pre-line">
          {text}
        </p>
      ) : (
        <p className="text-sm text-slate">{t("noText")}</p>
      )}
      {first && <p className="text-[13px] text-slate">{t("first")}</p>}
      {!first && none && <p className="text-[13px] text-slate">{t("none")}</p>}
      {!none && (
        <div className="grid grid-cols-3 items-start gap-4">
          {changes.items.length > 0 && (
            <Box label={t("roadmap")}>
              {changes.items.map((c) => {
                const key = `${c.kind}-${c.id}`;
                if (c.kind === "moved")
                  return (
                    <Change
                      key={key}
                      title={c.title}
                      detail={arrow(c.from ?? t("unplanned"), c.to ?? t("unplanned"))}
                    />
                  );
                if (c.kind === "reestimated")
                  return (
                    <Change
                      key={key}
                      title={c.title}
                      detail={t("reestimatedShort", { from: fmt(c.from), to: fmt(c.to) })}
                    />
                  );
                const kind = c.kind === "added" && c.split ? "split" : c.kind;
                return <Change key={key} title={c.title} detail={t(`kind.${kind}`)} />;
              })}
            </Box>
          )}
          {changes.milestones.length > 0 && (
            <Box label={t("forecast")}>
              {changes.milestones.map((m) => (
                <Change
                  key={m.code}
                  title={t("milestoneShort", { code: m.code, title: m.title })}
                  detail={arrow(m.from ?? "–", m.to ?? "–")}
                />
              ))}
            </Box>
          )}
          {changes.risks.length > 0 && (
            <Box label={t("risks")}>
              {changes.risks.map((r) => (
                <Change
                  key={`${r.kind}-${r.number}`}
                  title={t("riskShort", { number: r.number, title: r.title })}
                  detail={
                    r.kind === "moved"
                      ? t("riskMovedShort", {
                          from: `${r.from[0]}/${r.from[1]}`,
                          to: `${r.to[0]}/${r.to[1]}`,
                        })
                      : t(`kind.${r.kind === "new" ? "riskNew" : "riskClosed"}`)
                  }
                />
              ))}
            </Box>
          )}
        </div>
      )}
    </div>
  );
}
