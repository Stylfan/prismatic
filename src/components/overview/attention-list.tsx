import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CircleCheck, CircleAlert, Flame, Gavel, Gauge, Scale } from "lucide-react";
import { cn } from "@/lib/cn";

export type Attention = {
  kind: "overloaded" | "highRisk" | "warnings" | "slipping" | "cases";
  text: string;
  href: string;
};

const ICON = {
  overloaded: { icon: Gauge, tone: "text-danger" },
  highRisk: { icon: Flame, tone: "text-danger" },
  warnings: { icon: Scale, tone: "text-warning" },
  slipping: { icon: CircleAlert, tone: "text-warning" },
  cases: { icon: Gavel, tone: "text-slate" },
} as const;

/** What needs someone's hand this week, most serious first, each a link to where it is fixed. */
export async function AttentionList({ items }: { items: Attention[] }) {
  const t = await getTranslations("overview.attention");
  if (items.length === 0) {
    return (
      <p className="flex items-center gap-2 text-[13px] text-success">
        <CircleCheck className="size-4" aria-hidden />
        {t("none")}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((a, i) => {
        const { icon: Icon, tone } = ICON[a.kind];
        return (
          <li key={i}>
            <Link
              href={a.href}
              className="-mx-2 flex items-start gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-ink hover:bg-sand/60"
            >
              <Icon className={cn("mt-0.5 size-4 shrink-0", tone)} aria-hidden />
              <span>{a.text}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
