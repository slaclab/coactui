import { Suspense } from "react";
import { StorageUsagePage } from "@/redesign/pages/storage-usage/storage-usage-page";

export async function generateMetadata({ params }) {
  const p = await params;
  return { title: `${decodeURIComponent(p.storagename)} · ${decodeURIComponent(p.purpose)} · Storage usage · Coact` };
}

export default async function Page({ params }) {
  const p = await params;
  return (
    <Suspense>
      <StorageUsagePage storagename={decodeURIComponent(p.storagename)} purpose={decodeURIComponent(p.purpose)} />
    </Suspense>
  );
}
