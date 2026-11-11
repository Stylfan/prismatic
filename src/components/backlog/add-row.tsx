"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { StatusMessage, useStatus } from "@/components/ui/status";
import { cn } from "@/lib/cn";
import { TREE_COLS } from "./tree-row";

/**
 * "Add a feature here", in the tree where it belongs: a quiet row that
 * turns into a field on click. Enter adds and keeps the field open for the
 * next one; Escape closes it. Nothing to fill in but the title; the rest
 * is set in the side panel.
 */
export function AddRow({
  label,
  placeholder,
  create,
  indent = false,
}: {
  label: string;
  placeholder: string;
  create: (title: string) => Promise<{ ok: boolean; error?: string }>;
  indent?: boolean;
}) {
  const errors = useTranslations("errors");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          TREE_COLS,
          "w-full border-b border-hairline-soft bg-surface px-3 py-1.5 text-left text-[12px] text-slate last:border-b-0 hover:bg-sand/50 hover:text-ink",
        )}
      >
        <span />
        <span className="flex justify-center">
          <Plus className="size-3.5" aria-hidden />
        </span>
        <span className={cn(indent && "pl-5")}>{label}</span>
      </button>
    );
  }

  return (
    <form
      className={cn(
        TREE_COLS,
        "border-b border-hairline-soft bg-surface px-3 py-1 last:border-b-0",
      )}
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        startTransition(async () => {
          const result = await create(title.trim());
          if (!result.ok)
            return setStatus({
              kind: "error",
              text: errors((result.error ?? "generic") as "generic"),
            });
          setTitle("");
          router.refresh();
        });
      }}
    >
      <span />
      <span className="flex justify-center text-slate">
        <Plus className="size-3.5" aria-hidden />
      </span>
      <span className={cn("col-span-5 flex items-center gap-2", indent && "pl-5")}>
        <input
          autoFocus
          aria-label={label}
          value={title}
          maxLength={160}
          disabled={pending}
          placeholder={placeholder}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setTitle("");
            }
          }}
          onBlur={() => !title.trim() && setOpen(false)}
          className="h-7 w-full rounded border border-hairline bg-surface px-2 text-[13px] text-ink placeholder:text-slate/70 focus:border-ink focus:outline-none"
        />
        <StatusMessage status={status} className="shrink-0" />
      </span>
    </form>
  );
}
