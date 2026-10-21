"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, CheckCircle2, ChevronDown, Download, Inbox, Search, X } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  BulkButton,
  Chip,
  DataTable,
  ErrorAlert,
  FacetFilter,
  ResetButton,
  SearchInput,
  sortHeader,
  StatusPill,
  Toolbar,
  ToolbarButton,
} from "../../kit";
import { downloadCsv } from "../../lib/csv";
import { formatAge, formatDate } from "../../lib/format";
import { useDialogParam, useQueryState } from "../../lib/navigation";
import { routes } from "../../lib/routes";
import { useViewer } from "../../providers/viewer";
import { useRequestMutations, useRequests, useRequestsMeta } from "./queries";
import { RequestDialogs } from "./request-dialogs";
import { searchMatch, useRequestFilters } from "./request-filters";
import {
  approveBlockedReason,
  canApprove,
  canReject,
  describeRequest,
  shortId,
  STATUS_META,
  statusLabel,
  statusMeta,
  TYPE_META,
  typeLabel,
  typeMeta,
} from "./request-meta";
import { RequestSheet } from "./request-sheet";

/* ======================================================================================
 * RequestsTable — the one requests list, used by /requests (every view) and the facility
 * Requests tab (artboards 3AW, 3K9, 4TT). Cross-group contract: RequestsTable({ filter }).
 *
 *   view     "pending" (default) | "mine" | "all"
 *   filter   fixed filters that override the URL, e.g. { facilityname: "LCLS" }
 *   embedded facility-tab chrome: "Showing x of y pending" + "Open in Requests ↗"
 *
 * Rows, facets, the open sheet (?req=) and open dialogs (?dialog=) are all derived from the
 * URL and the query; the only local state is which inline approvals are in flight.
 * ====================================================================================== */
