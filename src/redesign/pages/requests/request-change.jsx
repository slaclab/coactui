"use client";

import { DefinitionList, ErrorAlert, MeterBar, meterStatus, Skeleton, StatusPill } from "../../kit";
import { formatDate, formatPct, formatStorage, formatStoragePair } from "../../lib/format";
import { cn } from "@/lib/utils";
import { useRequestContext, useRequesterLookup } from "./queries";

/* Per-type "Change" card at the top of the review sheet (artboard 3AW, "Change"). */

export function RequestChange({ req }) {
  const Card = CARDS[req.reqtype] ?? GenericChange;
  return <Card req={req} />;
}

const CARDS = {
  RepoStorageAllocation: StorageChange,
  UserStorageAllocation: UserQuotaChange,
  RepoComputeAllocation: ComputeChange,
  RepoMembership: MembershipChange,
  RepoRemoveUser: MembershipChange,
  UserAccount: AccountChange,
  NewRepo: NewRepoChange,
};

function Frame({ title, aside, children }) {
  return (
    <section className="tw:flex tw:flex-col tw:gap-3 tw:rounded-lg tw:border tw:p-4">
      <div className="tw:flex tw:items-baseline tw:justify-between tw:gap-3">
        <div className="tw:min-w-0 tw:truncate tw:font-mono tw:text-sm tw:font-medium">{title}</div>
        {aside && <div className="tw:shrink-0 tw:text-[13px] tw:text-muted-foreground">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

/** "8 TB → 13 TB +5 TB": struck-through before, big after, muted delta. */
function BeforeAfter({ before, after, delta }) {
  return (
    <div className="tw:flex tw:flex-wrap tw:items-baseline tw:gap-3 tw:tabular-nums">
      {before != null && (
        <>
          <span className="tw:text-[22px] tw:leading-7 tw:text-muted-foreground tw:line-through tw:decoration-1">{before}</span>
          <span className="tw:text-lg tw:leading-7 tw:text-muted-foreground" aria-hidden>→</span>
        </>
      )}
      <span className="tw:text-[28px] tw:leading-8 tw:font-semibold tw:tracking-[-0.02em]">{after}</span>
      {delta && <span className="tw:text-[13px] tw:text-muted-strong">{delta}</span>}
    </div>
  );
}

function ContextState({ ctx, lines = 2 }) {
  if (ctx.error) return <ErrorAlert error={ctx.error} onRetry={ctx.refetch} what="allocation context" />;
  if (ctx.loading)
    return (
      <div className="tw:flex tw:flex-col tw:gap-2">
        {Array.from({ length: lines }, (_, i) => <Skeleton key={i} className={i ? "tw:h-2 tw:w-full" : "tw:h-4 tw:w-48"} />)}
      </div>
    );
  return null;
}

const signedStorage = (gb) => (gb === 0 ? "no change" : `${gb > 0 ? "+" : "−"}${formatStorage(Math.abs(gb))}`);
const signedPct = (p) => (p === 0 ? "no change" : `${p > 0 ? "+" : "−"}${formatPct(Math.abs(p))}`);

function StorageChange({ req }) {
  const ctx = useRequestContext(req);
  const current = ctx.repo?.currentStorageAllocations?.find((s) => s.storagename === req.storagename && s.purpose === req.purpose);
  const before = current?.gigabytes ?? 0;
  const purchase = ctx.facility?.storagepurchases?.find((p) => p.storagename === req.storagename && (!p.purpose || p.purpose === req.purpose))
    ?? ctx.facility?.storagepurchases?.find((p) => p.storagename === req.storagename);
  const after = (purchase?.allocated ?? 0) - before + (req.gigabytes ?? 0);
  const pct = purchase?.purchased ? (after / purchase.purchased) * 100 : 0;
  const status = meterStatus("compute-allocated", pct);
  return (
    <Frame title={req.reponame} aside={[req.purpose, req.storagename].filter(Boolean).join(" · ")}>
      <BeforeAfter before={ctx.repo ? formatStorage(before) : null} after={formatStorage(req.gigabytes)} delta={ctx.repo ? signedStorage((req.gigabytes ?? 0) - before) : null} />
      <ContextState ctx={ctx} />
      {purchase && (
        <div className="tw:flex tw:flex-col tw:gap-1.5">
          <div className="tw:flex tw:justify-between tw:gap-3 tw:text-xs">
            <span className="tw:text-muted-strong">{req.facilityname} {req.storagename} · {req.purpose} after approval</span>
            <span className="tw:font-medium tw:tabular-nums">{formatStoragePair(after, purchase.purchased)} allocated</span>
          </div>
          <MeterBar pct={pct} status={status} className="tw:h-2 tw:w-full" />
          <span className="tw:text-xs tw:text-muted-foreground">
            {after <= purchase.purchased ? `${formatStorage(purchase.purchased - after)} stays unallocated` : `${formatStorage(after - purchase.purchased)} over the purchase`}
            {current?.usage?.gigabytes != null && ` · repo uses ${formatStorage(current.usage.gigabytes)} today`}
          </span>
        </div>
      )}
      {!ctx.loading && !ctx.error && ctx.facility && !purchase && (
        <span className="tw:text-xs tw:text-muted-foreground">{req.facilityname} has no {req.storagename} purchase on record.</span>
      )}
    </Frame>
  );
}

function UserQuotaChange({ req }) {
  return (
    <Frame title={req.username} aside={[req.purpose, req.storagename].filter(Boolean).join(" · ")}>
      <BeforeAfter after={formatStorage(req.gigabytes)} />
      {req.inodes ? <span className="tw:text-xs tw:text-muted-foreground">{req.inodes.toLocaleString("en")} inodes</span> : null}
    </Frame>
  );
}

function ComputeChange({ req }) {
  const ctx = useRequestContext(req);
  const current = ctx.repo?.currentComputeAllocations?.find((a) => a.clustername === req.clustername);
  const purchase = ctx.facility?.computepurchases?.find((p) => p.clustername === req.clustername);
  const before = current?.percentOfFacility ?? 0;
  return (
    <Frame title={req.reponame} aside={req.clustername && <span className="tw:font-mono">{req.clustername}</span>}>
      <BeforeAfter before={ctx.repo ? formatPct(before) : null} after={formatPct(req.percentOfFacility)} delta={ctx.repo ? signedPct((req.percentOfFacility ?? 0) - before) : null} />
      <ContextState ctx={ctx} lines={1} />
      <DefinitionList
        className="tw:text-[13px]"
        items={[
          { term: "Burst", value: `${formatPct(req.burstPercentOfFacility ?? 0)}${current ? ` (now ${formatPct(current.burstPercentOfFacility ?? 0)})` : ""}` },
          req.allocated != null && { term: "Nodes", value: <span className="tw:tabular-nums">{Number(req.allocated.toPrecision(3))} nodes{req.burstAllocated ? ` · burst ${Number(req.burstAllocated.toPrecision(3))}` : ""}</span> },
          purchase && { term: `${req.facilityname} purchase`, value: <span className="tw:tabular-nums">{purchase.purchased} nodes on <span className="tw:font-mono">{req.clustername}</span></span> },
          (req.start || req.end) && { term: "Window", value: `${formatDate(req.start)} – ${formatDate(req.end)}` },
        ]}
      />
      {purchase && ctx.repo && <FacilityComputeAfter req={req} purchase={purchase} before={before} />}
    </Frame>
  );
}

/** computepurchases.allocated is the % of the facility's purchase already given to repos. */
function FacilityComputeAfter({ req, purchase, before }) {
  const after = (purchase.allocated ?? 0) - before + (req.percentOfFacility ?? 0);
  return (
    <div className="tw:flex tw:flex-col tw:gap-1.5">
      <div className="tw:flex tw:justify-between tw:gap-3 tw:text-xs">
        <span className="tw:text-muted-strong">{req.facilityname} <span className="tw:font-mono">{req.clustername}</span> after approval</span>
        <span className="tw:font-medium tw:tabular-nums">{formatPct(after)} allocated</span>
      </div>
      <MeterBar pct={after} status={meterStatus("compute-allocated", after)} className="tw:h-2 tw:w-full" />
      <span className="tw:text-xs tw:text-muted-foreground tw:tabular-nums">{formatPct(purchase.allocated ?? 0)} allocated today</span>
    </div>
  );
}

function MembershipChange({ req }) {
  const ctx = useRequestContext(req);
  const isMember = ctx.repo ? (ctx.repo.users ?? []).includes(req.username) : null;
  const removing = req.reqtype === "RepoRemoveUser";
  return (
    <Frame title={req.reponame} aside={req.facilityname}>
      <div className="tw:flex tw:items-baseline tw:gap-3">
        <span className="tw:font-mono tw:text-[22px] tw:leading-7 tw:font-semibold">{req.username}</span>
        <span className="tw:text-[13px] tw:text-muted-strong">{removing ? "leaves the repo" : "joins the repo"}</span>
      </div>
      <ContextState ctx={ctx} lines={1} />
      {isMember != null && (
        <div className="tw:flex tw:items-center tw:gap-2 tw:text-xs tw:text-muted-foreground">
          {isMember === !removing ? <StatusPill tone="neutral">{removing ? "Not a member" : "Already a member"}</StatusPill> : null}
          <span className="tw:tabular-nums">{(ctx.repo.users ?? []).length} members today · PI <span className="tw:font-mono">{ctx.repo.principal ?? "—"}</span></span>
        </div>
      )}
    </Frame>
  );
}

function AccountChange({ req }) {
  const lookup = useRequesterLookup(req);
  return (
    <Frame title={req.preferredUserName || req.eppn} aside={req.facilityname}>
      <DefinitionList
        className="tw:text-[13px]"
        items={[
          { term: "EPPN", value: <span className="tw:font-mono">{req.eppn ?? "—"}</span> },
          { term: "Preferred username", value: <span className="tw:font-mono">{req.preferredUserName ?? "—"}</span> },
          { term: "Facility", value: req.facilityname },
        ]}
      />
      <div className="tw:flex tw:flex-col tw:gap-2 tw:border-t tw:pt-3">
        <span className="tw:text-xs tw:font-medium tw:text-muted-strong">Requester in the user directory</span>
        {lookup.error ? (
          <ErrorAlert error={lookup.error} onRetry={lookup.refetch} what="user details" />
        ) : lookup.loading ? (
          <span className="tw:text-[13px] tw:text-muted-foreground">Looking up…</span>
        ) : lookup.user ? (
          <DefinitionList
            className="tw:text-[13px]"
            items={[
              { term: "Name", value: lookup.user.fullname },
              { term: "Email", value: lookup.user.preferredemail },
              { term: "EPPNs", value: (lookup.user.eppns ?? []).length ? <span className="tw:font-mono">{lookup.user.eppns.join(", ")}</span> : null },
              { term: "UNIX UID", value: lookup.user.uidnumber ? <StatusPill tone="ok">Present</StatusPill> : <StatusPill tone="warn">Missing — approval will fail until it syncs</StatusPill> },
            ]}
          />
        ) : (
          <span className="tw:text-[13px] tw:text-muted-foreground">No SDF account yet for <span className="tw:font-mono">{req.preferredUserName}</span>. Approval needs a UNIX account first.</span>
        )}
      </div>
    </Frame>
  );
}

function NewRepoChange({ req }) {
  return (
    <Frame title={req.reponame} aside={req.facilityname}>
      <DefinitionList className="tw:text-[13px]" items={[{ term: "Facility", value: req.facilityname }, { term: "PI", value: <span className="tw:font-mono">{req.principal ?? "—"}</span> }]} />
    </Frame>
  );
}

// Everything else: the request's non-empty fields.
const GENERIC_FIELDS = [
  ["reponame", "Repo", true], ["previousName", "Previous name", true], ["facilityname", "Facility"], ["username", "User", true],
  ["clustername", "Cluster", true], ["storagename", "Storage", true], ["purpose", "Purpose"], ["computerequirement", "Compute requirement"],
  ["percentOfFacility", "% of facility"], ["allocated", "Allocated"], ["gigabytes", "Gigabytes"], ["shell", "Shell", true],
  ["publichtml", "Public HTML"], ["chargefactor", "Charge factor"], ["start", "Start"], ["end", "End"],
];
function GenericChange({ req }) {
  const items = GENERIC_FIELDS.filter(([k]) => req[k] != null && req[k] !== "").map(([k, term, mono]) => ({
    term,
    value: k === "start" || k === "end" ? formatDate(req[k]) : typeof req[k] === "boolean" ? (req[k] ? "On" : "Off") : <span className={cn(mono && "tw:font-mono")}>{String(req[k])}</span>,
  }));
  return (
    <section className="tw:rounded-lg tw:border tw:p-4">
      {items.length ? <DefinitionList className="tw:text-[13px]" items={items} /> : <span className="tw:text-[13px] tw:text-muted-foreground">No details recorded on this request.</span>}
    </section>
  );
}
