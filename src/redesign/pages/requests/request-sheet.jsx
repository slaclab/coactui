"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, FileQuestion, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ActionsMenu, EmptyState, Skeleton, StatusPill, Timeline } from "../../kit";
import { formatDate } from "../../lib/format";
import { useDialogParam } from "../../lib/navigation";
import { useViewer } from "../../providers/viewer";
import { useRequestContext, useRequesterLookup, useRequestMutations } from "./queries";
import { RequestChange } from "./request-change";
import {
  approveBlockedReason,
  auditEntries,
  canApprove,
  canManage,
  canReject,
  requestActions,
  requesterOf,
  shortId,
  statusLabel,
  statusMeta,
  typeLabel,
} from "./request-meta";

/**
 * Review sheet (artboard 3AW): opens from ?req=<Id>, so it can be deep-linked. ↑/↓ walk the
 * table's current rows. Only the note being written is local state (keyed by request).
 *
 * KIT REQUEST: promote the frame (title row, ↑/↓, close, scroll body, sticky footer) to a
 * kit EntitySheet — the repos peek needs the same shell.
 */
export function RequestSheet({ reqId, rows, loadedRows, loading, view, focusNote, onNavigate, onClose, onClearFilters }) {
  const noteRef = useRef(null);
  const req = rows.find((r) => r.Id === reqId) ?? loadedRows.find((r) => r.Id === reqId) ?? null;
  const index = req ? rows.findIndex((r) => r.Id === req.Id) : -1;
  const prev = index > 0 ? rows[index - 1] : null;
  const next = index >= 0 && index < rows.length - 1 ? rows[index + 1] : null;

  return (
    <Sheet open={!!reqId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="tw:w-full tw:gap-0 tw:p-0 tw:sm:w-140 tw:sm:max-w-none"
        onOpenAutoFocus={(e) => {
          if (focusNote && noteRef.current) {
            e.preventDefault();
            noteRef.current.focus();
          }
        }}
      >
        {req ? (
          <SheetBody
            key={req.Id}
            req={req}
            view={view}
            noteRef={noteRef}
            prev={prev}
            next={next}
            onNavigate={onNavigate}
            onClose={onClose}
            // On Pending an approved/rejected row leaves the list: move on instead of showing
            // "isn't in the current list". Other views keep the row (its status changes).
            onDone={view === "pending" ? () => (next ? onNavigate(next.Id) : prev ? onNavigate(prev.Id) : onClose()) : undefined}
          />
        ) : (
          <>
            <SheetHeaderRow title={loading ? "Loading request…" : "Request"} onClose={onClose} />
            <div className="tw:p-6">
              {loading ? (
                <div className="tw:flex tw:flex-col tw:gap-3">
                  <Skeleton className="tw:h-24 tw:w-full" />
                  <Skeleton className="tw:h-4 tw:w-64" />
                  <Skeleton className="tw:h-4 tw:w-48" />
                </div>
              ) : (
                <EmptyState
                  icon={FileQuestion}
                  title="This request isn’t in the current list"
                  description="It may be outside these filters or the time window."
                  actions={
                    <>
                      <Button variant="outline" size="sm" onClick={onClearFilters}>Clear filters</Button>
                      <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
                    </>
                  }
                />
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SheetHeaderRow({ title, badge, prev, next, onNavigate, onClose, children }) {
  const nav = "tw:flex tw:size-8 tw:items-center tw:justify-center tw:rounded-md tw:border tw:text-foreground tw:hover:bg-muted tw:disabled:opacity-40 tw:disabled:hover:bg-transparent";
  return (
    <div className="tw:flex tw:flex-col tw:gap-2.5 tw:border-b tw:pt-5 tw:pr-5 tw:pb-4 tw:pl-6">
      <div className="tw:flex tw:items-center tw:justify-between tw:gap-3">
        <div className="tw:flex tw:min-w-0 tw:items-center tw:gap-2">
          <SheetTitle className="tw:truncate tw:text-lg tw:leading-6.5 tw:font-semibold">{title}</SheetTitle>
          {badge}
        </div>
        <div className="tw:flex tw:shrink-0 tw:gap-1">
          {onNavigate && (
            <>
              <button type="button" className={nav} disabled={!prev} onClick={() => onNavigate(prev.Id)} aria-label="Previous request"><ChevronUp className="tw:size-3.5" /></button>
              <button type="button" className={nav} disabled={!next} onClick={() => onNavigate(next.Id)} aria-label="Next request"><ChevronDown className="tw:size-3.5" /></button>
            </>
          )}
          <button type="button" className="tw:flex tw:size-8 tw:items-center tw:justify-center tw:rounded-md tw:hover:bg-muted" onClick={onClose} aria-label="Close">
            <X className="tw:size-4" />
          </button>
        </div>
      </div>
      {children ?? <SheetDescription className="tw:sr-only">Request details</SheetDescription>}
    </div>
  );
}

function SheetBody({ req, view, noteRef, prev, next, onNavigate, onClose, onDone }) {
  const { can } = useViewer();
  const { openDialog } = useDialogParam();
  const m = useRequestMutations();
  const ctx = useRequestContext(req);
  const lookup = useRequesterLookup(req);
  const [note, setNote] = useState(""); // the note being written, while this request is open
  const [pending, setPending] = useState(null); // "approve" | "reject" while a mutation runs
  const [error, setError] = useState(null);

  const status = statusMeta(req.approvalstatus);
  const approveOk = canApprove(req);
  const rejectOk = canReject(req, can);
  const manage = canManage(req, can);
  const blocked = approveBlockedReason(req);
  // Leaders/PIs may approve memberships (canapprove) but every other action is czar/admin.
  const leaderOnly = approveOk && !manage;
  const czarWho = req.facilityname ? `${req.facilityname} czars or admins` : "admins";
  const groups = requestActions(req, can, { onLookup: () => lookup.refetch?.() });
  const title = req.reqtype === "UserAccount" && lookup.enabled && !lookup.loading && !lookup.hasUid ? "New SDF account request" : `${typeLabel(req.reqtype)} request`;
  const role = ctx.repo ? (ctx.repo.principal === req.requestedby ? " (PI)" : (ctx.repo.leaders ?? []).includes(req.requestedby) ? " (Leader)" : "") : "";

  const act = async (kind) => {
    setPending(kind);
    setError(null);
    try {
      if (kind === "approve") await m.approveWithToast(req);
      else {
        const run = m.reject(req, note.trim());
        toast.promise(run, { loading: "Rejecting…", success: "Rejected — the requester is notified", error: (err) => err.message });
        await run;
        setNote("");
      }
      onDone?.();
    } catch (err) {
      setError(err.message ?? String(err));
    } finally {
      setPending(null);
    }
  };

  const nothingAllowed = !approveOk && !rejectOk && !manage;
  return (
    <>
      <SheetHeaderRow
        title={title}
        badge={<StatusPill tone={status.tone} title={status.hint}>{statusLabel(req.approvalstatus, view)}</StatusPill>}
        prev={prev}
        next={next}
        onNavigate={onNavigate}
        onClose={onClose}
      >
        <SheetDescription className="tw:text-[13px] tw:text-muted-foreground">
          Requested by <span className="tw:font-mono">{requesterOf(req) ?? "—"}</span>{role} · {formatDate(req.timeofrequest, { time: true })} · <span className="tw:tabular-nums">{shortId(req.Id)}</span>
        </SheetDescription>
      </SheetHeaderRow>

      <div className="tw:flex tw:min-h-0 tw:grow tw:flex-col tw:gap-5.5 tw:overflow-y-auto tw:px-6 tw:py-5">
        <RequestChange req={req} />

        <section className="tw:flex tw:flex-col tw:gap-1.5">
          <h3 className="tw:text-[13px] tw:font-semibold">Justification</h3>
          {req.notes ? <p className="tw:text-sm tw:leading-5.5 tw:whitespace-pre-line">{req.notes}</p> : <p className="tw:text-sm tw:text-muted-foreground">No justification given.</p>}
        </section>

        <section className="tw:flex tw:flex-col tw:gap-2.5">
          <h3 className="tw:text-[13px] tw:font-semibold">Activity</h3>
          <Timeline entries={auditEntries(req).map((e) => ({ ...e, title: <span className="tw:text-[13px] tw:text-muted-strong">{e.title}</span> }))} />
        </section>

        {rejectOk && (
          <section className="tw:flex tw:flex-col tw:gap-1.5">
            <label htmlFor={`note-${req.Id}`} className="tw:text-[13px] tw:font-medium">Note to requester</label>
            <Textarea
              id={`note-${req.Id}`}
              ref={noteRef}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Required when rejecting"
              disabled={!!pending}
            />
            <span className="tw:text-xs tw:text-muted-foreground">Sent with the rejection. coact-api doesn’t store notes on approval.</span>
          </section>
        )}
      </div>

      <div className="tw:flex tw:flex-col tw:gap-2 tw:border-t tw:px-6 tw:py-3.5">
        {error && <p role="alert" className="tw:rounded-md tw:bg-crit-bg tw:px-3 tw:py-2 tw:text-[13px] tw:text-crit-text">{error}</p>}
        <div className="tw:flex tw:items-center tw:justify-between tw:gap-3">
          <ActionsMenu groups={groups} onDialog={(d) => openDialog(d, req.Id)} label="More request actions" align="start" className="tw:border tw:bg-muted" />
          {nothingAllowed ? (
            <span className="tw:text-[13px] tw:text-muted-foreground">
              {view === "mine" ? (["NotActedOn", "PreApproved"].includes(req.approvalstatus) ? "Waiting on review" : null) : `Only ${czarWho} can act on this request`}
            </span>
          ) : (
            <div className="tw:flex tw:items-center tw:gap-2">
              {req.approvalstatus === "NotActedOn" && (
                <Button
                  variant="outline"
                  className="tw:text-crit-text tw:hover:text-crit-text"
                  disabled={!rejectOk || !note.trim() || !!pending}
                  title={!rejectOk ? `Only ${czarWho} can reject` : !note.trim() ? "Write a note to the requester first" : undefined}
                  onClick={() => act("reject")}
                >
                  {pending === "reject" && <Loader2 className="tw:animate-spin" />}
                  Reject
                </Button>
              )}
              {req.approvalstatus === "NotActedOn" && (
                <Button disabled={!approveOk || !!pending} title={blocked ?? undefined} onClick={() => act("approve")}>
                  {pending === "approve" && <Loader2 className="tw:animate-spin" />}
                  Approve
                </Button>
              )}
              {req.approvalstatus === "PreApproved" && rejectOk && (
                <Button variant="outline" className="tw:text-crit-text tw:hover:text-crit-text" disabled={!note.trim() || !!pending} onClick={() => act("reject")}>Reject</Button>
              )}
            </div>
          )}
        </div>
        {leaderOnly && <span className="tw:text-xs tw:text-muted-foreground">As a repo leader you can approve this membership; only {czarWho} can reject it.</span>}
      </div>
    </>
  );
}
