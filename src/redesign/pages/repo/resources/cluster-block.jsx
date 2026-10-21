"use client";

import Link from "next/link";
import { BarChart3, ChevronDown, Copy, ExternalLink, FileText, Pencil, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionsMenu, ErrorAlert, Skeleton } from "../../../kit";
import { formatDate, formatInt, formatPct } from "../../../lib/format";
import { routes } from "../../../lib/routes";
import { allocationMeta, USAGE_WINDOWS, usedOfCapacity, windowUsage } from "./compute-math";
import { RecentJobs } from "./jobs-table";
import { MemberUsage } from "./member-usage";
import { PendingRequestBanner } from "./pending-request";
import { UsageMeter } from "./usage-meter";

/** Who may change compute on this repo, derived from the viewer's gates. */
export function computeAccess(repo, can) {
  const edit = can.canEditAllocation(repo);
  const request = !edit && can.canEditMembers(repo);
  return { edit, request, any: edit || request, label: edit ? "Edit allocation…" : "Request change…" };
}

/** One registry for the block's "…" (spec §6 Compute › Block "…" menu). */
export function computeBlockActions(alloc, repo, access) {
  return [
    access.any && {
      key: "change",
      items: [{ key: "change", label: access.label, icon: access.edit ? Pencil : Send, dialog: "compute-allocation" }],
    },
    {
      key: "open",
      items: [
        { key: "detail", label: "Open allocation detail", icon: FileText, href: routes.computeAllocation(repo.facility, repo.name, alloc.Id) },
        { key: "cluster", label: "View cluster usage", icon: BarChart3, href: routes.cluster(alloc.clustername) },
      ],
    },
    { key: "copy", items: [{ key: "copy-id", label: "Copy allocation id", icon: Copy, copy: alloc.Id }] },
  ].filter(Boolean);
}

const periodLine = (a) => `${formatDate(a.start)} – ${formatDate(a.end)}`;
const pctLabel = (d) => `${formatPct(d.pct)} · ${usedOfCapacity(d)}`;

function ClusterTitle({ name, size = "lg" }) {
  return (
    <div className="tw:flex tw:items-center tw:gap-2">
      <span className={size === "lg" ? "tw:font-mono tw:text-[17px] tw:leading-6 tw:font-semibold" : "tw:font-mono tw:text-[15px] tw:leading-5.5 tw:font-semibold"}>{name}</span>
      <Link href={routes.cluster(name)} aria-label={`${name} cluster usage`} title="Cluster usage" className="tw:text-muted-foreground tw:hover:text-foreground">
        <ExternalLink className="tw:size-3.25" strokeWidth={2} />
      </Link>
    </div>
  );
}

