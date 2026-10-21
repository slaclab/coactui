import { Suspense } from "react";
import { RepoGroupsTab } from "@/redesign/pages/repo/groups-tab";

export default async function Page({ params }) {
  const p = await params;
  return (
    <Suspense>
      <RepoGroupsTab facility={decodeURIComponent(p.facility)} name={decodeURIComponent(p.name)} />
    </Suspense>
  );
}
