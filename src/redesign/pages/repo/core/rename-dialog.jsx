"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApolloClient, useQuery } from "@apollo/client";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "../../../kit";
import { routes } from "../../../lib/routes";
import { mutate, REPO_RENAME, repoKey } from "./mutations";
import { REPO_RENAME_NAMES } from "./queries";

/** Live validation for a new repo name; `taken` is the facility's names (lower-cased). */
function renameError(value, repo, taken) {
  const v = value.trim();
  if (!v) return "Enter a new name";
  if (!/^[\w-]+$/.test(v)) return "Use letters, digits, _ and - only";
  if (v === repo.name) return "That is the current name";
  if (taken?.has(v.toLowerCase())) return `${repo.facility} already has a repo named “${v}”`;
  return null;
}

/** Rename repo (spec §6 Rename): AlertDialog, primary confirm, no type-to-confirm. */
export function RenameRepoDialog({ repo, open, onOpenChange }) {
  const client = useApolloClient();
  const router = useRouter();
  const [value, setValue] = useState(repo.name); // form value while the dialog is open
  const [touched, setTouched] = useState(false);
  const renamedTo = useRef(null);
  // Lazy: the names list only loads while this dialog is mounted.
  const names = useQuery(REPO_RENAME_NAMES);
  const taken = names.data ? new Set(names.data.allreposandfacility.filter((r) => r.facility === repo.facility && r.name !== repo.name).map((r) => r.name.toLowerCase())) : null;
  const error = renameError(value, repo, taken);
  const showError = touched && error;

  const confirm = async () => {
    setTouched(true);
    if (error) throw new Error(error);
    if (!taken) throw new Error("Still checking existing names — try again in a moment");
    const newname = value.trim();
    await mutate(client, REPO_RENAME, { repo: repoKey(repo), newname }, ["RepoRenameNames"]);
    renamedTo.current = newname;
    toast.success(`Renamed ${repo.name} to ${newname}`);
  };
  // After a successful rename the dialog closes by moving to the new URL (which also drops
  // ?dialog=); closing via the URL param alone would reload the old, now missing, name.
  const handleOpenChange = (o) => {
    if (!o && renamedTo.current) router.replace(routes.repo(repo.facility, renamedTo.current));
    else onOpenChange(o);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={<>Rename <span className="tw:font-mono">{repo.name}</span>?</>}
      description="Rewrites the repo name on all past requests and may break paths."
      confirmLabel="Rename repo"
      onConfirm={confirm}
    >
      <div className="tw:flex tw:flex-col tw:gap-1.5">
        <Label htmlFor="rename-repo" className="tw:text-[13px] tw:font-medium">New name</Label>
        <Input
          id="rename-repo"
          autoFocus
          value={value}
          aria-invalid={!!showError || undefined}
          aria-describedby="rename-repo-help"
          onChange={(e) => { setValue(e.target.value); setTouched(true); }}
          className="tw:font-mono"
        />
        <p id="rename-repo-help" className={cn("tw:text-xs", showError ? "tw:text-crit-text" : "tw:text-muted-foreground")}>
          {showError ? error : names.loading ? "Checking existing names…" : `Unique within ${repo.facility} · letters, digits, _ and -`}
        </p>
      </div>
    </ConfirmDialog>
  );
}
