import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { PrintButton } from "@/components/report/publish-form";
import { ReportView } from "@/components/report/report-view";
import { getDb, withUser } from "@/db/client";
import { programTitle } from "@/lib/load";
import { buildReportData, changesSince, previousEdition } from "@/lib/report-data";
import { getProgram } from "@/services/programs";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: await programTitle((await params).id) };
}

/** The report as it would be published now, compared with the latest edition. */
export default async function ReportPreviewPage({ params }: Params) {
  const user = await requireUser();
  // Everything the page reads, it reads as this user: row-level security applies.
  return withUser(
    user.id,
    async (db) => {
      const full = await getProgram(db, user.id, (await params).id);
      if (!full) notFound();
      const t = await getTranslations("report");
      const data = await buildReportData(db, full);
      const previous = await previousEdition(db, full.program.id);
      const previousRisks = Object.fromEntries(
        (previous?.risks ?? []).map((r) => [r.id, [r.probability, r.impact] as [number, number]]),
      );

      return (
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between rounded-lg border border-dashed border-hairline px-4 py-3 print:hidden">
            <p className="text-[13px] text-slate">{t("previewNote")}</p>
            <div className="flex gap-2">
              <Link
                href={`/programs/${full.program.id}/report`}
                className="text-[13px] underline underline-offset-4"
              >
                {t("backToEditor")}
              </Link>
              <PrintButton />
            </div>
          </div>
          <ReportView
            data={data}
            changes={changesSince(previous, data)}
            previousRisks={previousRisks}
            title={t("previewTitle")}
            first={previous === null}
          />
        </div>
      );
    },
    getDb(),
  );
}
