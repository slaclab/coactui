"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronUp, UserPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ActionsMenu, Chip, CopyButton, DefinitionList, ErrorAlert, MeterBar, meterStatus, Skeleton, STATUS_TEXT, StatusPill } from "../../kit";
import { repoActions } from "../../actions/repo-actions";
import { formatAge, formatInt, formatPct, formatStorage, formatStoragePair } from "../../lib/format";
import { routes } from "../../lib/routes";
import { cn } from "@/lib/utils";
import { useViewer } from "../../providers/viewer";
import { usePeek } from "./repo-filters";
import { usePeekRepo, usePeekRequests } from "./queries";

const REQUIREMENT = { OnShift: "On shift", OffShift: "Off shift", Normal: "Normal" };
const requirementLabel = (v) => (v ? REQUIREMENT[v] ?? v : "Normal");

/**
 * Peek Sheet (spec §6 "Peek Sheet", quick look, read-only). Open while ?peek=<facility>/<name>.
 *   rows  = repo-level rows (useRepos) — the peek reads the row, no refetch
 *   order = the rows in the list's current (filtered) order, for ↑/↓
 * Repos outside `rows` (deep link to another scope) are fetched once with ReposPeek.
 */
export function RepoPeekSheet({ rows, order = rows, loading = false, usageLoading = false, used = null, cores = {} }) {
  const peek = usePeek();
  const open = !!peek.peek;
  return (
    <Sheet open={open} onOpenChange={(o) => !o && peek.close()}>
      <SheetContent side="right" showCloseButton={false} overlayClassName="tw:bg-black/20" className="tw:w-full tw:gap-0 tw:sm:max-w-[560px]">
        {open && <PeekBody id={peek.peek} rows={rows} order={order} listLoading={loading} usageLoading={usageLoading} used={used} cores={cores} onNavigate={peek.open} />}
      </SheetContent>
    </Sheet>
  );
}

