import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MIN_PASSWORD_LENGTH } from "@/auth/password";
import { currentUser } from "@/auth/session";
import { AuthForm } from "@/components/auth/auth-form";
import { SectionLabel } from "@/components/ui/layout";
import { getDb } from "@/db/client";
import { signupOpen } from "@/services/users";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("loginTitle") };
}

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  // An empty installation has nobody to sign in as: start with the account.
  const db = getDb();
  if (signupOpen(db, "closed")) redirect("/register");
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
