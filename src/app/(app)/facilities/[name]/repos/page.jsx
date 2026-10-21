import { Suspense } from "react";
import { FacilityReposTab } from "@/redesign/pages/facility/repos-tab";

// The facility name comes from the layout's FacilityProvider (useFacility()), not props.
export default function Page() {
  return (
    <Suspense>
      <FacilityReposTab />
    </Suspense>
  );
}
