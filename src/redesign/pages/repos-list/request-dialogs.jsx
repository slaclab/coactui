"use client";

import { useMemo } from "react";
import { useMutation } from "@apollo/client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequestDialog, UserCombobox } from "../../kit";
import { formatInt, formatPct, formatStorage } from "../../lib/format";
import { useDialogParam } from "../../lib/navigation";
import { useViewer } from "../../providers/viewer";
import { RepoPicker } from "./repo-picker";
import {
  APPROVE_REQUEST,
  REQUEST_COMPUTE,
  REQUEST_FACILITY_ACCESS,
  REQUEST_MEMBERSHIP,
  REQUEST_NEW_REPO,
  REQUEST_STORAGE,
  useFacilityPurchases,
  useRequestOptions,
} from "./queries";

/** ?dialog= keys owned by the repos list (R1 split button, empty state). */
export const REQUEST_DIALOGS = {
  membership: "request-membership",
  newRepo: "request-new-repo",
  facilityAccess: "request-facility-access",
  compute: "request-compute",
  storage: "request-storage",
};
const KEYS = Object.values(REQUEST_DIALOGS);

const REPO_NAME = /^[A-Za-z0-9_-]+$/;
const num = (v) => (v === "" || v == null ? NaN : Number(v));

/**
 * All request dialogs for /repos/info, opened through ?dialog=<key>&target=<facility/name>.
 * `rows` = the viewer's repo rows (useRepos), used for the allocation pickers.
 */
export function ReposDialogs({ rows }) {
  const { dialog } = useDialogParam();
  if (!KEYS.includes(dialog)) return null;
  return <OpenRequestDialog dialog={dialog} rows={rows} />;
}

function OpenRequestDialog({ dialog, rows }) {
  const opts = useRequestOptions(true);
  switch (dialog) {
    case REQUEST_DIALOGS.membership: return <MembershipDialog opts={opts} rows={rows} />;
    case REQUEST_DIALOGS.newRepo: return <NewRepoDialog opts={opts} />;
    case REQUEST_DIALOGS.facilityAccess: return <FacilityAccessDialog opts={opts} />;
    case REQUEST_DIALOGS.compute: return <ComputeRequestDialog rows={rows} />;
    case REQUEST_DIALOGS.storage: return <StorageRequestDialog rows={rows} />;
    default: return null;
  }
}

function useClose() {
  const { closeDialog, target } = useDialogParam();
  return { onOpenChange: (o) => !o && closeDialog(), target };
}

/** Facilities a viewer may request in: admins all, everyone else their own (legacy rule). */
function useRequestFacilities(opts) {
  const { can } = useViewer();
  return useMemo(() => {
    const all = opts.allFacilities.map((f) => f.name);
    const list = can.isAdmin ? all : opts.myFacilities;
    return [...list].sort().map((f) => ({ value: f, label: f }));
  }, [opts.allFacilities, opts.myFacilities, can.isAdmin]);
}

const loadingHelper = (opts) => (opts.loading ? "Loading facilities…" : opts.error ? `Couldn’t load facilities — ${opts.error.message}` : undefined);

/* ------------------------------- Membership ----------------------------------------- */

function MembershipDialog({ opts, rows }) {
  const { onOpenChange, target } = useClose();
  const facilities = useRequestFacilities(opts);
  const [request] = useMutation(REQUEST_MEMBERSHIP);
  const [tf, ...tn] = (target ?? "").split("/");
  const reposIn = (f) => opts.allRepos.filter((r) => r.facility === f).map((r) => ({ value: r.name, name: r.name }));
  const mine = new Set(rows.filter((r) => ["PI", "Leader", "Member"].includes(r.role)).map((r) => r.id));
  return (
    <RequestDialog
      open
      onOpenChange={onOpenChange}
      title="Request repo membership"
      description="A PI, leader or facility czar of the repo approves membership requests."
      initialValues={{ facility: tf ?? "", repo: tn.join("/") }}
      fields={[
        { name: "facility", label: "Facility", type: "select", required: true, options: facilities, helper: loadingHelper(opts) },
        {
          name: "repo",
          label: "Repo",
          type: "custom",
          required: true,
          render: ({ value, onChange, values, disabled }) => (
            <RepoPicker
              id="field-repo"
              options={values.facility ? reposIn(values.facility) : []}
              value={value ?? ""}
              onChange={onChange}
              disabled={disabled || !values.facility}
              placeholder={values.facility ? "Choose a repo…" : "Choose a facility first"}
            />
          ),
          validate: (v, values) => {
            if (!opts.allRepos.some((r) => r.facility === values.facility && r.name === v)) return `No repo named “${v}” in ${values.facility} — ask your PI for the exact name`;
            if (mine.has(`${values.facility}/${v}`)) return `You’re already a member of ${v}`;
            return undefined;
          },
        },
      ]}
      onSubmit={async (v) => {
        await request({ variables: { request: { reqtype: "RepoMembership", reponame: v.repo, facilityname: v.facility } } });
        return { message: "Request submitted" };
      }}
    />
  );
}

