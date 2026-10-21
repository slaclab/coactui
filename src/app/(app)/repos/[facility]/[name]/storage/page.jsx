import { Suspense } from "react";
import { RepoStorageTab } from "@/redesign/pages/repo/storage-tab";

export default async function Page({ params }) {
  const p = await params;
  return (
    <Suspense>
      <RepoStorageTab facility={decodeURIComponent(p.facility)} name={decodeURIComponent(p.name)} />
    </Suspense>
  );
}
