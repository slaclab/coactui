"use client";

import Link from "next/link";
import { Building2, MoreHorizontal, Shield, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ActionsMenu, Chip, CountBadge, EmptyState, ErrorAlert, PageHeader, Skeleton, StatusPill } from "../../kit";
import { useDialogParam } from "../../lib/navigation";
import { routes } from "../../lib/routes";
import { DIALOGS, facilityHeaderActions } from "./facility-actions";
import { FacilityProvider, useFacility } from "./facility-context";
import { useFacilityLive, useFacilityPending, usePurchaseCoverage } from "./queries";
import { ClampedDescription } from "./header/clamped-description";
import { FacilityMeta } from "./header/facility-meta";
import { FacilitySwitcher } from "./header/facility-switcher";
import { FacilityDialogs } from "./dialogs/facility-dialogs";

/** Shell of /facilities/[name]/** (spec §5 D1–D3): breadcrumb, header, route tabs, dialogs. */
export function FacilityLayout({ name, children }) {
  return (
    <FacilityProvider name={name}>
      <FacilityHeader />
      <FacilityBody>{children}</FacilityBody>
    </FacilityProvider>
  );
}

const ROLE_LABEL = { Admin: "Admin", Czar: "You're a czar", "Read-only": "Read-only" };

function FacilityHeader() {
  const f = useFacility();
  const { name, facility, loading, notFound, canManage, viewerLoading, shares } = f;
  const { openDialog } = useDialogParam();
  const live = useFacilityLive(name, canManage && !notFound);
  const pending = useFacilityPending(name, canManage && !notFound);

  const tab = (key, label, count) => ({ label, href: routes.facility(name, key), exact: key === "overview", count });
  const tabs = notFound
    ? undefined
    : [tab("overview", "Overview"), tab("repos", "Repos"), ...(canManage ? [tab("requests", "Requests", pending.count || undefined), tab("history", "History")] : [])];

  const badges = loading || viewerLoading ? (
    <Skeleton className="tw:h-5 tw:w-12 tw:rounded-full" />
  ) : notFound ? null : (
    <>
      {live.bursting && <StatusPill tone="burst">Bursting</StatusPill>}
      <Chip icon={Shield}>{ROLE_LABEL[f.role]}</Chip>
    </>
  );

  // Its own component so the clusters query (purchase coverage) only runs for czars/admins,
  // in the browser (the viewer is unknown on the server, so canManage is false there).
  const actions = canManage && !notFound && <HeaderActions pendingCount={pending.count} />;

  return (
    <PageHeader
      breadcrumbs={[{ label: "Facilities", href: routes.facilities() }, { label: <FacilitySwitcher name={name} /> }]}
      title={name}
      badges={badges}
      subtitle={
        loading ? (
          <span className="tw:flex tw:flex-col tw:gap-2 tw:py-1"><Skeleton className="tw:h-4 tw:w-[480px]" /><Skeleton className="tw:h-4 tw:w-[360px]" /></span>
        ) : facility ? (
          <ClampedDescription text={facility.description} canEdit={canManage} onAdd={() => openDialog(DIALOGS.editDescription)} />
        ) : null
      }
      meta={
        loading ? <Skeleton className="tw:h-4 tw:w-40" /> : facility ? <FacilityMeta facility={facility} repoCount={shares.repoCount} showRepos={canManage} /> : null
      }
      actions={actions || null}
      tabs={tabs}
    />
  );
}

function HeaderActions({ pendingCount }) {
  const f = useFacility();
  const { name, facility } = f;
  const { openDialog } = useDialogParam();
  const { allPurchased } = usePurchaseCoverage(facility);
  return (
    <>
      <Button asChild variant="outline" size="sm">
        <Link href={routes.facility(name, "requests")}>
          Review requests
          {pendingCount > 0 && <CountBadge tone="warn">{pendingCount}</CountBadge>}
        </Link>
      </Button>
      <Button size="sm" onClick={() => openDialog(DIALOGS.inviteUsers)}>
        <UserPlus /> Invite users
      </Button>
      <ActionsMenu
        groups={facilityHeaderActions(f, { allPurchased })}
        onDialog={(dialog) => openDialog(dialog)}
        label={`Actions for ${name}`}
        trigger={
          <Button variant="outline" size="icon-sm" aria-label={`Actions for ${name}`}>
            <MoreHorizontal className="tw:text-muted-strong" />
          </Button>
        }
      />
    </>
  );
}

function FacilityBody({ children }) {
  const { name, facility, error, refetch, notFound } = useFacility();
  if (notFound) {
    return (
      <EmptyState
        icon={Building2}
        title={`Facility “${name}” not found`}
        actions={<Button asChild variant="outline" size="sm"><Link href={routes.facilities()}>Back to facilities</Link></Button>}
      />
    );
  }
  if (error) return <ErrorAlert error={error} onRetry={refetch} what="facility" />;
  return (
    <>
      {children}
      {facility && <FacilityDialogs />}
    </>
  );
}
