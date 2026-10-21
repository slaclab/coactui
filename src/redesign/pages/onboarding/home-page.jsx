"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ErrorAlert } from "../../kit";
import { ClientOnly } from "../../providers/apollo";
import { useViewer } from "../../providers/viewer";
import { HomeSkeleton } from "./home-skeleton";
import { resolveHome } from "./home-target";
import { Landing } from "./landing";
import { usePreview } from "./preview";

/** "/" — land on the question per role (design v2, "Four people, four front doors"). */
export function HomePage() {
  return (
    <ClientOnly fallback={<HomeSkeleton />}>
      <HomeRouter />
    </ClientOnly>
  );
}

function HomeRouter() {
  const router = useRouter();
  const { viewer, registration, can, loading, error, refetch } = useViewer();
  const preview = usePreview();
  const target = preview === "landing" ? { render: "landing" } : resolveHome({ viewer, registration, can, loading });

  // Navigation, not state sync: the only effect, keyed on the derived destination.
  useEffect(() => {
    if (target.redirect) router.replace(target.redirect);
  }, [router, target.redirect]);

  if (target.render === "landing") return <Landing />;
  if (target.render === "error") return <ErrorAlert error={error ?? new Error("whoami returned no user")} onRetry={refetch} what="your account" />;
  return <HomeSkeleton />;
}
