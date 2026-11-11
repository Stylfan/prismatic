"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { deleteRiskAction, updateRiskAction } from "@/actions/risks";
import { ConfirmButton } from "@/components/ui/confirm";
import { Button, Input, Label, Select, Textarea } from "@/components/ui/controls";
import { StatusMessage, useStatus } from "@/components/ui/status";
import type { Risk, RiskStatus } from "@/db/schema";
import { riskBand, riskScore } from "@/domain/risk";
import { cn } from "@/lib/cn";

const SCALE_VALUES = Array.from({ length: 10 }, (_, k) => k + 1);

/** One risk in the log: a row with its number, title and score that opens into its editor. */
export function RiskRow({ risk }: { risk: Risk }) {
  const t = useTranslations("risks");
  const common = useTranslations("common");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  const [v, setV] = useState({
    title: risk.title,
    consequence: risk.consequence,
    mitigation: risk.mitigation,
    changeNote: risk.changeNote,
    probability: risk.probability,
    impact: risk.impact,
    status: risk.status,
  });
  const set = <K extends keyof typeof v>(key: K, value: (typeof v)[K]) =>
    setV((prev) => ({ ...prev, [key]: value }));
  const id = (name: string) => `risk-${risk.id}-${name}`;
  const band = riskBand(risk.probability, risk.impact);

  return (
    <li className="bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id("editor")}
        onClick={() => setOpen((o) => !o)}
        className="grid w-full grid-cols-[3rem_1fr_7rem_6rem_auto] items-center gap-4 px-4 py-3 text-left hover:bg-paper"
      >
        <span className="tabular flex size-8 items-center justify-center rounded-full bg-ink text-[12px] font-bold text-paper">
          {risk.number}
        </span>
        <span
          className={cn(
            "text-sm font-medium",
            risk.status === "closed" && "text-slate line-through",
          )}
        >
          {risk.title}
        </span>
        <span className="tabular text-[12px] text-slate">
          {t("scoreLine", { p: risk.probability, i: risk.impact })}
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-center text-[11px] font-semibold",
            band === "high" && "bg-danger/12 text-danger",
            band === "medium" && "bg-warning/15 text-warning",
            band === "low" && "bg-success/10 text-success",
          )}
        >
          {t(`band.${band}`)} · {riskScore(risk.probability, risk.impact)}
        </span>
        <ChevronDown
          className={cn("size-4 text-slate transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <form
          id={id("editor")}
          className="grid grid-cols-6 gap-4 border-t border-hairline-soft bg-paper/60 px-6 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!v.title.trim()) return;
            startTransition(async () => {
              const result = await updateRiskAction({ riskId: risk.id, ...v });
              if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
              setStatus({ kind: "ok", text: t("saved", { number: risk.number }) });
              router.refresh();
            });
          }}
        >
          <div className="col-span-6 flex flex-col gap-1.5">
            <Label htmlFor={id("title")}>{t("fields.title")}</Label>
            <Input
              id={id("title")}
              required
              maxLength={400}
              value={v.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>
          <div className="col-span-3 flex flex-col gap-1.5">
            <Label htmlFor={id("consequence")}>{t("fields.consequence")}</Label>
            <Textarea
              id={id("consequence")}
              rows={3}
              maxLength={2000}
              placeholder={t("fields.consequenceHint")}
              value={v.consequence}
              onChange={(e) => set("consequence", e.target.value)}
            />
          </div>
          <div className="col-span-3 flex flex-col gap-1.5">
            <Label htmlFor={id("mitigation")}>{t("fields.mitigation")}</Label>
            <Textarea
              id={id("mitigation")}
              rows={3}
              maxLength={2000}
              placeholder={t("fields.mitigationHint")}
              value={v.mitigation}
              onChange={(e) => set("mitigation", e.target.value)}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor={id("p")}>{t("fields.probability")}</Label>
            <Select
              id={id("p")}
              value={String(v.probability)}
              onChange={(e) => set("probability", Number(e.target.value))}
            >
              {SCALE_VALUES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor={id("i")}>{t("fields.impact")}</Label>
            <Select
              id={id("i")}
              value={String(v.impact)}
              onChange={(e) => set("impact", Number(e.target.value))}
            >
              {SCALE_VALUES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor={id("status")}>{t("fields.status")}</Label>
            <Select
              id={id("status")}
              value={v.status}
              onChange={(e) => set("status", e.target.value as RiskStatus)}
            >
              <option value="open">{t("status.open")}</option>
              <option value="closed">{t("status.closed")}</option>
            </Select>
          </div>
          <div className="col-span-6 flex flex-col gap-1.5">
            <Label htmlFor={id("change")}>{t("fields.changeNote")}</Label>
            <Textarea
              id={id("change")}
              rows={2}
              maxLength={1000}
              value={v.changeNote}
              onChange={(e) => set("changeNote", e.target.value)}
            />
          </div>
          <div className="col-span-6 flex flex-wrap items-center gap-3 border-t border-hairline-soft pt-4">
            <ConfirmButton
              label={t("delete")}
              question={t("deleteQuestion", { number: risk.number })}
              detail={t("deleteDetail")}
              confirmLabel={t("delete")}
              cancelLabel={common("cancel")}
              onConfirm={() =>
                startTransition(async () => {
                  const result = await deleteRiskAction({ riskId: risk.id });
                  if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
                  router.refresh();
                })
              }
            />
            <span className="flex-1" />
            <StatusMessage status={status} />
            <Button type="submit" variant="primary" size="sm" disabled={pending || !v.title.trim()}>
              {pending ? common("saving") : common("save")}
            </Button>
          </div>
        </form>
      )}
    </li>
  );
}
