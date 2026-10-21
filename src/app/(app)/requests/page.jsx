import { Suspense } from "react";
import { RequestsPage } from "@/redesign/pages/requests/requests-page";

export default function Page() {
  return (
    <Suspense>
      <RequestsPage />
    </Suspense>
  );
}
