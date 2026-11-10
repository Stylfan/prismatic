"use client";

import { useTranslations } from "next-intl";
import { Hint, Input, Label, Select, Textarea } from "@/components/ui/controls";
import type { PeriodModel } from "@/db/schema";
import { ColumnsPreview } from "./columns-preview";

export type ProgramValues = {
  name: string;
  goal: string;
  periodModel: PeriodModel;
  startDate: string;
  quarterHorizon: number;
  costPerQuarter: number | null;
  deviationPct: number;
};

const MODELS: PeriodModel[] = ["seasons", "calendar"];
const HORIZONS = [1, 2, 3, 4];

/**
 * A programme's fields, shared by the create form and the settings panel.
 * The period choices sit together with a live preview of the columns they
 * produce, so the effect of a choice is visible before it is saved.
 */
export function ProgramFields({
  values,
  onChange,
  idPrefix,
  today,
}: {
  values: ProgramValues;
  onChange: (next: ProgramValues) => void;
  idPrefix: string;
  today: string;
}) {
  const t = useTranslations("fields");
  const set = <K extends keyof ProgramValues>(key: K, value: ProgramValues[K]) =>
    onChange({ ...values, [key]: value });
  const id = (name: string) => `${idPrefix}-${name}`;
  const whole = (raw: string) => (raw === "" ? null : Math.max(0, Math.round(Number(raw))));

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-5">
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor={id("name")}>{t("name")}</Label>
          <Input
            id={id("name")}
            required
            maxLength={80}
            value={values.name}
            placeholder={t("namePlaceholder")}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor={id("goal")}>{t("goal")}</Label>
          <Textarea
            id={id("goal")}
            rows={2}
            maxLength={300}
            value={values.goal}
            placeholder={t("goalPlaceholder")}
            onChange={(e) => set("goal", e.target.value)}
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-5 border-t border-hairline-soft pt-6">
        <legend className="mb-1 text-sm font-semibold">{t("periodsLegend")}</legend>
        <div className="grid grid-cols-3 gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("model")}>{t("periodModel")}</Label>
            <Select
              id={id("model")}
              value={values.periodModel}
              onChange={(e) => set("periodModel", e.target.value as PeriodModel)}
            >
              {MODELS.map((m) => (
                <option key={m} value={m}>
                  {m === "calendar" ? t("calendar") : t("seasons")}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("start")}>{t("startDate")}</Label>
            <Input
              id={id("start")}
              type="date"
              required
              value={values.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              aria-describedby={id("start-hint")}
            />
            <Hint id={id("start-hint")}>{t("startHint")}</Hint>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("horizon")}>{t("quarterHorizon")}</Label>
            <Select
              id={id("horizon")}
              value={String(values.quarterHorizon)}
              onChange={(e) => set("quarterHorizon", Number(e.target.value))}
              aria-describedby={id("horizon-hint")}
            >
              {HORIZONS.map((n) => (
                <option key={n} value={n}>
                  {t("quarterCount", { count: n })}
                </option>
              ))}
            </Select>
            <Hint id={id("horizon-hint")}>{t("quarterHorizonHint")}</Hint>
          </div>
        </div>
        <ColumnsPreview
          model={values.periodModel}
          startDate={values.startDate}
          quarterHorizon={values.quarterHorizon}
          today={today}
        />
      </fieldset>

      <fieldset className="grid grid-cols-2 gap-5 border-t border-hairline-soft pt-6">
        <legend className="mb-1 text-sm font-semibold">{t("economyLegend")}</legend>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("cost")}>{t("costPerQuarter")}</Label>
          <Input
            id={id("cost")}
            type="number"
            min={0}
            step={1000}
            className="tabular"
            value={values.costPerQuarter ?? ""}
            onChange={(e) => set("costPerQuarter", whole(e.target.value))}
            aria-describedby={id("cost-hint")}
          />
          <Hint id={id("cost-hint")}>{t("costHint")}</Hint>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("deviation")}>{t("deviationPct")}</Label>
          <Input
            id={id("deviation")}
            type="number"
            min={1}
            max={100}
            required
            className="tabular"
            value={values.deviationPct}
            onChange={(e) =>
              set("deviationPct", Math.min(100, Math.max(1, whole(e.target.value) ?? 10)))
            }
            aria-describedby={id("deviation-hint")}
          />
          <Hint id={id("deviation-hint")}>{t("deviationHint")}</Hint>
        </div>
      </fieldset>
    </div>
  );
}
