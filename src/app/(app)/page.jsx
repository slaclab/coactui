import { Suspense } from "react";
import { HomePage } from "@/redesign/pages/onboarding/home-page";

// "/" picks the viewer's front door client-side (admin → facilities, czar → their facility,
// member → repos, not registered → register, signed out → landing).
export default function Page() {
  return (
    <Suspense>
      <HomePage />
    </Suspense>
  );
}
