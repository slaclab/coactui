"use client";

import { useState } from "react";
import Link from "next/link";
import { useApolloClient } from "@apollo/client";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CopyButton, SectionCard, Segmented, Skeleton, StatusPill, UserCombobox } from "../../../kit";
import { useQueryParam } from "../../../lib/navigation";
import { routes } from "../../../lib/routes";
import { useRepo } from "../repo-context";
import { COMPUTE_REQUIREMENTS, mutate, REFETCH, REPO_CHANGE_PRINCIPAL, REPO_UPDATE, repoKey, requirementLabel, setComputeRequirement, userInput } from "./mutations";
import { memberOptions, showUndoToast } from "./repo-dialogs";

// Order matters: the spec sends repoChangePrincipal, then repoUpdate, then the request.
const FIELDS = ["description", "principal", "group", "computerequirement"];
const LABELS = { description: "Description", principal: "PI", group: "LDAP group", computerequirement: "Compute requirement" };
const SAVE_ORDER = ["principal", "description", "group", "computerequirement"];
const MAX_DESCRIPTION = 500;

const valuesOf = (repo) => ({
  description: repo.description ?? "",
  principal: repo.principal ?? "",
  group: repo.group ?? "",
  computerequirement: repo.computerequirement ?? "Normal",
});

function validate(field, value) {
  if (field === "description" && value.length > MAX_DESCRIPTION) return `Keep it under ${MAX_DESCRIPTION} characters`;
  if (field === "group" && !/^[\w-]+$/.test(value)) return "Use letters, digits, _ and - only";
  if (field === "principal" && !value) return "Choose a PI";
  return null;
}

/** Overview Details card (Paper "Repo — Overview (Details editing)"); edit mode is ?edit=details. */
export function DetailsCard() {
  const { repo, loading, canManage, facility } = useRepo();
  const [edit, setEdit] = useQueryParam("edit");
  if (loading || !repo) return <DetailsSkeleton />;
  if (canManage && edit === "details") return <DetailsEditor key={repo.Id} repo={repo} onClose={() => setEdit(null)} />;
  return (
    <SectionCard
      className="tw:overflow-hidden"
      bodyClassName="tw:px-5 tw:pb-1"
      title="Details"
      action={
        canManage ? (
          <Button variant="ghost" size="sm" onClick={() => setEdit("details")} className="tw:-mt-1 tw:-mr-2">
            <Pencil className="tw:text-muted-strong" />
            Edit
          </Button>
        ) : (
          <span className="tw:pt-0.5 tw:text-xs tw:text-muted-foreground">Details are managed by {facility} czars.</span>
        )
      }
    >
      <DetailsRead repo={repo} canManage={canManage} onEdit={() => setEdit("details")} />
    </SectionCard>
  );
}

function Row({ label, changed, children, last }) {
  return (
    <div className={cn("tw:grid tw:grid-cols-[170px_1fr] tw:gap-4 tw:border-t tw:py-4", last && "tw:pb-3")}>
      <div className="tw:flex tw:items-start tw:gap-1.5 tw:pt-0.5 tw:text-[13px] tw:font-medium">
        {label}
        {changed && <span className="tw:mt-1.5 tw:size-1.5 tw:rounded-full tw:bg-foreground" aria-label="changed" />}
      </div>
      <div className="tw:min-w-0 tw:text-sm">{children}</div>
    </div>
  );
}

const Muted = ({ children }) => <span className="tw:text-muted-foreground">{children}</span>;

