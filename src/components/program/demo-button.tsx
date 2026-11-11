"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { createDemoAction } from "@/actions/programs";
import { Button } from "@/components/ui/controls";
import { StatusMessage, useStatus } from "@/components/ui/status";

/** Creates the example programme and opens it. */
export function DemoButton({ variant = "secondary" }: { variant?: "primary" | "secondary" }) {
  const t = useTranslations("programs");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        variant={variant}
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await createDemoAction();
            if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
            router.push(`/programs/${result.data}`);
          })
        }
      >
        <Sparkles className="size-4" aria-hidden />
        {pending ? t("demoCreating") : t("demo")}
      </Button>
      <StatusMessage status={status} />
    </span>
  );
}
