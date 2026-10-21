import { Suspense } from "react";
import { FacilityRequestsTab } from "@/redesign/pages/requests/facility-requests-tab";

export default async function Page({ params }) {
  const p = await params;
  return (
    <Suspense>
      <FacilityRequestsTab name={decodeURIComponent(p.name)} />
    </Suspense>
  );
}
