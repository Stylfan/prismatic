"use client";

import { useState, useTransition } from "react";
import { Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { publishAction } from "@/actions/report";
import { Button, Input, Label } from "@/components/ui/controls";
import { StatusMessage, useStatus } from "@/components/ui/status";

/** Freezes the quarter's report as an edition, named for the meeting it goes to. */
export function PublishForm({
  programId,
  quarterIndex,
  defaultTitle,
}: {
  programId: string;
  quarterIndex: number;
  defaultTitle: string;
}) {
  const t = useTranslations("report.publish");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [title, setTitle] = useState(defaultTitle);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        startTransition(async () => {
          const result = await publishAction({ programId, title, quarterIndex });
          if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
          router.push(`/programs/${programId}/report/${result.data}`);
        });
      }}
    >
      <Label htmlFor="edition-title">{t("label")}</Label>
      <div className="flex gap-3">
        <Input
          id="edition-title"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="primary" disabled={pending || !title.trim()}>
          {pending ? t("publishing") : t("submit")}
        </Button>
      </div>
      <StatusMessage status={status} />
    </form>
  );
}

/** Opens the browser's print dialog, where the report can also be saved as PDF. */
export function PrintButton() {
  const t = useTranslations("report");
  return (
    <Button size="sm" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden />
      {t("print")}
    </Button>
  );
}
