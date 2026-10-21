import { Suspense } from "react";
import { FacilityHistoryTab } from "@/redesign/pages/facility/history-tab";

// The facility name comes from the layout's FacilityProvider (useFacility()), not props.
export default function Page() {
  return (
    <Suspense>
      <FacilityHistoryTab />
    </Suspense>
  );
}
