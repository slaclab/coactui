import { Suspense } from "react";
import { RepoOverviewTab } from "@/redesign/pages/repo/overview-tab";

export default async function Page({ params }) {
  const p = await params;
  return (
    <Suspense>
      <RepoOverviewTab facility={decodeURIComponent(p.facility)} name={decodeURIComponent(p.name)} />
    </Suspense>
  );
}