export function RequestsTable({ filter, view = "pending", embedded = false }) {
  const fixed = useMemo(() => filter ?? {}, [filter]);
  const { viewer, can } = useViewer();
  const [params, setParams] = useQueryState();
  const { openDialog } = useDialogParam();
  const f = useRequestFilters({ view, fixed });
  const { rows, loading, error, refetch } = useRequests(view, f.apiFilter);
  const meta = useRequestsMeta();
  const m = useRequestMutations();
  const [approving, setApproving] = useState(() => new Set()); // inline approvals in flight

  const reqId = params.get("req");
  const focusNote = params.get("focus") === "note";
  const setSheet = (id, { focus } = {}) => {
    const next = new URLSearchParams(params);
    if (id) next.set("req", id);
    else next.delete("req");
    if (focus) next.set("focus", focus);
    else next.delete("focus");
    setParams(next, { replace: !!reqId || !id });
  };

  const scoped = useMemo(() => (fixed.facilityname ? rows.filter((r) => r.facilityname === fixed.facilityname) : rows), [rows, fixed.facilityname]);
  const matched = useMemo(() => rows.filter(f.matches), [rows, f.matches]);
  const visible = useMemo(() => matched.filter((r) => searchMatch(r, f.q)), [matched, f.q]);

  const facilitiesInRows = useMemo(() => [...new Set(rows.map((r) => r.facilityname).filter(Boolean))].sort(), [rows]);
  const showFacilityFacet = !fixed.facilityname && (can.isAdmin || facilitiesInRows.length > 1);
  const showFacilityColumn = !fixed.facilityname && view !== "pending";

  const approveInline = async (r) => {
    setApproving((s) => new Set(s).add(r.Id));
    try {
      await m.approveWithToast(r);
    } catch {
      /* toast already shows the API message */
    } finally {
      setApproving((s) => {
        const n = new Set(s);
        n.delete(r.Id);
        return n;
      });
    }
  };

  const columns = useMemo(
    () => buildColumns({ view, can, showFacility: showFacilityColumn, approving, onApprove: approveInline, onReject: (r) => setSheet(r.Id, { focus: "note" }), onView: (r) => setSheet(r.Id) }),
    // the handlers only close over URL state, which changes with `params`
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, can, showFacilityColumn, approving, params],
  );

  // Facet counts are over the loaded rows (the window and any server-side filters).
  const countBy = (key) => {
    const acc = {};
    for (const r of scoped) acc[r[key]] = (acc[r[key]] ?? 0) + 1;
    return acc;
  };
  const typeCounts = countBy("reqtype");
  const typeOptions = [...new Set([...meta.types, ...Object.keys(TYPE_META), ...rows.map((r) => r.reqtype)])]
    .map((t) => ({ value: t, label: typeLabel(t), count: f.serverNarrowed.reqtype ? undefined : typeCounts[t] }))
    .filter((o) => o.count || f.reqtypes.includes(o.value) || f.serverNarrowed.reqtype)
    .sort((a, b) => a.label.localeCompare(b.label));
  const facilityCounts = countBy("facilityname");
  const facilityOptions = facilitiesInRows.map((x) => ({ value: x, count: f.serverNarrowed.facilityname ? undefined : facilityCounts[x] }));
  const statusOptions = [...new Set([...meta.statuses, ...Object.keys(STATUS_META)])].map((s) => ({ value: s, label: statusLabel(s, view) }));
  const windowLabel = f.windows.find((w) => w.value === f.windowKey)?.label ?? "Custom window";

  const facilityName = fixed.facilityname;
  const emptyContent = (() => {
    if (f.active) {
      return (
        <>
          No requests match{f.q ? ` “${f.q}”` : " these filters"}{facilityName ? ` in ${facilityName}` : ""}.{" "}
          <button type="button" onClick={f.reset} className="tw:font-medium tw:text-foreground tw:underline">Clear filters</button>
        </>
      );
    }
    if (view === "pending")
      return facilityName ? (
        <InlineEmpty icon={CheckCircle2} title={`No pending requests for ${facilityName}`}>
          <Link href={routes.requests({ view: "all", facilityname: facilityName })} className="tw:inline-flex tw:items-center tw:gap-1 tw:font-medium tw:text-foreground tw:no-underline tw:hover:underline">
            Open all {facilityName} requests <ArrowUpRight className="tw:size-3.5" />
          </Link>
        </InlineEmpty>
      ) : (
        <InlineEmpty
          icon={CheckCircle2}
          title="Nothing needs your approval"
          description={can.isAdmin ? "New requests from every facility will show up here." : can.isCzar ? `New requests for ${(viewer?.czarOf ?? []).join(" and ")} will show up here.` : "New membership requests for repos you lead will show up here."}
        />
      );
    if (view === "mine")
      return (
        <InlineEmpty icon={Inbox} title="You haven’t made any requests" description="Requests you make for repos, allocations and accounts show up here and track through to done.">
          <Link href={routes.repos()} className="tw:font-medium tw:text-foreground tw:underline">Go to Repos</Link>
        </InlineEmpty>
      );
    return (
      <InlineEmpty icon={Inbox} title={`No requests in the ${windowLabel.toLowerCase()}`}>
        {f.windowKey !== "1y" && (
          <button type="button" onClick={() => f.set({ window: "1y", windowbegin: null, windowend: null })} className="tw:font-medium tw:text-foreground tw:underline">Show the last year</button>
        )}
      </InlineEmpty>
    );
  })();

  return (
    <div className="tw:flex tw:flex-col">
      {error && <ErrorAlert className="tw:mt-4" error={error} onRetry={refetch} what="requests" />}
      <DataTable
        columns={columns}
        data={visible}
        getRowId={(r) => r.Id}
        loading={loading}
        skeleton={skeletonFor(view, showFacilityColumn)}
        enableRowSelection={view === "pending" ? canApprove : undefined}
        onRowClick={(r) => setSheet(r.Id)}
        rowClassName={(r) => reqId === r.Id && "tw:shadow-[inset_2px_0_0_var(--primary)]"}
        empty={emptyContent}
        pageSizes={[25, 50, 100]}
        defaultPageSize={50}
        toolbar={
          <Toolbar
            start={
              <>
                <SearchInput value={f.q} onChange={(v) => f.set({ q: v })} placeholder={facilityName ? `Filter ${facilityName} requests…` : "Filter by user, repo…"} />
                <FacetFilter label="Type" options={typeOptions} selected={f.reqtypes} onChange={(v) => f.set({ reqtype: v })} />
                {showFacilityFacet && <FacetFilter label="Facility" options={facilityOptions} selected={f.facilities} onChange={(v) => f.set({ facilityname: v })} />}
                {view !== "pending" && (
                  <SingleFacet label="Status" options={statusOptions} value={f.approvalstatus} onChange={(v) => f.set({ approvalstatus: v })} counts={f.serverNarrowed.approvalstatus ? null : countBy("approvalstatus")} />
                )}
                {view !== "pending" && (
                  <SingleFacet
                    label={windowLabel}
                    options={f.windows.map((w) => ({ value: w.value, label: w.label }))}
                    value={f.windowKey}
                    onChange={(v) => f.set({ window: v, windowbegin: null, windowend: null })}
                    always
                  />
                )}
                {f.reponame && <FilterChip label="Repo" value={f.reponame} onClear={() => f.set({ reponame: null })} />}
                {f.foruser && <FilterChip label="User" value={f.foruser} onClear={() => f.set({ foruser: null })} />}
                {f.active ? <ResetButton onClick={f.reset} /> : null}
              </>
            }
            end={
              <>
                {embedded && (
                  <>
                    <span className="tw:text-[13px] tw:text-muted-foreground tw:tabular-nums">{loading ? "Loading…" : `Showing ${visible.length} of ${scoped.length} pending`}</span>
                    <Link href={routes.requests(facilityName ? { facilityname: facilityName } : undefined)} className="tw:flex tw:items-center tw:gap-1 tw:text-[13px] tw:font-medium tw:text-foreground tw:no-underline tw:hover:underline">
                      Open in Requests <ArrowUpRight className="tw:size-3.5" />
                    </Link>
                  </>
                )}
                <ToolbarButton icon={Download} disabled={!visible.length} onClick={() => downloadCsv(`requests-${view}.csv`, CSV_COLUMNS, visible)}>Export</ToolbarButton>
              </>
            }
          />
        }
        bulkActions={
          view === "pending"
            ? ({ selected }) => {
                const ids = selected.map((r) => r.Id).join(",");
                return (
                  <>
                    <BulkButton variant="primary" icon={Check} onClick={() => openDialog("bulk-approve", ids)}>Approve {selected.length}</BulkButton>
                    {selected.every((r) => canReject(r, can)) && <BulkButton icon={X} onClick={() => openDialog("bulk-reject", ids)}>Reject {selected.length}…</BulkButton>}
                    <BulkButton icon={Download} onClick={() => downloadCsv("requests-selected.csv", CSV_COLUMNS, selected)}>Export CSV</BulkButton>
                  </>
                );
              }
            : undefined
        }
      />
      <RequestSheet
        reqId={reqId}
        rows={visible}
        loadedRows={rows}
        loading={loading}
        view={view}
        focusNote={focusNote}
        onNavigate={(id) => setSheet(id)}
        onClose={() => setSheet(null)}
        onClearFilters={() => {
          const next = new URLSearchParams(params);
          for (const k of ["q", "reqtype", "approvalstatus", "reponame", "foruser", "windowbegin", "windowend", "window", ...(fixed.facilityname ? [] : ["facilityname"])]) next.delete(k);
          setParams(next);
        }}
      />
      <RequestDialogs rows={rows} />
    </div>
  );
}

