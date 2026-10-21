import { Suspense } from "react";
import { RepoMembersTab } from "@/redesign/pages/repo/members-tab";

export default async function Page({ params }) {
  const p = await params;
  return (
    <Suspense>
      <RepoMembersTab facility={decodeURIComponent(p.facility)} name={decodeURIComponent(p.name)} />
    </Suspense>
  );
}
