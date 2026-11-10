import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return { title: { default: "Prismatic", template: "%s · Prismatic" }, description: t("tagline") };
}

/** The document shell shared by the signed-in pages and the sign-in pages. */
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
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
