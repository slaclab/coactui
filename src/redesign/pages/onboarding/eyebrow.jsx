/** Night-hall eyebrow: a 24 px SLAC-red rule + mono uppercase label. */
export function Eyebrow({ children }) {
  return (
    <div className="tw:flex tw:items-center tw:gap-2.5">
      <span className="tw:h-0.5 tw:w-6 tw:shrink-0 tw:bg-primary" aria-hidden />
      <span className="tw:font-mono tw:text-xs tw:leading-4 tw:font-medium tw:tracking-[0.14em] tw:text-primary-foreground/65 tw:uppercase">{children}</span>
    </div>
  );
}
