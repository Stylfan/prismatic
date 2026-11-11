"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createItemAction } from "@/actions/items";
import { Button, Input, Select } from "@/components/ui/controls";
import { StatusMessage, useStatus } from "@/components/ui/status";
import type { BacklogOptions } from "./types";

/**
 * A new business goal from the toolbar: the button opens one line with the
 * title and the milestone it belongs to. Features are added in the tree,
 * under their goal.
 */
export function AddGoal({ programId, options }: { programId: string; options: BacklogOptions }) {
  const t = useTranslations("backlog.board");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [milestone, setMilestone] = useState(options.milestones[0]?.value ?? "");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();

  if (!open) {
    return (
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        {t("addGoal")}
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
          const result = await createItemAction({
            programId,
            kind: "goal",
            title: title.trim(),
            parentId: null,
            milestoneId: milestone || null,
          });
          if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
          setTitle("");
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <Input
        autoFocus
        aria-label={t("goalTitle")}
        placeholder={t("goalTitle")}
        maxLength={160}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="h-8 w-64 text-[13px]"
      />
      <Select
        aria-label={t("milestone")}
        value={milestone}
        onChange={(e) => setMilestone(e.target.value)}
        className="h-8 w-48 text-[13px]"
      >
        <option value="">{t("noMilestone")}</option>
        {options.milestones.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="primary" size="sm" disabled={pending || !title.trim()}>
        {t("add")}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
        {t("cancel")}
      </Button>
      <StatusMessage status={status} />
    </form>
  );
}
