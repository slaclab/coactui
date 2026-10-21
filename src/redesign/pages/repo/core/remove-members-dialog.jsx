"use client";

import { useApolloClient } from "@apollo/client";
import { toast } from "sonner";

import { Chip, ConfirmDialog } from "../../../kit";
import { mutate, REFETCH, REPO_REMOVE_USER, repoKey, runSequential, userInput } from "./mutations";
import { useRepoMembers } from "./queries";

/**
 * Remove one or more members (spec §6 Members › Remove copy). Calls run one at a time; a
 * failure never rolls back the others. The PI is never removed (the API refuses it too).
 */
export function RemoveMembersDialog({ repo, open, onOpenChange, usernames }) {
  const client = useApolloClient();
  const { rows } = useRepoMembers(repo);
  const targets = usernames.filter((u) => u !== repo.principal && repo.users.includes(u));
  const groupCount = new Set(rows.filter((r) => targets.includes(r.username)).flatMap((r) => r.groups)).size;
  if (!targets.length) return null;

  const single = targets.length === 1;
  const isDefault = repo.name === "default";
  const title = single ? (isDefault ? `Remove ${targets[0]} from default?` : `Remove ${targets[0]} from ${repo.name}?`) : `Remove ${targets.length} members from ${repo.name}?`;
  const body = isDefault
    ? `${single ? `Removing ${targets[0]}` : `Removing these ${targets.length} members`} from default revokes their access to ${repo.facility}.`
    : `They lose access to repo storage and the LDAP group${repo.group ? ` ${repo.group}` : ""}${groupCount ? `, and are removed from ${groupCount} access group${groupCount === 1 ? "" : "s"}` : ""}.`;

  const confirm = async () => {
    const { results, ok } = await runSequential(targets, (u) => mutate(client, REPO_REMOVE_USER, { repo: repoKey(repo), user: userInput(u) }));
    await client.refetchQueries({ include: [...REFETCH.members, "RepoAccessGroups"] });
    const failed = Object.entries(results).filter(([, r]) => r !== true);
    if (!failed.length) {
      toast.success(single ? `Removed ${targets[0]} from ${repo.name}` : `Removed ${ok} of ${targets.length} from ${repo.name}`);
      return;
    }
    const message = failed.map(([u, m]) => `${u}: ${m}`).join("\n");
    toast.error(`Removed ${ok} of ${targets.length} from ${repo.name}`, { description: message });
    throw new Error(ok ? `Removed ${ok} of ${targets.length}. Not removed — ${message}` : message);
  };

  return (
    <ConfirmDialog open={open} onOpenChange={onOpenChange} title={title} destructive confirmLabel={single ? "Remove member" : `Remove ${targets.length} members`} onConfirm={confirm}>
      <div className="tw:flex tw:flex-col tw:gap-3">
        <div className="tw:flex tw:max-h-28 tw:flex-wrap tw:gap-1.5 tw:overflow-y-auto">
          {targets.map((u) => <Chip key={u} mono>{u}</Chip>)}
        </div>
        <p className="tw:text-sm tw:text-muted-foreground">{body}</p>
      </div>
    </ConfirmDialog>
  );
}
