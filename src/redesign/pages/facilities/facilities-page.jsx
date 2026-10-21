"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, LayoutGrid, List, Plus } from "lucide-react";

import { EmptyState, ErrorAlert, PageHeader, Segmented } from "../../kit";
import { useQueryList, useQueryParam, useQueryState } from "../../lib/navigation";
import { routes } from "../../lib/routes";
import { ClientOnly } from "../../providers/apollo";
import { useViewer } from "../../providers/viewer";
import { FacilitiesTable } from "./facilities-table";
import { FacilitiesToolbar } from "./facilities-toolbar";
import { FacilityCard, FacilityCardSkeleton, FacilityGrid } from "./facility-card";
import { filterAndSort } from "./filters";
import { ATTENTION, healthCounts } from "./health";
import { useFacilities } from "./queries";
import { S3dfNow } from "./s3df-now";

/** No create-facility mutation exists yet (spec F1: reserved, flagged slot). */
const FEATURE_NEW_FACILITY = false;

const VIEWS = [
  { value: "cards", label: "Cards", icon: LayoutGrid },
  { value: "table", label: "Table", icon: List },
];
const SORT_KEYS = ["name", "health", "storage", "pending"];

const linkButton =
  "tw:flex tw:h-8 tw:items-center tw:gap-1.5 tw:rounded-md tw:border tw:bg-background tw:px-3 tw:text-[13px] tw:font-medium tw:text-foreground tw:no-underline tw:hover:bg-muted";

/** /facilities (spec §4). */
export function FacilitiesPage() {
  return (
    <ClientOnly fallback={<FacilitiesFallback />}>
      <FacilitiesLive />
    </ClientOnly>
  );
}

/** Server / hydration render: header, toggle and toolbar from the URL; bodies skeleton. */
function FacilitiesFallback() {
  return <FacilitiesFrame loading filters={useFacilityFilters("cards")} />;
}

/** URL state (?view, ?q, ?health, ?sort, ?stay) — everything else is derived from it. */
function useFacilityFilters(defaultView) {
  const [view, setView] = useQueryParam("view", defaultView);
  const [q, setQ] = useQueryParam("q", "");
  const [health, setHealth] = useQueryList("health");
  const [rawSort, setSort] = useQueryParam("sort", "name");
  const sort = SORT_KEYS.includes(rawSort) ? rawSort : "name";
  const [params, setParams] = useQueryState();
  const active = !!q || health.length > 0;
  return {
    view: view === "table" || view === "cards" ? view : defaultView,
    setView,
    q,
    setQ,
    health,
    setHealth,
    sort,
    setSort,
    active,
    // One URL write: two setters in a row would each start from the same snapshot.
    reset: () => {
      const next = new URLSearchParams(params);
      next.delete("q");
      next.delete("health");
      setParams(next);
    },
  };
}

function FacilitiesLive() {
  const router = useRouter();
  const { viewer, can, loading: viewerLoading, error: viewerError } = useViewer();
  const [stay] = useQueryParam("stay", "");
  // Single-facility czar → that facility's page. Navigation, not state sync. Until the shell
  // marks nav-link entries, any entry redirects; ?stay=1 opts out.
  const redirectTo = viewer && !can.isAdmin && viewer.czarOf.length === 1 && !stay ? routes.facility(viewer.czarOf[0]) : null;
  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  const data = useFacilities();
  const filters = useFacilityFilters(can.isAdmin ? "table" : "cards");

  if (viewerLoading || redirectTo) return <FacilitiesFrame loading filters={filters} />;
  if (!viewer) return <FacilitiesFrame loading filters={filters} error={viewerError} />;
  if (!data.allowed) return <NoAccess title="You don't manage any facilities" description="Facilities are visible to facility czars and Coact admins." />;
  return <FacilitiesFrame data={data} filters={filters} />;
}

function NoAccess({ title, description }) {
  return (
    <>
      <PageHeader title="Facilities" />
      <EmptyState
        icon={Building2}
        title={title}
        description={description}
        actions={<Link href={routes.repos()} className={linkButton}>View my repos</Link>}
      />
    </>
  );
}

