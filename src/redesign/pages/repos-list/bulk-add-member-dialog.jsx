"use client";

import { useMemo } from "react";
import { useApolloClient, useMutation } from "@apollo/client";
import { toast } from "sonner";

import { FormDialog, UserCombobox } from "../../kit";
import { canSelectRepo } from "../../actions/repo-actions";
import { useDialogParam } from "../../lib/navigation";
import { useViewer } from "../../providers/viewer";
import { ADD_USER } from "./queries";

/**
 * Bulk "Add member…" (spec R6): ?dialog=bulk-add-member&target=F/n,F/n. There is no batch
 * mutation, so this calls repoAddUser once per repo, in sequence, with a progress toast,
 * skipping repos the user is already in. Targets are intersected with rows the viewer may select.
 */
export function BulkAddMemberDialog({ rows, onDone }) {
  const { can } = useViewer();
  const { target, closeDialog } = useDialogParam();
  const client = useApolloClient();
  const [addUser] = useMutation(ADD_USER);
  const targets = useMemo(() => {
    const ids = new Set((target ?? "").split(",").filter(Boolean));
    return rows.filter((r) => ids.has(r.id) && canSelectRepo(r, can));
  }, [target, rows, can]);

  const pending = (username) => targets.filter((r) => !username || !r.users.includes(username));

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && closeDialog()}
      title={`Add a member to ${targets.length} repo${targets.length === 1 ? "" : "s"}`}
      description="The user is added to each repo directly, as a member."
      submitLabel="Add member"
      fields={[
        {
          name: "username",
          label: "User",
          type: "custom",
          required: true,
          render: ({ value, onChange, disabled }) => <UserCombobox value={value || null} onChange={onChange} disabled={disabled} />,
          validate: (v) => (!targets.length ? "None of the selected repos can take new members here" : !pending(v).length ? `${v} is already in every selected repo` : undefined),
        },
      ]}
      preview={(values) => (
        <ul className="tw:max-h-52 tw:divide-y tw:overflow-y-auto tw:rounded-lg tw:border">
          {targets.map((r) => {
            const already = values.username && r.users.includes(values.username);
            return (
              <li key={r.id} className="tw:flex tw:h-9 tw:items-center tw:justify-between tw:gap-3 tw:px-3 tw:text-[13px]">
                <span className="tw:truncate tw:font-mono">{r.name}</span>
                <span className="tw:shrink-0 tw:text-xs tw:text-muted-foreground">{already ? "Already a member — skipped" : r.facility}</span>
              </li>
            );
          })}
          {!targets.length && <li className="tw:px-3 tw:py-3 tw:text-[13px] tw:text-muted-foreground">No selectable repos in this selection.</li>}
        </ul>
      )}
      onSubmit={async ({ username }) => {
        const todo = pending(username);
        const id = toast.loading(`Adding ${username} to ${todo.length} repos… 0/${todo.length}`);
        const failed = [];
        for (const [i, r] of todo.entries()) {
          try {
            await addUser({ variables: { repo: { name: r.name, facility: r.facility }, user: { username } } });
          } catch (err) {
            failed.push(`${r.name} (${err.message})`);
          }
          toast.loading(`Adding ${username} to ${todo.length} repos… ${i + 1}/${todo.length}`, { id });
        }
        await client.refetchQueries({ include: ["RedesignRepos"] });
        const ok = todo.length - failed.length;
        if (ok) onDone?.();
        if (!failed.length) toast.success(`Added ${username} to ${ok} repo${ok === 1 ? "" : "s"}`, { id });
        else if (ok) toast.warning(`Added ${username} to ${ok} of ${todo.length} repos — failed: ${failed.join(", ")}`, { id });
        else {
          toast.error(`Couldn’t add ${username}`, { id, description: failed.join(", ") });
          throw new Error(`Failed: ${failed.join(", ")}`);
        }
      }}
    />
  );
}
