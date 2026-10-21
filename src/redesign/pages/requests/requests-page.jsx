"use client";

import { CountBadge, ErrorAlert, LineTabs, PageHeader, Skeleton } from "../../kit";
import { useQueryState } from "../../lib/navigation";
import { ClientOnly } from "../../providers/apollo";
import { useViewer } from "../../providers/viewer";
import { usePendingRequests } from "./queries";
import { RequestsTable, RequestsTableSkeleton } from "./requests-table";

/** /requests — Needs my approval · My requests · All (artboards 3AW, 3K9). */
export function RequestsPage() {
  return (
    <ClientOnly fallback={<RequestsFrame />}>
      <RequestsLive />
    </ClientOnly>
  );
}

// Per-view params that don't carry over when switching tabs (a status filter on Mine would
// silently empty Pending; the open sheet/dialog belongs to the old list).
const VIEW_LOCAL = ["approvalstatus", "window", "windowbegin", "windowend", "req", "focus", "dialog", "target"];

function RequestsLive() {
  const { viewer, can, loading: viewerLoading, error: viewerError } = useViewer();
  const [params, setParams] = useQueryState();
  const pending = usePendingRequests();

  // Views this viewer has, the way ReposLive derives its scopes: czars and admins approve and
  // see All; PIs/leaders get "Needs my approval" only when the API gives them something to
  // approve; members only ever see their own requests.
  const requested = params.get("view");
  const reviewer = can.isAdmin || can.isCzar;
  const hasPending = reviewer || pending.rows.length > 0 || (pending.loading && requested === "pending");
  const views = [hasPending && "pending", "mine", reviewer && "all"].filter(Boolean);
  const view = views.includes(requested) ? requested : hasPending ? "pending" : "mine";

  const setView = (v) => {
    const next = new URLSearchParams(params);
    VIEW_LOCAL.forEach((k) => next.delete(k));
    if (v === views[0]) next.delete("view");
    else next.set("view", v);
    setParams(next, { replace: false });
  };

  if (viewerLoading) return <RequestsFrame />;
  const tabs = [
    hasPending && {
      value: "pending",
      label: (
        <>
          Needs my approval
          {pending.loading ? <Skeleton className="tw:h-5 tw:w-6 tw:rounded-full" /> : pending.rows.length > 0 && <CountBadge tone="warn">{pending.rows.length}</CountBadge>}
        </>
      ),
    },
    { value: "mine", label: "My requests" },
    reviewer && { value: "all", label: "All" },
  ].filter(Boolean);

  return (
    <RequestsFrame subtitle={subtitleFor(viewer, can)}>
      <LineTabs className="tw:-mt-1" value={view} onChange={setView} items={tabs} />
      <ErrorAlert error={viewerError} what="your account" />
      <RequestsTable key={view} view={view} />
    </RequestsFrame>
  );
}

function subtitleFor(viewer, can) {
  if (!viewer) return "Everything you have asked for, and where it is";
  if (can.isAdmin) return "Requests across all facilities, and requests you made";
  if (can.isCzar) return `Requests you can approve for ${viewer.czarOf.join(" and ")}, and requests you made`;
  return "Everything you have asked for, and where it is";
}

function RequestsFrame({ subtitle, children }) {
  return (
    <div className="tw:flex tw:flex-col tw:gap-5">
      <PageHeader title="Requests" subtitle={subtitle ?? <Skeleton className="tw:h-4 tw:w-80" />} />
      {children ?? (
        <>
          <div className="tw:-mt-1 tw:flex tw:h-8 tw:items-end tw:border-b" aria-hidden />
          <RequestsTableSkeleton />
        </>
      )}
    </div>
  );
}
