"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Download, Server } from "lucide-react";

import { EmptyState, LineTabs, PageHeader, Segmented, StatusPill, ToolbarButton, toolbarButtonClass } from "../../kit";
import { downloadCsv } from "../../lib/csv";
import { daysBehind, fmtLongDay } from "../../lib/dates";
import { formatInt } from "../../lib/format";
import { routes } from "../../lib/routes";
import { ClientOnly } from "../../providers/apollo";
import { useViewer } from "../../providers/viewer";
import { RANGES, STALE_DAYS, TABS } from "./constants";
import { useClusterUsage, useClusterUserUsage } from "./queries";
import { FacilityTab, facilityCsv } from "./tabs/facility-tab";
import { OverallTab, overallCsv } from "./tabs/overall-tab";
import { RepoTab, repoCsv } from "./tabs/repo-tab";
import { UserTab, userCsv } from "./tabs/user-tab";
import { capacityPerDay, usageWindow } from "./usage-model";
import { useUsageFilters, useUsageView } from "./use-usage-view";

const USERS_GATE = "Per-user usage is visible to facility czars and admins";

/** /clusterusage/[clustername] */
export function ClusterUsagePage({ clustername }) {
  // GraphQL runs in the browser only; the server renders the frame with skeletons.
  return (
    <ClientOnly fallback={<ClusterUsageFrame clustername={clustername} loading />}>
      <ClusterUsageLive clustername={clustername} />
    </ClientOnly>
  );
}

function ClusterUsageLive({ clustername }) {
  const src = useClusterUsage(clustername);
  return <ClusterUsageFrame clustername={clustername} src={src} loading={src.loading} />;
}

function ClusterUsageFrame({ clustername, src = {}, loading }) {
  const { can, loading: viewerLoading } = useViewer();
  const canSeeUsers = can.isAdmin || can.isCzar;
  // While the viewer loads, a deep link to ?tab=user stays on that tab (its body shows skeletons).
  const view = useUsageView({ canSeeUsers: canSeeUsers || viewerLoading });
  const filters = useUsageFilters();
  const { tab, rangeKey, mode, source } = view;
  const { anchor, cluster, purchases, daily, monthly } = src;

  const win = useMemo(() => usageWindow({ anchor, rangeKey, daily, monthly }), [anchor, rangeKey, daily, monthly]);
  const model = useMemo(
    () => (win && cluster && purchases ? { win, cluster, purchases, perDay: capacityPerDay(cluster) } : null),
    [win, cluster, purchases],
  );
  const users = useClusterUserUsage({
    clustername,
    anchor,
    reportRange: win?.reportRange,
    dayCount: win?.dayCount,
    source,
    skip: tab !== "user" || !canSeeUsers,
  });

  if (src.notFound) {
    return (
      <EmptyState
        icon={Server}
        title={`Cluster “${clustername}” not found`}
        description="It isn’t one of the S3DF clusters Coact knows about."
        actions={<Link href={routes.facilities()} className={toolbarButtonClass}>Back to facilities</Link>}
      />
    );
  }

  const empty = src.empty ? `No daily rollup for ${clustername} in the last 400 days.` : null;
  const exportCsv = () => {
    const csv =
      tab === "overall" ? overallCsv(model)
        : tab === "facility" ? facilityCsv(model)
          : tab === "repo" ? repoCsv(model, filters)
            : userCsv(users, cluster, can, filters);
    downloadCsv(`${clustername}-${tab}-${tab === "user" && source === "live" ? "live" : rangeKey}.csv`, csv.columns, csv.rows);
  };
  const canExport = !!model && !(tab === "user" && (users.loading || users.error));
  // A single ?facility adds it to the breadcrumb (Paper 41V-0: Facilities › LCLS › milano).
  const facilityCrumb = filters.facilities.length === 1 ? [{ label: filters.facilities[0], href: routes.facility(filters.facilities[0]) }] : [];
  const tabProps = { model, clustername, mode, onMode: view.setMode, rangeKey, loading, error: src.error, onRetry: src.refetch, empty };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Facilities", href: routes.facilities() }, ...facilityCrumb, { label: clustername, mono: true }]}
        title={clustername}
        mono
        subtitle={<ClusterSubtitle cluster={cluster} purchases={purchases} anchor={anchor} failed={!!src.error} />}
        actions={
          <>
            <Segmented label="Range" items={RANGES} value={rangeKey} onChange={view.setRange} />
            <ToolbarButton icon={Download} onClick={exportCsv} disabled={!canExport}>Export CSV</ToolbarButton>
          </>
        }
      />

      <LineTabs
        value={tab}
        onChange={view.setTab}
        items={TABS.map((t) => (t.value === "user" && !canSeeUsers && !viewerLoading ? { ...t, disabled: true, disabledReason: USERS_GATE } : t))}
      />

      {tab === "overall" && <OverallTab {...tabProps} />}
      {tab === "facility" && <FacilityTab {...tabProps} />}
      {tab === "repo" && <RepoTab {...tabProps} filters={filters} />}
      {tab === "user" && (
        <UserTab
          users={users}
          cluster={cluster}
          clustername={clustername}
          anchor={anchor}
          source={source}
          onSource={view.setSource}
          can={can}
          filters={filters}
          loading={loading || viewerLoading || !win}
          empty={src.error ? null : empty}
          span={win?.span ?? "…"}
        />
      )}
    </>
  );
}

/** "Cluster usage · 320 nodes purchased · 40,960 cores · purchased by 6 facilities · Daily rollup · through <anchor>" + stale pill. */
function ClusterSubtitle({ cluster, purchases, anchor, failed }) {
  if (!cluster && failed) return <span>Cluster usage · Daily rollup</span>;
  if (!cluster) return <span className="tw:inline-block tw:h-4 tw:w-96 tw:animate-pulse tw:rounded tw:bg-muted" />;
  const behind = daysBehind(anchor);
  const n = cluster.purchasedNodes;
  return (
    <span className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
      <span>
        Cluster usage · {formatInt(n)} nodes purchased · {formatInt(n * cluster.nodecpucount)} cores
        {cluster.nodegpucount ? ` · ${formatInt(n * cluster.nodegpucount)} GPUs` : ""}
        {purchases ? ` · purchased by ${purchases.length} ${purchases.length === 1 ? "facility" : "facilities"}` : ""} · Daily rollup
        {anchor ? ` · through ${fmtLongDay(anchor)}` : ""}
      </span>
      {anchor && behind > STALE_DAYS && (
        <StatusPill tone="warn" title={`The daily rollup has not run since ${fmtLongDay(anchor)}`}>Rollup {formatInt(behind)} days behind</StatusPill>
      )}
    </span>
  );
}
