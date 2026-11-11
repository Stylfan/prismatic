"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addRiskAction } from "@/actions/risks";
import { Button, Input, Label, Textarea } from "@/components/ui/controls";
import { StatusMessage, useStatus } from "@/components/ui/status";

const EMPTY = { title: "", consequence: "", mitigation: "" };

/**
 * Raises a new risk: the sentence it finishes, what happens if it occurs
 * and what is done about it. The scores are set on the row afterwards.
 */
export function AddRiskForm({ programId }: { programId: string }) {
  const t = useTranslations("risks");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [v, setV] = useState(EMPTY);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  const set = (key: keyof typeof EMPTY, value: string) =>
    setV((prev) => ({ ...prev, [key]: value }));
  return (
    <form
      className="grid grid-cols-2 gap-x-4 gap-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.title.trim()) return;
        startTransition(async () => {
          const result = await addRiskAction({ programId, ...v });
          if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
          setV(EMPTY);
          router.refresh();
        });
      }}
    >
      <div className="col-span-2 flex flex-col gap-1.5">
        <Label htmlFor="new-risk">{t("add.label")}</Label>
        <Input
          id="new-risk"
          maxLength={400}
          value={v.title}
          placeholder={t("add.placeholder")}
          onChange={(e) => set("title", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-risk-consequence">{t("fields.consequence")}</Label>
        <Textarea
          id="new-risk-consequence"
          rows={2}
          maxLength={2000}
          value={v.consequence}
          placeholder={t("fields.consequenceHint")}
          onChange={(e) => set("consequence", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-risk-mitigation">{t("fields.mitigation")}</Label>
        <Textarea
          id="new-risk-mitigation"
          rows={2}
          maxLength={2000}
          value={v.mitigation}
          placeholder={t("fields.mitigationHint")}
          onChange={(e) => set("mitigation", e.target.value)}
        />
      </div>
      <div className="col-span-2 flex items-center justify-end gap-3">
        <StatusMessage status={status} />
        <Button type="submit" variant="primary" disabled={pending || !v.title.trim()}>
          {t("add.submit")}
        </Button>
      </div>
    </form>
  );
}
