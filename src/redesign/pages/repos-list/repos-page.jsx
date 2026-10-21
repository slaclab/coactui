"use client";

import { FolderGit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientOnly } from "../../providers/apollo";
import { useViewer } from "../../providers/viewer";
import { EmptyState, ErrorAlert, LineTabs, PageHeader } from "../../kit";
import { fmtLongDay } from "../../lib/dates";
import { useDialogParam, useQueryParam } from "../../lib/navigation";
import { RequestSplitButton } from "./request-split-button";
import { REQUEST_DIALOGS, ReposDialogs } from "./request-dialogs";
import { ReposTable } from "./repos-table";
import { ComputeTable } from "./compute-table";
import { StorageTable } from "./storage-table";
import { RepoPeekSheet } from "./peek-sheet";
import { useRepoFilters } from "./repo-filters";
import { useView } from "./repos-toolbar";
import { useRepos, useRequestOptions } from "./queries";

// Scope tabs (spec R2): czars get My repos · My facilities, admins My repos · All, members none.
function scopesFor(can) {
  if (can.isAdmin) return [{ value: "mine", label: "My repos" }, { value: "all", label: "All" }];
  if (can.isCzar) return [{ value: "mine", label: "My repos" }, { value: "facilities", label: "My facilities" }];
  return [];
}

// The legacy `showallrepos` key is the fallback default; the URL wins.
const STORED = "showallrepos";
function storedShowAll() {
  try {
    return window.localStorage.getItem(STORED);
  } catch {
    return null;
  }
}

/** /repos/info */
export function ReposPage() {
  return (
    <ClientOnly fallback={<ReposFrame loading />}>
      <ReposLive />
    </ClientOnly>
  );
}

function ReposLive() {
  const { viewer, can, error: viewerError } = useViewer();
  const scopes = scopesFor(can);
  const [requested, setScope] = useQueryParam("scope", "");
  const stored = storedShowAll();
  const fallback = stored === "false" ? "mine" : (scopes.at(-1)?.value ?? "mine");
  // Derived: the requested scope if the viewer has it, else the stored/role default.
  const scope = scopes.some((s) => s.value === requested) ? requested : scopes.length ? fallback : "mine";
  const onScope = (s) => {
    try {
      window.localStorage.setItem(STORED, String(s !== "mine"));
    } catch {
      /* storage unavailable: the URL still carries the scope */
    }
    setScope(s);
  };
  const showAll = scope !== "mine";
  const repos = useRepos(showAll);
  const [view] = useView();
  const filters = useRepoFilters(repos.rows);
  const empty = !!viewer && scope === "mine" && !repos.loading && !repos.error && repos.rows.length === 0 && !filters.active;

  return (
    <ReposFrame viewer={viewer} scopes={scopes} scope={scope} onScope={onScope} repos={repos} error={viewerError ?? repos.error}>
      {empty ? (
        <MemberEmptyState />
      ) : view === "compute" ? (
        <ComputeTable showAll={showAll} repoRows={repos.rows} />
      ) : view === "storage" ? (
        <StorageTable showAll={showAll} repoRows={repos.rows} />
      ) : (
        <>
          <ErrorAlert error={repos.usageError} onRetry={repos.refetchUsage} what="compute usage" />
          <ReposTable rows={repos.rows} loading={repos.loading} usageLoading={repos.usageLoading} peek={false} />
        </>
      )}
      <RepoPeekSheet rows={repos.rows} order={filters.filtered} loading={repos.loading} usageLoading={repos.usageLoading} used={repos.used} cores={repos.cores} />
      <ReposDialogs rows={repos.rows} />
    </ReposFrame>
  );
}

function ReposFrame({ viewer, scopes = [], scope, onScope, repos, error, loading = !repos || repos.loading, children }) {
  const subtitle = !viewer
    ? "Loading…"
    : scope === "all"
      ? "All repos"
      : scope === "facilities"
        ? `Repos in ${viewer.czarOf.join(" and ")} — the facilities you manage`
        : "Repos you belong to";
  return (
    <>
      <PageHeader
        title="Repos"
        subtitle={<>{subtitle}{repos?.anchor && <> · Compute · 7d is the daily rollup through {fmtLongDay(repos.anchor)}</>}</>}
        actions={<RequestSplitButton rows={repos?.rows ?? []} />}
      />
      {scopes.length > 0 && <LineTabs className="tw:-mt-1" value={scope} onChange={onScope} items={scopes} />}
      <ErrorAlert error={error} onRetry={repos?.refetch} what="repos" />
      {children ?? <ReposTable rows={[]} loading={loading} peek={false} />}
    </>
  );
}

/** Spec §9: member with 0 repos. No facility access → the primary asks for that first. */
function MemberEmptyState() {
  const { openDialog } = useDialogParam();
  const opts = useRequestOptions(true);
  const noFacility = !opts.loading && opts.myFacilities.length === 0;
  return (
    <EmptyState
      icon={FolderGit2}
      title="You're not in any repos yet"
      description="Ask a PI to add you, or request membership."
      actions={
        <>
          <Button size="sm" disabled={opts.loading} onClick={() => openDialog(noFacility ? REQUEST_DIALOGS.facilityAccess : REQUEST_DIALOGS.membership)}>
            {noFacility ? "Request facility access" : "Request repo membership"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => openDialog(REQUEST_DIALOGS.newRepo)}>Request new repo</Button>
        </>
      }
    />
  );
}
