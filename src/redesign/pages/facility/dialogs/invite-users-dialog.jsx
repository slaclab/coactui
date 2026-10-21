"use client";

import { useState } from "react";
import { useApolloClient, useMutation, useQuery } from "@apollo/client";
import { toast } from "sonner";
import { CircleCheck, CircleX, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFacility } from "../facility-context";
import { INVITE_EXISTING, INVITE_USER } from "../queries";
import { DirectoryUserSearch } from "./directory-user-search";

const eppnOf = (username) => `${username}@slac.stanford.edu`;

/**
 * Invite users (spec §5, sm:max-w-xl). Each invite is a PreApproved UserAccount request (as in
 * legacy); the invitee finishes on /register. After submit the dialog shows per-user results
 * until Done. (RequestDialog has no per-item result mode; see kit requests.)
 */
export function InviteUsersDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <InviteUsersBody onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function InviteUsersBody({ onClose }) {
  const { name } = useFacility();
  const [selected, setSelected] = useState([]); // form value while the dialog is open
  const [results, setResults] = useState(null); // { [username]: true | reason } after submit
  const [pending, setPending] = useState(false);
  const [invite] = useMutation(INVITE_USER);
  const client = useApolloClient();
  const toggle = (u) => setSelected((s) => (s.some((x) => x.username === u.username) ? s.filter((x) => x.username !== u.username) : [...s, u]));

  const submit = async (e) => {
    e.preventDefault();
    if (!selected.length) return;
    setPending(true);
    const settled = await Promise.allSettled(
      selected.map((u) =>
        invite({
          variables: { request: { reqtype: "UserAccount", eppn: eppnOf(u.username), preferredUserName: u.username, facilityname: name, approvalstatus: "PreApproved" } },
        }),
      ),
    );
    const res = Object.fromEntries(selected.map((u, i) => [u.username, settled[i].status === "fulfilled" ? true : settled[i].reason?.message ?? "Failed"]));
    const ok = Object.values(res).filter((r) => r === true).length;
    setResults(res);
    setPending(false);
    if (ok) client.refetchQueries({ include: ["FacilityPendingRequests"] });
    (ok === selected.length ? toast.success : toast.error)(`Invited ${ok} of ${selected.length} user${selected.length === 1 ? "" : "s"} to ${name}`);
  };

  if (results) {
    return (
      <DialogContent className="tw:sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Invitations · {name}</DialogTitle>
          <DialogDescription>Invited people finish registering at Coact; they appear in {name} once their account is created.</DialogDescription>
        </DialogHeader>
        <ul className="tw:divide-y tw:rounded-lg tw:border">
          {selected.map((u) => (
            <li key={u.username} className="tw:flex tw:h-11 tw:items-center tw:gap-3 tw:px-3 tw:text-sm">
              <span className="tw:min-w-0 tw:flex-1 tw:truncate">{u.fullname || u.username} <span className="tw:font-mono tw:text-xs tw:text-muted-foreground">{u.username}</span></span>
              {results[u.username] === true ? (
                <span className="tw:flex tw:items-center tw:gap-1.5 tw:text-[13px] tw:text-ok-text"><CircleCheck className="tw:size-4" /> Invited</span>
              ) : (
                <span className="tw:flex tw:min-w-0 tw:items-center tw:gap-1.5 tw:text-[13px] tw:text-crit-text" title={results[u.username]}>
                  <CircleX className="tw:size-4 tw:shrink-0" /> <span className="tw:truncate">{results[u.username]}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button size="sm" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="tw:sm:max-w-xl">
      <form onSubmit={submit} className="tw:flex tw:flex-col tw:gap-5">
        <DialogHeader>
          <DialogTitle>Invite users to {name}</DialogTitle>
          <DialogDescription>Search the SLAC directory. Each person gets a pre-approved {name} account request they complete when they register.</DialogDescription>
        </DialogHeader>
        <DirectoryUserSearch selected={selected} onToggle={toggle} disabled={pending} />
        {selected.length > 0 && (
          <ul className="tw:flex tw:flex-col tw:gap-1.5">
            {selected.map((u) => (
              <li key={u.username} className="tw:flex tw:h-8 tw:items-center tw:gap-2 tw:rounded-md tw:bg-neutral-bg tw:pr-1 tw:pl-2.5 tw:text-[13px]">
                <span className="tw:truncate">{u.fullname || u.username}</span>
                <span className="tw:font-mono tw:text-xs tw:text-muted-strong">{u.username}</span>
                <ExistingRequestHint username={u.username} facility={name} />
                <button type="button" aria-label={`Remove ${u.username}`} onClick={() => toggle(u)} className="tw:ml-auto tw:rounded tw:p-1 tw:text-muted-foreground tw:hover:bg-muted">
                  <X className="tw:size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter className="tw:items-center">
          <span className="tw:mr-auto tw:text-[13px] tw:text-muted-foreground tw:tabular-nums">{selected.length} selected</span>
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" size="sm" disabled={!selected.length || pending}>
            {pending && <Loader2 className="tw:animate-spin" />}
            {selected.length ? `Invite ${selected.length} user${selected.length === 1 ? "" : "s"}` : "Invite users"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

/** "Already requested for LCLS" when this person already has an open account request here. */
function ExistingRequestHint({ username, facility }) {
  const { data } = useQuery(INVITE_EXISTING, { variables: { eppn: eppnOf(username) } });
  const existing = (data?.requestsExistingForEPPN ?? []).find((r) => r.reqtype === "UserAccount" && r.facilityname === facility);
  if (!existing) return null;
  return <span className="tw:text-xs tw:text-warn-text">Already requested for {facility}{existing.approvalstatus ? ` · ${existing.approvalstatus}` : ""}</span>;
}
