"use client";

import { useTranslations } from "next-intl";
import { Hint, Input, Label, Select, Textarea } from "@/components/ui/controls";
import type { PeriodModel } from "@/db/schema";

export type ProgramValues = {
  name: string;
  goal: string;
  periodModel: PeriodModel;
  startDate: string;
  quarterHorizon: number;
  costPerQuarter: number | null;
  deviationPct: number;
};

const MODELS: PeriodModel[] = ["seasons", "calendar", "custom"];

/** A programme's fields, shared by the create form and the settings panel. */
export function ProgramFields({
  values,
  onChange,
  idPrefix,
}: {
  values: ProgramValues;
  onChange: (next: ProgramValues) => void;
  idPrefix: string;
}) {
  const t = useTranslations("fields");
  const set = <K extends keyof ProgramValues>(key: K, value: ProgramValues[K]) =>
    onChange({ ...values, [key]: value });
  const id = (name: string) => `${idPrefix}-${name}`;
  const whole = (raw: string) => (raw === "" ? null : Math.max(0, Math.round(Number(raw))));
  const clamp = (raw: string, min: number, maxValue: number, fallback: number) =>
    Math.min(maxValue, Math.max(min, whole(raw) ?? fallback));

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5 sm:col-span-2">
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
      <div className="flex flex-col gap-1.5 sm:col-span-2">
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
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={id("model")}>{t("periodModel")}</Label>
        <Select
          id={id("model")}
          value={values.periodModel}
          onChange={(e) => set("periodModel", e.target.value as PeriodModel)}
        >
          {MODELS.map((m) => (
            <option key={m} value={m}>
              {m === "calendar" ? t("calendar") : m === "seasons" ? t("seasons") : t("custom")}
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
        <Hint id={id("start-hint")}>
          {values.periodModel === "custom" ? t("startHintCustom") : t("startHint")}
        </Hint>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("horizon")}>{t("quarterHorizon")}</Label>
        <Input
          id={id("horizon")}
          type="number"
          min={1}
          max={8}
          required
          className="tabular"
          value={values.quarterHorizon}
          onChange={(e) => set("quarterHorizon", clamp(e.target.value, 1, 8, 1))}
          aria-describedby={id("horizon-hint")}
        />
        <Hint id={id("horizon-hint")}>{t("quarterHorizonHint")}</Hint>
      </div>
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
          onChange={(e) => set("deviationPct", clamp(e.target.value, 1, 100, 10))}
          aria-describedby={id("deviation-hint")}
        />
        <Hint id={id("deviation-hint")}>{t("deviationHint")}</Hint>
      </div>
    </div>
  );
}
