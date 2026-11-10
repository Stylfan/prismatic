import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { LogoutButton } from "@/components/auth/logout-button";
import { Wordmark } from "@/components/ui/wordmark";

export const dynamic = "force-dynamic";

/** Every page behind the sign-in: the header with the user and the way out. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const t = await getTranslations("app");
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-hairline bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-8">
          <Link href="/" className="text-ink" aria-label={t("home")}>
            <Wordmark />
          </Link>
          <nav aria-label={t("navLabel")} className="flex items-center gap-6">
            <Link
              href="/"
              className="text-[12px] font-medium tracking-[0.16em] text-slate uppercase hover:text-ink"
            >
              {t("programs")}
            </Link>
            <span className="text-[13px] text-slate">{user.name || user.email}</span>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main id="content" className="mx-auto max-w-6xl px-8 py-14">
        {children}
      </main>
    </>
  );
}
