"use client";

import Link from "next/link";
import { ChevronDown, Cpu, Database, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ActionsMenu } from "../../../kit";
import { repoActions } from "../../../actions/repo-actions";
import { useDialogParam } from "../../../lib/navigation";
import { routes } from "../../../lib/routes";
import { useViewer } from "../../../providers/viewer";
import { useRepo } from "../repo-context";

/**
 * Repo header actions (spec §6 Header actions): "Request change ⌄" (PI/leader) or
 * "Edit allocation ⌄" (czar/admin), primary "Add members", and the page "…".
 * Plain members get only the "…" (Open / Copy / Go to).
 */
export function RepoHeaderActions() {
  const { repo, canEdit, canEditAlloc } = useRepo();
  const { can } = useViewer();
  const { openDialog } = useDialogParam();
  if (!repo) return null;
  const tabDialog = (tab, dialog) => `${routes.repo(repo.facility, repo.name, tab)}?dialog=${dialog}`;
  return (
    <>
      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {canEditAlloc ? "Edit allocation" : "Request change"}
              <ChevronDown className="tw:text-muted-strong" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="tw:w-48">
            <DropdownMenuItem asChild className="tw:h-8 tw:gap-2">
              <Link href={tabDialog("compute", "compute-allocation")}><Cpu className="tw:size-4 tw:text-muted-strong" />Compute…</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="tw:h-8 tw:gap-2">
              <Link href={tabDialog("storage", "storage-allocation")}><Database className="tw:size-4 tw:text-muted-strong" />Storage…</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {canEdit && (
        <Button size="sm" onClick={() => openDialog("add-members")}>
          <UserPlus />
          Add members
        </Button>
      )}
      <ActionsMenu
        groups={repoActions(repo, can, { context: "page" })}
        onDialog={(d) => openDialog(d)}
        label={`Actions for ${repo.name}`}
        className="tw:border tw:bg-primary-foreground"
      />
    </>
  );
}
