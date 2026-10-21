"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, FolderGit2 } from "lucide-react";

import { EmptyState, ErrorAlert, Skeleton } from "../../kit";
import { routes } from "../../lib/routes";
import { ClientOnly } from "../../providers/apollo";
import { useRepos } from "../repos-list/queries";
import { ReposTable } from "../repos-list/repos-table";
import { useFacility } from "./facility-context";

/** /facilities/[name]/repos — the §6 repos table scoped to this facility (Facility column hidden). */
export function FacilityReposTab() {
  return (
    <ClientOnly fallback={<ReposFrame loading />}>
      <ReposLive />
    </ClientOnly>
  );
}

function ReposLive() {
  const { name } = useFacility();
  const repos = useRepos(true);
  const rows = useMemo(() => repos.rows.filter((r) => r.facility === name), [repos.rows, name]);
  return <ReposFrame name={name} rows={rows} loading={repos.loading} usageLoading={repos.usageLoading} error={repos.error} refetch={repos.refetch} />;
}

function ReposFrame({ name, rows = [], loading, usageLoading, error, refetch }) {
  return (
    <div className="tw:flex tw:flex-col">
      {/* Count + "Open in Repos ↗" (spec §5). Its own row until ReposTable takes a toolbarEnd slot. */}
      <div className="tw:flex tw:items-center tw:justify-end tw:gap-4 tw:text-[13px]">
        <span className="tw:text-muted-foreground tw:tabular-nums">
          {loading ? <Skeleton className="tw:inline-block tw:h-4 tw:w-14 tw:align-middle" /> : `${rows.length} repo${rows.length === 1 ? "" : "s"}`}
        </span>
        {name && (
          <Link href={routes.repos({ scope: "facilities", facility: name })} className="tw:flex tw:items-center tw:gap-0.5 tw:font-medium tw:text-foreground tw:no-underline tw:hover:underline">
            Open in Repos <ArrowUpRight className="tw:size-3.5" />
          </Link>
        )}
      </div>
      <ErrorAlert error={error} onRetry={refetch} what="repos" className="tw:mt-3" />
      {error ? null : !loading && !rows.length ? (
        <EmptyState icon={FolderGit2} title={`No repos in ${name} yet`} className="tw:mt-4" />
      ) : (
        <ReposTable rows={rows} loading={loading} usageLoading={usageLoading} hideFacility showPresets={false} />
      )}
    </div>
  );
}
