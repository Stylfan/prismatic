import type { Metadata } from "next";
import { Download } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { DeleteAccount } from "@/components/account/delete-account";
import { PasskeyPanel } from "@/components/account/passkey-panel";
import { TotpPanel } from "@/components/account/totp-panel";
import { buttonClass } from "@/components/ui/controls";
import { PageHeader, Panel, Section } from "@/components/ui/layout";
import { getDb } from "@/db/client";
import { listPasskeys, recoveryCodesLeft } from "@/services/factors";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("title") };
}

/** The account: who you are, your data out, and the way to leave. */
export default async function AccountPage() {
  const user = await requireUser();
  const t = await getTranslations("account");
  const db = getDb();
  const [passkeys, codesLeft] = await Promise.all([
    listPasskeys(db, user.id),
    recoveryCodesLeft(db, user.id),
  ]);

  return (
    <div className="flex flex-col gap-14">
      <PageHeader label={t("label")} title={t("title")} lead={user.email} />

      <Section
        number={1}
        id="data"
        label={t("export.label")}
        title={t("export.title")}
        lead={t("export.lead")}
      >
        <Panel className="flex flex-wrap items-center gap-3">
          {/* Plain links: the browser downloads the file, no script needed. */}
          <a href="/account/export/xlsx" className={buttonClass("secondary", "sm")} download>
            <Download aria-hidden className="size-4" />
            {t("export.xlsx")}
          </a>
          <a href="/account/export/json" className={buttonClass("secondary", "sm")} download>
            <Download aria-hidden className="size-4" />
            {t("export.json")}
          </a>
          <p className="basis-full text-[13px] text-slate">{t("export.pdf")}</p>
        </Panel>
      </Section>
      <Section
        number={2}
        id="security"
        label={t("security.label")}
        title={t("security.title")}
        lead={t("security.lead")}
      >
        <div className="flex flex-col gap-3">
          <h3 className="text-[15px] font-semibold">{t("totp.title")}</h3>
          <TotpPanel enabled={user.totpSecret !== null} codesLeft={codesLeft} />
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-[15px] font-semibold">{t("passkeys.title")}</h3>
          <PasskeyPanel passkeys={passkeys} />
        </div>
      </Section>

      <Section
        number={3}
        id="leave"
        label={t("delete.label")}
        title={t("delete.title")}
        lead={t("delete.lead")}
      >
        <div>
          <DeleteAccount email={user.email} />
        </div>
      </Section>
    </div>
  );
}
