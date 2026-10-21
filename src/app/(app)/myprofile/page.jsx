import { Suspense } from "react";
import { ProfilePage } from "@/redesign/pages/profile/profile-page";

export default function Page() {
  return (
    <Suspense>
      <ProfilePage />
    </Suspense>
  );
}
