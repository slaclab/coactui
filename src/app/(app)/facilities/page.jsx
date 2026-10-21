import { Suspense } from "react";
import { FacilitiesPage } from "@/redesign/pages/facilities/facilities-page";

export default function Page() {
  return (
    <Suspense>
      <FacilitiesPage />
    </Suspense>
  );
}
