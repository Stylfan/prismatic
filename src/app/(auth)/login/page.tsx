import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MIN_PASSWORD_LENGTH } from "@/auth/password";
import { currentUser } from "@/auth/session";
import { AuthForm } from "@/components/auth/auth-form";
import { DemoStart } from "@/components/auth/demo-start";
import { isDemoMode } from "@/lib/demo-mode";
import { SectionLabel } from "@/components/ui/layout";
import { getDb } from "@/db/client";
import { signupOpen } from "@/services/users";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  if (isDemoMode()) return { title: (await getTranslations("demoVisit"))("title") };
  const t = await getTranslations("auth");
  return { title: t("loginTitle") };
}

type Props = { searchParams: Promise<{ demo?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  if (await currentUser()) redirect("/");
  // A demo installation opens with the demo; signing in is for whoever runs it.
  if (isDemoMode()) {
    const demo = (await searchParams).demo;
    const t = await getTranslations("demoVisit");
    return (
      <div className="flex flex-col gap-6">
        <DemoStart notice={demo === "busy" || demo === "full" ? demo : undefined} />
        <details className="border-t border-hairline-soft pt-4">
          <summary className="cursor-pointer text-[13px] text-slate hover:text-ink">
            {t("login")}
          </summary>
          <div className="pt-4">
            <AuthForm mode="login" minPassword={MIN_PASSWORD_LENGTH} />
          </div>
        </details>
      </div>
    );
  }
  // An empty installation has nobody to sign in as: start with the account.
  const db = getDb();
  if (await signupOpen(db, "closed")) redirect("/register");
  const t = await getTranslations("auth");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <SectionLabel>{t("loginLabel")}</SectionLabel>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{t("loginTitle")}</h1>
      </div>
      <AuthForm mode="login" minPassword={MIN_PASSWORD_LENGTH} />
    </div>
  );
}