function DetailsRead({ repo, canManage, onEdit }) {
  const { fullnameOf } = useRepo();
  const leaders = repo.leaders ?? [];
  return (
    <div className="tw:-mt-1">
      <Row label="Description">
        {repo.description ? (
          <p className="tw:whitespace-pre-line">{repo.description}</p>
        ) : canManage ? (
          <button type="button" onClick={onEdit} className="tw:flex tw:items-center tw:gap-1 tw:text-[13px] tw:font-medium tw:text-muted-strong tw:hover:text-foreground">
            <Plus className="tw:size-3.5" /> Add description
          </button>
        ) : (
          <Muted>—</Muted>
        )}
      </Row>
      <Row label="PI">
        {repo.principal ? (
          <span className="tw:flex tw:items-baseline tw:gap-2">
            <span className="tw:font-mono">{repo.principal}</span>
            {fullnameOf[repo.principal] && <Muted>{fullnameOf[repo.principal]}</Muted>}
          </span>
        ) : (
          <Muted>—</Muted>
        )}
      </Row>
      <Row label="Leaders">
        {leaders.length ? (
          <span className="tw:flex tw:flex-wrap tw:gap-x-3 tw:gap-y-1">
            {leaders.map((l) => (
              <span key={l} className="tw:flex tw:items-baseline tw:gap-1.5">
                <span className="tw:font-mono">{l}</span>
                {fullnameOf[l] && <span className="tw:text-xs tw:text-muted-foreground">{fullnameOf[l]}</span>}
              </span>
            ))}
          </span>
        ) : (
          <Muted>—</Muted>
        )}
      </Row>
      <Row label="LDAP group">
        {repo.group ? (
          <span className="tw:flex tw:items-center tw:gap-1">
            <span className="tw:font-mono">{repo.group}</span>
            <CopyButton value={repo.group} label="Copy LDAP group" />
          </span>
        ) : (
          <Muted>—</Muted>
        )}
      </Row>
      <Row label="Compute requirement">{requirementLabel(repo.computerequirement)}</Row>
      <Row label="Facility" last>
        <Link href={routes.facility(repo.facility)} className="tw:text-foreground tw:underline-offset-2 tw:hover:underline">{repo.facility}</Link>
        <span className="tw:ml-1.5 tw:text-xs tw:text-muted-foreground">· set when the repo was created</span>
      </Row>
    </div>
  );
}

