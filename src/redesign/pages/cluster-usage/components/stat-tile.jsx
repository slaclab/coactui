import { Skeleton } from "../../../kit";

/** KPI tile (label, large tabular value, muted caption). Kit request: promote to kit/. */
export function StatTile({ label, value, caption, loading }) {
  return (
    <div className="tw:flex tw:flex-col tw:gap-1 tw:rounded-xl tw:border tw:bg-background tw:px-5 tw:py-4">
      <span className="tw:text-[13px] tw:font-medium tw:text-muted-strong">{label}</span>
      {loading ? <Skeleton className="tw:my-0.5 tw:h-7 tw:w-20" /> : <span className="tw:text-2xl tw:leading-8 tw:font-semibold tw:tracking-[-0.02em] tw:tabular-nums">{value}</span>}
      {caption && <span className="tw:text-xs tw:text-muted-foreground">{loading ? " " : caption}</span>}
    </div>
  );
}

export function StatRow({ children }) {
  return <div className="tw:grid tw:grid-cols-2 tw:gap-3 tw:lg:grid-cols-4">{children}</div>;
}
