import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { startDemoAction } from "@/actions/demo-visit";
import { Button } from "@/components/ui/controls";
import { SectionLabel } from "@/components/ui/layout";
import { DEMO_HOURS } from "@/services/demo-visits";
import { sourceUrl } from "@/lib/demo-mode";

/**
 * The front door of a demo installation: what the visitor gets, that it is
 * gone again after a day, one button to start, and where the code is.
 */
export async function DemoStart({ notice }: { notice?: "busy" | "full" }) {
  const t = await getTranslations("demoVisit");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <SectionLabel>{t("label")}</SectionLabel>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{t("title")}</h1>
        <p className="text-sm leading-relaxed text-slate">{t("body", { hours: DEMO_HOURS })}</p>
        <p className="text-sm leading-relaxed text-ink">{t("noRealData")}</p>
      </div>
      {notice && (
        <p role="status" className="rounded-md bg-warning-soft px-3 py-2 text-[13px] text-warning">
          {t(notice)}
        </p>
      )}
      <form action={startDemoAction}>
        <Button type="submit" variant="primary" className="w-full justify-center">
          {t("start")}
        </Button>
      </form>
      <a
        href={sourceUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 self-start text-[13px] text-slate underline underline-offset-4 hover:text-ink"
      >
        {t("source")}
        <ExternalLink className="size-3.5" aria-hidden />
      </a>
    </div>
  );
}