function DetailsEditor({ repo, onClose }) {
  const client = useApolloClient();
  const current = valuesOf(repo); // live (refetched) values
  const [values, setValues] = useState(current); // edits while the form is open
  const [results, setResults] = useState({}); // field → true | message, from the last save
  const [saving, setSaving] = useState(false);
  const set = (field) => (v) => setValues((s) => ({ ...s, [field]: v }));

  const changed = FIELDS.filter((f) => values[f] !== current[f]);
  const errors = Object.fromEntries(changed.map((f) => [f, validate(f, values[f])]).filter(([, e]) => e));
  const failed = Object.values(results).filter((r) => r !== true).length;

  const save = async () => {
    const list = SAVE_ORDER.filter((f) => changed.includes(f));
    const previous = { ...current };
    setSaving(true);
    const res = {};
    for (const f of list) {
      try {
        if (f === "principal") await mutate(client, REPO_CHANGE_PRINCIPAL, { repo: repoKey(repo), user: userInput(values.principal) });
        else if (f === "computerequirement") await setComputeRequirement(client, repo, values.computerequirement);
        else await mutate(client, REPO_UPDATE, { repo: { ...repoKey(repo), [f]: values[f] } });
        res[f] = true;
      } catch (err) {
        res[f] = err.message ?? String(err);
      }
    }
    await client.refetchQueries({ include: REFETCH.details });
    setResults(res);
    setSaving(false);
    const ok = list.filter((f) => res[f] === true);
    if (ok.length === list.length) {
      if (list.length === 1 && (list[0] === "description" || list[0] === "group")) showUndoToast(client, repo, list[0], previous[list[0]]);
      else toast.success(list.length === 1 ? `${LABELS[list[0]]} saved` : `Saved ${list.length} changes`);
      onClose();
    } else {
      toast.error(`${ok.length} of ${list.length} changes saved`, { description: list.filter((f) => res[f] !== true).map((f) => `${LABELS[f]}: ${res[f]}`).join("\n") });
    }
  };

  const fieldProps = (f) => ({ changed: changed.includes(f), result: results[f], error: errors[f] });
  const saveLabel = failed && changed.length ? `Retry ${changed.length} change${changed.length === 1 ? "" : "s"}` : "Save changes";

  return (
    <SectionCard
      className="tw:overflow-hidden tw:shadow-sm"
      bodyClassName="tw:px-5 tw:pb-0"
      title={<span className="tw:flex tw:items-center tw:gap-2">Details <StatusPill tone="brand" dot={false}>Editing</StatusPill></span>}
      action={<span className="tw:pt-0.5 tw:text-xs tw:text-muted-foreground">Czars and admins can edit</span>}
      footer={
        <div className="tw:-mx-5 tw:-my-3 tw:flex tw:items-center tw:justify-between tw:bg-muted/50 tw:px-5 tw:py-3">
          <span className="tw:text-[13px] tw:text-muted-strong tw:tabular-nums">
            {Object.keys(results).length && failed
              ? `${Object.keys(results).length - failed} of ${Object.keys(results).length} changes saved`
              : `${changed.length} field${changed.length === 1 ? "" : "s"} changed`}
          </span>
          <div className="tw:flex tw:gap-2">
            <Button variant="outline" size="sm" disabled={saving} onClick={onClose}>{failed ? "Discard" : "Cancel"}</Button>
            <Button size="sm" disabled={saving || !changed.length || Object.keys(errors).length > 0} onClick={save}>
              {saving && <Loader2 className="tw:animate-spin" />}
              {saveLabel}
            </Button>
          </div>
        </div>
      }
    >
      <div className="tw:-mt-1">
        <EditRow label="Description" {...fieldProps("description")} helper={<span className="tw:ml-auto tw:tabular-nums">{values.description.length} / {MAX_DESCRIPTION}</span>}>
          <Textarea rows={4} value={values.description} disabled={saving} onChange={(e) => set("description")(e.target.value)} aria-label="Description" placeholder="What is this repo for?" />
        </EditRow>
        <EditRow label="PI" {...fieldProps("principal")} helper={<>Was <span className="tw:font-mono">{current.principal || "—"}</span> · must already be a member of the repo</>}>
          <div className="tw:max-w-80">
            <UserCombobox value={values.principal} onChange={set("principal")} options={memberOptions(repo)} disabled={saving} placeholder="Search members…" />
          </div>
        </EditRow>
        <EditRow label="LDAP group" {...fieldProps("group")}>
          <Input value={values.group} disabled={saving} onChange={(e) => set("group")(e.target.value)} aria-label="LDAP group" className="tw:max-w-80 tw:font-mono" />
        </EditRow>
        <EditRow label="Compute requirement" {...fieldProps("computerequirement")} helper="Applied through a Coact request · recorded in History">
          <div className="tw:w-fit">
            <Segmented label="Compute requirement" value={values.computerequirement} onChange={(v) => !saving && set("computerequirement")(v)} items={COMPUTE_REQUIREMENTS} />
          </div>
        </EditRow>
        <Row label="Facility" last>
          <span>{repo.facility}</span>
          <span className="tw:ml-1.5 tw:text-xs tw:text-muted-foreground">· set when the repo was created</span>
        </Row>
      </div>
    </SectionCard>
  );
}

function EditRow({ label, changed, result, error, helper, children }) {
  return (
    <Row label={label} changed={changed}>
      <div className="tw:flex tw:flex-col tw:gap-1.5">
        {children}
        {error ? (
          <p className="tw:text-xs tw:text-crit-text">{error}</p>
        ) : typeof result === "string" && changed ? (
          <p className="tw:flex tw:items-start tw:gap-1 tw:text-xs tw:text-crit-text"><X className="tw:mt-px tw:size-3.5 tw:shrink-0" />Not saved · {result}. Your edit is kept.</p>
        ) : result === true ? (
          <p className="tw:flex tw:items-center tw:gap-1 tw:text-xs tw:text-ok-text"><Check className="tw:size-3.5" />Saved</p>
        ) : helper ? (
          <p className="tw:flex tw:text-xs tw:text-muted-foreground">{helper}</p>
        ) : null}
      </div>
    </Row>
  );
}

function DetailsSkeleton() {
  return (
    <SectionCard title="Details">
      <div className="tw:flex tw:flex-col">
        {["Description", "PI", "Leaders", "LDAP group", "Compute requirement", "Facility"].map((l) => (
          <div key={l} className="tw:grid tw:grid-cols-[170px_1fr] tw:gap-4 tw:border-t tw:py-4">
            <span className="tw:text-[13px] tw:font-medium">{l}</span>
            <Skeleton className="tw:h-4 tw:w-40" />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
