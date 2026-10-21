import { Suspense } from "react";
import { StorageUsagePage } from "@/redesign/pages/storage-usage/storage-usage-page";

export async function generateMetadata({ params }) {
  const { storagename } = await params;
  return { title: `${decodeURIComponent(storagename)} · Storage usage · Coact` };
}

export default async function Page({ params }) {
  const p = await params;
  return (
    <Suspense>
      <StorageUsagePage storagename={decodeURIComponent(p.storagename)} />
    </Suspense>
  );
}
