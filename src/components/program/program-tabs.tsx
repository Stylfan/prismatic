import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/cn";

/** The programme's pages. The current one is marked for screen readers as well as by eye. */
export async function ProgramTabs({
  programId,
  active,
}: {
  programId: string;
  active: "backlog" | "roadmap" | "forecast" | "risks" | "report" | "setup";
}) {
  const t = await getTranslations("tabs");
  const tabs = [
    { key: "backlog", href: `/programs/${programId}` },
    { key: "roadmap", href: `/programs/${programId}/roadmap` },
    { key: "forecast", href: `/programs/${programId}/forecast` },
    { key: "risks", href: `/programs/${programId}/risks` },
    { key: "report", href: `/programs/${programId}/report` },
    { key: "setup", href: `/programs/${programId}/setup` },
  ] as const;
  return (
    <nav aria-label={t("label")} className="-mt-4 flex gap-8 border-b border-hairline">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={active === tab.key ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 pb-3 text-[13px] font-semibold tracking-[0.12em] uppercase transition-colors",
            active === tab.key
              ? "border-ink text-ink"
              : "border-transparent text-slate hover:text-ink",
          )}
        >
          {t(tab.key)}
        </Link>
      ))}
    </nav>
  );
}
