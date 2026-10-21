import { Skeleton } from "../../kit";
import { HallCard } from "./night-hall";
import { StepTracker, StepTrackerSkeleton } from "./step-tracker";

/** Card shell on the hall: title, "Signed in with SLAC SSO as <eppn>", tracker, then the body. */
export function RegisterCard({ title, eppn, step, children }) {
  return (
    <HallCard className="tw:gap-5.5">
      <div className="tw:flex tw:flex-col tw:gap-1.5">
        <h2 className="tw:text-[22px] tw:leading-7 tw:font-bold tw:tracking-[-0.015em]">{title}</h2>
        {eppn && (
          <p className="tw:flex tw:flex-wrap tw:items-center tw:gap-1.5 tw:text-[13px] tw:leading-4.5 tw:text-muted-foreground">
            Signed in with SLAC SSO as <span className="tw:font-mono tw:font-medium tw:text-foreground">{eppn}</span>
          </p>
        )}
      </div>
      {step ? <StepTracker step={step} /> : <StepTrackerSkeleton />}
      {children}
    </HallCard>
  );
}

/** Card while the registration loads: title, tracker, three option rows, textarea, button. */
export function RegisterCardSkeleton() {
  return (
    <HallCard className="tw:gap-5.5" aria-busy="true">
      <div className="tw:flex tw:flex-col tw:gap-2">
        <Skeleton className="tw:h-7 tw:w-64" />
        <Skeleton className="tw:h-4 tw:w-72" />
      </div>
      <StepTrackerSkeleton />
      <div className="tw:flex tw:flex-col tw:gap-2">
        <Skeleton className="tw:h-14 tw:w-full tw:rounded-lg" />
        <Skeleton className="tw:h-14 tw:w-full tw:rounded-lg" />
        <Skeleton className="tw:h-14 tw:w-full tw:rounded-lg" />
      </div>
      <Skeleton className="tw:h-21 tw:w-full tw:rounded-lg" />
      <Skeleton className="tw:h-11 tw:w-full tw:rounded-lg" />
    </HallCard>
  );
}
