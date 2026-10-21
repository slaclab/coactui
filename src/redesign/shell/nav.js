import { routes } from "../lib/routes";

/**
 * Main navigation (spec §3, design v2 top bar). `show(can)` gates an item with the derived
 * permissions from useViewer(); `match` lists path prefixes that keep the item active
 * (e.g. cluster usage pages live under Facilities).
 */
export const MAIN_NAV = [
  { key: "repos", label: "Repos", href: routes.repos(), match: ["/repos"] },
  { key: "requests", label: "Requests", href: routes.requests(), match: ["/requests"], badge: "requests" },
  {
    key: "facilities",
    label: "Facilities",
    href: routes.facilities(),
    match: ["/facilities", "/clusterusage", "/storageusage"],
    // Today's rule: admins (not impersonating) and czars.
    show: (can, viewer) => (can.isAdmin && !viewer?.isImpersonating) || can.isCzar,
  },
];
