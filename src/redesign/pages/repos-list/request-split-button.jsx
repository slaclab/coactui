"use client";

import { ChevronDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDialogParam } from "../../lib/navigation";
import { useViewer } from "../../providers/viewer";
import { REQUEST_DIALOGS } from "./request-dialogs";

/**
 * R1 split button. The main face is the viewer's most likely request: "Request repo
 * membership" for plain members, "Request new repo" for czars and admins. Allocation items
 * appear only when the viewer is PI, leader or czar of at least one listed repo.
 */
export function RequestSplitButton({ rows = [] }) {
  const { can, viewer } = useViewer();
  const { openDialog } = useDialogParam();
  const manager = can.isAdmin || can.isCzar;
  const main = manager ? { key: REQUEST_DIALOGS.newRepo, label: "Request new repo" } : { key: REQUEST_DIALOGS.membership, label: "Request repo membership" };
  const canAllocate = rows.some((r) => can.canEditMembers(r));
  return (
    <div className="tw:flex tw:h-8 tw:items-center tw:rounded-md tw:bg-primary tw:text-primary-foreground">
      <button
        type="button"
        disabled={!viewer}
        onClick={() => openDialog(main.key)}
        className="tw:flex tw:h-8 tw:items-center tw:gap-1.5 tw:rounded-l-md tw:px-3 tw:text-[13px] tw:font-medium tw:hover:bg-primary-hover tw:disabled:opacity-60"
      >
        <Plus className="tw:size-3.5" strokeWidth={2.2} /> {main.label}
      </button>
      <span className="tw:h-4.5 tw:w-px tw:bg-primary-foreground/35" aria-hidden />
      <DropdownMenu>
        <DropdownMenuTrigger disabled={!viewer} className="tw:flex tw:size-8 tw:items-center tw:justify-center tw:rounded-r-md tw:hover:bg-primary-hover" aria-label="More requests">
          <ChevronDown className="tw:size-3.5" strokeWidth={2.2} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="tw:w-60">
          <DropdownMenuItem onSelect={() => openDialog(REQUEST_DIALOGS.membership)}>Request repo membership…</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openDialog(REQUEST_DIALOGS.newRepo)}>Request new repo…</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openDialog(REQUEST_DIALOGS.facilityAccess)}>Request facility access…</DropdownMenuItem>
          {canAllocate && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => openDialog(REQUEST_DIALOGS.compute)}>Request compute allocation…</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openDialog(REQUEST_DIALOGS.storage)}>Request storage allocation…</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