/* ------------------------------- New repo ------------------------------------------- */

function NewRepoDialog({ opts }) {
  const { onOpenChange, target } = useClose();
  const { viewer } = useViewer();
  const facilities = useRequestFacilities(opts);
  const [request] = useMutation(REQUEST_NEW_REPO);
  return (
    <RequestDialog
      open
      onOpenChange={onOpenChange}
      title="Request new repo"
      description="The facility’s czars review new repo requests in Requests."
      initialValues={{ facility: (target ?? "").split("/")[0] ?? "", principal: viewer?.username ?? "" }}
      fields={[
        {
          name: "reponame",
          label: "Repo name",
          mono: true,
          required: true,
          placeholder: "lcls-xpp-2026",
          helper: "Letters, numbers, - and _",
          validate: (v, values) => {
            if (!REPO_NAME.test(v.trim())) return "Use letters, numbers, - and _";
            if (opts.allRepos.some((r) => r.facility === values.facility && r.name === v.trim())) return `A repo named “${v.trim()}” already exists in ${values.facility}`;
            return undefined;
          },
        },
        { name: "facility", label: "Facility", type: "select", required: true, options: facilities, helper: loadingHelper(opts) },
        {
          name: "principal",
          label: "Principal (PI)",
          type: "custom",
          required: true,
          render: ({ value, onChange, disabled }) => <UserCombobox value={value || null} onChange={onChange} disabled={disabled} />,
        },
      ]}
      onSubmit={async (v) => {
        await request({ variables: { request: { reqtype: "NewRepo", reponame: v.reponame.trim(), facilityname: v.facility, principal: v.principal } } });
        return { message: "Request submitted" };
      }}
    />
  );
}

/* ------------------------------- Facility access ------------------------------------ */

function FacilityAccessDialog({ opts }) {
  const { onOpenChange, target } = useClose();
  const [request] = useMutation(REQUEST_FACILITY_ACCESS);
  const missing = useMemo(
    () => opts.allFacilities.filter((f) => !opts.myFacilities.includes(f.name)).sort((a, b) => a.name.localeCompare(b.name)),
    [opts.allFacilities, opts.myFacilities],
  );
  const describe = (name) => missing.find((f) => f.name === name)?.description;
  return (
    <RequestDialog
      open
      onOpenChange={onOpenChange}
      title="Request facility access"
      description={!opts.loading && !missing.length ? "You already have access to every facility." : "Get an S3DF account in another facility. Its czars approve the request."}
      initialValues={{ facility: target ?? "" }}
      fields={[
        {
          name: "facility",
          label: "Facility",
          type: "select",
          required: true,
          options: missing.map((f) => ({ value: f.name, label: f.name })),
          helper: (values) => loadingHelper(opts) ?? (values.facility ? describe(values.facility) : undefined),
        },
        {
          name: "notes",
          label: "Notes *",
          type: "textarea",
          rows: 3,
          placeholder: "What will you work on, and with whom?",
          validate: (v) => (!v?.trim() ? "Please give some context for your S3DF account request" : undefined),
        },
      ]}
      onSubmit={async (v) => {
        await request({
          variables: {
            request: {
              reqtype: "UserAccount",
              eppn: opts.eppns[0] ?? `${opts.username}@slac.stanford.edu`,
              preferredUserName: opts.username,
              facilityname: v.facility,
              notes: v.notes.trim(),
            },
          },
        });
        return { message: `Access to ${v.facility} requested — you’ll get access once it’s approved.` };
      }}
    />
  );
}

/* ------------------------------- Allocation requests -------------------------------- */