function StatRow({ usage, lifetime, loading, error, onRetry }) {
  if (error) return <div className="tw:px-5 tw:py-4"><ErrorAlert error={error} onRetry={onRetry} what="live usage" /></div>;
  const items = [...USAGE_WINDOWS.map((w) => ({ label: w.label, value: usage[w.key], live: true })), { label: "Period total", value: lifetime }];
  return (
    <dl className="tw:flex tw:px-5 tw:py-4">
      {items.map((it, i) => (
        <div key={it.label} className={i ? "tw:flex tw:grow tw:basis-0 tw:flex-col tw:gap-0.5 tw:border-l tw:pl-4" : "tw:flex tw:grow tw:basis-0 tw:flex-col tw:gap-0.5"}>
          <dt className="tw:text-xs tw:text-muted-foreground">{it.label}</dt>
          <dd className="tw:text-lg tw:leading-6.5 tw:font-semibold tw:tabular-nums">
            {it.live && loading ? <Skeleton className="tw:my-1 tw:h-4 tw:w-10" /> : it.value == null ? <span className="tw:text-muted-foreground">—</span> : formatInt(Math.round(it.value))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A cluster allocation on the Compute tab (Paper "Repo — Compute"). Expanded: header, md
 * meter, stat row, member usage + recent jobs. Collapsed: one line with an sm meter.
 */
export function ClusterBlock({ d, repo, members, expanded, onExpand, access, onDialog, recent, pending }) {
  const a = d.alloc;
  const groups = computeBlockActions(a, repo, access);
  const openDialog = () => onDialog("compute-allocation", a.clustername);
  const menu = <ActionsMenu groups={groups} onDialog={() => openDialog()} label={`Actions for ${a.clustername}`} />;
  const meta = allocationMeta(d, repo.facility);
  const pendingChange = pending && `${formatPct(a.percentOfFacility)} → ${formatPct(pending.percentOfFacility)}${pending.burstPercentOfFacility != null ? ` · burst ${formatPct(pending.burstPercentOfFacility)}` : ""}`;

  if (!expanded) {
    return (
      <section aria-label={`${a.clustername} allocation`} className="tw:flex tw:items-center tw:justify-between tw:gap-6 tw:rounded-xl tw:border tw:bg-background tw:py-4 tw:pr-4 tw:pl-5">
        <div className="tw:flex tw:min-w-0 tw:items-center tw:gap-6">
          <div className="tw:flex tw:w-75 tw:shrink-0 tw:flex-col tw:gap-0.5">
            <ClusterTitle name={a.clustername} size="sm" />
            <span className="tw:truncate tw:text-[13px] tw:leading-5 tw:text-muted-foreground" title={`${meta} · ${periodLine(a)}`}>{meta}</span>
          </div>
          <UsageMeter pct={d.pct} burstPct={d.burstPct} className="tw:w-70 tw:shrink-0" ariaLabel={`${a.clustername} compute used ${formatPct(d.pct)} of allocation this period`} />
          <span className="tw:text-[13px] tw:leading-5 tw:font-medium tw:whitespace-nowrap tw:tabular-nums">{pctLabel(d)}</span>
        </div>
        <div className="tw:flex tw:items-center tw:gap-1">
          {pending && <span className="tw:mr-2 tw:text-xs tw:font-medium tw:text-warn-text">Pending request</span>}
          <Button variant="ghost" size="sm" onClick={onExpand} aria-expanded={false}>
            Expand <ChevronDown className="tw:text-muted-foreground" />
          </Button>
          {menu}
        </div>
      </section>
    );
  }

  const usage = windowUsage(recent.data, repo, a.clustername);
  return (
    <section aria-label={`${a.clustername} allocation`} className="tw:flex tw:flex-col tw:rounded-xl tw:border tw:bg-background">
      <div className="tw:flex tw:items-start tw:justify-between tw:pt-4.5 tw:pr-4 tw:pl-5">
        <div className="tw:flex tw:flex-col tw:gap-1">
          <ClusterTitle name={a.clustername} />
          <span className="tw:text-[13px] tw:leading-5 tw:text-muted-foreground">{meta} · {periodLine(a)}</span>
        </div>
        <div className="tw:flex tw:items-center tw:gap-2">
          {access.any && <Button variant="outline" size="sm" onClick={openDialog}>{access.label.replace("…", "")}</Button>}
          {menu}
        </div>
      </div>
      <div className="tw:flex tw:flex-col tw:gap-3 tw:px-5 tw:pt-4">
        <UsageMeter
          label="Used this period"
          value={pctLabel(d)}
          pct={d.pct}
          burstPct={d.burstPct}
          ariaLabel={`${a.clustername} compute used ${formatPct(d.pct)} of this repo's allocation, burst ${formatPct(d.burstPct)}, period to date`}
        />
        {pending && <PendingRequestBanner request={pending} change={pendingChange} canReview={access.edit} facility={repo.facility} repoName={repo.name} />}
      </div>
      <StatRow usage={usage} lifetime={d.used} loading={recent.loading} error={recent.error} onRetry={recent.refetch} />
      <div className="tw:flex tw:border-t">
        <div className="tw:w-130 tw:shrink-0 tw:border-r tw:px-5 tw:pt-4 tw:pb-5">
          <MemberUsage perUserUsage={a.perUserUsage} members={members} allHref={`${routes.computeAllocation(repo.facility, repo.name, a.Id)}?view=users`} />
        </div>
        <div className="tw:min-w-0 tw:grow tw:px-5 tw:pt-4 tw:pb-5">
          <RecentJobs allocationId={a.Id} compact allHref={`${routes.computeAllocation(repo.facility, repo.name, a.Id)}?view=jobs`} />
        </div>
      </div>
    </section>
  );
}

export function ClusterBlockSkeleton() {
  return (
    <div className="tw:flex tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:bg-background tw:px-5 tw:py-4.5" aria-hidden>
      <Skeleton className="tw:h-4 tw:w-40" />
      <Skeleton className="tw:h-4 tw:w-72" />
      <Skeleton className="tw:mt-2 tw:h-2 tw:w-full" />
      <div className="tw:flex tw:gap-16 tw:pt-2">
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="tw:h-4 tw:w-10" />)}
      </div>
    </div>
  );
}
