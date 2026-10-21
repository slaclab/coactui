"use client";

import { useMemo } from "react";
import { Cpu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EmptyState, ErrorAlert } from "../../kit";
import { useDialogParam, useQueryParam } from "../../lib/navigation";
import { ClientOnly } from "../../providers/apollo";
import { useViewer } from "../../providers/viewer";
import { useRepo } from "./repo-context";
import { ClusterBlock, ClusterBlockSkeleton, computeAccess } from "./resources/cluster-block";
import { ComputeAllocationDialog } from "./resources/compute-allocation-dialog";
import { describeAllocation, largestAllocation, unallocatedClusters } from "./resources/compute-math";
import { usePendingResourceRequests, useRecentComputeUsage, useRepoCompute } from "./resources/queries";

/** /repos/[facility]/[name]/compute — one block per cluster allocation (spec §6 Compute). */
export function RepoComputeTab() {
  return (
    <ClientOnly fallback={<ComputeSkeleton />}>
      <ComputeLive />
    </ClientOnly>
  );
}

function ComputeSkeleton() {
  return (
    <div className="tw:flex tw:flex-col tw:gap-5 tw:pt-6">
      <ClusterBlockSkeleton />
      <ClusterBlockSkeleton />
    </div>
  );
}

function ComputeLive() {
  const { repo } = useRepo();
  if (!repo) return <ComputeSkeleton />;
  return <ComputeBody repo={repo} />;
}

/** The dialog's cluster: ?target= when valid, else a sensible default. */
const pick = (target, choices, fallback) => (choices.includes(target) ? target : fallback ?? choices[0] ?? null);

function ComputeBody({ repo }) {
  const { can } = useViewer();
  const access = computeAccess(repo, can);
  const compute = useRepoCompute();
  const [preempt, setPreempt] = useQueryParam("preempt", "");
  const recent = useRecentComputeUsage(preempt === "1");
  const { pending } = usePendingResourceRequests("RepoComputeAllocation");
  const [clusterParam, setClusterParam] = useQueryParam("cluster");
  const { dialog, target, openDialog, closeDialog } = useDialogParam();
  const [, setTarget] = useQueryParam("target");

  const described = useMemo(
    () => compute.allocations.map((a) => describeAllocation(a, compute.facilityObj, compute.cores[a.clustername])),
    [compute.allocations, compute.facilityObj, compute.cores],
  );
  const unallocated = useMemo(() => unallocatedClusters(compute.facilityObj, compute.allocations), [compute.facilityObj, compute.allocations]);
  const pendingBy = useMemo(() => Object.fromEntries([...pending].reverse().map((r) => [r.clustername, r])), [pending]);

  const defaultCluster = largestAllocation(described);
  const expanded = described.some((d) => d.alloc.clustername === clusterParam) ? clusterParam : defaultCluster;
  const expand = (name) => setClusterParam(name === defaultCluster ? null : name);

  const allocating = dialog === "allocate-cluster";
  const editing = dialog === "compute-allocation";
  const allocNames = compute.allocations.map((a) => a.clustername);
  // From the header "…" with no target: an existing allocation opens edit; none → allocate.
  const dialogAllocate = allocating || (editing && allocNames.length === 0);
  const dialogCluster = dialogAllocate ? pick(target, unallocated) : pick(target, allocNames, expanded);

  if (compute.error) return <ErrorAlert className="tw:mt-6" error={compute.error} onRetry={compute.refetch} what="compute allocations" />;
  if (compute.loading) return <ComputeSkeleton />;

  const footerLabel = access.edit ? "Allocate on another cluster" : "Request compute on another cluster…";

  return (
    <div className="tw:flex tw:flex-col tw:gap-5 tw:pt-6">
      {described.length > 0 && (
        <div className="tw:-mb-1 tw:flex tw:items-center tw:justify-between tw:text-xs tw:text-muted-foreground">
          <span>Past hour · 24h · 7d · 30d are live from jobs; the period total is the allocation&apos;s lifetime usage. All values in resource-h.</span>
          <div className="tw:flex tw:items-center tw:gap-2">
            <Switch id="compute-preempt" size="sm" checked={preempt === "1"} onCheckedChange={(on) => setPreempt(on ? "1" : "")} />
            <Label htmlFor="compute-preempt" className="tw:text-xs tw:font-medium tw:text-muted-strong">Include preemptable jobs</Label>
          </div>
        </div>
      )}

      {described.length === 0 ? (
        <EmptyState
          icon={Cpu}
          title="No compute allocations"
          description={
            <>
              <span className="tw:font-mono">{repo.name}</span> has no allocation on any cluster yet.
              {!access.any && " Ask the PI or a facility czar to request compute."}
            </>
          }
          actions={
            access.any && unallocated.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => openDialog("allocate-cluster")}>
                {access.edit ? "Allocate on a cluster…" : "Request compute…"}
              </Button>
            )
          }
        />
      ) : (
        described.map((d) => (
          <ClusterBlock
            key={d.alloc.Id}
            d={d}
            repo={repo}
            members={repo.users ?? []}
            expanded={d.alloc.clustername === expanded}
            onExpand={() => expand(d.alloc.clustername)}
            access={access}
            onDialog={openDialog}
            recent={recent}
            pending={pendingBy[d.alloc.clustername]}
          />
        ))
      )}

      {described.length > 0 && access.any && unallocated.length > 0 && (
        <button
          type="button"
          onClick={() => openDialog("allocate-cluster", unallocated[0])}
          className="tw:flex tw:h-13 tw:shrink-0 tw:items-center tw:justify-center tw:gap-2 tw:rounded-xl tw:border tw:border-dashed tw:border-control-border tw:hover:bg-background"
        >
          <Plus className="tw:size-3.5 tw:text-muted-strong" strokeWidth={2} />
          <span className="tw:text-[13px] tw:leading-5 tw:font-medium">{footerLabel}</span>
          <span className="tw:text-xs tw:text-muted-foreground">
            · <span className="tw:font-mono">{unallocated[0]}</span> has 0% allocated to this repo
            {unallocated.length > 1 ? ` (+${unallocated.length - 1} more)` : ""}
          </span>
        </button>
      )}

      {access.any && (
        <ComputeAllocationDialog
          open={(editing || allocating) && !!dialogCluster}
          onClose={closeDialog}
          allocate={dialogAllocate}
          cluster={dialogCluster}
          onCluster={setTarget}
          repo={repo}
          facilityObj={compute.facilityObj}
          allocations={compute.allocations}
          unallocated={unallocated}
          access={access}
        />
      )}
    </div>
  );
}