/* ------------------------------------ Columns ---------------------------------------- */

function buildColumns({ view, can, showFacility, approving, onApprove, onReject, onView }) {
  return [
    {
      id: "type",
      accessorFn: (r) => typeLabel(r.reqtype),
      header: sortHeader("Type"),
      cell: ({ row: { original: r } }) => <TypeCell type={r.reqtype} />,
      size: 200,
      meta: { headerClassName: "tw:w-50", cellClassName: "tw:w-50" },
    },
    {
      id: "request",
      accessorFn: (r) => describeRequest(r, view).text,
      header: "Request",
      cell: ({ row: { original: r } }) => <RequestCell req={r} view={view} />,
      enableSorting: false,
    },
    view !== "mine" && {
      accessorKey: "requestedby",
      header: sortHeader("By"),
      cell: ({ getValue }) => (getValue() ? <span className="tw:font-mono tw:text-[13px]">{getValue()}</span> : <span className="tw:text-muted-foreground">—</span>),
      size: 120,
      meta: { headerClassName: "tw:w-30", cellClassName: "tw:w-30" },
    },
    showFacility && {
      accessorKey: "facilityname",
      header: sortHeader("Facility"),
      cell: ({ getValue }) => (getValue() ? <Chip>{getValue()}</Chip> : <span className="tw:text-muted-foreground">—</span>),
      size: 120,
      meta: { headerClassName: "tw:w-30", cellClassName: "tw:w-30" },
    },
    {
      accessorKey: "timeofrequest",
      header: sortHeader("When"),
      cell: ({ getValue }) => <span className="tw:text-[13px] tw:whitespace-nowrap tw:text-muted-strong tw:tabular-nums" title={formatDate(getValue(), { time: true })}>{formatAge(getValue())}</span>,
      size: 110,
      meta: { headerClassName: "tw:w-27.5", cellClassName: "tw:w-27.5" },
    },
    {
      accessorKey: "approvalstatus",
      header: sortHeader("Status"),
      cell: ({ getValue }) => {
        const s = statusMeta(getValue());
        return <StatusPill tone={s.tone} title={s.hint}>{statusLabel(getValue(), view)}</StatusPill>;
      },
      size: 150,
      meta: { headerClassName: "tw:w-37.5", cellClassName: "tw:w-37.5" },
    },
    {
      id: "actions",
      header: () => <span className="tw:sr-only">Actions</span>,
      cell: ({ row: { original: r } }) => {
        const busy = approving.has(r.Id);
        if (view === "pending" && canApprove(r)) {
          const rejectOk = canReject(r, can);
          return (
            <div className="tw:flex tw:justify-end tw:gap-1.5">
              <button
                type="button"
                className={cn(rowButton, "tw:border-crit/30 tw:text-crit-text tw:hover:bg-crit-bg")}
                disabled={!rejectOk || busy}
                title={rejectOk ? "Reject with a note" : `Only ${r.facilityname ? `${r.facilityname} ` : ""}czars can reject`}
                onClick={() => onReject(r)}
              >
                Reject
              </button>
              <button type="button" className={rowButton} disabled={busy} onClick={() => onApprove(r)}>{busy ? "Approving…" : "Approve"}</button>
            </div>
          );
        }
        return (
          <div className="tw:flex tw:justify-end">
            <button type="button" className={rowButton} title={approveBlockedReason(r) ?? undefined} onClick={() => onView(r)}>View</button>
          </div>
        );
      },
      enableSorting: false,
      size: 190,
      meta: { headerClassName: "tw:w-47.5", cellClassName: "tw:w-47.5" },
    },
  ].filter(Boolean);
}

