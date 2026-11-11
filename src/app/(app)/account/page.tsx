import type { Metadata } from "next";
import { Download } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { DeleteAccount } from "@/components/account/delete-account";
import { PasskeyPanel } from "@/components/account/passkey-panel";
import { TotpPanel } from "@/components/account/totp-panel";
import { buttonClass } from "@/components/ui/controls";
import { PageHeader, Panel, Section, SettingRow } from "@/components/ui/layout";
import { getDb } from "@/db/client";
import { listPasskeys, recoveryCodesLeft } from "@/services/factors";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("title") };
}

/** The account as settings: who you are, how you sign in, your data out, and the way to leave. */
export default async function AccountPage() {
  const user = await requireUser();
  const t = await getTranslations("account");
  const db = getDb();
  const [passkeys, codesLeft] = await Promise.all([
    listPasskeys(db, user.id),
    recoveryCodesLeft(db, user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} />
      <div className="flex max-w-4xl flex-col gap-8">
        <Section id="profile" label={t("profile.title")}>
          <Panel className="py-0 sm:py-0">
            <SettingRow label={t("profile.name")}>
              <span className="text-[14px] text-ink">{user.name || "–"}</span>
            </SettingRow>
            <SettingRow label={t("profile.email")}>
              <span className="text-[14px] text-ink">{user.email}</span>
            </SettingRow>
          </Panel>
        </Section>

        <Section id="security" label={t("security.title")}>
          <Panel className="py-0 sm:py-0">
            <TotpPanel enabled={user.totpSecret !== null} codesLeft={codesLeft} />
            <PasskeyPanel passkeys={passkeys} />
          </Panel>
        </Section>

        <Section id="data" label={t("export.label")}>
          <Panel className="py-0 sm:py-0">
            <SettingRow label={t("export.title")} hint={t("export.hint")}>
              {/* Plain links: the browser downloads the file, no script needed. */}
              <a href="/account/export/xlsx" className={buttonClass("secondary", "sm")} download>
                <Download aria-hidden className="size-4" />
                {t("export.xlsx")}
              </a>
              <a href="/account/export/json" className={buttonClass("secondary", "sm")} download>
                <Download aria-hidden className="size-4" />
                {t("export.json")}
              </a>
            </SettingRow>
          </Panel>
        </Section>

        <Section id="leave" label={t("delete.label")}>
          <Panel className="border-danger/30 py-0 sm:py-0">
            <SettingRow label={t("delete.title")} hint={t("delete.lead")}>
              <DeleteAccount email={user.email} />
            </SettingRow>
          </Panel>
        </Section>
      </div>
    </div>
  );
}
