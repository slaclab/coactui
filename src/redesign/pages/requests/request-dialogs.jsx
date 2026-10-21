"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog, FormDialog } from "../../kit";
import { useDialogParam } from "../../lib/navigation";
import { useViewer } from "../../providers/viewer";
import { cn } from "@/lib/utils";
import { useRequestMutations, useRequestsMeta } from "./queries";
import { canApprove, canManage, canReject, describeRequest, shortId, typeLabel } from "./request-meta";

/*
 * Every request dialog, opened through ?dialog=<name>&target=<Id>[,<Id>…] so they can be
 * deep-linked and survive a reload. `rows` = the loaded requests the targets resolve against.
 * Each dialog re-checks the gate for its targets; a stale or forged link renders nothing.
 */
export function RequestDialogs({ rows }) {
  const { dialog, target, closeDialog } = useDialogParam();
  const { can } = useViewer();
  const m = useRequestMutations();
  const ids = target ? target.split(",") : [];
  const targets = rows.filter((r) => ids.includes(r.Id));
  const one = targets.length === 1 ? targets[0] : null;
  const onOpenChange = (o) => !o && closeDialog();
  const label = one ? `${typeLabel(one.reqtype)} · ${describeRequest(one).text}` : "";
  const manage = one && canManage(one, can);

  return (
    <>
      <FormDialog
        open={dialog === "complete" && !!manage && ["Approved", "Incomplete"].includes(one.approvalstatus)}
        onOpenChange={onOpenChange}
        title="Mark request complete"
        description={<>{label}. Use this when the change was applied by hand; coactd won’t run it again.</>}
        fields={[{ name: "notes", label: "Note", type: "textarea", required: true, rows: 3, placeholder: "What was done, for the audit trail" }]}
        submitLabel="Mark complete"
        toastMessages={{ loading: "Marking complete…", success: "Marked complete" }}
        onSubmit={(v) => m.complete(one, v.notes.trim())}
      />
      <FormDialog
        open={dialog === "incomplete" && !!manage && ["Approved", "Completed"].includes(one.approvalstatus)}
        onOpenChange={onOpenChange}
        title="Mark request incomplete"
        description={<>{label}. The requester sees it as failed until it is re-run or completed.</>}
        fields={[{ name: "notes", label: "Note", type: "textarea", required: true, rows: 3, placeholder: "What went wrong" }]}
        submitLabel="Mark incomplete"
        destructive
        toastMessages={{ loading: "Marking incomplete…", success: "Marked incomplete" }}
        onSubmit={(v) => m.incomplete(one, v.notes.trim())}
      />
      {dialog === "reassign" && manage && one.reqtype === "UserAccount" && <ReassignDialog req={one} onOpenChange={onOpenChange} reassign={m.reassign} />}
      <ConfirmDialog
        open={dialog === "refire" && !!manage && !!one.canrefire && ["Approved", "Incomplete", "Completed"].includes(one.approvalstatus)}
        onOpenChange={onOpenChange}
        title="Re-run provisioning?"
        description={<>{label}. Sets the request back to Applying so coactd runs it again.</>}
        confirmLabel="Re-run"
        toastMessages={{ loading: "Re-running…", success: "Sent back to coactd" }}
        onConfirm={() => m.refire(one)}
      />
      <ConfirmDialog
        open={dialog === "reopen" && !!manage && one.approvalstatus === "Rejected"}
        onOpenChange={onOpenChange}
        title="Reopen this request?"
        description={<>{label}. It goes back to Pending and can be approved or rejected again.</>}
        confirmLabel="Reopen"
        toastMessages={{ loading: "Reopening…", success: "Reopened" }}
        onConfirm={() => m.reopen(one)}
      />
      <ConfirmDialog
        open={dialog === "approve-now" && !!manage && one.approvalstatus === "PreApproved"}
        onOpenChange={onOpenChange}
        title="Approve this pre-approved request now?"
        description={<>{label}. Normally it completes when the user registers. Approving now hands it to coactd straight away.</>}
        confirmLabel="Approve now"
        toastMessages={{ loading: "Approving…", success: "Approved" }}
        onConfirm={() => m.approve(one)}
      />
      {dialog === "bulk-approve" && <BulkApproveDialog targets={targets.filter(canApprove)} approve={m.approve} onOpenChange={onOpenChange} />}
      {dialog === "bulk-reject" && <BulkRejectDialog targets={targets.filter((r) => canReject(r, can))} reject={m.reject} onOpenChange={onOpenChange} />}
    </>
  );
}

function ReassignDialog({ req, onOpenChange, reassign }) {
  const { facilityNames } = useRequestsMeta();
  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title="Reassign to another facility"
      description={<>Moves <span className="tw:font-mono">{req.preferredUserName || req.eppn}</span>’s access request from {req.facilityname ?? "—"} to another facility’s queue.</>}
      fields={[{ name: "facility", label: "New facility", type: "select", required: true, options: facilityNames.filter((f) => f !== req.facilityname).map((f) => ({ value: f })) }]}
      submitLabel="Reassign"
      toastMessages={{ loading: "Reassigning…", success: "Reassigned" }}
      onSubmit={(v) => reassign(req, v.facility)}
    />
  );
}

