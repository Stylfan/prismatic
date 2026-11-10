"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { setSizePointsAction } from "@/actions/programs";
import { Input } from "@/components/ui/controls";
import { Panel } from "@/components/ui/layout";
import { StatusMessage, useStatus, type Status } from "@/components/ui/status";
import type { Size, SizeLevel } from "@/db/schema";
import { LEVEL_SIZES, MAX_POINTS, type SizeTable } from "@/domain/sizes";

/**
 * Points per size for business goals and features. A cell saves when it
 * loses focus with a changed value, so eleven numbers need no save button.
 */
export function SizesPanel({ programId, sizes }: { programId: string; sizes: SizeTable }) {
  const t = useTranslations("sizes");
  const [status, setStatus] = useStatus();
  return (
    <Panel className="flex flex-col gap-6">
      {(["goal", "feature"] as const).map((level) => (
        <fieldset key={level} className="flex flex-col gap-3">
          <legend className="mb-2 text-sm font-semibold">{t(level)}</legend>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {LEVEL_SIZES[level].map((size) => (
              <SizeCell
                key={size}
                programId={programId}
                level={level}
                size={size}
                points={sizes[level][size] ?? 0}
                onStatus={setStatus}
              />
            ))}
          </div>
        </fieldset>
      ))}
      <StatusMessage status={status} />
    </Panel>
  );
}

function SizeCell({
  programId,
  level,
  size,
  points,
  onStatus,
}: {
  programId: string;
  level: SizeLevel;
  size: Size;
  points: number;
  onStatus: (s: Status) => void;
}) {
  const t = useTranslations("sizes");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [value, setValue] = useState(String(points));
  const [, startTransition] = useTransition();
  const id = `size-${level}-${size}`;

  const save = () => {
    const next = Math.round(Number(value));
    if (value.trim() === "" || !Number.isFinite(next) || next < 0 || next > MAX_POINTS) {
      setValue(String(points));
      return;
    }
    if (next === points) return;
    startTransition(async () => {
      const result = await setSizePointsAction({ programId, level, size, points: next });
      if (!result.ok) {
        setValue(String(points));
        return onStatus({ kind: "error", text: errors(result.error) });
      }
      onStatus({ kind: "ok", text: t("saved", { size, points: next }) });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[11px] font-bold tracking-[0.14em] text-slate">
        {size}
      </label>
      <Input
        id={id}
        type="number"
        min={0}
        max={MAX_POINTS}
        inputMode="numeric"
        className="tabular"
        value={value}
        aria-label={t("pointsLabel", { level: t(level), size })}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </div>
  );
}