function PeekBody({ id, rows, order, listLoading, usageLoading, used, cores, onNavigate }) {
  const inList = useMemo(() => rows.find((r) => r.id === id), [rows, id]);
  const fallback = usePeekRepo(id, { skip: !!inList || listLoading, used, cores });
  const repo = inList ?? fallback.row;

  // Previous / next follow the list's filtered order, sorted by name like the table default.
  const ids = useMemo(() => [...order].sort((a, b) => a.name.localeCompare(b.name) || a.facility.localeCompare(b.facility)).map((r) => r.id), [order]);
  const index = ids.indexOf(id);
  const prev = index > 0 ? ids[index - 1] : null;
  const next = index >= 0 && index < ids.length - 1 ? ids[index + 1] : null;

  // ↑/↓ while open (Radix handles Esc). A DOM subscription, not state syncing.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input,textarea,select,[role=menu],[role=listbox]")) return;
      if (e.key === "ArrowUp" && prev) { e.preventDefault(); onNavigate(prev); }
      if (e.key === "ArrowDown" && next) { e.preventDefault(); onNavigate(next); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [prev, next, onNavigate]);

  const [facility, ...rest] = id.split("/");
  const name = rest.join("/");

  if (!repo) {
    const pending = listLoading || fallback.loading;
    return (
      <>
        <PeekHeader name={name} prev={prev} next={next} onNavigate={onNavigate} />
        <div className="tw:flex tw:flex-col tw:gap-4 tw:px-6 tw:py-5">
          {pending ? (
            <>
              <Skeleton className="tw:h-24 tw:w-full" />
              <Skeleton className="tw:h-4 tw:w-60" />
              <Skeleton className="tw:h-4 tw:w-48" />
            </>
          ) : fallback.error ? (
            <ErrorAlert error={fallback.error} onRetry={fallback.refetch} what="repo" />
          ) : (
            <div className="tw:flex tw:flex-col tw:items-start tw:gap-3">
              <p className="tw:text-sm">Repo “{id}” isn’t in this list.</p>
              <div className="tw:flex tw:gap-2">
                <Button asChild size="sm"><Link href={routes.repo(facility, name)}>Open full page</Link></Button>
                <SheetClose asChild><Button size="sm" variant="outline">Close</Button></SheetClose>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }
  return <PeekContent repo={repo} prev={prev} next={next} onNavigate={onNavigate} usageLoading={usageLoading} />;
}

function PeekHeader({ name, prev, next, onNavigate, children }) {
  return (
    <div className="tw:flex tw:flex-col tw:gap-3 tw:border-b tw:pt-5 tw:pr-5 tw:pb-4 tw:pl-6">
      <div className="tw:flex tw:items-center tw:justify-between tw:gap-3">
        <div className="tw:flex tw:min-w-0 tw:items-center tw:gap-2">
          <SheetTitle className="tw:truncate tw:font-mono tw:text-[19px] tw:leading-7 tw:font-semibold">{name}</SheetTitle>
          <CopyButton value={name} label="Copy repo name" className="tw:size-7" />
        </div>
        <div className="tw:flex tw:shrink-0 tw:items-center tw:gap-1">
          <Button variant="outline" size="icon" className="tw:size-8" aria-label="Previous repo" disabled={!prev} onClick={() => onNavigate(prev)}>
            <ChevronUp className="tw:size-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="tw:size-8" aria-label="Next repo" disabled={!next} onClick={() => onNavigate(next)}>
            <ChevronDown className="tw:size-3.5" />
          </Button>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="tw:size-8" aria-label="Close">
              <X className="tw:size-4" />
            </Button>
          </SheetClose>
        </div>
      </div>
      {children}
      <SheetDescription className="tw:sr-only">Quick look at the repo {name}</SheetDescription>
    </div>
  );
}

function PeekContent({ repo, prev, next, onNavigate, usageLoading }) {
  const { can } = useViewer();
  const role = can.roleIn(repo);
  const req = requirementLabel(repo.computerequirement);
  const editMembers = can.canEditMembers(repo);
  const manage = can.canManageRepo(repo);
  return (
    <>
      <PeekHeader name={repo.name} prev={prev} next={next} onNavigate={onNavigate}>
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-1.5">
          <Chip>{repo.facility}</Chip>
          {role && <Chip>You: {role}</Chip>}
          {req !== "Normal" && <Chip>{req}</Chip>}
          {repo.name === "default" && <Chip>Facility access</Chip>}
        </div>
      </PeekHeader>

      <div className="tw:flex tw:grow tw:flex-col tw:gap-6 tw:overflow-y-auto tw:px-6 tw:py-5">
        <div className="tw:grid tw:grid-cols-1 tw:gap-3 tw:sm:grid-cols-2">
          <UsageBlock title="Compute · 7d">
            {!repo.computeAllocs.length ? (
              <p className="tw:text-[13px] tw:text-muted-foreground">No compute allocation</p>
            ) : (
              repo.computeAllocs.map((a) =>
                a.pct == null && usageLoading ? (
                  <div key={a.id} className="tw:flex tw:flex-col tw:gap-1.5">
                    <span className="tw:font-mono tw:text-xs tw:text-muted-strong">{a.cluster}</span>
                    <Skeleton className="tw:h-2 tw:w-full" />
                  </div>
                ) : (
                  <UsageLine
                    key={a.id}
                    label={<span className="tw:font-mono">{a.cluster}</span>}
                    pct={a.pct}
                    status={a.pct == null ? null : meterStatus("compute-used", a.pct, a.burst)}
                    caption={a.pct == null ? `${formatInt(Math.round(a.availRh))} resource-h available` : `${formatInt(Math.round(a.usedRh))} / ${formatInt(Math.round(a.availRh))} resource-h`}
                  />
                ),
              )
            )}
          </UsageBlock>
          <UsageBlock title="Storage">
            {!repo.storageAllocs.length ? (
              <p className="tw:text-[13px] tw:text-muted-foreground">No storage allocation</p>
            ) : (
              repo.storageAllocs.map((s) => {
                const pct = (s.usedGb / s.allocatedGb) * 100;
                return <UsageLine key={s.id} label={s.purpose} pct={pct} status={meterStatus("storage", pct)} caption={`${formatStoragePair(s.usedGb, s.allocatedGb)} · ${s.storagename}`} />;
              })
            )}
          </UsageBlock>
        </div>

        <section className="tw:flex tw:flex-col tw:gap-2.5">
          <h3 className="tw:text-[13px] tw:leading-5 tw:font-semibold">Details</h3>
          <DefinitionList
            className="tw:text-[13px] tw:leading-5"
            items={[
              { term: "Description", value: repo.description || null },
              { term: "PI", value: <span className="tw:font-mono">{repo.principal}</span> },
              { term: "Leaders", value: repo.leaders.length ? <span className="tw:font-mono">{repo.leaders.join(", ")}</span> : null },
              {
                term: "LDAP group",
                value: repo.group ? (
                  <span className="tw:inline-flex tw:items-center tw:gap-1">
                    <span className="tw:font-mono">{repo.group}</span>
                    <CopyButton value={repo.group} label="Copy LDAP group" className="tw:size-5" />
                  </span>
                ) : (
                  <span className="tw:text-muted-foreground">Not set</span>
                ),
              },
              { term: "Compute requirement", value: req },
              {
                term: "Facility",
                value: (
                  <Link href={routes.facility(repo.facility)} className="tw:text-foreground tw:underline tw:decoration-border tw:underline-offset-2 tw:hover:decoration-foreground">
                    {repo.facility}
                  </Link>
                ),
              },
            ]}
          />
        </section>

        <MembersSummary repo={repo} />
        <PendingRequests repo={repo} />
      </div>

      <div className="tw:flex tw:items-center tw:justify-between tw:gap-3 tw:border-t tw:py-3.5 tw:pr-5 tw:pl-6">
        <span className="tw:text-xs tw:text-muted-foreground">{manage ? "" : `Details are managed by ${repo.facility} czars.`}</span>
        <div className="tw:flex tw:shrink-0 tw:items-center tw:gap-2">
          <ActionsMenu
            groups={repoActions(repo, can, { context: "peek" })}
            label={`Actions for ${repo.name}`}
            align="end"
            className="tw:border tw:rounded-md"
          />
          {editMembers && (
            <Button asChild variant="outline" size="sm">
              <Link href={`${routes.repo(repo.facility, repo.name, "members")}?dialog=add-members`}>
                <UserPlus /> Add member
              </Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link href={routes.repo(repo.facility, repo.name)}>
              Open full page <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}

function UsageBlock({ title, children }) {
  return (
    <div className="tw:flex tw:flex-col tw:gap-3 tw:rounded-lg tw:border tw:px-4 tw:py-3.5">
      <div className="tw:flex tw:justify-between">
        <span className="tw:text-[13px] tw:leading-5 tw:font-semibold">{title}</span>
        <span className="tw:text-xs tw:leading-5 tw:text-muted-foreground">Daily rollup</span>
      </div>
      {children}
    </div>
  );
}

function UsageLine({ label, pct, status, caption }) {
  return (
    <div className="tw:flex tw:flex-col tw:gap-1.5">
      <div className="tw:flex tw:justify-between tw:text-xs tw:leading-4">
        <span className="tw:text-muted-strong">{label}</span>
        <span className={cn("tw:font-medium tw:tabular-nums", status ? STATUS_TEXT[status] : "tw:text-foreground")}>{pct == null ? "—" : formatPct(pct)}</span>
      </div>
      <MeterBar pct={pct ?? 0} status={status} className="tw:h-2 tw:w-full" />
      <span className="tw:text-xs tw:leading-4 tw:text-muted-foreground tw:tabular-nums">{caption}</span>
    </div>
  );
}

function MembersSummary({ repo }) {
  const shown = repo.users.slice(0, 8);
  const more = repo.users.length - shown.length;
  return (
    <section className="tw:flex tw:flex-col tw:gap-2.5">
      <div className="tw:flex tw:items-baseline tw:justify-between">
        <h3 className="tw:text-[13px] tw:leading-5 tw:font-semibold">Members</h3>
        <span className="tw:text-xs tw:text-muted-foreground">
          {repo.users.length} member{repo.users.length === 1 ? "" : "s"} · {repo.leaders.length} leader{repo.leaders.length === 1 ? "" : "s"}
        </span>
      </div>
      {shown.length > 0 && (
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-1.5">
          {shown.map((u) => (
            <span key={u} className="tw:flex tw:h-6 tw:items-center tw:rounded-sm tw:bg-neutral-bg tw:px-2 tw:font-mono tw:text-xs">{u}</span>
          ))}
          {more > 0 && <span className="tw:text-xs tw:text-muted-foreground">+{more}</span>}
        </div>
      )}
      <Link href={routes.repo(repo.facility, repo.name, "members")} className="tw:w-fit tw:text-[13px] tw:font-medium tw:text-foreground tw:no-underline tw:hover:underline">
        View all members →
      </Link>
    </section>
  );
}

const STATUS = {
  NotActedOn: ["warn", "Pending"],
  PreApproved: ["brand", "Pre-approved"],
  Approved: ["ok", "Approved"],
  Incomplete: ["crit", "Incomplete"],
  Rejected: ["crit", "Rejected"],
  Completed: ["ok", "Completed"],
};

function describeRequest(r) {
  switch (r.reqtype) {
    case "RepoMembership": return `Membership · ${r.username ?? r.requestedby}`;
    case "RepoComputeAllocation": return `Compute ${r.clustername ?? ""} → ${formatPct(r.percentOfFacility ?? 0)}`;
    case "RepoStorageAllocation": return `Storage ${r.purpose ?? ""} → ${formatStorage(r.gigabytes)}`;
    case "RepoRemoveUser": return `Remove ${r.username ?? "member"}`;
    case "RenameRepo": return "Rename";
    case "RepoChangeComputeRequirement": return "Compute requirement";
    case "RepoUpdateFeature": return "Feature change";
    default: return r.reqtype;
  }
}

function PendingRequests({ repo }) {
  const { requests, loading, error, refetch } = usePeekRequests(repo);
  if (error) return <ErrorAlert error={error} onRetry={refetch} what="pending requests" />;
  if (loading) return <Skeleton className="tw:h-4 tw:w-56" />;
  if (!requests.length) return null;
  const canReview = requests.some((r) => r.canapprove);
  return (
    <section className="tw:flex tw:flex-col tw:gap-2.5">
      <h3 className="tw:text-[13px] tw:leading-5 tw:font-semibold">Pending requests</h3>
      <ul className="tw:flex tw:flex-col tw:divide-y tw:rounded-lg tw:border">
        {requests.map((r) => {
          const [tone, label] = STATUS[r.approvalstatus] ?? ["neutral", r.approvalstatus ?? "Pending"];
          return (
            <li key={r.Id} className="tw:flex tw:h-10 tw:items-center tw:justify-between tw:gap-3 tw:px-3 tw:text-[13px]">
              <span className="tw:truncate">
                {describeRequest(r)}
                <span className="tw:text-muted-foreground"> · <span className="tw:font-mono">{r.requestedby}</span> · {formatAge(r.timeofrequest)}</span>
              </span>
              <StatusPill tone={tone}>{label}</StatusPill>
            </li>
          );
        })}
      </ul>
      {canReview && (
        <Link href={routes.requests({ reponame: repo.name, facilityname: repo.facility })} className="tw:w-fit tw:text-[13px] tw:font-medium tw:text-foreground tw:no-underline tw:hover:underline">
          Review in Requests →
        </Link>
      )}
    </section>
  );
}
