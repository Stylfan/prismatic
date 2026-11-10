import type { PeriodLabel } from "@/domain/periods";

/** A translator scoped to "periods", from useTranslations or getTranslations. */
type PeriodT = (key: string, values?: Record<string, string | number>) => string;

/** Renders a structured period label in the page's language: "Vinter 2025/26", "Q1 2027". */
export function formatPeriodLabel(t: PeriodT, label: PeriodLabel): string {
  if (label.kind === "quarter") {
    if (label.model === "calendar")
      return t("quarterCalendar", { quarter: label.quarter, year: label.year });
    if (label.model === "custom") return t("quarterCustom", { n: label.n });
    switch (label.season) {
      case "spring":
        return t("spring", { year: label.year });
      case "summer":
        return t("summer", { year: label.year });
      case "autumn":
        return t("autumn", { year: label.year });
      case "winter":
        return t("winter", {
          year: label.year,
          next: String((label.year + 1) % 100).padStart(2, "0"),
        });
    }
  }
  if (label.model === "custom") return t("halfCustom", { n: label.n });
  if (label.model === "calendar") return t("halfCalendar", { half: label.half, year: label.year });
  return label.half === 1
    ? t("halfSpringSummer", { year: label.year })
    : t("halfAutumnWinter", { year: label.year });
}

/** dd.mm.yyyy, as dates are written in Danish reports. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}.${m}.${y}` : iso;
}