function subtitleFor(data, rows) {
  if (!data || data.loading) return "Loading…";
  const n = rows.length;
  const parts = [`${n} ${n === 1 ? "facility shares" : "facilities share"} S3DF.`];
  const known = rows.every((r) => r.health);
  const counts = healthCounts(rows);
  const k = ATTENTION.reduce((s, key) => s + counts[key], 0);
  const p = data.pending.loading || data.pending.error ? 0 : rows.reduce((s, r) => s + (r.pending ?? 0), 0);
  const clauses = [];
  if (known && n) clauses.push(`${k} ${k === 1 ? "needs" : "need"} attention`);
  if (p > 0) clauses.push(`${p} ${p === 1 ? "request is" : "requests are"} waiting`);
  if (clauses.length) parts.push(`${clauses.join(", ")}.`.replace(/^./, (c) => c.toUpperCase()));
  return parts.join(" ");
}

function FacilitiesFrame({ data, filters, loading: frameLoading = false, error }) {
  const rows = data?.rows ?? [];
  const loading = frameLoading || !data || data.loading;
  const view = filters?.view ?? "cards";
  const shownRows = useMemo(
    () => (filters ? filterAndSort(rows, filters) : rows),
    // filters is rebuilt each render; depend on its values
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, filters?.q, filters?.health, filters?.sort],
  );
  const counts = useMemo(() => healthCounts(rows), [rows]);
  const usage = data?.usage ?? { loading: true, source: null };
  const pendingLoading = !data || data.pending.loading;
  const noData = !loading && !data?.error && rows.length === 0;

  const toolbar = filters ? (table) => <FacilitiesToolbar filters={filters} counts={loading ? null : counts} shown={loading ? null : shownRows.length} table={table} /> : null;
  const noMatch = filters && (
    <>
      No facilities match{filters.q ? ` “${filters.q}”` : " these filters"}.{" "}
      <button type="button" onClick={filters.reset} className="tw:font-medium tw:text-foreground tw:underline">Clear filters</button>
    </>
  );

  return (
    <div className="tw:flex tw:flex-col tw:gap-6">
      <PageHeader
        title="Facilities"
        subtitle={subtitleFor(data, rows)}
        actions={
          <>
            <Segmented label="Layout" items={VIEWS} value={view} onChange={(v) => filters?.setView(v)} />
            {FEATURE_NEW_FACILITY && (
              <button type="button" className="tw:flex tw:h-8 tw:items-center tw:gap-1.5 tw:rounded-md tw:bg-primary tw:px-3 tw:text-[13px] tw:font-semibold tw:text-primary-foreground tw:hover:bg-primary-hover">
                <Plus className="tw:size-3.5" /> New facility
              </button>
            )}
          </>
        }
      />

      <ErrorAlert error={error} what="your profile" />

      {noData && !data?.error ? null : <S3dfNow now={data?.now} loading={loading} />}

      {noData && !data?.error ? (
        <EmptyState icon={Building2} title="No facilities assigned" description="Ask an admin to add you as a czar." actions={<Link href={routes.repos()} className={linkButton}>View my repos</Link>} />
      ) : (
        <div className="tw:flex tw:flex-col tw:gap-3">
          <ErrorAlert error={data?.usage.error} onRetry={data?.usage.refetch} what="live usage" />
          <ErrorAlert error={data?.usage.fallbackError} onRetry={data?.usage.fallbackRefetch} what="the daily usage rollup" />
          <ErrorAlert error={data?.pending.error} onRetry={data?.pending.refetch} what="pending requests" />
          {data?.error ? (
            <>
              {toolbar?.(null)}
              <ErrorAlert error={data.error} onRetry={data.refetch} what="facilities" />
            </>
          ) : view === "table" ? (
            <FacilitiesTable rows={shownRows} loading={loading} usage={usage} pendingLoading={pendingLoading} sort={filters?.sort ?? "name"} toolbar={toolbar} empty={noMatch} />
          ) : (
            <div className="tw:flex tw:flex-col">
              {toolbar?.(null)}
              {loading ? (
                <FacilityGrid>
                  {Array.from({ length: 6 }, (_, i) => <FacilityCardSkeleton key={i} />)}
                </FacilityGrid>
              ) : shownRows.length ? (
                <FacilityGrid>
                  {shownRows.map((f) => <FacilityCard key={f.name} facility={f} usage={usage} pendingLoading={pendingLoading} />)}
                </FacilityGrid>
              ) : (
                <div className="tw:flex tw:h-24 tw:items-center tw:justify-center tw:rounded-xl tw:border tw:border-dashed tw:bg-background tw:text-[13px] tw:text-muted-foreground">
                  <span>{noMatch}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
