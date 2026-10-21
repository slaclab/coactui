import { Suspense } from "react";
import { RepoComputeTab } from "@/redesign/pages/repo/compute-tab";

export default async function Page({ params }) {
  const p = await params;
  return (
    <Suspense>
      <RepoComputeTab facility={decodeURIComponent(p.facility)} name={decodeURIComponent(p.name)} />
    </Suspense>
  );
}
