"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ErrorAlert } from "../../kit";
import { routes } from "../../lib/routes";
import { ClientOnly } from "../../providers/apollo";
import { useViewer } from "../../providers/viewer";
import { HomeSkeleton } from "./home-skeleton";
import { resolveHome } from "./home-target";

/**
 * "/login" — the request reached us through SSO, so never show the signed-out landing here
 * (its button would loop back). Same as main: account holders go to their front door,
 * everyone else to /register.
 */
export function LoginPage() {
  return (
    <ClientOnly fallback={<HomeSkeleton />}>
      <LoginRouter />
    </ClientOnly>
  );
}

function LoginRouter() {
  const router = useRouter();
  const { viewer, registration, can, loading, error, refetch } = useViewer();
  const home = resolveHome({ viewer, registration, can, loading });
  const target = home.render === "landing" ? { redirect: routes.register() } : home;

  useEffect(() => {
    if (target.redirect) router.replace(target.redirect);
  }, [router, target.redirect]);

  if (target.render === "error") return <ErrorAlert error={error ?? new Error("whoami returned no user")} onRetry={refetch} what="your account" />;
  return <HomeSkeleton />;
}
