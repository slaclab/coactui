import { Suspense } from "react";
import { RepoHistoryTab } from "@/redesign/pages/repo/history-tab";

export default async function Page({ params }) {
  const p = await params;
  return (
    <Suspense>
      <RepoHistoryTab facility={decodeURIComponent(p.facility)} name={decodeURIComponent(p.name)} />
    </Suspense>
  );
}
