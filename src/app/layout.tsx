import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { Wordmark } from "@/components/ui/wordmark";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return { title: { default: "Prismatic", template: "%s · Prismatic" }, description: t("tagline") };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("app");
  const messages = await getMessages();
  return (
    <html lang="da" className={inter.variable}>
      <body className="font-sans">
        <NextIntlClientProvider messages={messages}>
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
          >
            {t("skipToContent")}
          </a>
          <header className="sticky top-0 z-40 border-b border-hairline bg-paper/90 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
              <Link href="/" className="text-ink" aria-label={t("home")}>
                <Wordmark />
              </Link>
              <nav aria-label={t("navLabel")}>
                <Link
                  href="/"
                  className="text-[12px] font-medium tracking-[0.16em] text-slate uppercase hover:text-ink"
                >
                  {t("programs")}
                </Link>
              </nav>
            </div>
          </header>
          <main id="content" className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
