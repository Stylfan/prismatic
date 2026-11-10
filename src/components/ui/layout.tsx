import { cn } from "@/lib/cn";

/**
 * Page structure. A section opens with a numbered bronze label in bold,
 * letter-spaced capitals ("01 · OVERBLIK") and a heading; content sits on
 * white panels with a hairline. No shadows: the hairline is the structure.
 */

export function SectionLabel({
  number,
  children,
  className,
}: {
  number?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[12px] font-bold tracking-[0.18em] text-bronze-deep uppercase",
        className,
      )}
    >
      {number !== undefined && (
        <span className="tabular">{String(number).padStart(2, "0")} · </span>
      )}
      {children}
    </p>
  );
}

export function PageHeader({
  label,
  title,
  lead,
  actions,
}: {
  label?: React.ReactNode;
  title: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-hairline pb-8">
      <div className="flex max-w-3xl min-w-0 flex-col gap-3">
        {label && <SectionLabel>{label}</SectionLabel>}
        <h1 className="text-4xl leading-[1.1] font-bold tracking-[-0.03em] sm:text-5xl">{title}</h1>
        {lead && <p className="text-base leading-relaxed text-slate">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Section({
  number,
  label,
  title,
  lead,
  children,
  id,
}: {
  number?: number;
  label: string;
  title?: string;
  lead?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <SectionLabel number={number}>{label}</SectionLabel>
        {title && (
          <h2
            id={id ? `${id}-title` : undefined}
            className="text-2xl font-semibold tracking-[-0.02em]"
          >
            {title}
          </h2>
        )}
        {lead && <p className="max-w-3xl text-sm leading-relaxed text-slate">{lead}</p>}
      </div>
      {children}
    </section>
  );
}

export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-lg border border-hairline bg-surface p-5 sm:p-6", className)}
      {...props}
    />
  );
}
