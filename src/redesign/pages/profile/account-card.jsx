"use client";

import { useMemo } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Chip, CopyButton, ErrorAlert, SectionCard, Skeleton, StatusPill } from "../../kit";
import { formatDate } from "../../lib/format";
import { useDialogParam } from "../../lib/navigation";
import { useProfileGids } from "./queries";

/**
 * One row of the read-only Account form (Paper "Account (FieldsForm read)"): fixed label
 * column, value, optional trailing action. Kit request: DefinitionList variant="rows".
 */
export function AccountRow({ label, children, action, multiline }) {
  return (
    <div className={cn("tw:flex tw:gap-5 tw:border-b tw:last:border-b-0", multiline ? "tw:items-start tw:py-3.5" : "tw:min-h-12 tw:items-center tw:py-2")}>
      <div className={cn("tw:w-42.5 tw:shrink-0 tw:text-[13px] tw:leading-5 tw:text-muted-foreground", multiline && "tw:pt-0.75")}>{label}</div>
      <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-wrap tw:items-center tw:gap-x-3 tw:gap-y-1.5 tw:text-sm">{children}</div>
      {action && <div className="tw:shrink-0">{action}</div>}
    </div>
  );
}

const Muted = ({ children }) => <span className="tw:text-[13px] tw:text-muted-foreground">{children}</span>;

const ROW_LABELS = ["Username", "UID", "Preferred email", "Login shell", "EPPNs", "Unix groups"];

export function AccountCard({ me, loading, pendingShell }) {
  return (
    <SectionCard
      title="Account"
      action={<span className="tw:pt-0.5 tw:text-xs tw:text-muted-foreground">From SLAC identity · contact SDF help to change your name</span>}
      bodyClassName="tw:border-t tw:py-1"
    >
      {loading || !me ? (
        ROW_LABELS.map((label, i) => (
          <AccountRow key={label} label={label}>
            <Skeleton className={cn("tw:h-4", i % 2 ? "tw:w-24" : "tw:w-40")} />
          </AccountRow>
        ))
      ) : (
        <>
          <AccountRow label="Username">
            <span className="tw:flex tw:items-center tw:gap-1 tw:font-mono">
              {me.username}
              <CopyButton value={me.username} label="Copy username" />
            </span>
          </AccountRow>
          <AccountRow label="UID">
            <span className="tw:font-mono tw:tabular-nums">{me.uidnumber ?? "—"}</span>
          </AccountRow>
          <AccountRow label="Preferred email">{me.preferredemail || <Muted>—</Muted>}</AccountRow>
          <ShellRow me={me} pendingShell={pendingShell} />
          <EppnRow eppns={me.eppns ?? []} />
          <UnixGroupsRow me={me} />
        </>
      )}
    </SectionCard>
  );
}

const basename = (path) => path?.split("/").filter(Boolean).at(-1) ?? path;

function ShellRow({ me, pendingShell }) {
  const { openDialog } = useDialogParam();
  const reason = pendingShell ? "A shell change is already in progress" : undefined;
  return (
    <AccountRow
      label="Login shell"
      action={
        <span title={reason}>
          <Button variant="outline" size="sm" disabled={!!pendingShell} onClick={() => openDialog("change-shell")}>Change…</Button>
        </span>
      }
    >
      <span className="tw:font-mono">{me.shell || "—"}</span>
      {pendingShell?.shell && <StatusPill tone="warn" dot={false}>{basename(pendingShell.shell)} at next login</StatusPill>}
    </AccountRow>
  );
}

/** Outlined mono chip used for EPPNs (Paper), with an optional remove button. */
function EppnChip({ eppn, onRemove }) {
  return (
    <Chip mono className={cn("tw:h-6.5 tw:border tw:bg-primary-foreground tw:pl-2.25 tw:font-normal tw:text-foreground", onRemove ? "tw:pr-1" : "tw:pr-2.25")}>
      {eppn}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${eppn}`}
          title={`Remove ${eppn}`}
          className="tw:flex tw:size-5 tw:items-center tw:justify-center tw:rounded tw:text-muted-foreground tw:hover:bg-muted tw:hover:text-foreground"
        >
          <X className="tw:size-3" strokeWidth={2.5} />
        </button>
      )}
    </Chip>
  );
}

function EppnRow({ eppns }) {
  const { openDialog } = useDialogParam();
  // The API rejects an empty list, so × only shows while more than one remains.
  const removable = eppns.length > 1;
  return (
    <AccountRow
      label="EPPNs"
      multiline
      action={<Button variant="ghost" size="sm" className="tw:-my-1" onClick={() => openDialog("add-eppn")}>Add</Button>}
    >
      {eppns.length ? eppns.map((e) => <EppnChip key={e} eppn={e} onRemove={removable ? () => openDialog("remove-eppn", e) : undefined} />) : <Muted>—</Muted>}
    </AccountRow>
  );
}

function UnixGroupsRow({ me }) {
  const { gids, loading, error, refetch } = useProfileGids();
  const groups = useMemo(() => {
    const byName = new Map();
    for (const g of me.accessGroupObjs ?? []) byName.set(g.name, g.gidnumber);
    for (const name of me.groups ?? []) if (!byName.has(name)) byName.set(name, null);
    return [...byName].map(([name, gid]) => ({ name, gid })).sort((a, b) => a.name.localeCompare(b.name));
  }, [me]);
  // Secondary GIDs that no access group names (LDAP-only groups) show as bare numbers.
  const unnamed = useMemo(() => {
    const known = new Set(groups.map((g) => g.gid).filter((g) => g != null));
    return (gids?.secondaryGidNumbers ?? []).filter((n) => !known.has(n) && n !== gids?.primaryGid);
  }, [groups, gids]);

  const empty = !groups.length && !unnamed.length;
  return (
    <AccountRow label="Unix groups" multiline>
      <div className="tw:flex tw:w-full tw:flex-col tw:gap-2">
        <div className="tw:flex tw:flex-wrap tw:gap-1.5">
          {groups.map((g) => (
            <Chip key={g.name} mono title={g.gid != null ? `GID ${g.gid}` : undefined} className="tw:h-6 tw:bg-muted tw:font-normal">{g.name}</Chip>
          ))}
          {unnamed.map((n) => (
            <Chip key={n} mono title={`GID ${n} (no Coact group name)`} className="tw:h-6 tw:bg-muted tw:font-normal tw:tabular-nums">{n}</Chip>
          ))}
          {empty && !loading && <Muted>No Unix groups</Muted>}
          {loading && <Skeleton className="tw:h-6 tw:w-24" />}
        </div>
        {gids && (
          <p className="tw:text-xs tw:text-muted-foreground tw:tabular-nums">
            Primary GID <span className="tw:font-mono">{gids.primaryGid ?? "—"}</span>
            {" · "}{(gids.secondaryGidNumbers ?? []).length} secondary GIDs
            {gids.syncedAt && <> · synced {formatDate(gids.syncedAt)}</>}
          </p>
        )}
        <ErrorAlert error={error} onRetry={refetch} what="POSIX groups" className="tw:px-3 tw:py-2 tw:text-xs" />
      </div>
    </AccountRow>
  );
}
