"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";

import { DataTable, ErrorAlert, FacetFilter, PageHeader, ResetButton, SearchInput, Segmented, sortHeader, Toolbar, ToolbarButton } from "../../kit";
import { downloadCsv } from "../../lib/csv";
import { formatDate } from "../../lib/format";
import { useQueryList, useQueryParam, useQueryState } from "../../lib/navigation";
import { routes } from "../../lib/routes";
import { ClientOnly } from "../../providers/apollo";
import { useViewer } from "../../providers/viewer";
import { KINDS } from "./audit-labels";
import { useAccountEvents } from "./queries";

const BY = [
  { value: "all", label: "All" },
  { value: "me", label: "By me" },
  { value: "others", label: "By others" },
];
const SKELETON = ["tw:w-32", "tw:w-40", "tw:w-16", "tw:w-56"];

const columns = [
  {
    id: "at",
    accessorFn: (r) => r.at ?? "",
    header: sortHeader("When"),
    cell: ({ row }) => <span className="tw:whitespace-nowrap tw:tabular-nums">{formatDate(row.original.at, { time: true })}</span>,
    size: 176,
  },
  { id: "label", accessorKey: "label", header: sortHeader("Action"), size: 240 },
  {
    id: "by",
    accessorFn: (r) => r.by ?? "",
    header: sortHeader("By"),
    cell: ({ row }) => <span className="tw:font-mono tw:text-[13px]">{row.original.by ?? "system"}</span>,
    size: 140,
  },
  {
    id: "details",
    accessorKey: "details",
    header: "Details",
    enableSorting: false,
    cell: ({ row }) => <span className="tw:font-mono tw:text-xs tw:text-muted-strong">{row.original.details || "—"}</span>,
  },
];

const CSV_COLUMNS = [
  { header: "When", value: (r) => r.at },
  { header: "Action", value: (r) => r.label },
  { header: "By", value: (r) => r.by },
  { header: "Details", value: (r) => r.details },
];

/** /myaudittrail */
export function AuditTrailPage() {
  return (
    <ClientOnly fallback={<AuditTrailFrame loading />}>
      <AuditTrailLive />
    </ClientOnly>
  );
}

function AuditTrailLive() {
  const { viewer } = useViewer();
  const events = useAccountEvents();
  return <AuditTrailFrame events={events} username={viewer?.username} />;
}

function AuditTrailFrame({ loading: frameLoading = false, events, username }) {
  const [params, setParams] = useQueryState();
  const [byParam, setBy] = useQueryParam("by", "all");
  const [q, setQ] = useQueryParam("q", "");
  const [kinds, setKinds] = useQueryList("kind");
  const by = BY.some((b) => b.value === byParam) ? byParam : "all";

  const loading = frameLoading || !!events?.loading;
  const all = useMemo(() => events?.rows ?? [], [events]);

  // Everything below is derived from the merged rows + URL state.
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((r) => {
      if (by === "me" && r.by !== username) return false;
      if (by === "others" && r.by === username) return false;
      if (kinds.length && !r.kinds.some((k) => kinds.includes(k))) return false;
      if (needle && ![r.label, r.details, r.by].some((v) => v?.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [all, by, kinds, q, username]);

  const kindOptions = useMemo(
    () => KINDS.map((k) => ({ ...k, count: all.filter((r) => r.kinds.includes(k.value)).length })),
    [all],
  );
  const filtered = by !== "all" || kinds.length > 0 || q !== "";
  const reset = () => {
    const next = new URLSearchParams(params);
    ["by", "q", "kind"].forEach((k) => next.delete(k));
    setParams(next);
  };

  const empty = filtered ? (
    by === "me" && !kinds.length && !q ? (
      "You haven't made any changes yet"
    ) : (
      <span className="tw:inline-flex tw:items-center tw:gap-2">No changes match these filters <ResetButton onClick={reset} /></span>
    )
  ) : (
    "No changes recorded for your account yet"
  );

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "My profile", href: routes.profile() }, { label: "Audit trail" }]}
        title="Audit trail"
        subtitle="Every change made to your account, by you or by an admin"
        actions={
          <>
            <Segmented label="Changed by" items={BY} value={by} onChange={setBy} />
            <ToolbarButton icon={Download} disabled={loading || !rows.length} onClick={() => downloadCsv("audit-trail.csv", CSV_COLUMNS, rows)}>
              Export CSV
            </ToolbarButton>
          </>
        }
      />
      <ErrorAlert error={events?.error} onRetry={events?.refetch} what="your audit trail" />
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        loading={loading}
        skeleton={SKELETON}
        initialSorting={[{ id: "at", desc: true }]}
        empty={empty}
        toolbar={
          <Toolbar
            className="tw:pt-0"
            start={
              <>
                <SearchInput value={q} onChange={setQ} placeholder="Filter changes…" label="Filter changes" />
                <FacetFilter label="Kind" options={kindOptions} selected={kinds} onChange={setKinds} />
                {filtered && <ResetButton onClick={reset} />}
              </>
            }
          />
        }
      />
    </>
  );
}
