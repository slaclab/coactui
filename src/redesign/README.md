# Coact redesign — conventions

Next.js 16 App Router, React 19, shadcn/ui (new-york) on Tailwind v4 **with `prefix(tw)`**, Apollo Client 3 (browser only), design **v2 "SLAC ethos"** (Paper file `01M5AMFKNSMT22E0607ETWJYXT`). The spec is `/Users/amithm/Documents/projects/coact/coact-ui-redesign-spec.md`; where Paper v2 and the spec disagree on visuals, Paper wins; on behaviour and permissions, the spec wins.

## Structure

```
src/app/(app)/**            route files only: await params, <Suspense>, render one page component
src/app/(app)/layout.jsx    AppProviders + AppShell for every redesigned page
src/app/(legacy)/[...slug]  old SPA for any URL no (app) route owns
src/redesign/
  providers/   theme.jsx (ThemeProvider/useAppTheme) · apollo.jsx (client, ClientOnly, useMounted) · viewer.jsx (useViewer → viewer, registration, can.*)
  shell/       app-shell · top-bar (Brand, MainNav, SearchButton, UserMenu) · nav.js · slots.jsx · features/* (palette, impersonation, badges)
  kit/         import from "@/redesign/kit" — DataTable + toolbar parts, ActionsMenu, FormDialog/FieldsForm, RequestDialog, ConfirmDialog, ListEditor, UserCombobox,
               PageHeader, LinkTabs, LineTabs, Segmented, SectionCard, DefinitionList, Chip, StatusPill, CountBadge, Kbd, CopyButton, Timeline,
               AllocationMeter/MeterBar, Skeleton/SkeletonRows, ErrorAlert, EmptyState, PageStub
  lib/         routes.js (ALL links) · navigation.js (useQueryState/useQueryParam/useQueryList/useDialogParam) · format.js · dates.js · csv.js
  data/        cross-page hooks (useClusters, useRollupAnchor)
  actions/     entity action registries (repo-actions.js) rendered by <ActionsMenu>
  pages/<group>/  everything page-specific: components, queries.js, dialogs
src/components/ui/  shadcn primitives (already installed; do not re-run the shadcn CLI)
```

## Rules

1. **Reuse the kit.** Tables are `DataTable`; dialogs are `FormDialog`/`RequestDialog`/`ConfirmDialog`; headers are `PageHeader`; tabs are `LinkTabs` (routes) or `LineTabs` (URL state). Don't build parallel versions. If the kit truly lacks something, build it inside your own `pages/<group>/` folder and list it under "kit requests" in your report — do not edit kit/, lib/, providers/, shell/ (except the shell group), data/, components/ui/ or globals.css.
2. **State is derived, not duplicated.**
   - Server data → Apollo (`useQuery`), never copied into `useState`.
   - Anything shareable/linkable (tab, filters, scope, sort preset, open peek, open dialog) → URL via `lib/navigation.js`.
   - Values computable from props/data/URL → compute inline or `useMemo`. No `useEffect` that syncs one state into another.
   - `useState` only for genuinely local UI state (form values while a dialog is open, a transient "copied" tick).
   - Viewer and permissions → `useViewer()` (`viewer`, `can.isAdmin`, `can.isCzarOf(f)`, `can.roleIn(repo)`, `can.canEditMembers(repo)`, `can.canManageRepo(repo)`, `can.canEditAllocation(repo)`, `can.canEditPurchases()`, `can.canEditFeatures()` …). Show only what the API accepts (spec §1.4).
   - Entity pages → `useRepo()` / `useFacility()` from the layouts' contexts.
3. **GraphQL only in the browser.** Data components render under `<ClientOnly fallback={skeleton}>` (pages export a frame that renders the skeleton on the server). Never fetch on the Next server. Use `context: { showAll }` for `coactshowall`. Name every operation uniquely (prefix with your group, e.g. `RepoMembers`, `FacilitiesList`).
4. **Mutations.** Implement them (request + `requestApprove` chain where the spec says so), wrap in the kit dialogs, `toast.promise`, `refetchQueries` by operation name. **Never execute a mutation while testing** — the local API is backed by a real data copy.
5. **Links** come from `routes.*` in `lib/routes.js`. Use `next/link` for in-app routes; full-page `<a>` only for `/logout` and external URLs.
6. **Styling.** Every Tailwind class carries the `tw:` prefix (`tw:flex tw:hover:bg-muted`), including variants (`tw:hover:…`, `tw:data-[state=open]:…`). Classes must be literal strings in source (Tailwind can't see `"tw:" + x`). Colours only via tokens (`tw:bg-background`, `tw:text-muted-foreground`, `tw:bg-crit-bg`…) or `var(--token)` — never hex. Mono (`tw:font-mono`) for repo names, usernames, clusters, groups, GIDs, paths. Numbers `tabular-nums`. Status colour only as `StatusPill` / meters.
7. **States** (spec §9): header/toolbar always render; bodies show `Skeleton`/`SkeletonRows` while loading; `ErrorAlert` inline with Retry in the region that failed; `EmptyState` with the spec's copy.
8. **Privacy.** Verify with counts/structure. Never print people's records (usernames, names, emails) into reports or logs.
9. **Ownership.** Only create/edit files your group owns (listed in your brief). Shared files are read-only.

## Checking your work

- Dev server: `http://localhost:5174` (`next dev`, hot reload; the dev `/graphql` proxy adds the local dev identity — an admin). Do not start another server or run `next build` (shared `.next`).
- A route compiles if `curl -s -o /dev/null -w '%{http_code}' http://localhost:5174/<route>` is 200; compile/render errors return 500 with the error in the HTML (`curl -s … | grep -o 'Error[^<]*' | head`).
- Probe queries read-only: `curl -s localhost:5174/graphql -H 'content-type: application/json' -d '{"query":"{ … }"}'` and print only counts/shape.
- Schema: introspect via the same endpoint (`__type(name: "…") { fields { name args { name } } }`).
- Legacy implementations to mine for queries and behaviour: `src/tabs/*.jsx`, `src/myprofile.jsx`, `src/register.jsx`, `src/nav.jsx`.
