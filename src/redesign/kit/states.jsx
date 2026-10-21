
import { cn } from "@/lib/utils";

/* Spec §9: loading keeps header/toolbar/table header; only the body shows skeletons.
   Errors are inline, in the region that failed, with the GraphQL message and Retry. */

export function Skeleton({ className }) {
  return <span className={cn("tw:block tw:animate-pulse tw:rounded tw:bg-muted", className)} aria-hidden />;
}

/** Table body skeleton: `widths` = one full class string per column, e.g. ["tw:w-4", "tw:w-40", null].
 *  Pass literal classes: Tailwind only generates classes it can see in source. */
export function SkeletonRows({ rows = 8, widths, rowClassName = "tw:h-12" }) {
  return Array.from({ length: rows }, (_, i) => (
    <tr key={i} className={cn("tw:border-b tw:last:border-b-0", rowClassName)} aria-hidden>
      {widths.map((w, j) => (
        <td key={j} className="tw:px-3">
          {w ? <Skeleton className={cn("tw:h-4", w)} /> : null}
        </td>
      ))}
    </tr>
  ));
}

export function ErrorAlert({ error, onRetry, what = "data", className }) {
  if (!error) return null;
  return (
    <div role="alert" className={cn("tw:flex tw:items-center tw:justify-between tw:gap-4 tw:rounded-lg tw:border tw:border-crit/30 tw:bg-crit-bg tw:px-4 tw:py-3 tw:text-[13px] tw:text-crit-text", className)}>
      <span>
        <span className="tw:font-semibold">Couldn’t load {what}</span> — {error.message ?? String(error)}
      </span>
      {onRetry && (
        <button type="button" onClick={() => onRetry()} className="tw:rounded-md tw:border tw:border-crit/30 tw:bg-primary-foreground tw:px-2.5 tw:py-1 tw:font-medium">
          Retry
        </button>
      )}
    </div>
  );
}

/** Dashed empty state (spec §9 Empty): icon, title, description, actions. */
export function EmptyState({ icon: Icon, title, description, actions, className }) {
  return (
    <div className={cn("tw:flex tw:flex-col tw:items-center tw:gap-2 tw:rounded-xl tw:border tw:border-dashed tw:bg-background tw:px-6 tw:py-12 tw:text-center", className)}>
      {Icon && <Icon className="tw:mb-1 tw:size-8 tw:text-muted-foreground" strokeWidth={1.5} />}
      <h3 className="tw:text-[15px] tw:font-semibold">{title}</h3>
      {description && <p className="tw:max-w-md tw:text-[13px] tw:text-muted-foreground">{description}</p>}
      {actions && <div className="tw:mt-2 tw:flex tw:gap-2">{actions}</div>}
    </div>
  );
}

/** Placeholder for a page or tab that its owning work group hasn't built yet. */
export function PageStub({ title, spec }) {
  return (
    <div className="tw:flex tw:flex-col tw:gap-1 tw:rounded-xl tw:border tw:border-dashed tw:bg-background tw:px-6 tw:py-10 tw:text-center">
      <h2 className="tw:text-[15px] tw:font-semibold">{title}</h2>
      {spec && <p className="tw:text-[13px] tw:text-muted-foreground">{spec}</p>}
    </div>
  );
}