/**
 * Bulk reject: one required note, applied one request at a time. The target list is frozen
 * while a run is in flight — rejected rows leave the pending query as it refetches, which
 * would otherwise shrink the list (and close the dialog) mid-run.
 */
function BulkRejectDialog({ targets, reject, onOpenChange }) {
  const [frozen, setFrozen] = useState(null); // snapshot during a run (transient UI)
  const list = frozen ?? targets;
  if (!list.length) return null;
  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={`Reject ${list.length} request${list.length === 1 ? "" : "s"}`}
      description="The note is sent to every requester."
      fields={[{ name: "notes", label: "Note to requesters", type: "textarea", required: true, rows: 3 }]}
      submitLabel={`Reject ${list.length}`}
      destructive
      preview={() => <TargetList targets={list} />}
      onSubmit={async (v) => {
        const run = list;
        setFrozen(run);
        const failed = [];
        for (const r of run) {
          try {
            await reject(r, v.notes.trim());
          } catch (err) {
            failed.push(`${shortId(r.Id)}: ${err.message}`);
          }
        }
        setFrozen(null);
        const done = run.length - failed.length;
        if (failed.length) {
          toast.error(`Rejected ${done} of ${run.length} requests`);
          throw new Error(failed.join("\n"));
        }
        toast.success(`Rejected ${done} request${done === 1 ? "" : "s"}`);
      }}
    />
  );
}

function TargetList({ targets, results = {} }) {
  return (
    <ul className="tw:flex tw:max-h-64 tw:flex-col tw:divide-y tw:overflow-y-auto tw:rounded-md tw:border tw:text-[13px]">
      {targets.map((r) => {
        const res = results[r.Id];
        return (
          <li key={r.Id} className="tw:flex tw:items-start tw:gap-2.5 tw:px-3 tw:py-2">
            <span className="tw:mt-0.5 tw:flex tw:size-4 tw:shrink-0 tw:items-center tw:justify-center">
              {res === "running" ? <Loader2 className="tw:size-3.5 tw:animate-spin tw:text-muted-foreground" /> : res?.ok ? <Check className="tw:size-3.5 tw:text-ok" /> : res ? <X className="tw:size-3.5 tw:text-crit-text" /> : null}
            </span>
            <span className="tw:min-w-0">
              <span className="tw:font-medium">{typeLabel(r.reqtype)}</span>
              <span className="tw:text-muted-foreground"> · {describeRequest(r).text}</span>
              {res && res !== "running" && !res.ok && <span className="tw:block tw:text-xs tw:text-crit-text">{res.message}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Bulk approve: confirm the list, then run requestApprove one at a time (gentle on coactd),
 * showing ✓/✕ per row until Done. The results are transient dialog state.
 */
function BulkApproveDialog({ targets, approve, onOpenChange }) {
  const [results, setResults] = useState({});
  const [phase, setPhase] = useState("confirm"); // confirm | running | done
  // Freeze the list once started: approved rows leave the pending query as it refetches.
  const [frozen, setFrozen] = useState(null);
  const list = frozen ?? targets;
  const okCount = Object.values(results).filter((r) => r?.ok).length;

  const run = async () => {
    setFrozen(list);
    setPhase("running");
    let ok = 0;
    for (const r of list) {
      setResults((s) => ({ ...s, [r.Id]: "running" }));
      try {
        await approve(r);
        ok += 1;
        setResults((s) => ({ ...s, [r.Id]: { ok: true } }));
      } catch (err) {
        setResults((s) => ({ ...s, [r.Id]: { ok: false, message: err.message ?? String(err) } }));
      }
    }
    setPhase("done");
    (ok === list.length ? toast.success : toast.warning)(`Approved ${ok} of ${list.length} request${list.length === 1 ? "" : "s"}`);
  };

  if (!list.length) return null;
  return (
    <Dialog open onOpenChange={(o) => phase !== "running" && onOpenChange(o)}>
      <DialogContent className="tw:sm:max-w-lg" showCloseButton={phase !== "running"}>
        <DialogHeader>
          <DialogTitle>{phase === "done" ? `Approved ${okCount} of ${list.length}` : `Approve ${list.length} request${list.length === 1 ? "" : "s"}?`}</DialogTitle>
          <DialogDescription>
            {phase === "confirm" ? "Each one is handed to coactd to provision. Approvals can’t be undone." : phase === "running" ? "Approving one at a time…" : "Rows marked ✕ are still pending; open them to see why."}
          </DialogDescription>
        </DialogHeader>
        <TargetList targets={list} results={results} />
        <DialogFooter>
          {phase === "done" ? (
            <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" size="sm" disabled={phase === "running"} onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button size="sm" disabled={phase === "running"} onClick={run} className={cn(phase === "running" && "tw:cursor-wait")}>
                {phase === "running" && <Loader2 className="tw:animate-spin" />}
                Approve {list.length}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
