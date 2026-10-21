import { Suspense } from "react";
import { ComputeAllocationPage } from "@/redesign/pages/repo/compute-allocation";

export default async function Page({ params }) {
  const p = await params;
  return (
    <Suspense>
      <ComputeAllocationPage facility={decodeURIComponent(p.facility)} name={decodeURIComponent(p.name)} allocationid={decodeURIComponent(p.allocationid)} />
    </Suspense>
  );
}
