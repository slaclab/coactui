import { Suspense } from "react";
import { RegisterPage } from "@/redesign/pages/onboarding/register-page";

export default function Page() {
  return (
    <Suspense>
      <RegisterPage />
    </Suspense>
  );
}
