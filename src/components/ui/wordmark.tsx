/**
 * The mark: a ring with a bronze point inside, a prism seen end-on, and
 * the name in spaced capitals. Decorative to assistive technology; the
 * link around it carries the name.
 */
export function Wordmark() {
  return (
    <span className="flex items-center gap-3">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <circle cx="14" cy="14" r="12.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M14 7 L20.5 19 H7.5 Z" fill="none" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="14" cy="15" r="2.4" fill="var(--color-bronze)" />
      </svg>
      <span className="text-[13px] font-semibold tracking-[0.32em]">PRISMATIC</span>
    </span>
  );
}
