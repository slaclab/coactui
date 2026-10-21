import { Suspense } from "react";
import { ClusterUsagePage } from "@/redesign/pages/cluster-usage/cluster-usage-page";

export async function generateMetadata({ params }) {
  const { clustername } = await params;
  return { title: `${decodeURIComponent(clustername)} · Cluster usage · Coact` };
}

export default async function Page({ params }) {
  const { clustername } = await params;
  return (
    <Suspense>
      <ClusterUsagePage clustername={decodeURIComponent(clustername)} />
    </Suspense>
  );
}
