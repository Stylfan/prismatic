import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NewProgramForm } from "@/components/program/new-program-form";
import { PageHeader } from "@/components/ui/layout";
import { todayInCopenhagen } from "@/lib/dates";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("create");
  return { title: t("title") };
}

export default async function NewProgramPage() {
  const t = await getTranslations("create");
  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <PageHeader label={t("label")} title={t("title")} lead={t("lead")} />
      <NewProgramForm today={todayInCopenhagen()} />
    </div>
  );
}
