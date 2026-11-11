"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { createDemoAction } from "@/actions/programs";
import { Button } from "@/components/ui/controls";
import { StatusMessage, useStatus } from "@/components/ui/status";
import { cn } from "@/lib/cn";

/**
 * Creates the example programme and opens it. As a button, or as a tile
 * the same size as a programme's on the front page.
 */
export function DemoButton({ tile, className }: { tile?: boolean; className?: string }) {
  const t = useTranslations("programs");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  const open = () =>
    startTransition(async () => {
      const result = await createDemoAction();
      if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
      router.push(`/programs/${result.data}`);
    });
  const label = (
    <>
      <Sparkles className="size-4" aria-hidden />
      {pending ? t("demoCreating") : t("demo")}
    </>
  );

  if (tile) {
    return (
      <button
        type="button"
        onClick={open}
        disabled={pending}
        className={cn(
          "relative flex h-full w-full items-center justify-center rounded-lg border border-dashed border-hairline text-[14px] font-medium text-slate transition-colors hover:border-ink hover:text-ink disabled:opacity-60",
          className,
        )}
      >
        <span className="flex items-center gap-2">{label}</span>
        {/* Out of the flow, so the label stays centred like the tile beside it. */}
        <StatusMessage status={status} className="absolute inset-x-3 bottom-3 text-center" />
      </button>
    );
  }
  return (
    <span className="inline-flex flex-col gap-1">
      <Button variant="secondary" size="sm" disabled={pending} onClick={open}>
        {label}
      </Button>
      <StatusMessage status={status} />
    </span>
  );
}
