"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addRiskAction } from "@/actions/risks";
import { Button, Input, Label } from "@/components/ui/controls";
import { StatusMessage, useStatus } from "@/components/ui/status";

/** Raises a new risk with its sentence; the assessment is filled in on the row. */
export function AddRiskForm({ programId }: { programId: string }) {
  const t = useTranslations("risks.add");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        startTransition(async () => {
          const result = await addRiskAction({ programId, title });
          if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
          setTitle("");
          router.refresh();
        });
      }}
    >
      <Label htmlFor="new-risk">{t("label")}</Label>
      <div className="flex gap-3">
        <Input
          id="new-risk"
          maxLength={400}
          value={title}
          placeholder={t("placeholder")}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="primary" disabled={pending || !title.trim()}>
          {t("submit")}
        </Button>
      </div>
      <StatusMessage status={status} />
    </form>
  );
}
