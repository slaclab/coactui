import { cn } from "@/lib/utils";
import { trackerFor } from "./register-state";

/** 4-segment registration tracker (Signed in · Request · Czar review · Ready), derived from step. */
export function StepTracker({ step }) {
  const segments = trackerFor(step);
  return (
    <ol className="tw:flex tw:gap-1.5" aria-label="Registration progress">
      {segments.map((s, i) => (
        <li key={s.label} aria-current={s.status === "active" ? "step" : undefined} className="tw:flex tw:flex-1 tw:basis-0 tw:flex-col tw:gap-2">
          <span
            aria-hidden
            className={cn("tw:h-0.75 tw:rounded-xs", s.status === "done" ? "tw:bg-foreground" : s.status === "active" ? "tw:bg-primary" : "tw:bg-border")}
          />
          <span className={cn("tw:truncate tw:text-xs tw:leading-4", s.status === "active" ? "tw:font-semibold tw:text-foreground" : "tw:font-medium tw:text-muted-foreground")}>
            {i + 1} · {s.label}
            {s.status === "done" && " ✓"}
            <span className="tw:sr-only">{s.status === "done" ? " (done)" : s.status === "active" ? " (current)" : ""}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function StepTrackerSkeleton() {
  return (
    <div className="tw:flex tw:gap-1.5" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="tw:flex tw:flex-1 tw:flex-col tw:gap-2">
          <span className="tw:h-0.75 tw:rounded-xs tw:bg-border" />
          <span className="tw:h-4 tw:w-16 tw:animate-pulse tw:rounded tw:bg-muted" />
        </span>
      ))}
    </div>
  );
}
