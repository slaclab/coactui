import { Suspense } from "react";
import { RepoFeaturesTab } from "@/redesign/pages/repo/features-tab";

export default async function Page({ params }) {
  const p = await params;
  return (
    <Suspense>
      <RepoFeaturesTab facility={decodeURIComponent(p.facility)} name={decodeURIComponent(p.name)} />
    </Suspense>
  );
}
