"use client";

import { useState } from "react";
import { gql, useQuery } from "@apollo/client";
import { Loader2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ErrorAlert, useDebounced } from "../../kit";
import { useViewer } from "../../providers/viewer";
import { createLocalStore } from "./local-store";
import { PaletteBody, PaletteDialog, PaletteGroup, PaletteItem, PaletteNote } from "./palette-frame";

/*
 * Impersonation is client-only, shared with the legacy half: localStorage "imptk" holds the
 * username, providers/apollo.jsx sends it as the `coactimp` header, and start/stop reload the
 * page so every query re-runs as the new identity.
 */
const imptk = createLocalStore("imptk");

export function startImpersonation(username) {
  imptk.set(username);
  window.location.reload();
}

export function stopImpersonation() {
  imptk.remove();
  window.location.reload();
}

/**
 * { target, active, failed, error, loading, username }
 *   target  — the imptk value (null when unset)
 *   active  — the API confirms the impersonation (whoami.isImpersonating)
 *   failed  — imptk is set but whoami errored (e.g. unknown user); `error` holds the reason
 */
export function useImpersonation() {
  const raw = imptk.useValue();
  const target = raw && raw !== "null" ? raw : null;
  const { viewer, loading, error } = useViewer();
  const active = !!viewer?.isImpersonating;
  return {
    target,
    active,
    loading: !!target && loading,
    failed: !!target && !loading && !viewer && !!error,
    error,
    username: viewer?.isImpersonating ? viewer.username : target,
    stoppable: active || !!target,
  };
}

/** User-menu items: "Impersonate…" (admins, not impersonating) and "Stop impersonating". */
export function ImpersonationMenuItems({ onImpersonate }) {
  const { can } = useViewer();
  const { stoppable } = useImpersonation();
  const canStart = can.canImpersonate() && !stoppable;
  if (!canStart && !stoppable) return null;
  return (
    <>
      <DropdownMenuSeparator />
      {canStart && (
        <DropdownMenuItem onSelect={() => onImpersonate?.()}>
          <UserRound /> Impersonate…
        </DropdownMenuItem>
      )}
      {stoppable && (
        <DropdownMenuItem onSelect={stopImpersonation}>
          <UserRound /> Stop impersonating
        </DropdownMenuItem>
      )}
    </>
  );
}

/** h-9 amber band under the top bar while impersonating (spec §3, Paper States & Components). */
export function ImpersonationStrip() {
  const imp = useImpersonation();
  if (!imp.active && !imp.loading && !imp.failed) return null;
  return (
    <div
      role="status"
      className="tw:flex tw:h-9 tw:shrink-0 tw:items-center tw:justify-between tw:gap-4 tw:border-b tw:border-warn/35 tw:bg-warn-bg tw:px-6 tw:text-[13px] tw:leading-5 tw:text-warn-text"
    >
      <span className="tw:min-w-0 tw:truncate">
        {imp.failed ? (
          <>
            Couldn’t view as <span className="tw:font-mono tw:font-medium">{imp.target}</span> — {failureReason(imp.error)}.
          </>
        ) : (
          <>
            Viewing as <span className="tw:font-mono tw:font-medium">{imp.username}</span>
            {imp.loading ? "…" : " — actions run as this user."}
          </>
        )}
      </span>
      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={stopImpersonation}
        className="tw:h-auto tw:shrink-0 tw:p-0 tw:text-[13px] tw:font-medium tw:text-warn-text tw:underline tw:decoration-1 tw:hover:decoration-2"
      >
        Stop impersonating
      </Button>
    </div>
  );
}

// The API's message for an unknown user ends with the raw Mongo filter; drop that part.
const failureReason = (error) => (error?.message ?? "the API rejected this user").replace(/\s+using filter[\s\S]*$/, "").replace(/\.$/, "");

const IMPERSONATE_USERS = gql`
  query ShellImpersonateUsers($regex: String!) {
    usersMatchingUserName(regex: $regex) { username fullname }
  }
`;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "Impersonate user" picker: debounced username search; choosing a user reloads as them. */
export function ImpersonateDialog({ open, onOpenChange }) {
  return (
    <PaletteDialog open={open} onOpenChange={onOpenChange} title="Impersonate user" description="Search for a user by username. The page reloads as that user.">
      <ImpersonateContent />
    </PaletteDialog>
  );
}

function ImpersonateContent() {
  const [query, setQuery] = useState(""); // local input state while the dialog is open
  const q = useDebounced(query.trim());
  const tooShort = q.length < 2;
  const { data, loading, error, refetch } = useQuery(IMPERSONATE_USERS, { skip: tooShort, variables: { regex: `^${escapeRegex(q)}` } });
  const users = (data?.usersMatchingUserName ?? []).slice(0, 50);
  const pending = query.trim() !== q; // still debouncing

  return (
    <PaletteBody
      query={query}
      onQueryChange={setQuery}
      label="Impersonate user"
      placeholder="Impersonate user — search by username…"
      footer={<><span>↵ impersonate</span><span>·</span><span>The page reloads as this user.</span></>}
    >
      {tooShort ? (
        <PaletteNote>Type at least 2 characters</PaletteNote>
      ) : (loading && !data) || (pending && !data) ? (
        <div className="tw:flex tw:justify-center tw:py-6" aria-label="Searching users"><Loader2 className="tw:size-4 tw:animate-spin tw:text-muted-foreground" /></div>
      ) : error && !data ? (
        <ErrorAlert error={error} what="users" onRetry={refetch} className="tw:my-1 tw:px-3 tw:py-2 tw:text-xs" />
      ) : users.length === 0 ? (
        <PaletteNote>No users match “{q}”.</PaletteNote>
      ) : (
        <PaletteGroup heading="Users">
          {users.map((u) => (
            <PaletteItem key={u.username} value={u.username} onSelect={() => startImpersonation(u.username)} meta={u.fullname}>
              <span className="tw:truncate tw:font-mono">{u.username}</span>
            </PaletteItem>
          ))}
        </PaletteGroup>
      )}
    </PaletteBody>
  );
}
