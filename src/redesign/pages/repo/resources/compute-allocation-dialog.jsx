"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequestDialog } from "../../../kit";
import { formatInt } from "../../../lib/format";
import { previewNodes, purchasedOn } from "./compute-math";
import { useAllocationRequest } from "./mutations";

const ZERO_ONLY = "Only 0% is allowed here; only preemptable jobs will run.";

const pctNumber = (v) => (v === "" || v == null ? NaN : Number(v));

/**
 * Edit / request / allocate-on-another-cluster (spec §6 Compute). One dialog, three modes:
 *   edit     — czar/admin, existing allocation: request + requestApprove
 *   request  — PI/leader, existing allocation: request only
 *   allocate — new cluster (czar/admin approve; PI/leader request)
 * The cluster lives in the URL (?target=), so switching it remounts the form with that
 * cluster's current values — no state syncing.
 */
export function ComputeAllocationDialog({ open, onClose, allocate, cluster, onCluster, repo, facilityObj, allocations, unallocated, access }) {
  const submit = useAllocationRequest("compute");
  const current = allocations.find((a) => a.clustername === cluster) ?? null;
  const choices = allocate ? unallocated : allocations.map((a) => a.clustername);
  const purchased = purchasedOn(facilityObj, cluster);
  const fixedZero = !!cluster && (purchased <= 0 || repo.name === "default");
  const approve = access.edit;

  const title = allocate
    ? approve ? "Allocate on another cluster" : "Request compute on another cluster"
    : approve ? "Edit compute allocation" : "Request compute change";
  const description = cluster
    ? purchased > 0
      ? `${repo.facility} has purchased ${formatInt(purchased)} nodes on ${cluster}. Allocations are a share of that purchase.`
      : `${repo.facility} has not purchased any compute on ${cluster}.`
    : "Choose a cluster.";

  const fields = [
    {
      name: "cluster",
      label: "Cluster",
      type: "custom",
      required: true,
      render: ({ disabled }) => (
        <Select value={cluster ?? ""} onValueChange={onCluster} disabled={disabled || choices.length < 2}>
          <SelectTrigger className="tw:w-full tw:font-mono" aria-label="Cluster"><SelectValue placeholder="Choose a cluster…" /></SelectTrigger>
          <SelectContent>
            {choices.map((c) => <SelectItem key={c} value={c} className="tw:font-mono">{c}</SelectItem>)}
          </SelectContent>
        </Select>
      ),
    },
    fixedZero
      ? {
          name: "percent",
          label: "% of facility",
          type: "custom",
          helper: ZERO_ONLY,
          render: () => <><Input value="0" readOnly aria-label="% of facility" className="tw:bg-muted" /><span className="tw:text-[13px] tw:text-muted-foreground">%</span></>,
        }
      : {
          name: "percent",
          label: "% of facility",
          type: "number",
          suffix: "%",
          required: true,
          min: 0,
          step: "any",
          validate: (v) => {
            const n = pctNumber(v);
            return Number.isNaN(n) || n < 0 || n > 100 ? "Enter a number from 0 to 100" : undefined;
          },
        },
    {
      name: "burst",
      label: "Burst % of facility",
      type: "number",
      suffix: "%",
      required: true,
      min: 0,
      step: "any",
      helper: "Extra share of the facility's purchase this repo may use at any instant, on top of its allocation.",
      validate: (v) => {
        const n = pctNumber(v);
        return Number.isNaN(n) || n < 0 ? "Enter a number ≥ 0" : undefined;
      },
    },
    { name: "notes", label: "Notes", type: "textarea", rows: 3, placeholder: approve ? "Optional — recorded on the request" : "Why is this change needed?" },
  ];

  const initialValues = {
    cluster: cluster ?? "",
    percent: fixedZero ? "0" : current ? String(current.percentOfFacility ?? 0) : "",
    burst: String(current?.burstPercentOfFacility ?? 0),
    notes: "",
  };

  const onSubmit = (values) => {
    if (!cluster) throw new Error("Choose a cluster");
    return submit(
      {
        reqtype: "RepoComputeAllocation",
        reponame: repo.name,
        facilityname: repo.facility,
        clustername: cluster,
        start: current?.start ?? new Date().toISOString(),
        percentOfFacility: fixedZero ? 0 : Number(values.percent),
        // Always sent: the server multiplies the purchase by burst % unconditionally.
        burstPercentOfFacility: Number(values.burst),
        ...(values.notes?.trim() ? { notes: values.notes } : {}),
      },
      { approve },
    );
  };

  const preview = (values) => {
    const p = previewNodes(purchased, fixedZero ? 0 : values.percent, values.burst);
    if (!p) return null;
    return (
      <div className="tw:flex tw:flex-col tw:gap-1 tw:rounded-md tw:bg-muted tw:px-3 tw:py-2.5">
        <span className="tw:text-[13px] tw:font-medium tw:tabular-nums">{p.text}</span>
        <span className="tw:text-xs tw:text-muted-foreground">Absolute nodes are recorded when the request is made; they do not follow later purchase changes.</span>
      </div>
    );
  };

  return (
    <RequestDialog
      key={`${allocate ? "allocate" : "edit"}:${cluster ?? ""}`}
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={title}
      description={description}
      fields={fields}
      initialValues={initialValues}
      submitLabel={approve ? "Save and approve" : "Submit request"}
      onSubmit={onSubmit}
      preview={preview}
    />
  );
}
