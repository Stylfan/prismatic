import { cn } from "@/lib/cn";

/**
 * The basic controls. One filled button per view (ink), everything else
 * outlined or quiet; fields are white on paper with a hairline that turns
 * ink on focus. Sizes follow a 4px rhythm and every target is at least 36px.
 */

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
};

export function buttonClass(
  variant: ButtonProps["variant"] = "secondary",
  size: ButtonProps["size"] = "md",
) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    size === "md" && "h-10 px-5 text-sm",
    size === "sm" && "h-9 px-4 text-[13px]",
    size === "icon" && "size-9 rounded-full",
    variant === "primary" && "bg-ink text-paper hover:bg-ink-soft",
    variant === "secondary" && "border border-ink/70 text-ink hover:bg-ink hover:text-paper",
    variant === "ghost" && "text-slate hover:bg-sand hover:text-ink",
    variant === "danger" &&
      "border border-danger/60 text-danger hover:bg-danger hover:text-surface",
  );
}

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonClass(variant, size), className)} {...props} />;
}

const FIELD =
  "w-full rounded-md border border-hairline bg-surface px-3 text-sm text-ink placeholder:text-slate/70 transition-colors hover:border-slate/60 focus:border-ink focus:outline-none aria-[invalid=true]:border-danger";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(FIELD, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(FIELD, "py-2 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(FIELD, "h-10 cursor-pointer", className)} {...props} />;
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-[13px] font-medium text-ink", className)} {...props} />;
}

export function Hint({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-xs leading-relaxed text-slate", className)} {...props} />;
}
