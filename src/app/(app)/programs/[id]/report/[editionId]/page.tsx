import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { PrintButton } from "@/components/report/publish-form";
import { ReportView } from "@/components/report/report-view";
import { withUser } from "@/db/client";
import type { ReportData } from "@/lib/report-data";
import { NotFound } from "@/services/programs";
import { getEdition } from "@/services/report-content";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; editionId: string }> };

async function load(userId: string, programId: string, editionId: string) {
  try {
    return await withUser(userId, (tx) => getEdition(tx, userId, programId, editionId));
  } catch (error) {
    if (error instanceof NotFound) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const user = await requireUser();
  const { id, editionId } = await params;
  return { title: (await load(user.id, id, editionId))?.title };
}

/** A published edition, exactly as it was when it was published. */
export default async function EditionPage({ params }: Params) {
  const user = await requireUser();
  const { id, editionId } = await params;
  const edition = await load(user.id, id, editionId);
  if (!edition) notFound();
  const t = await getTranslations("report");
  const data = JSON.parse(edition.data) as ReportData;
  const empty = { items: [], risks: [], milestones: [], starred: [], newRisks: [] };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between rounded-lg border border-dashed border-hairline px-4 py-3 print:hidden">
        <p className="text-[13px] text-slate">{t("editionNote")}</p>
        <div className="flex gap-2">
          <Link
            href={`/programs/${id}/report`}
            className="text-[13px] underline underline-offset-4"
          >
            {t("backToEditor")}
          </Link>
          <PrintButton />
        </div>
      </div>
      <ReportView
        data={data}
        changes={data.changes ?? empty}
        previousRisks={data.previousRisks ?? {}}
        title={edition.title}
        first={data.first ?? false}
      />
    </div>
  );
}
