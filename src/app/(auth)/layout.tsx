import { Wordmark } from "@/components/ui/wordmark";

/** The sign-in pages: the mark, one quiet panel, nothing else. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="content"
      className="flex min-h-screen flex-col items-center justify-center gap-10 px-8"
    >
      <span className="text-ink">
        <Wordmark />
      </span>
      <div className="w-full max-w-sm rounded-lg border border-hairline bg-surface p-8">
        {children}
      </div>
    </main>
  );
}
