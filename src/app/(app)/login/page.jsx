import { Suspense } from "react";
import { LoginPage } from "@/redesign/pages/onboarding/login-page";

// /login sits behind the gateway's SSO route (like main's): once signed in, forward to a door.
export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
