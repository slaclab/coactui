"use client";

import { ErrorAlert, Segmented } from "../../../kit";
import { MODES, NOTES } from "../constants";

/**
 * The chart card every tab uses: title + caption, chart-type switch (?chart), and the region
 * states (pulse while loading, inline error with Retry, empty copy). Children render the chart.
 */
export function ChartCard({ title, mode, onMode, loading, error, onRetry, empty, children }) {
  return (
    <section className="tw:flex tw:flex-col tw:gap-3.5 tw:rounded-xl tw:border tw:bg-background tw:px-5 tw:pt-4.5 tw:pb-4">
      <div className="tw:flex tw:items-start tw:justify-between tw:gap-4">
        <div>
          <h2 className="tw:text-[15px] tw:leading-5.5 tw:font-semibold">{title}</h2>
          {NOTES[mode].sub && <p className="tw:mt-0.5 tw:text-xs tw:text-muted-foreground">{NOTES[mode].sub}</p>}
        </div>
        <Segmented label="Chart type" size="sm" items={MODES} value={mode} onChange={onMode} />
      </div>
      {error ? (
        <ErrorAlert error={error} onRetry={onRetry} what="usage" />
      ) : empty ? (
        <p className="tw:flex tw:h-[264px] tw:items-center tw:justify-center tw:text-[13px] tw:text-muted-foreground">{empty}</p>
      ) : loading ? (
        <div className="tw:h-[264px] tw:animate-pulse tw:rounded-lg tw:bg-muted/60" aria-label="Loading usage" />
      ) : (
        children
      )}
    </section>
  );
}
