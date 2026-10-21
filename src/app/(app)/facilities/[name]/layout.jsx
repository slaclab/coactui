import { Suspense } from "react";
import { FacilityLayout } from "@/redesign/pages/facility/facility-layout";

export async function generateMetadata({ params }) {
  const { name } = await params;
  return { title: `${decodeURIComponent(name)} · Facilities · Coact` };
}

export default async function Layout({ params, children }) {
  const { name } = await params;
  // Suspense: the header reads search params (?dialog=) via useDialogParam.
  return (
    <Suspense>
      <FacilityLayout name={decodeURIComponent(name)}>{children}</FacilityLayout>
    </Suspense>
  );
}
