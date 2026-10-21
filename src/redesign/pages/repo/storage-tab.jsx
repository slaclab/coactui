"use client";

import { useMemo } from "react";
import { Database } from "lucide-react";
import { EmptyState, ErrorAlert } from "../../kit";
import { useDialogParam, useQueryParam } from "../../lib/navigation";
import { ClientOnly } from "../../providers/apollo";
import { useViewer } from "../../providers/viewer";
import { useRepo } from "./repo-context";
import { usePendingResourceRequests, useRepoStorage } from "./resources/queries";
import { StorageAllocationDialog } from "./resources/storage-allocation-dialog";
import { StorageBlock, StorageBlockSkeleton, storageAccess } from "./resources/storage-block";

/** /repos/[facility]/[name]/storage — one block per storage purpose (spec §6 Storage). */
export function RepoStorageTab() {
  return (
    <ClientOnly fallback={<StorageSkeleton />}>
      <StorageLive />
    </ClientOnly>
  );
}

function StorageSkeleton() {
  return (
    <div className="tw:flex tw:flex-col tw:gap-5 tw:pt-6">
      <StorageBlockSkeleton />
      <StorageBlockSkeleton />
    </div>
  );
}

function StorageLive() {
  const { repo } = useRepo();
  if (!repo) return <StorageSkeleton />;
  return <StorageBody repo={repo} />;
}

function StorageBody({ repo }) {
  const { can } = useViewer();
  const access = storageAccess(repo, can);
  const storage = useRepoStorage();
  const { pending } = usePendingResourceRequests("RepoStorageAllocation");
  const { dialog, target, openDialog, closeDialog } = useDialogParam();
  const [, setTarget] = useQueryParam("target");
  // Latest pending request per allocation (pending is newest first).
  const pendingBy = useMemo(() => Object.fromEntries([...pending].reverse().map((r) => [r.allocationid, r])), [pending]);

  if (storage.error) return <ErrorAlert className="tw:mt-6" error={storage.error} onRetry={storage.refetch} what="storage allocations" />;
  if (storage.loading) return <StorageSkeleton />;

  const allocations = storage.allocations;
  const dialogAlloc = allocations.find((a) => a.Id === target) ?? allocations[0] ?? null;

  return (
    <div className="tw:flex tw:flex-col tw:gap-5 tw:pt-6">
      {allocations.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No storage allocated"
          description={<><span className="tw:font-mono">{repo.name}</span> has no storage allocation yet. Storage is allocated by {repo.facility} czars.</>}
        />
      ) : (
        allocations.map((a) => <StorageBlock key={a.Id} a={a} repo={repo} access={access} onDialog={openDialog} pending={pendingBy[a.Id]} />)
      )}

      {access.any && (
        <StorageAllocationDialog
          open={dialog === "storage-allocation" && !!dialogAlloc}
          onClose={closeDialog}
          allocation={dialogAlloc}
          allocations={allocations}
          onTarget={setTarget}
          repo={repo}
          access={access}
        />
      )}
    </div>
  );
}
