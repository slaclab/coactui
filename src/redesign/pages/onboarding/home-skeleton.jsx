import { Skeleton } from "../../kit";

/** Neutral placeholder while "/" works out which door to open (no landing flash). */
export function HomeSkeleton() {
  return (
    <div className="tw:flex tw:flex-col tw:gap-5" aria-busy="true">
      <span className="tw:sr-only" role="status">Opening Coact…</span>
      <div className="tw:flex tw:flex-col tw:gap-2">
        <Skeleton className="tw:h-8 tw:w-56" />
        <Skeleton className="tw:h-4 tw:w-80" />
      </div>
      <div className="tw:flex tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:bg-background tw:p-5">
        <Skeleton className="tw:h-10 tw:w-full" />
        <Skeleton className="tw:h-10 tw:w-full" />
        <Skeleton className="tw:h-10 tw:w-2/3" />
      </div>
    </div>
  );
}
