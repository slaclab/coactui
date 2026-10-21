"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequestDialog } from "../../../kit";
import { formatStorage } from "../../../lib/format";
import { useAllocationRequest } from "./mutations";

const label = (a) => `${a.purpose} · ${a.storagename}`;

/**
 * Edit (czar/admin: request + approve) or request (PI/leader) a storage allocation. The
 * allocation is ?target=<allocationId>; switching it remounts the form. Only existing
 * allocations can be changed: requestRepoStorageAllocation requires an allocationid.
 */
export function StorageAllocationDialog({ open, onClose, allocation, allocations, onTarget, repo, access }) {
  const submit = useAllocationRequest("storage");
  const approve = access.edit;
  if (!allocation) return null;
  const a = allocation;
  const usedGb = a.usage?.gigabytes ?? 0;

  const fields = [
    {
      name: "allocation",
      label: "Storage",
      type: "custom",
      render: ({ disabled }) => (
        <Select value={a.Id} onValueChange={onTarget} disabled={disabled || allocations.length < 2}>
          <SelectTrigger className="tw:w-full" aria-label="Storage allocation"><SelectValue /></SelectTrigger>
          <SelectContent>
            {allocations.map((x) => <SelectItem key={x.Id} value={x.Id}>{label(x)}</SelectItem>)}
          </SelectContent>
        </Select>
      ),
    },
    {
      name: "gigabytes",
      label: "Allocated",
      type: "number",
      suffix: "GB",
      required: true,
      min: 0,
      step: "any",
      helper: (v) => {
        const n = Number(v.gigabytes);
        return Number.isFinite(n) && n > 0 ? `= ${formatStorage(n)}. Currently ${formatStorage(a.gigabytes)}, ${formatStorage(usedGb)} used.` : `Currently ${formatStorage(a.gigabytes)}.`;
      },
      validate: (v) => (!(Number(v) > 0) ? "Enter a size greater than 0" : undefined),
    },
    {
      name: "inodes",
      label: "Inodes",
      type: "number",
      min: 0,
      step: 1,
      placeholder: "Leave empty to keep it unset",
      validate: (v) => (v !== "" && v != null && !(Number(v) >= 0) ? "Enter a number ≥ 0" : undefined),
    },
    { name: "notes", label: "Notes", type: "textarea", rows: 3, placeholder: approve ? "Optional — recorded on the request" : "Why is this change needed?" },
  ];

  const preview = (values) => {
    const n = Number(values.gigabytes);
    if (!(n > 0)) return null;
    const delta = n - (a.gigabytes ?? 0);
    return (
      <div className="tw:flex tw:flex-col tw:gap-1 tw:rounded-md tw:bg-muted tw:px-3 tw:py-2.5 tw:text-[13px]">
        <span className="tw:font-medium tw:tabular-nums">
          {formatStorage(a.gigabytes)} → {formatStorage(n)}
          {delta !== 0 && <span className="tw:text-muted-foreground"> ({delta > 0 ? "+" : "−"}{formatStorage(Math.abs(delta))})</span>}
        </span>
        {n < usedGb && <span className="tw:font-medium tw:text-warn-text">Below current usage ({formatStorage(usedGb)}). Writes will fail until usage drops.</span>}
      </div>
    );
  };

  const onSubmit = (values) =>
    submit(
      {
        reqtype: "RepoStorageAllocation",
        reponame: repo.name,
        facilityname: repo.facility,
        allocationid: a.Id,
        purpose: a.purpose,
        storagename: a.storagename,
        gigabytes: Number(values.gigabytes),
        ...(values.inodes !== "" && values.inodes != null ? { inodes: Number(values.inodes) } : {}),
        ...(values.notes?.trim() ? { notes: values.notes } : {}),
      },
      { approve },
    );

  return (
    <RequestDialog
      key={a.Id}
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={approve ? `Edit ${a.purpose} allocation` : `Request ${a.purpose} change`}
      description={`${a.purpose} on ${a.storagename}${a.rootfolder ? ` · ${a.rootfolder}` : ""}`}
      fields={fields}
      initialValues={{ allocation: a.Id, gigabytes: String(a.gigabytes ?? ""), inodes: a.inodes ? String(a.inodes) : "", notes: "" }}
      submitLabel={approve ? "Save and approve" : "Submit request"}
      onSubmit={onSubmit}
      preview={preview}
    />
  );
}
