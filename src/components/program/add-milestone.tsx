"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addMilestoneAction } from "@/actions/programs";
import { Button, Input } from "@/components/ui/controls";
import { StatusMessage, useStatus } from "@/components/ui/status";

/** A new milestone from wherever the milestones are seen: a button that opens one line for its name. */
export function AddMilestone({ programId }: { programId: string }) {
  const t = useTranslations("milestones");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        {t("addShort")}
      </Button>
    );
  }
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        startTransition(async () => {
          const result = await addMilestoneAction({ programId, title: title.trim() });
          if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
          setTitle("");
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <Input
        autoFocus
        aria-label={t("addLabel")}
        placeholder={t("addPlaceholder")}
        maxLength={120}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="h-8 w-64 text-[13px]"
      />
      <Button type="submit" variant="primary" size="sm" disabled={pending || !title.trim()}>
        {t("add")}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        {t("cancel")}
      </Button>
      <StatusMessage status={status} />
    </form>
  );
}
