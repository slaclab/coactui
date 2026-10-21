"use client";

import { useApolloClient } from "@apollo/client";
import { toast } from "sonner";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ActionsMenu, CopyButton, ListEditor, UserCombobox } from "../../../kit";
import { mutate, REFETCH, repoKey, runSequential, TOGGLE_GROUP_MEMBERSHIP, userInput } from "./mutations";
import { REPO_ACCESS_GROUPS, repoFilter } from "./queries";
import { gidLabel } from "./group-list";

/**
 * Group detail panel: header and the members ListEditor (staged add/remove, "Save N changes").
 * repoToggleGroupMembership is a toggle, so onApply re-reads membership (network-only) and
 * only toggles users whose current state differs from the target.
 */
export function GroupMembersEditor({ repo, group, members, names, canEdit }) {
  const client = useApolloClient();
  const current = group.members ?? [];
  const candidates = members.filter((u) => !current.includes(u));
  const renderItem = (u) => (
    <span className="tw:flex tw:items-baseline tw:gap-4">
      <span className="tw:w-32 tw:truncate tw:font-mono">{u}</span>
      <span className="tw:truncate tw:text-muted-foreground">{names[u] ?? ""}</span>
    </span>
  );

  const apply = async ({ added, removed }) => {
    const { data } = await client.query({ query: REPO_ACCESS_GROUPS, variables: { filter: repoFilter(repo) }, fetchPolicy: "network-only" });
    const fresh = new Set(data.repo.accessGroupObjs.find((g) => g.name === group.name)?.members ?? []);
    const ops = [...added.map((u) => [u, true]), ...removed.map((u) => [u, false])];
    const { results, ok } = await runSequential(
      ops,
      async ([u, want]) => {
        if (fresh.has(u) === want) return; // already in the target state
        await mutate(client, TOGGLE_GROUP_MEMBERSHIP, { repo: repoKey(repo), user: userInput(u), group: { name: group.name } });
      },
      ([u]) => u,
    );
    await client.refetchQueries({ include: REFETCH.groups });
    (ok === ops.length ? toast.success : toast.error)(`Saved ${ok} of ${ops.length} change${ops.length === 1 ? "" : "s"} to ${group.name}`);
    return results;
  };

  return (
    <section className="tw:flex tw:flex-col tw:rounded-xl tw:border tw:bg-background">
      <header className="tw:flex tw:items-start tw:justify-between tw:gap-4 tw:border-b tw:px-5 tw:py-4">
        <div className="tw:min-w-0">
          <h2 className="tw:flex tw:items-center tw:gap-1.5 tw:font-mono tw:text-base tw:font-semibold">
            <span className="tw:truncate">{group.name}</span>
            <CopyButton value={group.name} label="Copy group name" />
          </h2>
          <p className="tw:text-xs tw:text-muted-foreground tw:tabular-nums">{gidLabel(group)} · {canEdit ? "only repo members can be added" : `${current.length} member${current.length === 1 ? "" : "s"}`}</p>
        </div>
        <ActionsMenu
          label={`Actions for ${group.name}`}
          groups={[{ key: "copy", items: [{ key: "copy-name", label: "Copy name", icon: Copy, copy: group.name }, group.gidnumber != null && { key: "copy-gid", label: "Copy GID", icon: Copy, copy: String(group.gidnumber) }].filter(Boolean) }]}
        />
      </header>
      <div className="tw:px-5 tw:py-4">
        {canEdit ? (
          <ListEditor
            key={group.name}
            items={current}
            renderItem={renderItem}
            emptyLabel="No members in this group yet"
            onApply={apply}
            addControl={({ add, exclude }) => {
              const left = candidates.filter((u) => !exclude.includes(u));
              return (
                <div className="tw:flex tw:items-start tw:gap-2">
                  <div className="tw:flex-1">
                    <UserCombobox
                      value={null}
                      onChange={add}
                      options={left.map((u) => ({ username: u, fullname: names[u] ?? "" }))}
                      placeholder="Add repo members to this group…"
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" disabled={!left.length} onClick={() => left.forEach(add)}>Add all {left.length}</Button>
                </div>
              );
            }}
          />
        ) : current.length ? (
          <ul className="tw:divide-y tw:rounded-lg tw:border">
            {current.map((u) => <li key={u} className="tw:flex tw:h-11 tw:items-center tw:px-3 tw:text-sm">{renderItem(u)}</li>)}
          </ul>
        ) : (
          <p className="tw:text-[13px] tw:text-muted-foreground">No members in this group yet</p>
        )}
      </div>
    </section>
  );
}
