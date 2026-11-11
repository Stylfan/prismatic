import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/controls";
import { DemoButton } from "@/components/program/demo-button";
import { SectionLabel } from "@/components/ui/layout";
import { requireUser } from "@/auth/session";
import { withUser } from "@/db/client";
import { listPrograms } from "@/services/programs";

export const dynamic = "force-dynamic";

/** The front page: every programme, the most recently changed first. */
export default async function HomePage() {
  const t = await getTranslations("programs");
  const user = await requireUser();
  const programs = await withUser(user.id, (tx) => listPrograms(tx, user.id));

  return (
    <div className="flex flex-col gap-6 pt-8">
      <h1 className="sr-only">{t("title")}</h1>
      {programs.length === 0 ? (
        <div className="flex max-w-xl flex-col gap-3 rounded-lg border border-dashed border-hairline p-8">
          <h2 className="text-xl font-semibold">{t("emptyTitle")}</h2>
          <p className="text-sm leading-relaxed text-slate">{t("emptyBody")}</p>
          <div className="flex flex-wrap items-start gap-2">
            <Link href="/programs/new" className={buttonClass("primary", "sm")}>
              {t("new")}
            </Link>
            <DemoButton />
          </div>
          <p className="text-[13px] text-slate">{t("demoHint")}</p>
        </div>
      ) : (
        <ul className="grid auto-rows-[10.5rem] grid-cols-[repeat(auto-fill,minmax(15rem,17rem))] gap-3">
          {programs.map((p) => (
            <li key={p.id}>
              <Link
                href={`/programs/${p.id}`}
                aria-label={t("open", { name: p.name })}
                className="group flex h-full flex-col gap-1.5 rounded-lg border border-hairline bg-surface p-4 transition-colors hover:border-ink"
              >
                <SectionLabel>{t("periodModel", { model: p.periodModel })}</SectionLabel>
                <h2 className="line-clamp-2 text-[15px] leading-snug font-semibold">{p.name}</h2>
                {p.goal && (
                  <p className="line-clamp-2 text-[13px] leading-snug text-slate">{p.goal}</p>
                )}
                <p className="mt-auto flex items-center justify-between border-t border-hairline-soft pt-2.5 text-[12px] text-slate">
                  {t("milestoneCount", { count: p.milestoneCount })}
                  <ArrowRight
                    className="size-4 text-ink transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </p>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/programs/new"
              className="flex h-full items-center justify-center gap-2 rounded-lg border border-dashed border-hairline text-[14px] font-medium text-slate transition-colors hover:border-ink hover:text-ink"
            >
              <Plus className="size-4" aria-hidden />
              {t("new")}
            </Link>
          </li>
          <li>
            <DemoButton tile />
          </li>
        </ul>
      )}
    </div>
  );
}
