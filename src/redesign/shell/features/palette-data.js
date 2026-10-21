"use client";

import { useMemo } from "react";
import { gql, useQuery } from "@apollo/client";
import { routes } from "../../lib/routes";
import { useViewer } from "../../providers/viewer";
import { MAIN_NAV } from "../nav";
import { rankBy } from "./fuzzy";

// myRepos (not myreposandfacility) because the palette shows the PI; admins and czars search
// every repo via coactshowall. allreposandfacility is deliberately not used: it returns all
// repos even to plain members.
const PALETTE_REPOS = gql`
  query ShellPaletteRepos {
    myRepos { name facility principal }
  }
`;

const PALETTE_FACILITIES = gql`
  query ShellPaletteFacilities {
    facilityNameDescs { name description }
  }
`;

/** Repos the palette searches. Skipped until the palette has been opened (`enabled`). */
export function usePaletteRepos(enabled) {
  const { viewer, can } = useViewer();
  const showAll = can.isAdmin || can.isCzar;
  const { data, loading, error, refetch } = useQuery(PALETTE_REPOS, {
    skip: !enabled || !viewer,
    context: { showAll },
    fetchPolicy: "cache-first",
  });
  return { showAll, repos: data?.myRepos ?? [], loading: loading && !data, error: data ? null : error, refetch };
}

/**
 * Facilities the palette offers, by role: admins all, czars their own, members none
 * (`visible` false — the group is hidden, matching the nav rule).
 */
export function usePaletteFacilities(enabled) {
  const { viewer, can } = useViewer();
  const visible = !!viewer && (can.isAdmin || can.isCzar);
  const { data, loading, error, refetch } = useQuery(PALETTE_FACILITIES, { skip: !enabled || !visible, fetchPolicy: "cache-first" });
  const facilities = useMemo(() => {
    const all = data?.facilityNameDescs ?? [];
    return can.isAdmin ? all : all.filter((f) => viewer?.czarOf.includes(f.name));
  }, [data, can.isAdmin, viewer]);
  return { visible, facilities, loading: loading && !data, error: data ? null : error, refetch };
}

const PROFILE_PAGES = [
  { key: "profile", label: "My profile", href: routes.profile(), keywords: ["account", "me", "ssh", "keys"] },
  { key: "audit", label: "My audit trail", href: routes.auditTrail(), keywords: ["history", "log"] },
];

/**
 * Page entries (same show rules as the main nav), fuzzy-ranked by `q`, plus — with a query —
 * "Repos filtered to “q”" / "Requests filtered to “q”" so Enter always goes somewhere.
 */
export function usePalettePages(q) {
  const { viewer, can } = useViewer();
  const staticPages = useMemo(
    () => [
      ...MAIN_NAV.filter((item) => !item.show || item.show(can, viewer)).map((item) => ({ key: item.key, label: item.label, href: item.href, keywords: [] })),
      ...PROFILE_PAGES,
    ],
    [can, viewer],
  );
  return useMemo(() => {
    if (!q) return staticPages;
    return [
      ...rankBy(staticPages, q, (p) => [p.label, ...p.keywords], 5),
      { key: "repos-q", label: `Repos filtered to “${q}”`, href: routes.repos({ q }), filtered: true },
      { key: "requests-q", label: `Requests filtered to “${q}”`, href: routes.requests({ q }), filtered: true },
    ];
  }, [staticPages, q]);
}
