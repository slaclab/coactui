"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { EmptyState } from "../../kit";
import { routes } from "../../lib/routes";
import { ClientOnly } from "../../providers/apollo";
import { useViewer } from "../../providers/viewer";
import { useFacility } from "../facility/facility-context";
import { RequestsTable, RequestsTableSkeleton } from "./requests-table";

/** /facilities/[name]/requests (artboard 4TT): the pending queue for this facility. */
export function FacilityRequestsTab({ name }) {
  return (
    <ClientOnly fallback={<RequestsTableSkeleton placeholder={`Filter ${name} requests…`} />}>
      <FacilityRequestsLive name={name} />
    </ClientOnly>
  );
}

function FacilityRequestsLive({ name }) {
  const { name: facilityName } = useFacility();
  const { can, loading } = useViewer();
  const facility = facilityName ?? name;
  // The facilityname prop overrides any ?facilityname= on the URL.
  const filter = useMemo(() => ({ facilityname: facility }), [facility]);
  if (loading) return <RequestsTableSkeleton placeholder={`Filter ${facility} requests…`} />;
  // FacilityLayout hides the tab for others; a direct link still lands here.
  if (!can.isCzarOf(facility))
    return (
      <EmptyState
        className="tw:mt-4"
        icon={ShieldAlert}
        title={`Only ${facility} czars and admins review its requests`}
        description="Requests you made yourself are under My requests."
        actions={<Link href={routes.requests({ view: "mine" })} className="tw:text-[13px] tw:font-medium tw:text-foreground tw:underline">Open My requests</Link>}
      />
    );
  return <RequestsTable filter={filter} view="pending" embedded />;
}