const rowButton = "tw:flex tw:h-8 tw:items-center tw:rounded-md tw:border tw:bg-primary-foreground tw:px-3 tw:text-[13px] tw:font-medium tw:hover:bg-muted tw:disabled:opacity-50 tw:disabled:hover:bg-primary-foreground";

function skeletonFor(view, showFacility) {
  const base = view === "pending" ? [null] : [];
  return [...base, "tw:w-32", "tw:w-48", view !== "mine" && "tw:w-16", showFacility && "tw:w-12", "tw:w-12", "tw:w-16", "tw:w-24 tw:ml-auto"].filter((x) => x !== false);
}

function TypeCell({ type }) {
  const Icon = typeMeta(type).icon;
  return (
    <div className="tw:flex tw:items-center tw:gap-2">
      <span className="tw:flex tw:size-6.5 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-sm tw:bg-muted">
        <Icon className="tw:size-3.5 tw:text-muted-strong" strokeWidth={2} />
      </span>
      <span className="tw:text-[13px] tw:font-medium tw:whitespace-nowrap">{typeLabel(type)}</span>
    </div>
  );
}

export function RequestCell({ req, view }) {
  const { parts, subtitle } = describeRequest(req, view);
  return (
    <div className="tw:flex tw:min-w-56 tw:flex-col tw:py-1.5">
      <span className="tw:text-sm tw:leading-5">
        {parts.map((p, i) => (typeof p === "string" ? <span key={i}>{p}</span> : <span key={i} className="tw:font-mono tw:text-[13px]">{p.mono}</span>))}
      </span>
      {subtitle && <span className="tw:line-clamp-1 tw:text-xs tw:leading-4 tw:text-muted-foreground">{subtitle}</span>}
    </div>
  );
}

/* ------------------------------- Toolbar parts (local) -------------------------------- */

