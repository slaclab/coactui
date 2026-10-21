import { Suspense } from "react";
import { AuditTrailPage } from "@/redesign/pages/profile/audit-trail-page";

export default function Page() {
  return (
    <Suspense>
      <AuditTrailPage />
    </Suspense>
  );
}
