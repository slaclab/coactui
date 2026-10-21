import { Suspense } from "react";
import { FacilityOverviewTab } from "@/redesign/pages/facility/overview-tab";

// The facility name comes from the layout's FacilityProvider (useFacility()), not props.
export default function Page() {
  return (
    <Suspense>
      <FacilityOverviewTab />
    </Suspense>
  );
}
