import { Suspense } from "react";
import { StorageAllocationPage } from "@/redesign/pages/repo/storage-allocation";

export default async function Page({ params }) {
  const p = await params;
  return (
    <Suspense>
      <StorageAllocationPage facility={decodeURIComponent(p.facility)} name={decodeURIComponent(p.name)} allocationid={decodeURIComponent(p.allocationid)} />
    </Suspense>
  );
}