// KIT REQUEST: a single-select facet (status, time window). FacetFilter is multi-select only.
function SingleFacet({ label, options, value, onChange, counts, always = false }) {
  const selected = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "tw:flex tw:h-8 tw:items-center tw:gap-1.5 tw:rounded-md tw:border tw:px-2.5 tw:text-[13px] tw:font-medium tw:text-foreground tw:hover:bg-background",
          always || selected ? "tw:border-solid tw:bg-background" : "tw:border-dashed",
        )}
      >
        {always ? label : selected ? <>{label}<span className="tw:h-3.5 tw:w-px tw:bg-border" /><span className="tw:flex tw:h-5 tw:items-center tw:rounded tw:bg-neutral-bg tw:px-1.5 tw:text-xs tw:font-semibold tw:text-muted-strong">{selected.label}</span></> : label}
        <ChevronDown className="tw:size-3.5 tw:text-muted-strong" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="tw:w-52">
        <DropdownMenuRadioGroup value={value ?? ""} onValueChange={onChange}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label ?? o.value}
              {counts?.[o.value] != null && <span className="tw:ml-auto tw:text-xs tw:text-muted-foreground tw:tabular-nums">{counts[o.value]}</span>}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {!always && value && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange("")}>Clear filter</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Deep-link filters without a facet (?reponame=, ?foruser=) shown as removable chips. */
function FilterChip({ label, value, onClear }) {
  return (
    <span className="tw:flex tw:h-8 tw:items-center tw:gap-1.5 tw:rounded-md tw:border tw:bg-background tw:pr-1 tw:pl-2.5 tw:text-[13px]">
      <span className="tw:text-muted-foreground">{label}</span>
      <span className="tw:font-mono">{value}</span>
      <button type="button" onClick={onClear} aria-label={`Clear ${label.toLowerCase()} filter`} className="tw:flex tw:size-6 tw:items-center tw:justify-center tw:rounded tw:hover:bg-muted">
        <X className="tw:size-3.5 tw:text-muted-strong" />
      </button>
    </span>
  );
}

function InlineEmpty({ icon: Icon, title, description, children }) {
  return (
    <div className="tw:flex tw:flex-col tw:items-center tw:gap-1.5 tw:py-8">
      {Icon && <Icon className="tw:mb-1 tw:size-7 tw:text-muted-foreground" strokeWidth={1.5} />}
      <span className="tw:text-sm tw:font-semibold tw:text-foreground">{title}</span>
      {description && <span className="tw:max-w-md tw:text-[13px] tw:text-muted-foreground">{description}</span>}
      {children && <span className="tw:mt-1 tw:text-[13px]">{children}</span>}
    </div>
  );
}

const CSV_COLUMNS = [
  { header: "id", value: (r) => r.Id },
  { header: "type", value: (r) => r.reqtype },
  { header: "request", value: (r) => describeRequest(r).text },
  { header: "requested_by", value: (r) => r.requestedby },
  { header: "facility", value: (r) => r.facilityname },
  { header: "repo", value: (r) => r.reponame },
  { header: "user", value: (r) => r.username || r.preferredUserName },
  { header: "time", value: (r) => r.timeofrequest },
  { header: "status", value: (r) => r.approvalstatus },
  { header: "ref", value: (r) => shortId(r.Id) },
];

/** Static skeleton for server render / hydration (no viewer, no queries). */
export function RequestsTableSkeleton({ view = "pending", showFacility = false, placeholder = "Filter by user, repo…" }) {
  const columns = buildColumns({ view, can: { isCzarOf: () => false }, showFacility, approving: new Set(), onApprove: () => {}, onReject: () => {}, onView: () => {} });
  return (
    <DataTable
      columns={columns}
      data={[]}
      loading
      skeleton={skeletonFor(view, showFacility)}
      enableRowSelection={view === "pending" ? () => false : undefined}
      footer={false}
      toolbar={
        <Toolbar
          start={
            <>
              <span className="tw:flex tw:h-8 tw:w-70 tw:items-center tw:gap-2 tw:rounded-md tw:border tw:bg-primary-foreground tw:px-2.5 tw:text-[13px] tw:text-muted-foreground">
                <Search className="tw:size-3.5" /> {placeholder}
              </span>
              <span className="tw:flex tw:h-8 tw:items-center tw:rounded-md tw:border tw:border-dashed tw:px-2.5 tw:text-[13px] tw:font-medium">Type</span>
            </>
          }
        />
      }
    />
  );
}
