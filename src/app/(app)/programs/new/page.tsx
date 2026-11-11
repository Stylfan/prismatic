import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NewProgramForm } from "@/components/program/new-program-form";
import { DemoButton } from "@/components/program/demo-button";
import { PageHeader } from "@/components/ui/layout";
import { todayInCopenhagen } from "@/lib/dates";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("create");
  return { title: t("title") };
}

export default async function NewProgramPage() {
  const t = await getTranslations("create");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} lead={t("lead")} actions={<DemoButton />} />
      <div className="max-w-4xl">
        <NewProgramForm today={todayInCopenhagen()} />
      </div>
    </div>
  );
}
