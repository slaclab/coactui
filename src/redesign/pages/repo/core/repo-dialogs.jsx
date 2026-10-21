"use client";

import { useApolloClient } from "@apollo/client";
import { toast } from "sonner";

import { FormDialog, RequestDialog, UserCombobox } from "../../../kit";
import { useDialogParam } from "../../../lib/navigation";
import { routes } from "../../../lib/routes";
import { useRepo } from "../repo-context";
import { COMPUTE_REQUIREMENTS, mutate, REFETCH, REPO_CHANGE_PRINCIPAL, REPO_UPDATE, repoKey, requirementLabel, setComputeRequirement, userInput } from "./mutations";
import { RenameRepoDialog } from "./rename-dialog";
import { AddMembersSheet } from "./add-members-sheet";
import { RemoveMembersDialog } from "./remove-members-dialog";

/**
 * Repo-level dialogs keyed on ?dialog= (opened from the header, the page "…", the Details
 * card and member rows). Unknown keys — or keys the viewer may not use — render nothing, so
 * tab-owned dialogs (compute-allocation, storage-allocation, allocate-cluster, features…)
 * are left to their tabs.
 */
export function RepoDialogs() {
  const { repo, canEdit, canManage, canRename } = useRepo();
  const { dialog, target, closeDialog } = useDialogParam();
  if (!repo || !dialog) return null;
  const onOpenChange = (o) => !o && closeDialog();
  const props = { repo, open: true, onOpenChange, target, onClose: closeDialog };
  switch (dialog) {
    case "change-pi":
      return canManage ? <ChangePiDialog {...props} /> : null;
    case "change-ldap":
      return canManage ? <UpdateFieldDialog {...props} field="group" /> : null;
    case "edit-description":
      return canManage ? <UpdateFieldDialog {...props} field="description" /> : null;
    case "compute-requirement":
      return canManage ? <ComputeRequirementDialog {...props} /> : null;
    case "rename":
      return canRename ? <RenameRepoDialog {...props} /> : null;
    case "add-members":
      return canEdit ? <AddMembersSheet {...props} /> : null;
    case "remove-member":
    case "remove-members":
      return canEdit ? <RemoveMembersDialog {...props} usernames={(target ?? "").split(",").filter(Boolean)} /> : null;
    default:
      return null;
  }
}

/** Options for a members-only combobox: repo users joined to their names. */
export const memberOptions = (repo) => {
  const names = Object.fromEntries((repo.allUsers ?? []).map((u) => [u.username, u.fullname]));
  return (repo.users ?? []).map((username) => ({ username, fullname: names[username] ?? "" }));
};

function ChangePiDialog({ repo, open, onOpenChange, target }) {
  const client = useApolloClient();
  const preselect = target && repo.users.includes(target) ? target : repo.principal;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Change PI"
      description={<>The PI of <span className="tw:font-mono">{repo.name}</span> must already be a member of the repo.</>}
      initialValues={{ principal: preselect }}
      submitLabel="Change PI"
      fields={[
        {
          name: "principal",
          label: "PI",
          type: "custom",
          required: true,
          helper: <>Was <span className="tw:font-mono">{repo.principal ?? "—"}</span> · must already be a member of the repo</>,
          validate: (v) => (v === repo.principal ? "That is the current PI" : undefined),
          render: ({ value, onChange, disabled }) => <UserCombobox value={value} onChange={onChange} options={memberOptions(repo)} disabled={disabled} placeholder="Search members…" />,
        },
      ]}
      toastMessages={{ loading: "Changing PI…", success: "PI changed" }}
      onSubmit={(v) => mutate(client, REPO_CHANGE_PRINCIPAL, { repo: repoKey(repo), user: userInput(v.principal) }, REFETCH.details)}
    />
  );
}

const FIELD_COPY = {
  group: { title: "Change LDAP group", label: "LDAP group", success: "LDAP group updated", type: "text", mono: true },
  description: { title: "Edit description", label: "Description", success: "Description updated", type: "textarea" },
};

/** Success toast with Undo (spec: Undo only for a single description / LDAP change). */
export function showUndoToast(client, repo, field, previous) {
  toast.success(FIELD_COPY[field].success, {
    action: {
      label: "Undo",
      onClick: () =>
        toast.promise(mutate(client, REPO_UPDATE, { repo: { ...repoKey(repo), [field]: previous } }, REFETCH.details), {
          loading: "Undoing…",
          success: "Change undone",
          error: (e) => e.message,
        }),
    },
  });
}

/** repoUpdate for one field, then the Undo toast. */
async function updateRepoField(client, repo, field, value) {
  const previous = repo[field] ?? "";
  await mutate(client, REPO_UPDATE, { repo: { ...repoKey(repo), [field]: value } }, REFETCH.details);
  showUndoToast(client, repo, field, previous);
}

function UpdateFieldDialog({ repo, open, onOpenChange, field }) {
  const client = useApolloClient();
  const copy = FIELD_COPY[field];
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title}
      description={<span className="tw:font-mono">{repo.facility}/{repo.name}</span>}
      initialValues={{ [field]: repo[field] ?? "" }}
      fields={[
        {
          name: field,
          label: copy.label,
          type: copy.type,
          mono: copy.mono,
          rows: 4,
          required: field === "group",
          helper: field === "description" ? (v) => `${(v.description ?? "").length} / 500` : "The POSIX group that grants access to repo storage",
          validate: (v) =>
            field === "description" ? ((v ?? "").length > 500 ? "Keep it under 500 characters" : undefined) : !/^[\w-]+$/.test(v ?? "") ? "Use letters, digits, _ and - only" : undefined,
        },
      ]}
      onSubmit={async (v) => {
        if ((v[field] ?? "") === (repo[field] ?? "")) return;
        try {
          await updateRepoField(client, repo, field, v[field]);
        } catch (err) {
          toast.error(`${copy.label} not saved`, { description: err.message });
          throw err;
        }
      }}
    />
  );
}

function ComputeRequirementDialog({ repo, open, onOpenChange }) {
  const client = useApolloClient();
  return (
    <RequestDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Set compute requirement"
      description={<span className="tw:font-mono">{repo.facility}/{repo.name}</span>}
      submitLabel="Apply"
      initialValues={{ computerequirement: repo.computerequirement ?? "Normal" }}
      fields={[
        {
          name: "computerequirement",
          label: "Compute requirement",
          type: "select",
          required: true,
          options: COMPUTE_REQUIREMENTS,
          helper: "Applied through a Coact request · recorded in History",
          validate: (v) => (v === (repo.computerequirement ?? "Normal") ? "That is the current requirement" : undefined),
        },
      ]}
      onSubmit={async (v) => {
        await setComputeRequirement(client, repo, v.computerequirement, REFETCH.details);
        return { message: `Compute requirement set to ${requirementLabel(v.computerequirement)}`, href: routes.requests({ reponame: repo.name, facilityname: repo.facility }) };
      }}
    />
  );
}
