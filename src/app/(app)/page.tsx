import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/controls";
import { PageHeader, SectionLabel } from "@/components/ui/layout";
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        lead={t("lead")}
        actions={
          <Link href="/programs/new" className={buttonClass("primary", "sm")}>
            {t("new")}
          </Link>
        }
      />
      {programs.length === 0 ? (
        <div className="flex max-w-xl flex-col gap-3 rounded-lg border border-dashed border-hairline p-8">
          <h2 className="text-xl font-semibold">{t("emptyTitle")}</h2>
          <p className="text-sm leading-relaxed text-slate">{t("emptyBody")}</p>
          <div>
            <Link href="/programs/new" className={buttonClass("secondary", "sm")}>
              {t("new")}
            </Link>
          </div>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <li key={p.id}>
              <Link
                href={`/programs/${p.id}`}
                aria-label={t("open", { name: p.name })}
                className="group flex h-full flex-col gap-3 rounded-lg border border-hairline bg-surface p-6 transition-colors hover:border-ink"
              >
                <SectionLabel>{t("periodModel", { model: p.periodModel })}</SectionLabel>
                <h2 className="text-xl font-semibold tracking-[-0.01em]">{p.name}</h2>
                {p.goal && (
                  <p className="line-clamp-3 text-sm leading-relaxed text-slate">{p.goal}</p>
                )}
                <p className="mt-auto flex items-center justify-between border-t border-hairline-soft pt-4 text-[13px] text-slate">
                  {t("milestoneCount", { count: p.milestoneCount })}
                  <ArrowRight
                    className="size-4 text-ink transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
