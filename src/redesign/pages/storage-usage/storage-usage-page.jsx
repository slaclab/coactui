"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Database, Download } from "lucide-react";

import { EmptyState, ErrorAlert, PageHeader, ToolbarButton, toolbarButtonClass } from "../../kit";
import { downloadCsv } from "../../lib/csv";
import { formatStorage } from "../../lib/format";
import { routes } from "../../lib/routes";
import { ClientOnly } from "../../providers/apollo";
import { useUsageFilters } from "../cluster-usage/use-usage-view";
import { FacilityMeters } from "./facility-meters";
import { PurposeSwitch } from "./purpose-switch";
import { useStoragePurchases, useStorageRepos } from "./queries";
import { facilityMeterRows, knownStorage, purchaseTotals, purposesFor, repoRows } from "./storage-model";
import { filterStorageRows, STORAGE_CSV, StorageReposTable } from "./storage-repos-table";

/** /storageusage/[storagename] and /storageusage/[storagename]/purpose/[purpose] */
export function StorageUsagePage({ storagename, purpose = null }) {
  return (
    <ClientOnly fallback={<StorageUsageFrame storagename={storagename} purpose={purpose} />}>
      <StorageUsageLive storagename={storagename} purpose={purpose} />
    </ClientOnly>
  );
}

function StorageUsageLive({ storagename, purpose }) {
  const purchases = useStoragePurchases();
  const repos = useStorageRepos();
  return <StorageUsageFrame storagename={storagename} purpose={purpose} purchases={purchases} repos={repos} />;
}

const LOADING = { loading: true, facilities: [], storagenames: [], repos: [] };

function StorageUsageFrame({ storagename, purpose, purchases = LOADING, repos = LOADING }) {
  const filters = useUsageFilters();
  const { facilities, storagenames } = purchases;

  const meters = useMemo(() => facilityMeterRows(facilities, storagename, purpose), [facilities, storagename, purpose]);
  const rows = useMemo(() => repoRows(repos.repos, storagename, purpose), [repos.repos, storagename, purpose]);
  const purposes = useMemo(() => purposesFor(storagename, facilities, repos.repos), [storagename, facilities, repos.repos]);
  // Decide "unknown" only once both sources are in (an allocation can name a storage no purchase does).
  const settled = !purchases.loading && !purchases.error && !repos.loading;
  const known = settled && knownStorage(storagenames, facilities, repos.repos).has(storagename);
  const totals = purchaseTotals(meters);

  if (settled && !known) {
    return (
      <EmptyState
        icon={Database}
        title={`Storage “${storagename}” not found`}
        description="No storage purchase or allocation references this name."
        actions={<Link href={routes.facilities()} className={toolbarButtonClass}>Back to facilities</Link>}
      />
    );
  }
  if (settled && purpose && !purposes.includes(purpose)) {
    return (
      <EmptyState
        icon={Database}
        title={`${storagename} has no “${purpose}” purpose`}
        description={purposes.length ? `Purposes on ${storagename}: ${purposes.join(", ")}.` : undefined}
        actions={<Link href={routes.storage(storagename)} className={toolbarButtonClass}>All purposes</Link>}
      />
    );
  }

  // A single ?facility adds it to the breadcrumb (Paper: Facilities › LCLS › sdfdata).
  const facilityCrumb = filters.facilities.length === 1 ? [{ label: filters.facilities[0], href: routes.facility(filters.facilities[0]) }] : [];
  const exportCsv = () => downloadCsv(`${storagename}${purpose ? `-${purpose}` : ""}-allocations.csv`, STORAGE_CSV, filterStorageRows(rows, filters));

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Facilities", href: routes.facilities() }, ...facilityCrumb, { label: storagename, mono: true }]}
        title={storagename}
        mono
        subtitle={
          purchases.loading ? (
            <span className="tw:inline-block tw:h-4 tw:w-80 tw:animate-pulse tw:rounded tw:bg-muted" />
          ) : purchases.error ? (
            <>Storage usage{purpose ? ` · ${purpose}` : ""} · Daily rollup</>
          ) : (
            <>
              Storage usage{purpose ? ` · ${purpose}` : ""} · {formatStorage(totals.purchased)} purchased by {totals.facilities}{" "}
              {totals.facilities === 1 ? "facility" : "facilities"} · Daily rollup
            </>
          )
        }
        actions={
          <>
            <PurposeSwitch storagename={storagename} purpose={purpose} purposes={purposes} />
            <ToolbarButton icon={Download} onClick={exportCsv} disabled={repos.loading || !!repos.error || rows.length === 0}>Export CSV</ToolbarButton>
          </>
        }
      />

      <FacilityMeters rows={meters} loading={purchases.loading} error={purchases.error} onRetry={purchases.refetch} storagename={storagename} purpose={purpose} />

      {repos.error ? (
        <ErrorAlert error={repos.error} onRetry={repos.refetch} what="allocations" />
      ) : (
        <StorageReposTable rows={rows} loading={repos.loading} filters={filters} storagename={storagename} purpose={purpose} showAll={repos.showAll ?? true} />
      )}
    </>
  );
}
