"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ErrorAlert } from "../../kit";
import { routes } from "../../lib/routes";
import { rankFacilities, rankRepos } from "./fuzzy";
import { usePaletteFacilities, usePalettePages, usePaletteRepos } from "./palette-data";
import { PaletteBody, PaletteDialog, PaletteGroup, PaletteItem, PaletteNote, PaletteSkeleton } from "./palette-frame";

/**
 * ⌘K palette (spec §3): navigation only. Groups: Repos (fuzzy over name / facility / PI),
 * Facilities (admins: all, czars: theirs), Pages. Data loads on first open and stays cached.
 */
export function CommandPalette({ open, onOpenChange }) {
  return (
    <PaletteDialog open={open} onOpenChange={onOpenChange} title="Search Coact" description="Jump to a repo, facility or page.">
      {/* Mounted only while open, so the query text resets every time the palette opens. */}
      <PaletteContent onClose={() => onOpenChange(false)} />
    </PaletteDialog>
  );
}

function PaletteContent({ onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState(""); // local input state while the dialog is open
  const q = query.trim();

  const repos = usePaletteRepos(true);
  const facilities = usePaletteFacilities(true);
  const pageHits = usePalettePages(q);

  // With no query, members see their own repos (a short list); admins and czars search
  // hundreds via coactshowall, so their repos only appear once they type.
  const browseRepos = !q && !repos.showAll;
  const repoHits = useMemo(() => (q || browseRepos ? rankRepos(repos.repos, q, 8) : []), [repos.repos, q, browseRepos]);
  const facilityHits = useMemo(() => rankFacilities(facilities.facilities, q, q ? 6 : 5), [facilities.facilities, q]);

  const go = (href) => {
    router.push(href);
    onClose();
  };

  const showRepos = (!!q || browseRepos) && (repos.loading || !!repos.error || repoHits.length > 0);
  const showFacilities = facilities.visible && (facilities.loading || !!facilities.error || facilityHits.length > 0);
  const nothing = !!q && !showRepos && !showFacilities;

  return (
    <PaletteBody
      query={query}
      onQueryChange={setQuery}
      label="Search repos, facilities and pages"
      placeholder="Search repos, facilities, pages…"
      footer={<><span>↵ open</span><span>↑↓ move</span><span>esc close</span></>}
    >
      {nothing && <PaletteNote>No matches for “{q}”.</PaletteNote>}
      {showRepos && (
        <PaletteGroup heading="Repos">
          {repos.loading ? (
            <PaletteSkeleton />
          ) : repos.error ? (
            <ErrorAlert error={repos.error} what="repos" onRetry={repos.refetch} className="tw:my-1 tw:px-3 tw:py-2 tw:text-xs" />
          ) : (
            repoHits.map((r) => (
              <PaletteItem
                key={`${r.facility}/${r.name}`}
                value={`repo:${r.facility}/${r.name}`}
                onSelect={() => go(routes.repo(r.facility, r.name))}
                meta={[r.facility, r.principal && `PI ${r.principal}`].filter(Boolean).join(" · ")}
              >
                <span className="tw:truncate tw:font-mono">{r.name}</span>
              </PaletteItem>
            ))
          )}
        </PaletteGroup>
      )}
      {showFacilities && (
        <PaletteGroup heading="Facilities">
          {facilities.loading ? (
            <PaletteSkeleton rows={2} />
          ) : facilities.error ? (
            <ErrorAlert error={facilities.error} what="facilities" onRetry={facilities.refetch} className="tw:my-1 tw:px-3 tw:py-2 tw:text-xs" />
          ) : (
            facilityHits.map((f) => (
              <PaletteItem key={f.name} value={`facility:${f.name}`} onSelect={() => go(routes.facility(f.name))} meta={f.description}>
                <span className="tw:truncate tw:font-medium">{f.name}</span>
              </PaletteItem>
            ))
          )}
        </PaletteGroup>
      )}
      {pageHits.length > 0 && (
        <PaletteGroup heading="Pages">
          {pageHits.map((p) => (
            <PaletteItem key={p.key} value={`page:${p.key}`} onSelect={() => go(p.href)}>
              <span className="tw:truncate">{p.label}</span>
            </PaletteItem>
          ))}
        </PaletteGroup>
      )}
    </PaletteBody>
  );
}
