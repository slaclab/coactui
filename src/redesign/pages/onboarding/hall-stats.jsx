"use client";

import { useHallStats } from "./queries";

const LABELS = ["Clusters", "Cores", "GPUs", "Storage", "Facilities"];

/**
 * Bottom-left strip on the night hall: what S3DF runs. Decoration — skeleton numbers while
 * loading, hidden on error (unregistered callers may be denied these queries). No
 * "All systems operational" LED: there is no status source in the API.
 */
export function HallStats() {
  const { stats, loading, error } = useHallStats();
  if (error || (!loading && !stats)) return null;
  const items = stats ?? LABELS.map((label) => ({ label, value: null }));
  return (
    <dl className="tw:flex tw:w-fit tw:flex-wrap tw:items-center tw:gap-x-7 tw:gap-y-3 tw:rounded-xl tw:border tw:border-primary-foreground/10 tw:bg-night/70 tw:px-5 tw:py-3.5" aria-busy={loading || undefined}>
      {items.map((s) => (
        <div key={s.label} className="tw:flex tw:flex-col-reverse tw:gap-0.5">
          <dt className="tw:text-[11px] tw:leading-3.5 tw:tracking-[0.06em] tw:text-primary-foreground/55 tw:uppercase">{s.label}</dt>
          <dd className="tw:font-mono tw:text-base tw:leading-5 tw:font-medium tw:text-primary-foreground tw:tabular-nums">
            {s.value ?? <span className="tw:my-0.5 tw:block tw:h-4 tw:w-10 tw:animate-pulse tw:rounded tw:bg-primary-foreground/10" aria-hidden />}
          </dd>
        </div>
      ))}
    </dl>
  );
}
