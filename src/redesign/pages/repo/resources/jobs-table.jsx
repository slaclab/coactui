"use client";

import { useMemo } from "react";
import Link from "next/link";
import { DataTable, ErrorAlert, Segmented, sortHeader } from "../../../kit";
import { formatDate } from "../../../lib/format";
import { useQueryParam } from "../../../lib/navigation";
import { DEFAULT_JOB_WINDOW, formatDuration, formatRh, JOB_WINDOWS, jobWindow } from "./compute-math";
import { useComputeJobs } from "./queries";

/** ?jobs=5|15|60|180 — shared by the Compute tab block and the allocation detail page. */
export function useJobWindow() {
  const [raw, set] = useQueryParam("jobs", DEFAULT_JOB_WINDOW);
  return [jobWindow(raw), set];
}

const sameDay = (a, b) => a.toDateString() === b.toDateString();
function formatTs(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return sameDay(d, new Date()) ? d.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false }) : formatDate(value, { time: true });
}

const num = (label) => ({ header: sortHeader(label, { align: "right" }), meta: { headerClassName: "tw:text-right", cellClassName: "tw:text-right tw:tabular-nums" } });

function jobColumns(full) {
  return [
    { accessorKey: "jobId", header: sortHeader("Job ID"), cell: ({ getValue }) => <span className="tw:font-mono">{getValue()}</span> },
    { accessorKey: "username", header: sortHeader("User"), cell: ({ getValue }) => <span className="tw:font-mono">{getValue()}</span> },
    { accessorKey: "qos", header: sortHeader("QOS"), cell: ({ getValue }) => <span className="tw:text-muted-strong">{getValue() ?? "—"}</span> },
    { accessorKey: "resourceHours", ...num("Resource-h"), cell: ({ getValue }) => formatRh(getValue()) },
    full && { accessorKey: "normalizedResourceHours", ...num("Normalized"), cell: ({ getValue }) => formatRh(getValue()) },
    full && { accessorKey: "startTs", header: sortHeader("Started"), cell: ({ getValue }) => <span className="tw:text-muted-strong tw:tabular-nums">{formatTs(getValue())}</span> },
    { accessorKey: "endTs", header: sortHeader("Ended"), cell: ({ getValue }) => <span className="tw:text-muted-strong tw:tabular-nums">{formatTs(getValue())}</span> },
    { accessorKey: "durationMillis", ...num("Duration"), cell: ({ getValue }) => <span className="tw:text-muted-strong">{formatDuration(getValue())}</span> },
  ].filter(Boolean);
}

/**
 * Recent jobs for one allocation. compact = the Compute tab block (latest 5, no footer,
 * link to the detail page); full = the detail page's Jobs view.
 */
export function RecentJobs({ allocationId, compact = false, allHref, title = "Recent jobs" }) {
  const [win, setWin] = useJobWindow();
  const jobs = useComputeJobs(allocationId, win.minutes);
  const columns = useMemo(() => jobColumns(!compact), [compact]);
  const data = compact ? jobs.rows.slice(0, 5) : jobs.rows;
  const empty = `No jobs ended in the past ${win.label}`;

  return (
    <div className="tw:flex tw:flex-col tw:gap-3">
      <div className="tw:flex tw:items-center tw:justify-between">
        <h3 className={compact ? "tw:text-[13px] tw:leading-5 tw:font-semibold" : "tw:text-[15px] tw:leading-5.5 tw:font-semibold"}>{title}</h3>
        <Segmented label="Jobs window" size="sm" items={JOB_WINDOWS} value={win.value} onChange={setWin} />
      </div>
      {jobs.error ? (
        <ErrorAlert error={jobs.error} onRetry={jobs.refetch} what="recent jobs" />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          getRowId={(r) => String(r.jobId)}
          loading={jobs.loading}
          skeleton={compact ? ["tw:w-16", "tw:w-12", "tw:w-12", "tw:w-10", "tw:w-10", "tw:w-10"] : ["tw:w-16", "tw:w-12", "tw:w-12", "tw:w-10", "tw:w-10", "tw:w-24", "tw:w-24", "tw:w-10"]}
          empty={empty}
          footer={!compact}
          defaultPageSize={compact ? 5 : 50}
          initialSorting={[{ id: "endTs", desc: true }]}
          rowClassName={compact ? () => "tw:h-9 tw:text-xs" : undefined}
          tableClassName={compact ? "tw:text-xs" : undefined}
        />
      )}
      {compact && jobs.rows.length > data.length && allHref && (
        <Link href={allHref} className="tw:text-xs tw:font-medium tw:text-foreground tw:underline-offset-2 tw:hover:underline">
          All {jobs.rows.length} jobs in the past {win.label} →
        </Link>
      )}
    </div>
  );
}