function editableOptions(rows, can) {
  return rows
    .filter((r) => can.canEditMembers(r))
    .map((r) => ({ value: r.id, name: r.name, facility: r.facility }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function FieldSelect({ id, value, onChange, options, placeholder, disabled }) {
  return (
    <Select value={value ?? ""} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className="tw:w-full"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function ComputeRequestDialog({ rows }) {
  const { onOpenChange, target } = useClose();
  const { can } = useViewer();
  const { purchases, clusters, loading } = useFacilityPurchases(true);
  const [request] = useMutation(REQUEST_COMPUTE);
  const [approve] = useMutation(APPROVE_REQUEST);
  const repos = editableOptions(rows, can);
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  const cores = Object.fromEntries(clusters.map((c) => [c.name, c.nodecpucount]));

  // Existing allocations first, then clusters the facility purchased that the repo lacks.
  const clusterOptions = (repo) => {
    if (!repo) return [];
    const have = repo.computeRaw.map((a) => ({ value: a.cluster, label: `${a.cluster} · now ${formatPct(a.percentOfFacility)}` }));
    const bought = Object.entries(purchases[repo.facility] ?? {})
      .filter(([c, p]) => p > 0 && !repo.computeRaw.some((a) => a.cluster === c))
      .map(([c]) => ({ value: c, label: `${c} · new allocation` }));
    return [...have, ...bought];
  };
  const purchasedOn = (repo, cluster) => purchases[repo?.facility]?.[cluster] ?? 0;
  const existing = (repo, cluster) => repo?.computeRaw.find((a) => a.cluster === cluster);

  return (
    <RequestDialog
      open
      onOpenChange={onOpenChange}
      title="Request compute allocation"
      description="Set a repo’s share of its facility’s purchase on a cluster. Czars approve requests; czars’ own requests apply directly."
      initialValues={{ repo: byId[target] && can.canEditMembers(byId[target]) ? target : "", burst: "0" }}
      submitLabel="Submit"
      fields={[
        {
          name: "repo",
          label: "Repo",
          type: "custom",
          required: true,
          render: ({ value, onChange, disabled }) => <RepoPicker id="field-repo" options={repos} value={value ?? ""} onChange={onChange} disabled={disabled} showFacility />,
        },
        {
          name: "cluster",
          label: "Cluster",
          type: "custom",
          required: true,
          render: ({ value, onChange, values, disabled }) => (
            <FieldSelect id="field-cluster" value={value} onChange={onChange} options={clusterOptions(byId[values.repo])} disabled={disabled || !values.repo || loading} placeholder={values.repo ? "Choose a cluster…" : "Choose a repo first"} />
          ),
          validate: (v, values) => (clusterOptions(byId[values.repo]).some((o) => o.value === v) ? undefined : "Choose a cluster for this repo"),
        },
        {
          name: "pct",
          label: "Allocation",
          type: "number",
          required: true,
          min: 0,
          step: "any",
          suffix: "% of facility",
          helper: (values) => {
            const a = existing(byId[values.repo], values.cluster);
            return a ? `Current: ${formatPct(a.percentOfFacility)} · burst ${formatPct(a.burstPercentOfFacility)}` : undefined;
          },
          validate: (v, values) => {
            const n = num(v);
            const repo = byId[values.repo];
            if (Number.isNaN(n) || n < 0 || n > 100) return "% must be between 0 and 100";
            if (n > 0 && repo && purchasedOn(repo, values.cluster) <= 0) return `This facility hasn’t purchased compute on ${values.cluster}; set 0`;
            if (n > 0 && repo?.name === "default" && !can.isAdmin) return "Only admins allocate compute to default; set 0";
            return undefined;
          },
        },
        {
          name: "burst",
          label: "Burst",
          type: "number",
          required: true,
          min: 0,
          step: "any",
          suffix: "% of facility",
          validate: (v) => (Number.isNaN(num(v)) || num(v) < 0 ? "Burst must be 0 or more" : undefined),
        },
        { name: "notes", label: "Notes", type: "textarea", rows: 2, placeholder: "Optional context for the approver" },
      ]}
      preview={(values) => {
        const repo = byId[values.repo];
        const n = num(values.pct);
        if (!repo || !values.cluster || Number.isNaN(n)) return null;
        const nodes = (purchasedOn(repo, values.cluster) * n) / 100;
        return (
          <p className="tw:rounded-md tw:bg-muted tw:px-3 tw:py-2 tw:text-[13px] tw:tabular-nums">
            {formatPct(n)} of {formatInt(purchasedOn(repo, values.cluster))} purchased nodes = <span className="tw:font-semibold">{Number(nodes.toFixed(2))} nodes</span>
            {cores[values.cluster] ? <> · {formatInt(Math.round(nodes * cores[values.cluster]))} resource-h per hour</> : null}
          </p>
        );
      }}
      onSubmit={async (v) => {
        const repo = byId[v.repo];
        const a = existing(repo, v.cluster);
        const { data } = await request({
          variables: {
            request: {
              reqtype: "RepoComputeAllocation",
              facilityname: repo.facility,
              reponame: repo.name,
              clustername: v.cluster,
              start: a?.start ?? new Date().toISOString(),
              percentOfFacility: num(v.pct),
              burstPercentOfFacility: num(v.burst),
              ...(v.notes?.trim() ? { notes: v.notes.trim() } : {}),
            },
          },
        });
        if (!can.canEditAllocation(repo)) return { message: "Request submitted" };
        await approve({ variables: { id: data.requestRepoComputeAllocation.Id }, refetchQueries: ["ReposListCompute", "RedesignRepos"] });
        return { message: "Allocation change approved — it takes a few seconds to apply" };
      }}
    />
  );
}

function StorageRequestDialog({ rows }) {
  const { onOpenChange, target } = useClose();
  const { can } = useViewer();
  const [request] = useMutation(REQUEST_STORAGE);
  const [approve] = useMutation(APPROVE_REQUEST);
  const repos = editableOptions(rows, can);
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  const allocOptions = (repo) => (repo?.storageRaw ?? []).map((s) => ({ value: s.id, label: `${s.purpose} · ${s.storagename} · ${formatStorage(s.gigabytes)}` }));
  const allocOf = (values) => byId[values.repo]?.storageRaw.find((s) => s.id === values.allocation);

  return (
    <RequestDialog
      open
      onOpenChange={onOpenChange}
      title="Request storage allocation"
      description="Change the size of one of a repo’s storage allocations. Czars approve requests; czars’ own requests apply directly."
      initialValues={{ repo: byId[target] && can.canEditMembers(byId[target]) ? target : "" }}
      submitLabel="Submit"
      fields={[
        {
          name: "repo",
          label: "Repo",
          type: "custom",
          required: true,
          render: ({ value, onChange, disabled }) => <RepoPicker id="field-repo" options={repos} value={value ?? ""} onChange={onChange} disabled={disabled} showFacility />,
          validate: (v) => (byId[v]?.storageRaw.length ? undefined : "This repo has no storage allocation yet — ask a facility czar to create one"),
        },
        {
          name: "allocation",
          label: "Allocation",
          type: "custom",
          required: true,
          render: ({ value, onChange, values, disabled }) => (
            <FieldSelect id="field-allocation" value={value} onChange={onChange} options={allocOptions(byId[values.repo])} disabled={disabled || !values.repo} placeholder={values.repo ? "Choose an allocation…" : "Choose a repo first"} />
          ),
          validate: (v, values) => (allocOptions(byId[values.repo]).some((o) => o.value === v) ? undefined : "Choose one of this repo’s allocations"),
        },
        {
          name: "gigabytes",
          label: "New size",
          type: "number",
          required: true,
          min: 0,
          step: "any",
          suffix: "GB",
          helper: (values) => {
            const s = allocOf(values);
            return s ? `Current: ${formatStorage(s.gigabytes)} · ${formatStorage(s.usedGb)} used` : undefined;
          },
          validate: (v, values) => {
            const n = num(v);
            if (Number.isNaN(n) || n < 0) return "Size must be 0 or more";
            const s = allocOf(values);
            if (s && n < s.usedGb) return `That’s less than the ${formatStorage(s.usedGb)} already used`;
            return undefined;
          },
        },
        { name: "notes", label: "Notes", type: "textarea", rows: 2, placeholder: "Optional context for the approver" },
      ]}
      onSubmit={async (v) => {
        const repo = byId[v.repo];
        const s = allocOf(v);
        const { data } = await request({
          variables: {
            request: {
              reqtype: "RepoStorageAllocation",
              reponame: repo.name,
              facilityname: repo.facility,
              allocationid: s.id,
              purpose: s.purpose,
              storagename: s.storagename,
              gigabytes: num(v.gigabytes),
              ...(v.notes?.trim() ? { notes: v.notes.trim() } : {}),
            },
          },
        });
        if (!can.canEditAllocation(repo)) return { message: "Request submitted" };
        await approve({ variables: { id: data.requestRepoStorageAllocation.Id }, refetchQueries: ["ReposListStorage", "RedesignRepos"] });
        return { message: "Allocation change approved — it takes a few seconds to apply" };
      }}
    />
  );
}
