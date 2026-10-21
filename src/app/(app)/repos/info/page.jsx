import { Suspense } from "react";
import { ReposPage } from "@/redesign/pages/repos-list/repos-page";

export const metadata = { title: "Repos · Coact" };

// URL state is read with useSearchParams, which needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense>
      <ReposPage />
    </Suspense>
  );
}
