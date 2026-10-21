"use client";

import { Copy, FileText, HardDrive, Pencil, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ActionsMenu, CopyButton, Skeleton } from "../../../kit";
import { formatPct, formatStorage, formatStoragePair } from "../../../lib/format";
import { routes } from "../../../lib/routes";
import { formatCount } from "./compute-math";
import { PendingRequestBanner } from "./pending-request";
import { UsageMeter } from "./usage-meter";

/** Same gates as compute: czar/admin edit (request + approve), PI/leader request only. */
export function storageAccess(repo, can) {
  const edit = can.canEditAllocation(repo);
  const request = !edit && can.canEditMembers(repo);
  return { edit, request, any: edit || request, label: edit ? "Edit allocation…" : "Request change…" };
}

/** Space and inode figures for one storage allocation. */
export function describeStorage(a) {
  const usedGb = a.usage?.gigabytes ?? 0;
  const spacePct = a.gigabytes ? (usedGb / a.gigabytes) * 100 : null;
  const usedInodes = a.usage?.inodes ?? 0;
  const inodePct = a.inodes ? (usedInodes / a.inodes) * 100 : null;
  return {
    alloc: a,
    usedGb,
    spacePct,
    usedInodes,
    inodePct,
    spaceText: a.gigabytes ? `${formatStoragePair(usedGb, a.gigabytes)} · ${formatPct(spacePct)}` : "—",
    inodeText: a.inodes ? `${formatCount(usedInodes)} / ${formatCount(a.inodes)} · ${formatPct(inodePct)}` : "—",
  };
}

const copyPath = (path) => navigator.clipboard?.writeText(path).then(() => toast.success("Copied", { description: path }));

export function storageBlockActions(a, repo, access) {
  return [
    access.any && { key: "change", items: [{ key: "change", label: access.label, icon: access.edit ? Pencil : Send, dialog: "storage-allocation" }] },
    {
      key: "open",
      items: [
        { key: "detail", label: "Open allocation detail", icon: FileText, href: routes.storageAllocation(repo.facility, repo.name, a.Id) },
        { key: "usage", label: "View storage usage", icon: HardDrive, href: routes.storage(a.storagename, a.purpose) },
      ],
    },
    // Not `copy:` — ActionsMenu turns "/…" values into in-app URLs; a root folder is a filesystem path.
    a.rootfolder && { key: "copy", items: [{ key: "copy-path", label: "Copy path", icon: Copy, onSelect: () => copyPath(a.rootfolder) }] },
  ].filter(Boolean);
}

function InodeMeter({ s }) {
  if (!s.alloc.inodes)
    return (
      <div className="tw:flex tw:flex-col tw:gap-1.5" title="No inode quota recorded">
        <div className="tw:flex tw:justify-between tw:text-[13px] tw:leading-4.5 tw:font-medium">
          <span>Files (inodes)</span>
          <span className="tw:text-muted-foreground">—</span>
        </div>
        <div className="tw:h-2 tw:w-full tw:rounded-full tw:bg-muted tw:shadow-[inset_0_0_0_1px_var(--border)]" />
      </div>
    );
  return <UsageMeter type="storage" label="Files (inodes)" value={s.inodeText} pct={s.inodePct} ariaLabel={`Files used ${formatPct(s.inodePct)} of inode quota`} />;
}

/** One storage purpose (Paper "Repo — Storage"): header, path + copy, space and inode meters. */
export function StorageBlock({ a, repo, access, onDialog, pending }) {
  const s = describeStorage(a);
  const open = () => onDialog("storage-allocation", a.Id);
  const change = pending?.gigabytes != null && `${formatStorage(a.gigabytes)} → ${formatStorage(pending.gigabytes)}`;
  return (
    <section aria-label={`${a.purpose} on ${a.storagename}`} className="tw:flex tw:flex-col tw:gap-4 tw:rounded-xl tw:border tw:bg-background tw:pt-4.5 tw:pr-4 tw:pb-5 tw:pl-5">
      <div className="tw:flex tw:items-start tw:justify-between">
        <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1">
          <div className="tw:flex tw:items-baseline tw:gap-2">
            <h2 className="tw:text-[17px] tw:leading-6 tw:font-semibold">{a.purpose}</h2>
            <span className="tw:font-mono tw:text-[13px] tw:text-muted-foreground">on {a.storagename}</span>
          </div>
          {a.rootfolder ? (
            <div className="tw:flex tw:items-center tw:gap-1">
              <span className="tw:truncate tw:font-mono tw:text-[13px] tw:text-muted-strong">{a.rootfolder}</span>
              <CopyButton value={a.rootfolder} label="Copy path" />
            </div>
          ) : (
            <span className="tw:text-[13px] tw:text-muted-foreground">No root folder recorded</span>
          )}
        </div>
        <div className="tw:flex tw:items-center tw:gap-2">
          {access.any && <Button variant="outline" size="sm" onClick={open}>{access.label.replace("…", "")}</Button>}
          <ActionsMenu groups={storageBlockActions(a, repo, access)} onDialog={open} label={`Actions for ${a.purpose}`} />
        </div>
      </div>
      <div className="tw:grid tw:grid-cols-2 tw:gap-8 tw:pr-1">
        <UsageMeter type="storage" label="Space" value={s.spaceText} pct={s.spacePct} ariaLabel={`${a.purpose} storage used ${formatPct(s.spacePct)} of allocation`} />
        <InodeMeter s={s} />
      </div>
      {pending && <PendingRequestBanner request={pending} change={change} canReview={access.edit} facility={repo.facility} repoName={repo.name} />}
    </section>
  );
}

export function StorageBlockSkeleton() {
  return (
    <div className="tw:flex tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:bg-background tw:px-5 tw:py-4.5" aria-hidden>
      <Skeleton className="tw:h-4 tw:w-40" />
      <Skeleton className="tw:h-4 tw:w-64" />
      <div className="tw:mt-2 tw:grid tw:grid-cols-2 tw:gap-8">
        <Skeleton className="tw:h-1.5 tw:w-full" />
        <Skeleton className="tw:h-1.5 tw:w-full" />
      </div>
    </div>
  );
}
