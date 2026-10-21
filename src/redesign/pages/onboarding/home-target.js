import { routes } from "../../lib/routes";

/**
 * "Four people, four front doors" (design v2, Ethos): where "/" sends the viewer.
 * Pure, so the decision is checkable without rendering. Returns one of
 *   { redirect: href }                  — admin, czar, member, or not-yet-registered
 *   { render: "loading" }               — viewer still resolving (skeleton, no landing flash)
 *   { render: "landing" }               — no identity at all (expired / missing SSO session)
 *   { render: "error" }                 — registered, but whoami failed
 * While impersonating, whoami is the impersonated user, so their door applies.
 */
export function resolveHome({ viewer, registration, can, loading }) {
  if (loading) return { render: "loading" };
  if (viewer) {
    if (can.isAdmin) return { redirect: routes.facilities() };
    if (can.isCzar) return { redirect: viewer.czarOf.length === 1 ? routes.facility(viewer.czarOf[0]) : routes.facilities() };
    return { redirect: routes.repos() };
  }
  if (registration && !registration.isRegistered) return { redirect: routes.register() };
  if (registration?.isRegistered) return { render: "error" };
  return { render: "landing" };
}
