"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import { History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ClientOnly } from "../../providers/apollo";
import { EmptyState, ErrorAlert, Segmented, Skeleton, StatusPill, Timeline } from "../../kit";
import { formatDate } from "../../lib/format";
import { useQueryParam } from "../../lib/navigation";
import { useRepo } from "./repo-context";
import { REPO_HISTORY, repoFilter, requestFilter } from "./core/queries";
import { buildHistory } from "./core/history-model";

const KINDS = [
  { value: "all", label: "All" },
  { value: "changes", label: "Changes" },
  { value: "requests", label: "Requests" },
];
const PAGE = 50;

/** Repo › History (Paper "Repo — History"): audit trail + Coact requests, newest first; ?kind=. */
export function RepoHistoryTab() {
  return (
    <ClientOnly fallback={<HistoryFrame kind="all" body={<HistorySkeleton />} />}>
      <HistoryLive />
    </ClientOnly>
  );
}

function HistoryFrame({ kind, onKind, body }) {
  return (
    <div className="tw:flex tw:flex-col tw:gap-5">
      <div className="tw:flex tw:items-center tw:justify-between tw:gap-4">
        <Segmented label="Show" value={kind} onChange={onKind ?? (() => {})} items={KINDS} />
        <span className="tw:text-[13px] tw:text-muted-foreground">From repo audit trail and Coact requests</span>
      </div>
      {body}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="tw:ml-2 tw:flex tw:flex-col tw:gap-6 tw:border-l tw:pl-6">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="tw:flex tw:flex-col tw:gap-1.5">
          <Skeleton className="tw:h-4 tw:w-72" />
          <Skeleton className="tw:h-3 tw:w-40" />
        </div>
      ))}
    </div>
  );
}

function HistoryLive() {
  const { repo } = useRepo();
  const [kind, setKind] = useQueryParam("kind", "all");
  if (!repo) return <HistoryFrame kind={kind} onKind={setKind} body={<HistorySkeleton />} />;
  return <HistoryFrame kind={kind} onKind={setKind} body={<HistoryBody key={kind} repo={repo} kind={kind} />} />;
}

function HistoryBody({ repo, kind }) {
  const { data, loading, error, refetch } = useQuery(REPO_HISTORY, { variables: { filter: repoFilter(repo), rf: requestFilter(repo) } });
  const [shown, setShown] = useState(PAGE); // local "Show more" count
  const all = useMemo(() => buildHistory(data?.repoAuditTrails ?? [], data?.requests ?? []), [data]);
  const entries = useMemo(() => all.filter((e) => kind === "all" || (kind === "changes" ? e.kind === "change" : e.kind === "request")), [all, kind]);

  if (error && !data) return <ErrorAlert error={error} onRetry={refetch} what="history" />;
  if (loading && !data) return <HistorySkeleton />;
  if (!entries.length)
    return (
      <EmptyState
        icon={History}
        title={kind === "changes" ? "No changes recorded" : kind === "requests" ? "No requests for this repo" : "No history recorded for this repo"}
      />
    );

  return (
    <div className="tw:flex tw:flex-col tw:gap-5">
      {error && <ErrorAlert error={error} onRetry={refetch} what="all of the history" />}
      <Timeline
        entries={entries.slice(0, shown).map((e) => ({
          key: e.key,
          title: (
            <span>
              <span className="tw:font-mono tw:font-medium">{e.actor ?? "—"}</span> {e.title}
            </span>
          ),
          badge: e.status && <StatusPill tone={e.status.tone} dot={false}>{e.status.label}</StatusPill>,
          meta: (
            <>
              {formatDate(e.at, { time: true }).replace(/, (\d\d:\d\d)$/, " · $1")} · {e.kind === "change" ? "Change" : "Request"}
              {e.note && <> · “{e.note}”</>}
            </>
          ),
        }))}
      />
      {entries.length > shown && (
        <div>
          <Button variant="outline" size="sm" onClick={() => setShown((n) => n + PAGE)}>
            Show {Math.min(PAGE, entries.length - shown)} more
          </Button>
          <span className="tw:ml-3 tw:text-xs tw:text-muted-foreground tw:tabular-nums">{shown} of {entries.length}</span>
        </div>
      )}
    </div>
  );
}
