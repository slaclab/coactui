# Coact UI migration plan: Bootstrap → shadcn/ui

**Decision (2026-10-19): migrate the existing coactui repo in place onto Next.js (App Router).** The team chose Next.js over a plain Vite SPA (§0). This worktree now proves the approach: the whole legacy SPA is mounted inside the Next app, and the redesigned pages are real App Router routes next to it.

- **One repo, one app, one image, no second deployment.** The pre-redesign SPA runs unchanged inside a client-only catch-all route, `src/app/[[...slug]]`. This is Next's documented path for migrating an SPA. Each redesigned page becomes a route in `src/app/` that takes precedence over the catch-all, so pages move one milestone at a time, and every old URL keeps working until its page moves.
- **Why not the original "fresh Next.js repo" (B1)?** It needed two deployments, a proxy (`rewrites().fallback`) to the old app, and patches to old-app links for 6–8 months. The in-place catch-all keeps all the advantages of Option A: it ships first, it can stop at any milestone, and legacy components can be embedded in new pages, which the Requests tab needs. The Next-specific cost drops to about **+1.5–2.5 person-weeks** over in-place Vite (§0).
- **Rules that keep Next.js safe here:** no server-side GraphQL in v1 (the API trusts identity headers from any in-cluster caller); identity stays at the ingress; `/graphql` stays routed by the ingress straight to coact-api.
- **The prototype de-risks the hard parts, all verified at runtime:**
  - Next 16.4 with React 19 and Turbopack. `next build` passes in about 6 s, and the `output: "standalone"` server serves every route on port 3000.
  - The legacy app runs unmodified, apart from env-var names and two image imports.
  - Tailwind v4 + shadcn alongside Bootstrap, with 11/11 coexistence checks passing.
  - The design-v2 repos DataTable and cluster usage page.
- **Two findings change the spec.** Cascade layers alone are **not** enough: Tailwind must run with `prefix(tw)` until Bootstrap is removed (§8). And the prototype implements **design v2 ("SLAC ethos")** from Paper, which adds scope (§10).

Prototype: the redesigned pages now read **live data from the locally deployed coact-api** (no mock data). Run it as the `coactui-next` docker compose service on http://localhost:3001, or with `npm run dev -- -p 5174` (§9, §11). Pages: `/next/repos`, `/next/clusterusage/milano?chart=area`, `/next/compat`.

---

## 0. Framework decision: Next.js App Router, in place

| | **Vite SPA (interim step, superseded)** | **React Router v7, framework mode, `ssr: false`** | **Next.js App Router** |
|---|---|---|---|
| Is it React? | Yes (React 19) | Yes | Yes |
| shadcn/ui | Supported (prototype runs it) | Supported | Supported |
| On React's recommended-framework list | No (it is the "build your own" route) | **Yes** | **Yes** |
| Migration from today's code | Done earlier in this worktree, then superseded | Small. The app is already on react-router 6: enable the v7 future flags, bump, then add the Vite plugin and `routes.ts`. The components stay as they are. | **Done in this worktree, in place.** The legacy SPA is mounted client-only in `src/app/[[...slug]]`, and new pages are `src/app/**/page.jsx` routes. No second app and no proxy. |
| Runtime in prod | Static files (`serve` or nginx), same as today | Static files (SPA mode prerenders `index.html`) | A Node server (`output: 'standalone'`, `node server.js`, 48 MB bundle) in the **same** image, Service and port 3000 as today. Static export would lose dynamic routes and rewrites. |
| What SSR/RSC buys Coact | — | Optional later | Little. Identity arrives as Vouch headers at ingress, impersonation and scope live in localStorage, and every page is per-user. Server-side GraphQL calls would also have to forward identity headers to an API that trusts them from any in-cluster caller. |
| Effort vs in-place Vite (§2) | baseline | about +0.5–1 pw | **about +1.5–2.5 pw in place** (Node server ops and probes, SSR-safety discipline, runtime config replacing build-time `NEXT_PUBLIC_*`). It was +5–7 pw as a separate repo (B1). |

**Decision: Next.js App Router, migrated in place.** This was the team's call. The comparison above records the trade-off: Next.js costs a Node server and SSR discipline, and it buys a React-recommended framework, file-system routing, layouts and metadata, a self-hosted font pipeline, and room for server-side features later. The in-place catch-all makes the cost small.

How the two halves coexist (built and verified in this worktree):

| Piece | Where | Notes |
|---|---|---|
| Root layout | `src/app/layout.jsx` | Loads `globals.css` (Bootstrap layer + Tailwind `tw:`) and Geist / Geist Mono through `next/font` (self-hosted at build, no runtime CDN). Same CSS for both halves, so legacy components can render inside new pages. |
| Legacy SPA | `src/app/[[...slug]]/` → `src/legacy-app.jsx` | `next/dynamic(..., { ssr: false })`. The old `BrowserRouter`, Apollo client and localStorage reads run as before. `createRoot` is gone; the module exports its root component. |
| New pages | `src/app/next/repos`, `src/app/next/clusterusage/[clustername]`, `src/app/next/compat` | Server components that render client components from `src/redesign/`. URL state goes through `useQueryState()` (`src/redesign/navigation.js`), a react-router-shaped wrapper over `next/navigation`. |
| Crossing between them | next/link, `router.push` | App Router → legacy works as a client navigation: Next renders the catch-all, which mounts the legacy app. Legacy → new pages must be **hard navigations** (`<a href>` / `window.location`), because a react-router `<Link>` stays inside the legacy router. Browser Back across the boundary works (checked). |
| `/graphql` | ingress → coact-api | Unchanged. `next.config.mjs` only adds a `/graphql` rewrite when `COACT_API_DEV_URL` is set, for local dev. In prod the Next server never proxies identity headers. |

> Produced by a 10-agent workflow (3 readers → 3 option planners → 3 adversarial reviewers → 1 synthesizer) plus hands-on prototyping. **Citations:** coactui paths refer to HEAD `07fd753` with the original `.js` names, unless they say `.jsx`. coact-deploy and coact-api paths are as read on 2026-10-19. All prototype data is placeholder data from the spec. No database or API was queried.

## 1. Inventory

### 1.1 Size and shape
| Metric | Count |
|---|---|
| JS files / lines | 32 / 7,222 |
| React components | 127 (77 class, 50 function) |
| `className` attributes | 477 (21 dynamic) |
| `console.log` | 133 |
| Unused import bindings | 139 (+22 unneeded `import React`) |
| Test files | 0 |
| `src/index.css` (compiled and checked in) | 11,127 lines, 241 KB, 1,343 `!important` (Bootstrap 5.2.0 at css:22–~10607) |
| `src/index.scss` | 640 lines. Never compiled by any npm script; `index.js:42` imports the CSS |
| Fonts | 18 TTFs, of which 4 are referenced (`index.scss:61-80`) |

Largest files (lines): `facility.js` 944, `requests.js` 880, `myprofile.js` 758, `reposcompute.js` 610, `compute.js` 425, `repostabs.js` 380, `reposinfo.js` 323, `users.js` 313.

### 1.2 Routes (`index.js:96-126`, one `<BrowserRouter>`)
| Item | Count / notes |
|---|---|
| `<Route>` total | 25 (13 top-level, 12 nested under `repos`) |
| Index route under `/repos` / 404 route | none / none |
| `exact` (a no-op in RR6) | 25 |
| `useParams` sites | 9 |
| `useOutletContext` consumers | 6 (all from `repostabs.js:374`) |
| `Link`/`NavLink` | 26 (23 live; the 3 in `requesttypes.js:15-21` are dead) |
| `useNavigate` / `<Navigate>` / `window.location` | 1 hook (2 calls) / 3 / 8 |
| Startup sequential queries | 3 (`index.js:57-73` → `nav.js:146` → `repostabs.js:305`) |
| Vouch ingress regex | `/(login.*\|register.*\|requests.*\|my.*\|facilities.*\|repos.*)` (coact-deploy `prod/ui/endpoints.yaml:53`). `/`, `/clusterusage/*`, `/storageusage/*` and assets are unprotected. |

### 1.3 Data layer
Totals:
| Metric | Count |
|---|---|
| Files with `gql` | 27 |
| Operations | 77 (38 queries, 39 mutations, 0 subscriptions, 0 fragments) |
| Hooks | 27 `useQuery`, 10 `useLazyQuery`, 39 `useMutation` |
| `refetchQueries` sites | 29 |
| Anonymous operations | 13 |
| Colliding operation names | 8 names shared by 24 documents |
| Options passed as an ignored 3rd argument | 7 (`repoaudit.js:80`, `requests.js:795`, `repofeatures.js:256`, all 4 `reports/*`) |
| `typePolicies` | 0. The API emits `Id`, not `id`, so nothing is normalized |
| `whoami` / `myRepos` selections | 18 / 6 |
| Distinct roots used | 33 of about 47 query roots, 33 of about 54 mutation roots |

Per file (Q = useQuery, L = useLazyQuery, M = useMutation):
| File | Q | L | M | Notes |
|---|---|---|---|---|
| `facility.js` | 1 | 5 | 6 | 13 gql docs, 9 Modals; `props.facilityname` mutation bug at :879-916 |
| `requests.js` | 1 | 1 | 5 | free-form URL→filter at :784-790; deps-less `useEffect` at :810 |
| `myprofile.js` | 1 | – | 5 | plus the SSH-keys REST client (:98-190) |
| `reposinfo.js` | 1 | – | 4 | `requestApprove` handle never called |
| `compute.js` | 1 | 1 | 3 | one dead approve handle |
| `users.js`, `repofeatures.js`, `repostabs.js` | 1 each | 1 / – / 1 | 3 each | |
| `register.js`, `reposcompute.js`, `groups.js` | 1 each | – | 2 each | |
| `storage.js` | 1 | – | 1 | |
| `nav.js` | 1 | 1 | – | |
| 13 other files (list views, tabs, reports, audits, index) | 1 each | – | – | |

### 1.4 react-bootstrap (27 files import it)
Opening-tag counts: Col 116, Button 92, Row 66, Form.Control 46, InputGroup 46, Modal 37 (14 files), Form.Label 23, ListGroup.Item 22, Tab 16, InputGroup.Text 15, Form.Group 14, Card 13, Form.Text 12, Table 10, Form.Select 9, Alert 8, Toast 3, OverlayTrigger 3, Tabs 3, Navbar 2, NavDropdown 2, Popover 2, Image 2, Tooltip 1.

Other usage:
- FontAwesome: 44 uses of 21 icons.
- Formik/yup: 1 form (`groups.js:70-126`).
- Real Tailwind collisions:
  - `text-primary` ×21
  - spacing steps ≥3: `mb-3` ×22, `p-3` ×3, `ps-5` ×3
  - reboot vs preflight on raw tags
  - The spec's suspected `.border/.rounded/.badge/...` appear 0 times.

### 1.5 Plotly
| Instance | Data | Known bugs |
|---|---|---|
| `compute.js:184-210` MidChart | `perDateUsage{date,resourceHours}` | "Uniform" line is in node units (:190, :197, against :162); `dayOfYear` key merges years (:195) |
| `storage.js:132-156` | `perDateUsage(year){date,gigabytes}` | current calendar year only (query :32) |
| `reports/facilitycomputeoverall.js:26-35` | `reportFacilityComputeOverall` stacked | error check commented out |

- At HEAD: plotly.js 1.58.5 full is 3.48 MB min / 1.03 MB gz, statically imported.
- In the worktree now: `plotly.js-dist-min` 3.7.0 via `src/lib/plot.js`. The single JS chunk is **6,213,480 bytes** plus 223 KB CSS (`build/assets/index-DokRjYvr.js`), with no code-splitting.
- All 3 charts are scatter/area, so Recharts can replace them.

### 1.6 Dead code (delete, do not port)
- **Unused files and components:**
  - `fakelogin.js`, `requesttypes.js` (imported at `index.js:18,23`, never routed)
  - `requestsActiveTab` plus its regex (`index.js:71,87-92`)
  - `RequestNewFacility` ×2 (`facilities.js:22`, `facility.js:848`)
  - the `USERNAMES` query (`facility.js:106`)
  - the WHOAMI queries in `clusterstabs.js:17-36` and `storagetabs.js:16-35` (results unused)
  - the LoginLink dropdown (`nav.js:108-127`)
  - unused formatters `TwoPrecPercent`, `ChargeFactor`, `InMillions`
- **Dependencies and config:** `@apollo/react-hooks`, direct `react-router`, `@fortawesome/free-regular-svg-icons`, the `browser` field (`package.json:49-55`), and 14 unreferenced TTFs.
- **Deploy leftovers:**
  - Makefile (podman).
  - Dockerfile ENTRYPOINT `serve -s build`, which coact-deploy overrides.
  - `coactui/kubernetes/overlays/dev`, a PVC plus code-server sandbox with a plaintext password at `code-server.yaml:54-55`.
- **Broken/no-op code that must not be ported:** mutation result destructures that are always undefined (`register.js:124`, `groups.js:257`, `compute.js:386-388`, `storage.js:164`, `nav.js:147`).

### 1.7 Build and deploy facts that constrain every option
- **Prod runs the CRA dev server.** Both overlays override the entrypoint with `command: ["npm","start","--host=0.0.0.0"]` (coact-deploy `prod/ui/deployment.yaml:24`, `dev/ui/deployment.yaml:24`) on 2 replicas. That is the only reason `REACT_APP_*` behaves as runtime env.
- **Image drift.** Prod is pinned to `coact-ui:20250623-2236` (`prod/kustomization.yaml:13-14`), about 16 months behind main. Deploys are manual (`make apply`).
- **Same origin.** UI and API share `coact.slac.stanford.edu`; `/graphql` has its own Vouch-protected ingress (`prod/api/endpoints.yaml:17-47`).
- **Unset config.** `REACT_APP_LOGOUT_URL` and `REACT_APP_SLAC_MFA_SSH_KEYS_SERVER` are set nowhere. So the SSH-keys card (`myprofile.js:680`) is hidden everywhere, and coact-dev logs out via prod Vouch.
- **Identity is trusted blindly.** coact-api trusts `x-vouch-*` headers from any in-cluster caller, and `BOT_USERS` are promoted to admin (`main.py:160-163` on main).
- **Local dev identity is broken.** `dev_middleware.py` is gitignored (`.gitignore:158`) and imported nowhere, and its filter at :18 compares a str against bytes.

---

## 2. Options (effort uses the skeptic-revised numbers; pw = person-weeks for 1 frontend developer; backend work is excluded)

| | **A: in-place** | **B1: fresh Next.js** | **B2: fresh Vite + TS in `web/`** |
|---|---|---|---|
| Approach | Finish the worktree's Vite step 0. Run Tailwind v4 and shadcn inside cascade layers over Bootstrap. Port page by page behind `?next=1` flags in spec order, then the non-spec pages, then delete Bootstrap. | Next 16 standalone used only as a client-rendered SPA host (no RSC data, no server GraphQL). `rewrites().fallback` proxies unported paths to the old `coact-ui` Service. Ownership moves path by path. | New TS-strict Vite app in `web/`, old app in `legacy/`. One nginx image splits by path (`^/repos/info$`, `^/repos/[^/]+/[^/]+/?$`, `^/facilities`). |
| Effort, full (Bootstrap-free) | **27–34.5 pw** base (plan said 25–31.5) | **~27 pw** base, **~32 pw** (27–38) with 20% contingency | **~34 pw** base, **~40–41 pw** with contingency |
| Effort, spec scope only | **21–27 pw** | ~23 pw base / ~27 pw with contingency. Requests is pulled forward, so /requests cannot really be left behind (§3.2). | not separable: /requests is needed before facility detail |
| First user-visible page (/repos/info) | ~6–8 pw (kit plus table; step 0–1 mostly done) | ~10 pw (P0 3.5 + P1 3 + P2 3.5) | ~10.5–11 pw |
| Calendar (solo) | 6.5–8 months | 7.5–8.5 months | 9.5–10 months |
| Running apps during migration | 1 app, 1 image | 2 Deployments, 2 images, 2 CI pipelines, proxy hop | 2 apps, 1 image, 2 dependency trees (React 18 and React 19) |
| Bootstrap/Tailwind cascade problem | Yes, for 5.5–7 months (mitigated, see §3.4) | None (no shared DOM) | None in `web/`; legacy must stay a pure Bootstrap build |
| Reuse | Repo, git history (renames preserve blame), CI/cosign, the 77 gql docs in place, about 1,600 lines of logic, the worktree's Vite/Tailwind/shadcn/prototype work | About 1,600 lines of logic as reference; gql rewritten as codegen docs; shadcn files need `'use client'`/`rsc:true` | Same as B1; legacy uses the worktree Vite conversion after stripping Tailwind |
| Top risks | Per-port regressions on old pages through shared CSS; keyFields throwing on old docs; non-spec pages (5–6 pw) get cut, so Bootstrap stays forever | Header-trust hole if anyone ever adds server fetching; request-time env baked at build time unless the layout is forced dynamic; HardNav reload loops and two-image rollback coupling | Legacy RepoTabs client `Link`s (`repostabs.jsx:355,358`) bypass the nginx split; dual-run upkeep 1.5–2 pw; /requests on the critical path |

### Sequencing (summary)
- **A:**
  1. M0: Vite and deploy fixes.
  2. M1: Tailwind layers.
  3. M2: data layer and kit.
  4. M3: /repos/info.
  5. M4: repo page.
  6. M5: facility.
  7. M6: /facilities.
  8. M7: shell.
  9. M8: non-spec pages.
  10. M9: Bootstrap removal.
- **B1:** fix the old image first. Then a Next front door owning zero paths, then the shell and kit, then /repos/info, the repo page, facility, /facilities, the non-spec pages, and finally decommission.
- **B2:**
  1. Legacy hygiene and the deploy fix.
  2. Scaffold `web/`.
  3. Kit and /repos/info.
  4. Repo page.
  5. Facility and /facilities.
  6. /requests.
  7. Profile/register.
  8. Allocation detail and reports.
  9. Delete legacy.

---

## 3. Adversarial findings

### 3.1 Refuted
| Option | Claim | Why it failed |
|---|---|---|
| A | Scoping `@source` keeps Tailwind utilities off old pages | It limits where Tailwind scans, not where the CSS applies. shadcn `button.jsx:20`/`badge.jsx:19` and `src/next` emitted `.text-primary/.mb-3/.p-3/.mt-3` into the top layer, which changed 47 old usages. |
| A | keyFields typePolicies are backward compatible | Apollo throws on a missing keyField (`key-extractor.js:26-40`). About 14 old docs return `Repo{name}` or `Facility{Id}` (users, reposinfo, compute, repofeatures, facility), plus `users.js:23-25 facilityObj{czars}`. `repoRenameRepo` changes the key itself. |
| A | Anti-reboot shim with `border-radius:revert-layer` | `revert-layer` from `components` rolls back to `bootstrap`, which restores `button{border-radius:0}`. The descendant selector also misses the `[data-slot]` element itself. |
| A | `findDOMNode` removal is a React 19 blocker | RB `TransitionWrapper` always passes `nodeRef`. The real blocker was `defaultProps` (`Modal.js:58/:267` in 2.5.0). |
| A | `/repos/:facility/:name` collides with 2-segment legacy URLs | No legacy route sits at depth 2 (`index.js:111-122`). Redirects are still useful, but not for precedence. |
| A, B2 | Bundle is 4.46 MB on plotly 1.58.5 and needs `define:{global}` | Stale. Now plotly 3.7.0 via factory, 6.2 MB, no `define`. |
| Inventory, B1 | Empty env falls back to relative `/graphql` | **False.** ApolloClient uses `uri ? new HttpLink(...) : ApolloLink.empty()` (`node_modules/@apollo/client/core/ApolloClient.js:78`, verified). A static build without the env var makes **zero** GraphQL requests. This is still unfixed in the worktree (`src/index.jsx:50`). |
| B1, B2 | /requests can stay on the old app for "redesign scope only" | The spec embeds "the existing Requests component" in facility detail (spec ~:376) and repo History uses the repo's requests (~:601). Neither can mount across apps. |
| B1 | 13 of 25 routes have no redesign | It is 10, and about 7 of those are real pages. |
| B1 | A is 8–10 pw cheaper | The honest delta is about 5–7 pw for redesign scope and 3–4 pw at full decommission, because A's coexistence cost had been charged at about zero. |
| B2 | Total 29.0 pw; infra 0.25 pw | The milestone table sums to 27.5 and M3 under-adds by 0.5. Infra is realistically 1–1.5 pw, plus 1.5–2 pw of dual-run upkeep that was not budgeted. |
| B2 | Legacy can reuse the worktree Vite conversion as-is | It carries preflight, `$enable-important-utilities:false`, radix/recharts and `/next/*` routes, all of which must be stripped. |

### 3.2 Upheld (all three options agree, and reviewers confirmed)
- The `npm start` override in coact-deploy (`prod/ui/deployment.yaml:24`, `dev/ui/deployment.yaml:24`) must be removed together with `WDS_SOCKET_PORT` before any new image tag is applied.
- React 19 with react-bootstrap 2.5.0 breaks every Modal (fixed since by 2.10.10, §3.4).
- `$enable-important-utilities:false` cuts `!important` from 1,343 to 76, and none of the remaining 76 are spacing or text utilities.
- The GraphQL URI can be relative `/graphql` (same origin), but only if it is set explicitly (§3.1).
- Logout and SSH-keys URLs need runtime config (`/config.js` or server env).
- No ingress change is needed for new routes under `repos.*` and `facilities.*`.
- `/login` must stay a full page load (`landingpage.js:17`).
- Keep the localStorage keys `imptk` and `showallrepos`. Keep full reloads for impersonation while old class components exist, because constructor-computed state goes stale.
- B1's "no server-side GraphQL" rule is mandatory, given the `BOT_USERS` admin promotion and the unauthenticated ClusterIP.
- Static-export Next is no better than Vite.
- The repoUsageSummaries resolver does not exist, and the client-side fallback costs about 300+ Mongo calls for 48 repos.

### 3.3 Missed risks that survive into the plan
- **XHR auth expiry.** An expired session gets a Vouch 302 that fails CORS, so Apollo sees a network error, not a 401. `onError` must treat network errors on `/graphql` as possible expiry.
- **Prototype routes are public.** `next/repos`, `next/clusterusage/:c` and `next/compat` (`src/index.jsx:127-129`) sit outside the Vouch regex and use mock data. Remove or flag-gate them before any release.
- **The `?next=1` flag collides with `requests.js`.** That page turns every query parameter into a `CoactRequestFilter` field. The 7-field whitelist must land in M0, not M8.
- **The flagged route must not render inside RepoTabs.** Wrapping the nested `repos/info` route keeps it inside RepoTabs and its extra query, so the route tree needs restructuring.
- **No test harness.** Authenticated visual-regression and role tests need seeded Mongo plus working dev identity, and neither exists. That is 0.5–1 pw no plan budgeted.
- **Preflight `*{border:0 solid}` and `@apply border-border` reach old pages.** Unclassed `td/th`, `img`, `dd` and `fieldset` can shift.
- **Unreleased commits ship with the first release.** The first new image also ships 23 unreleased main commits (gateway logout, SSH keys).

### 3.4 Worktree state after the reviews (verified at runtime, 2026-10-19)
The reviewers were reading a moving target. Here is where each review item stands now.

| Item | Status |
|---|---|
| Global class-name collision (A's top refutation) | **Fixed with `prefix(tw)`** (§8). The `/next/compat` page checks 11 computed styles, and all pass. |
| Apollo `uri` falsy → `ApolloLink.empty()`, so zero requests | **Fixed:** `uri: REACT_APP_COACT_GRAPHQL_URI \|\| "/graphql"` (`src/index.jsx:51`). With no API running, the old app now shows its landing page instead of "Loading..." forever. |
| React 19 vs react-bootstrap `defaultProps` | **Fixed** by upgrading to react-bootstrap **2.10.10**. Its only `defaultProps` left is a hand-merged parameter (`createWithBsPrefix.js`). A react-bootstrap `Modal` opens and styles correctly under React 19.3.1 (checked at runtime). The other 36 Modals, 3 OverlayTriggers and 3 Toasts still need the M0 smoke test. FontAwesome react 0.2.6 also hand-merges its defaults. **Do not pin React 18:** shadcn v4 components pass `ref` as a prop, which React 18 drops, and that breaks Radix `asChild` triggers. |
| `npm start` is the dev server in prod | **Fails safe:** `start` = `next start -H 0.0.0.0 -p 3000` (production server). The image itself runs `node server.js` (standalone). The coact-deploy `command` override should still be removed. |
| Bundle is a 6.2 MB single chunk | **Fixed:** plotly is lazy-loaded (`src/lib/plot.jsx`). The entry is now **1.61 MB / 463 KB gzip**, and plotly is a separate 4.6 MB chunk that only the 3 legacy chart pages load. A legacy plotly chart renders through it (checked at runtime). |
| `/next/*` prototype routes sit outside the Vouch regex | **Still open.** They must be deleted or flag-gated before anything merges. They are mock-data demos. |
| Dockerfile still runs `npm install react-scripts`, single-stage, unpinned `node:alpine` | **Rewritten:** multistage `node:22-alpine` → `npm ci && npm run build` → standalone runtime as a non-root user on port 3000, plus a `.dockerignore`. Not built here (no container work in this session). |
| `REACT_APP_*` env vars | Renamed to `NEXT_PUBLIC_*` (build-time inlined; Dockerfile build args). Replace with runtime config in M0 so one image serves dev and prod. |

---

## 4. Recommendation: migrate in place (Option A), on Next.js App Router. Do not start a fresh repo.

> **Update after the framework decision (§0):** everything below still holds, with one change: "in place" now means in place **onto Next.js**. The catch-all route keeps all of A's advantages and removes B1's second deployment, so the B1 critique in point 4 applies to a *separate* Next repo, not to this approach. The no-server-side-GraphQL rule from B1's review becomes a project rule.


1. **At full scope, cost does not decide this.** Revised bases are A 27–34.5, B1 ~27 (but ~32 with contingency and 7.5–8.5 months), and B2 ~34. Roughly 0% of the JSX and about 22% of lines survive in every option, so everyone rewrites the same 127 components. What separates the options is time to value, operational load and risk.
2. **A ships first and can stop safely.**
   - /repos/info lands at about 6–8 pw, against about 10–11 pw for the fresh options.
   - A can halt at spec scope (21–27 pw) with the 7 non-spec pages still working on Bootstrap at zero cost.
   - B1 and B2 cannot halt there, because /requests is embedded in the redesigned facility page.
3. **A's main technical risk is already mitigated in the worktree.** `prefix(tw)` addresses the collision, RB 2.10.10 the defaultProps break, `start=serve` the dev-server-in-prod risk, and the `/graphql` fallback the silent no-request build. Steps 0–1 are mostly done, and their checks pass at runtime. Throwing that away to pay for a second app is negative value.
4. **The fresh options buy little and add real cost.**
   - B1: SSR, RSC and server actions give nothing here. Identity is ingress headers, per-request state is in localStorage, every page is per-user, and the one legitimate win (collapsing the startup waterfall) is available in an SPA. B1 also adds a Node trust boundary next to an unauthenticated API that promotes `BOT_USERS` to admin.
   - B2: its real advantages (TS strict, codegen, no coexistence tax) are attainable inside A. Do codegen and `checkJs`/TS for `src/redesign/**` only, and avoid the 1.5–2 pw of dual-app upkeep and the cross-app link and rollback hazards.
5. **When fresh would win.** Only if the team commits up front to TS-strict everywhere and to rebuilding every page anyway. Even then, B2 inside this repo beats B1. Revisit this only if A's M1 visual-regression sweep shows the coexistence tax exceeds about 3 pw.

---

## 5. Phased plan (Option A, revised)

| Milestone | Weeks (pw) | Scope | Exit criteria |
|---|---|---|---|
| **M0: Ship Next.js safely** | 1–3 (2–2.5) | Commit the worktree conversion: Next 16 App Router, legacy SPA in the client-only catch-all, the standalone Dockerfile, and the `/graphql` fallback. **Runtime config:** replace the build-time `NEXT_PUBLIC_*` values (logout URL per environment, SSH-keys server) with a server-read config, for example the root layout reading `process.env` at request time (`export const dynamic = "force-dynamic"` on the layout) or a `/config.js` route handler, so one image serves dev and prod. Delete `/next/*` prototype routes or gate them (they sit outside the Vouch regex). Requests 7-field whitelist and the `:810` effect fix. CI: `npm ci && npm run build`, and an image build. Remove dead deps. coact-deploy: drop `command` (the image runs `node server.js`) and `WDS_SOCKET_PORT`; add readiness and liveness probes; set memory requests and limits for a Node server (about 256Mi / 512Mi). Optionally cut a CRA-era catch-up release first. | coact-dev on the new tag. 25 routes × {member, czar, admin} smoke-pass through the catch-all. `/graphql` calls visible in the network tab. 37 Modals open. Logout on dev hits vouch-dev. The legacy entry stays code-split from the new pages, with plotly in its own chunk. Then prod. |
| **M1: Coexistence hardening** | 3–4 (1.5–2) | Write down the **SSR-safety rules** for `src/redesign/**`: no `window`/`document`/`localStorage` during render; browser-only libraries through `next/dynamic({ ssr: false })` (as `src/lib/plot.jsx` does); URL state via `useQueryState` inside `<Suspense>`. Add an ESLint rule or test that renders each route on the server. `prefix(tw)` is in place for the 11 ui components (CLI fix-ups in §9.4). The anti-reboot shim already uses explicit values and matches `[data-slot]` itself; extend it as leaks turn up. Audit preflight leaks (`td/th/img/dd`). CI check that index.css matches the sass output. Build the authenticated screenshot harness (Playwright plus wired dev_middleware or admin impersonation on coact-dev). | 0 unexplained pixel diffs on 25 old routes. Harness reruns in CI after every later milestone. |
| **M2: Data layer and kit** | 5–7 (3.5–4.5) | `setContext`/`onError` (network error = possible auth expiry)/`HttpLink`. typePolicies **only for types new queries select fully**: either patch the ~14 old docs to add `facility`/`name`, or defer keyFields until they are deleted. `src/redesign/queries` with unique names. Codegen scoped to `src/redesign/**` against the **deployed** API schema. flags.js. DataTable, ListEditor, FieldsForm, ConfirmDialog, RequestDialog, AllocationMeter, §2 formatters, peek Sheet. Vitest for formatters and meter rules. Decide TS here (+1–1.5 pw if yes). | Old pages pass the M1 harness with the new link chain. Kit has unit tests. Codegen CI fails on schema drift (`burstNodes` vs `burst_percent`). |
| **M3: /repos/info** | 8–11 (3–4) | Becomes `src/app/repos/info/page.jsx` (taking precedence over the catch-all). Remove the `repos/info` route from `legacy-app.jsx`, and turn legacy links into it into hard navigations. Route restructured outside RepoTabs. Compute/Storage presets first, Overview meters once repoUsageSummaries lands. Scope tabs (`network-only`), and write `showallrepos` back to localStorage so legacy pages agree. | 2 weeks opt-in, then default-on for 2 weeks with 0 P1 bugs. Old list views deleted. |
| **M4: Repo full page** | 12–16 (4–5) | 7 tabs. Burst field plus the request→approve chain (`reposcompute.js:586-597`). Fix `princpial` (`reposinfo.js:70`). Redirects. History needs a repo-scoped requests list (build the shared Requests table here). | Deleted: users, groups, repofeatures, repoaudit, reposusers, reposgroups, reposaudit (about 1,200 lines). |
| **M5: Facility detail** | 17–20 (3.5–4) | Route-param facility name everywhere (fixes `facility.js:879-916`). Embedded Requests tab reuses the M4 table. Purchase dialogs with an impact preview. | `facility.jsx` deleted. Czar and admin role tests pass. |
| **M6: /facilities** | 21 (1–1.5) | Cards/Table toggle, health rule, single-czar redirect. | `facilities.jsx` deleted. |
| **M7: Shell** | 22–23 (1.5–2) | Move the v2 top bar into `src/app/layout.jsx` so every page, legacy included, gets it. Then delete the legacy Navbar. Top bar, impersonation strip, ⌘K, Requests badge, one `whoami+amIRegistered` startup query. | 3 sequential startup queries become 1. `nav.jsx`, Footer and NoNavHeader deleted. |
| **M8: Non-spec restyle** | 24–29 (5–6) | requests, myprofile/SSH keys, register/landing, allocation detail on Recharts (fix the unit and dayOfYear bugs), cluster/storage reports, myaudittrail. | CI allowlist for `react-bootstrap\|@fortawesome\|react-plotly\|formik` reaches 0. |
| **M9: Remove Bootstrap** | 30–31 (1) | Delete the catch-all, `legacy-app.jsx`, react-router, the layer import, index.scss/css, shims and deps. Run `npm run unprefix-tw`. | CSS ≤40 KB, JS entry ≤1 MB (to confirm by build). Full role regression green. |

**Decision gate after M7.** Spec scope is complete at that point (about 21–27 pw). Either continue to M8–M9 or freeze Bootstrap on the 7 legacy pages.

---

## 6. Backend prerequisites (coact-api; about 3.5–4.5 pw, run in parallel from M2)

| # | Item | Needed by | What existing code can back it |
|---|---|---|---|
| 1 | **`repoUsageSummaries(scope)`**, with per-repo compute % of allocation (7d), storage GB/inodes vs quota, and a needs-attention flag. 1.5–2 pw. | M3 Overview meters, usage sort, attention facet | `Repo.currentComputeAllocations` (`models.py:815` main) gives `allocated`, `burstAllocated`. `RepoComputeAllocation.perDateUsage(pastDays:7)` (:676) reads the `repo_daily_compute_usage` rollup. `Repo.currentStorageAllocations` (:843) and `RepoStorageAllocation.usage` (:730) read the latest `repo_overall_storage_usage`. Implement it as **one aggregation per collection over all visible repos**, not per-repo resolvers (no DataLoader exists; the naive version is 300+ calls for 48 repos). **Do not** reuse `repoRecentComputeUsage` (`schema.py:640`): it scans raw jobs, its percent is a share of the facility purchase, and it filters via `repos()`, which misses PIs who are not in `users` (`schema.py:355-371` vs `myRepos` :433). |
| 2 | `myRepos(scope)` | M3 scope tabs and cache keys | Existing `myRepos` (:433) plus the `coactshowall` logic (`main.py:195-200`) moved into an argument. 0.5 pw. |
| 3 | Recompute `repo_compute_allocations.allocated/burst_allocated` on purchase edit | M5 purchase impact preview | `facilityAddUpdateComputePurchase` does `$set servers` in place (`schema.py:1508-1509`). Allocations are computed only at request time (:846-847). 0.5–1 pw. |
| 4 | Facility audit trail | M5 History tab | Pattern from `repoAuditTrails`/`userAuditTrails`. 1 pw. |
| 5 | `Repo.allUsers` fix | M4 Members | `set(list(self.principal))` (`models.py:807` main) iterates the characters of the string. 0.1 pw. |
| 6 | Approvable-requests count | M7 badge | `requests` root with an approver filter. About 0.25 pw. |
| 7 | Historic compute % date-filtering, and a guard on the `KeyError` | Facility windows (`lastyear`) | `reportFacilityComputeUsageByCluster` uses the last purchase record for the whole range (:596, :607-617; same pattern at :337 and :683) and raises a `KeyError` at :610. 0.5 pw. |
| 8 | Dev identity | M1 harness | Import `dev_middleware.py`, fix the str-vs-bytes filter (:18), and inject the header `FULLNAME_FIELD` names. Also set `FULLNAME_FIELD` in both API overlays (unset today). 0.25 pw. |
| 9 | Schema provenance | M2 codegen | Map deployed API image tags (prod `20261008-2006`) to commits. Prod sets `POSIX_SYNC_USERNAMES`, which exists only on `feat/posix-sync` (`burst_percent`, `models.py:488`), while main has `burstNodes` (:450). |

---

## 7. Open questions
1. **Who commits the worktree conversion?** This session committed nothing. Reviewers flagged that the worktree kept changing during review (that was this prototype). The diff is ready to split into an M0 PR (§9.5).
2. **Which coact-api branch is actually deployed** (`main` or `feat/posix-sync`)? This determines the codegen schema and the `burstNodes` vs `burst_percent` field.
3. **Is a CRA-era catch-up release wanted** before M0, to separate 23 unreleased commits from the Vite switch?
4. **TS:** adopt it at M2 for `src/redesign/**` (+1–1.5 pw), or stay JS with `checkJs`?
5. **Should the SSH-keys card be enabled anywhere?** If so, what is the server URL and its CORS policy for `credentials:'include'`? It has never run in a deployed environment.
6. **Is M8 committed?** Is Bootstrap removal a goal, or is freezing the 7 non-spec pages on Bootstrap acceptable? This needs a mini-spec (about 1 pw) if they are to be restyled.
7. **Will the API owner deliver repoUsageSummaries by week 8?** If not, M3 ships without Overview meters.
8. **Can `coactui/kubernetes/overlays/dev` be deleted** (it contains a plaintext code-server password), and should the Makefile flow be retired in the coact-deploy README?
9. **Test data:** is there an approved seeded Mongo fixture for role-matrix tests, or should the harness use admin impersonation on coact-dev?

---


---

## 8. How Bootstrap and Tailwind coexist during the dual run (measured, not assumed)

The spec's plan was cascade layers plus disabling preflight on unported pages, with `prefix(tw)` as a fallback. The prototype shows the fallback is required. Each finding below was reproduced on `/next/compat` with `getComputedStyle`.

| # | Mechanism | Finding | Resolution in the worktree |
|---|---|---|---|
| 1 | Layer order | `@layer theme, base, bootstrap, components, utilities`. Bootstrap's reboot sits above preflight, so old pages keep their element defaults. Tailwind utilities sit above Bootstrap. | `src/styles/globals.css:15-18` |
| 2 | `!important` | Bootstrap's utilities are `!important` (1,343 rules), and `!important` in a lower layer beats normal declarations in higher layers. | Recompiled with `$enable-important-utilities: false` → 76 left, none of them utilities (`src/index.scss`, `npm run css:bootstrap`). |
| 3 | **Shared class names** | Layers order the cascade, but they can't separate names. shadcn's own `button.jsx`/`badge.jsx` use `text-primary` and `bg-secondary`, so Tailwind always generates them. Old `.text-primary` (21 uses, Coact red) rendered **zinc-900**. Old `<Badge bg="secondary">` (Coact yellow) rendered **zinc-100**. `p-3`/`mb-3` (25 uses) shrank from 16px to 12px. `@source` scoping does not help. | **`@import "tailwindcss" prefix(tw)`**. New code writes `tw:flex tw:hover:bg-accent`, so the namespaces never overlap. shadcn CLI: `"prefix": "tw"` in `components.json`. tailwind-merge: `extendTailwindMerge({ prefix: "tw" })` (`src/lib/utils.js`). |
| 4 | `.border` shorthand | Bootstrap's `.border` sets `border-color` in a layer above shadcn's base `* { border-color }`, so new borders came out Bootstrap grey (#dee2e6). | Resolved by #3 (`tw:border` no longer matches `.border`). |
| 5 | Reboot leaking into new markup | `a` red and underlined, `h1–h6` sizes, `p`/`ul` margins, `label` margin. Radix portals render outside any page wrapper. | Zero-specificity reset in the `components` layer, scoped to `.tw-page` and to every `[data-slot]` element. All shadcn v4 parts carry `data-slot`, so portals are covered too (`globals.css`). Old markup embedded in a new page opts out with `.bs-scope`. |
| 6 | Preflight reaching old pages | `ul/ol` lose bullets, `img` becomes block. | Small compat block in the bootstrap layer (`globals.css`). Audit `td/th/img/dd/fieldset` in M1 with the screenshot harness. |
| 7 | Theme variables are prefixed too | With `prefix(tw)`, theme vars become `--tw-color-*`. | New code references the raw tokens (`var(--border)`, `var(--primary)`). `scripts/unprefix-tw.mjs` maps `--tw-color-` back. |

**What this buys:** legacy Bootstrap components can still mount inside new pages during the transition, for example the existing Requests component in the facility detail Requests tab, which the spec requires. That is something only the in-place option can do.

**Exit (M9):** delete the bootstrap layer import, `index.scss`/`index.css` and the shims. Then run `node scripts/unprefix-tw.mjs`, and remove `prefix(tw)` and `"prefix": "tw"`. The unprefix is a mechanical regex over `tw:` tokens.

---

## 9. Prototype notes

### 9.1 Run it
```bash
npm install
```
```bash
npm run dev -- -p 5174
```
A `.claude/launch.json` entry (`coactui-prototype`) does the same. `npm run build` (Next 16.4 + Turbopack) succeeds in about 6 s. To run the production server exactly as the image does:
```bash
npm run build && cp -R public .next/standalone/ && cp -R .next/static .next/standalone/.next/ && PORT=3000 node .next/standalone/server.js
```
Next telemetry is disabled in every npm script (`NEXT_TELEMETRY_DISABLED=1`).

| URL | What it shows |
|---|---|
| http://localhost:5174/next/repos | /repos/info as a v2 shadcn DataTable on TanStack Table v8, on live `myRepos`. Scope tabs follow the viewer's role (the local dev user is an admin: My repos · All, 936 repos). Try `?scope=mine`, `?attn=1`, `?facility=…`. |
| http://localhost:5174/next/clusterusage/milano | Cluster usage page on the live daily rollup. Add `?chart=line\|area\|percent` and `?range=week\|month\|year`. Any cluster name works (roma, ampere, ada…). |
| http://localhost:5174/next/compat | Bootstrap and shadcn side by side: 11 computed-style checks, a react-bootstrap Modal, and a legacy plotly chart. |

Every other route (for example `/`, `/repos/info`, `/facilities/LCLS`) is the unchanged legacy SPA, served by the catch-all. With no API running it shows the landing page or its own error state, and its `/graphql` POSTs reach the catch-all, which answers with HTML. In the cluster the ingress sends `/graphql` to coact-api first.

### 9.2 What is built (design v2)
- **Shell** (`src/redesign/shell.jsx`):
  - v2 top bar: SLAC wordmark · **Coact** S3DF. Nav items get a 2px SLAC-red underline when active. Requests carries an amber pill count and links to the legacy page during the dual run.
  - A ⌘K search field (visual only) and a user menu with the role chip.
  - Shared `LineTabs` (red underline) and `Segmented` (muted track, raised white item).
- **Repos table** (`src/redesign/repos-table.jsx`, matches artboard "Repos — Table (Czar, My facilities)"):
  - **Header and scope:** red split button "Request new repo ⌄". Scope tabs My repos / My facilities in `?scope=`.
  - **Toolbar:** a 280px filter; dashed facet buttons **Facility** and **My role** (working, values in `?facility=` / `?role=`, with counts); **Needs attention** with a count (`?attn=1`); Reset; the Overview · Compute · Storage segmented preset (Compute and Storage are disabled in the prototype); **View** (column visibility); and **Export** (CSV of the filtered rows).
  - **Rows:** 48px. Geist Mono for repo names, PIs and clusters. Filled neutral chips for Facility, PI and Leader; "Czar view" as shield + text. **SLAC-red checkboxes** and a 45% brand-tint on selected rows. Checkboxes are disabled for `default` and out-of-facility rows.
  - **Meters:** graphite fill, **vermilion** past the cap (131%), **blue** while bursting (108%), **amber** for storage ≥80%. They fill from 0 the first time they're seen (600 ms).
  - **Row "…" menu:** icons, "Go to · Members, Compute… ›" submenu into the legacy pages, a "Manage · LCLS czar" group label, Rename inside Manage.
  - **Bulk bar:** red primary "Add member…", plus Export CSV and Copy names.
  - **Kept from v1:** the Esc-ordering fix, row click as a redundant target, and `?q=` / `?peek=` in the URL.
- **Cluster usage** (`src/redesign/cluster-usage.jsx`, matches "Cluster usage — milano" + "chart type variants"):
  - **Page:** breadcrumb Facilities › LCLS › `milano`; mono title; the "320 nodes · 40,960 cores · purchased by 6 facilities · Daily rollup" line; **Week / Month / Year** in `?range=` (Year = the last 12 complete months, aggregated by month); a working Export CSV; and line tabs (only By facility is live).
  - **Chart card:** one dataset and one chartConfig. **Graphite ramp, two named facilities + "N others"**, a dashed capacity line, and a ToggleGroup Bar · Line · Area · **% of capacity** in `?chart=`. **% of capacity is one utilization series** with a dashed 100% line, a blue **burst zone** above 100%, and "Peak · avg". Each mode carries the v2 subtitle and footnote.
  - **Facility table:** Purchased · Used this {week|month|year} · % of purchase meter · Repos.
- **Tokens** (`src/styles/globals.css`): Concrete ground `#ECEEF0`, Aluminium surfaces `#F7F8F9`, Graphite ink `#1A1F24`, Slate muted `#59616A`, border `#D5DADF`, **primary = SLAC red `#B1040E`** (hover `#8E0A12`), and the LED status set (ok `#12805C`, warn `#B26B00`, crit `#E0451F`, burst `#2D6BCF`, each with `-text` and `-bg`). Radii 6/8/10/14. **Geist + Geist Mono** come from the `geist` package through `next/font` (self-hosted at build, no runtime CDN calls). Menus fade with a 4px offset over 150 ms with no zoom, and everything is instant under `prefers-reduced-motion`.
- **Deliberate deviation:** the focus ring stays **graphite**, not red. v2 makes red the selection colour, and a red ring next to red selection would read as `aria-invalid`. Flag this for the designer.
- **Chart accessibility note:** the v2 graphite ramp is not a hue palette, and the lightest step (`#D4D4D8`) is under 3:1 on Aluminium. The design compensates by capping named series at two and folding the rest into "others". The prototype adds tooltips and the facility table as the text alternative.

### 9.3 Build changes (CRA → Next.js App Router), all uncommitted
- **Toolchain:** `react-scripts` removed; `next` 16.4 (Turbopack), `@tailwindcss/postcss` 4.3 + `postcss.config.mjs`, `geist` (next/font). `next.config.mjs` sets `output: "standalone"`, `reactStrictMode: false` (the legacy class components were never written for double-invoked effects), and a dev-only `/graphql` rewrite behind `COACT_API_DEV_URL`. An interim Vite 8 step was built and verified first, then replaced; the `.jsx` renames and fixes from it carried over.
- **Legacy code changes:**
  - The 32 `src/**/*.js` files are renamed to `.jsx` (`git mv`, so blame is kept).
  - `src/index.js` → `src/legacy-app.jsx`, which exports its root component instead of calling `createRoot`.
  - `process.env.REACT_APP_*` → `process.env.NEXT_PUBLIC_*` at 4 sites.
  - The two PNG imports in `widgets.jsx` use `.src`, because Next's static image imports are objects.
  - `public/index.html` is deleted; `src/app/layout.jsx` owns `<html>`, the metadata, favicon and manifest.
- **Libraries:** React 19.2, Apollo Client 3.14, react-bootstrap 2.10.10, FontAwesome react 0.2.6, TanStack Table 8.21, Recharts 3.
- **plotly.js 1.58 does not run under ESM bundlers** (its d3 v3 reads `this.document`). It is replaced by `plotly.js-dist-min` 3 through `react-plotly.js/factory`, behind `next/dynamic({ ssr: false })` in `src/lib/plot.jsx`. That keeps it off the server and in its own chunk.
- **Apollo:** Client 3.14 logs deprecation warnings for `uri`/`headers` on the constructor. Moving to an `HttpLink` + `setContext` chain in M2 fixes them and is needed for per-operation `coactimp`/`coactshowall` anyway.
- **Dockerfile:** multistage, `node:22-alpine`, `npm ci`, `npm run build`, then the standalone runtime (`node server.js`, non-root, port 3000). Also a `.dockerignore`.

### 9.4 Tooling bugs found (work around them in M1)
1. **shadcn CLI with `tsx: false`** writes `import { cn } from "cn"` in every component. Fix: `sed -i '' 's#from "cn"#from "@/lib/utils"#' src/components/ui/*.jsx` after each `shadcn add`.
2. **shadcn CLI prefix mode** strips the quotes in `[stroke='#ccc']` / `[stroke='#fff']` selectors in `chart.jsx`, which Lightning CSS rejects. Re-quote them after adding.
3. **Recharts 3 sorts legend items by name** by default. Pass `itemSorter={null}` to keep stack order.
4. **Next.js: streamed Suspense content only reveals in a visible tab.** React 19.2 batches the reveal of streamed `<Suspense>` boundaries on `requestAnimationFrame`. In a background tab (or a hidden test browser) the server HTML stays in a hidden `<div id="S:0">` and hydration waits until the tab becomes visible. This is correct behaviour, but automated tests must run with a visible page (Playwright does).
5. **Next.js: static prerender + `useSearchParams`.** `/next/repos` and `/next/compat` prerender as static, so URL-dependent content (the filtered table) renders on the client. For the real pages, which are authenticated and per-user, mark them dynamic, or read `searchParams` in the server page and pass it down, so the first HTML already has the right rows.
6. **Next.js: SSR safety.** `window.location.origin` in the actions registry broke server rendering. The origin is now added on click. Watch for this pattern when porting.
7. **Esc ordering:** a document-level Esc handler for "clear selection" must skip while a Radix menu or dialog is open, or one Esc closes the menu and drops the selection. Fixed in the prototype.
8. **Sass `@charset`** becomes invalid once the file is inlined into a layer. Compile with `--no-charset`.

### 9.5 Before any of this merges (M0 checklist)
- [ ] Delete or flag-gate `src/app/next/*` (outside the Vouch regex). Move the pages to their real paths (`/repos/info`, `/clusterusage/[name]`) as M3 does.
- [ ] Make sure `COACT_API_DEV_URL` is **unset** in every cluster deployment, so `src/proxy.js` is a pass-through there. Add a startup check that refuses `DEV_MODE` when `NODE_ENV=production` and the host isn't local.
- [ ] Runtime config instead of build-time `NEXT_PUBLIC_*`; the logout URL differs per environment.
- [ ] Build the new image in CI. Run it on coact-dev with readiness and liveness probes and Node memory limits.
- [ ] coact-deploy: remove `command: ["npm","start",...]` and `WDS_SOCKET_PORT` (prod and dev overlays), in the same release.
- [ ] Smoke-test 25 routes × member/czar/admin through the catch-all, including the react-bootstrap Modals, on coact-dev.
- [ ] Decide whether `scripts/prefix-tw.py` (one-off, used for the prototype) is kept or deleted. `npm run unprefix-tw` is the M9 tool.

### 9.6 Environment notes
- Node was not installed on this machine. This session ran `brew install node` (26.12.0). Remove it with `brew uninstall node` if unwanted.
- The first `next dev` run started before telemetry was turned off, so Next may have sent its standard anonymous usage event once. Every script now sets `NEXT_TELEMETRY_DISABLED=1`.
- This session made no commits or pushes, touched no Docker containers, and did not touch `coact-api/.env`. The `git mv` renames are staged in the index but not committed.

---

## 10. Design v2 ("SLAC ethos"): what changed and what it adds

Source: the Paper file *Coact UI Redesign — Draft*, page **v2 · SLAC ethos** (Ethos, Facilities v2, Facility logo, Register). The other pages (Repos table, Requests, Cluster usage, Repo page + CRUD kit) were restyled to the same tokens. The markdown spec (`coact-ui-redesign-spec.md`) has **not** been updated to v2. The Paper file is the source of truth for everything below.

| Area | v1 (markdown spec) | v2 (Paper) | Effect on the plan |
|---|---|---|---|
| Primary colour | zinc-900; red is the logo only | **SLAC red for every primary action and selection**; status never uses red buttons | Tokens only. Bootstrap's Coact red and shadcn's primary now agree, so legacy and new pages look closer during the dual run. |
| Surfaces | white | Concrete ground + Aluminium cards, Graphite ink | Tokens only. |
| Type | Lato (spec body), mono = system | **Geist + Geist Mono**; "real units in mono" | Two font packages. Lato stays for legacy pages until M9. |
| Status | emerald / amber / red / violet dots | **LED set**: green / amber / vermilion / **blue = burst**, shown only as tinted labelled pills and meters | Meter and pill components. Facility health gains a **"Watch"** label (LCLS card). Confirm whether it replaces "Warning". |
| Charts | categorical hues | **Graphite ramp, ≤2 named series + "N others"**; % of capacity as one utilization series with a burst zone | Done in the prototype. Needs a "top-N by usage" fold in the data layer. |
| Motion | none specified | **Motion budget**: register entrance once (1200 ms), meters fill (600 ms), rack cells cross-fade (150 ms), live-dot halo (2 s), routes/sheets/menus fade 4px (150 ms); `prefers-reduced-motion` = instant | Small utility set. The meter fill and menu motion are in the prototype. |
| Personas | role variants | **Four front doors**: first-time (Register "night data hall" with a step tracker), regular (My repos + meters), czar ("Needs you" queue, dense tables, ⌘K, j/k, **approve inline on Requests**, repos near quota rise to the top), admin (Facilities · **S3DF right now**) | Adds a Register/onboarding redesign (was a non-spec page, now designed: move it from M8 into scope). Czar default sort becomes "near quota first", which **reverses the v1 decision** "health worst-first is not the default". |
| Nav | Repos · Requests · Facilities | + **Reports** (admin), "New facility" primary on /facilities | New route group, and a create-facility flow (`RequestNewFacility` stops being dead code). |
| Facilities page | cards with meters | + **"S3DF right now" live rack panel**: per-cluster node grids (busy / burst / down), jobs running, PB stored; **facility logos** with an upload flow | New backend (below) and a new `RackGrid` component. |

**New backend prerequisites from v2** (add to §6):
1. **Live cluster state:** per-node (or bucketed) busy / burst / down for each cluster, plus the jobs-running count and a freshness timestamp ("Live · 1 min ago", the live-dot halo stops when stale). This probably comes from Slurm through the existing jobs pipeline. It extends spec prerequisite 6 (`usageFreshness`). Estimate 1.5–2.5 pw, depending on the source.
2. **Total storage stored vs capacity** across S3DF (the "31.6 PB of 41 PB" tile). 0.5 pw.
3. **Facility logo:** an upload mutation, object storage or GridFS, size and type limits, and a `Facility.logoUrl` field (artboard "Facility logo · upload states + pills"). 1–1.5 pw.
4. **"Needs you" queue for czars:** the approvable-requests count (§6 item 6) extended to a list endpoint. 0.25 pw more.
5. **Create facility:** `facilityCreate` (or request + approve) for "New facility". This is a policy question, already an open question in the spec.

**Effort delta:** about +3–4 pw of frontend (Register onboarding, rack panel, logos, Reports shell, motion utilities) and about +3.5–5 pw of backend. The phase order is unchanged. Move Register/landing into M7 (shell), and put the rack panel and logos with M6 (/facilities).

---

## 11. Running against the locally deployed coact-api

The redesigned pages read live data; the mock module is deleted. Everything below was measured against the local stack (`coact-mongodb`, `coact-api` on :8000), and only structure and counts were inspected, never people's records.

### 11.1 How to run it
| Way | Command | URL |
|---|---|---|
| docker compose (new `coactui-next` service; the existing `coactui`, `coact-api` and Mongo services are untouched) | `docker build -t coactui-next:dev coactui/.claude/worktrees/migration-research-22588b` then `docker compose up -d --no-deps coactui-next`, from `projects/coact/` | http://localhost:3001/next/repos |
| `next dev` on the host | `node scripts/dev-env-from-api.mjs ../../../../coact-api/.env` (writes the gitignored `.env.development.local`), then `npm run dev -- -p 5174` | http://localhost:5174/next/repos |

### 11.2 Local identity (stand-in for Vouch)
- In the cluster, the ingress authenticates with Vouch and adds the identity header that coact-api reads (`USERNAME_FIELD`). Locally nothing did that: `coact-api/dev_middleware.py` exists but **`main.py` never registers it**, so every local request was anonymous (`whoami` → "username: None").
- `src/proxy.js` (Next 16 Proxy, matcher `/graphql`) now plays the ingress's part for local development. It forwards `/graphql` to `COACT_API_DEV_URL`, always strips client-supplied identity headers, and, **only** when the API's own `DEV_MODE` is on **and** the request's `Host` / `X-Forwarded-Host` is localhost, adds `USERNAME_FIELD: DEV_USERNAME`. Those are the values `dev_middleware.py` was written to use. All three cases were checked: localhost gets the dev user; a spoofed `REMOTE_USER` / `x-vouch-user` is replaced; a non-local `Host` gets no identity, and the API rejects the request.
- In the cluster `COACT_API_DEV_URL` is unset, so the proxy is a pass-through and the ingress keeps routing `/graphql` straight to coact-api. **GraphQL still never runs on the Next server:** the pages use a browser-only Apollo client (`src/redesign/apollo.jsx`), render a skeleton on the server, and fetch after mount.
- Better long term (backend): register `dev_middleware` behind `DEV_MODE` in coact-api, as §6 item 8 says. The UI-side shim can then go.

### 11.3 What the pages query
| Page element | Query | Notes |
|---|---|---|
| Viewer, role chip, scope tabs | `whoami { username isAdmin isCzar subjectFacilities }` | The local dev user is an **admin, not a czar**, so the tabs are My repos · All (default All, matching `showallrepos`). |
| Repo rows | `myRepos { name facility principal leaders users group description currentComputeAllocations { clustername allocated burstAllocated } currentStorageAllocations { … usage { gigabytes } } }` | `coactshowall` is sent per operation from `context.showAll` (spec R2). 936 repos in **1.4 s / 0.77 MB**. 724 repos have a current compute allocation; **none has a current storage allocation** in this dump, so Storage shows "—". |
| Compute · 7d meter | one `reportFacilityComputeByDay` per cluster (7 aliased fields in one request) for the 7 days ending at the rollup anchor, joined client-side | Replaces N per-allocation `perDateUsage(pastDays: 7)` calls. % = resource-h ÷ (allocated nodes × 7 × 24 × cores per node), the legacy allocation page's denominator. This is the client-side stand-in for `repoUsageSummaries` (§6 item 1), which should move to the server. |
| Rollup anchor | `reportFacilityComputeByDay(…, last 400 days) { date }` → latest day | **The local rollup ends on 2026-02-06** (the Mongo dump date). Every window (7d, Week, Month, Year) ends on that day, and the UI says "through Feb 6, 2026" plus a "Rollup N days behind" pill. A `usageFreshness` resolver (§6 item 6) would replace this query. |
| Cluster header and capacity | `clusters { name nodecpucount nodegpucount }`, `clusterPurchases { clustername totalpurchased }` | milano: 259 purchased nodes × 120 cores. Capacity line = 746k resource-h/day. `clusters.members` is empty locally, so capacity uses purchased nodes. |
| Cluster chart and facility table | `reportFacilityComputeByDay` (Day, 35 days; Month, 13 months) + `facilities { computepurchases }` | Top 2 facilities + "N others" (milano: 10 facilities). "% of purchase" per facility; "Active repos" counts distinct repos with usage in the range. |

### 11.4 API quirks found while wiring
- `ReportRangeInput` dates must match `%Y-%m-%dT%H:%M:%S.%fZ` exactly; `Date.prototype.toISOString()` does.
- `reportFacilityComputeOverall` is admin-only; `reportFacilityComputeByDay` works for any authenticated user, so the pages use it.
- Month buckets come from `$dateTrunc` in America/Los_Angeles, so their timestamps sit at 07:00/08:00Z; read only the `YYYY-MM` part.
- The local API runs the `feat/posix-sync` lineage (`burstPercentOfFacility`), which matches the open question in §7 about which branch is deployed.
- **No approvable-requests count exists**, so the v2 nav badge ("Requests 23") is hidden instead of faked (§6 item 6).


---

## 12. Full build-out (all pages, live data)

All pages of the redesign now exist as App Router routes on live local data; the old SPA is only the fallback for URLs nobody owns. Built by a 30-agent workflow (10 page groups × plan → build → review) on a foundation laid first, then integrated and QA'd here.

### 12.1 Foundation the pages share (`src/redesign/README.md` has the rules)
- **Layouts:** `src/app/(app)/layout.jsx` = `AppProviders` (ThemeProvider → Apollo → ViewerProvider → Tooltip + Toaster) + `AppShell` (TopBar · ImpersonationStrip · main); route-level `error.jsx` / `not-found.jsx`; entity layouts for `/repos/[facility]/[name]/**` (RepoProvider/`useRepo()`, header, route tabs) and `/facilities/[name]/**` (FacilityProvider/`useFacility()`). Legacy SPA moved to `(legacy)/[...slug]`.
- **Theme:** `next-themes` sets `data-theme` on `<html>`; tokens are scoped `:root, [data-theme="light"]` in globals.css; `THEMES` registry in `providers/theme.jsx`; the user menu shows a theme switch as soon as a second theme exists.
- **State:** server data in Apollo (browser only, under `<ClientOnly>`); URL state for tabs/filters/scope/peek/dialogs (`useQueryParam`, `useQueryList`, `useDialogParam`); viewer + derived permission gates in one context (`useViewer().can.*`); `useState` only for form values and transient UI.
- **Kit:** DataTable (+ Toolbar, SearchInput, FacetFilter, ToggleFacet, ColumnsMenu, BulkBar; controlled sorting, footerLabel), ActionsMenu (one registry per entity), FormDialog/FieldsForm, RequestDialog (request → approve, success state), ConfirmDialog, ListEditor, UserCombobox, PageHeader, LinkTabs/LineTabs, Segmented, SectionCard, DefinitionList, Chip/StatusPill/CountBadge, Timeline, AllocationMeter, states.
- **Routes & redirects:** every link via `lib/routes.js`; every old URL redirects in `next.config.mjs` (e.g. `/repos/users/:f/:n` → `/repos/:f/:n/members`, `/repos/compute/:f/:n/allocation/:id` → `/repos/:f/:n/compute/:id`).

### 12.2 Pages (all verified: 29 URLs 200 server-side; browser sweep with no runtime errors)
| Area | Routes | Highlights (live) |
|---|---|---|
| Home | `/` | Lands per role (admin → /facilities, czar → their facility, member → My repos, unregistered → register) |
| Repos | `/repos/info` | Overview / Compute / Storage presets (`?view=`), compute options, facets, peek Sheet (`?peek=`), request split button (membership, new repo, facility access, compute/storage allocation), bulk Add member |
| Repo page | `/repos/[f]/[n]` + members, compute (+ `/[allocationid]`), storage (+ `/[allocationid]`), groups, features, history | Details edit in place, Change PI / LDAP / description / compute requirement / rename dialogs, members with roles + add (search/paste) + remove, allocation blocks with edit/request, allocation detail with usage chart, features admin CRUD, history timeline |
| Facilities | `/facilities` | Cards/Table, health rule + reason popover, S3DF panel from available data, actions |
| Facility | `/facilities/[name]` + repos, requests, history | Compute/Storage/People sections, Top repos, purchases/czars/description/invite dialogs, embedded Repos and Requests tables |
| Requests | `/requests` (`?view=pending|mine|all`) | Needs-my-approval queue (nav badge), inline + bulk approve, review Sheet with approve/reject/complete/incomplete/refire/reopen |
| Profile | `/myprofile`, `/myaudittrail` | Account, repos, personal storage, public web page, recent changes; audit trail |
| Usage | `/clusterusage/[name]` (`?tab=overall|facility|repo|user`), `/storageusage/[name]` (+ `/purpose/[p]`) | Rollup-anchored charts and tables |
| Onboarding | `/register`, `/logout` (route handler, runtime logout URL) | Register states, night-hall entrance (once, reduced-motion aware) |
| Shell | all pages | ⌘K palette (Repos/Facilities/Pages), `?` shortcuts dialog with single-key switch, `/` focuses search, impersonation (Impersonate…, strip, Stop), Requests badge |

Mutations are implemented in the UI but **none were executed** against the local API during build or QA.

### 12.3 Backend gaps and owner decisions surfaced by the page groups
- **Data in this local copy:** job data is stale/empty (`repoRecentComputeUsage`, `facilityRecentComputeUsage`, `repoComputeJobs` return 0 rows), so Live columns show 0; no repo has a *current* storage allocation; `computerequirement` is null everywhere; only 4 repos have access groups; `myGids` depends on the external user-lookup service (404 from a laptop, shown inline on My profile).
- **Missing resolvers:** `repoUsageSummaries` (per-repo usage — now joined client-side), `usageFreshness`, `myRepos(scope:)`, an approvable-requests count (badge counts the pending list), facility logo upload, node state (down/drained), jobs-running aggregate, GPU model on Cluster, `createFacility`, a per-repo filter on `repoRecentComputeUsage`, idempotent group add/remove (today `repoToggleGroupMembership` is a toggle).
- **API behaviour to fix or confirm:** `requestsExistingForRepo` / `requestsExistingForEPPN` are admin-only (pages use `requests(filter:)` instead, which is role-scoped); `UserInput`/`CoactRequestInput` require `publichtml`/`isbot` booleans (the UI sends `false`); audit details lack old values (history can't show "jdoe → bwong"); `repoChangeComputeRequirement` writes no audit (UI uses request + approve); `repoAddUser` doesn't validate the user exists; `repoComputeJobs` is open to any authenticated user; feature writes create requests coactd never completes; `reportFacilityStorage`'s purpose argument doesn't filter.
- **Owner decisions:** keep the legacy 0% compute lock on `default`; the "used this period" denominator (allocation start → now); no request path for storage on a new purpose (only a direct upsert exists); PI/leader editing of description/LDAP; design sign-off for usage tabs without artboards (Overall, By repo, By user).

### 12.4 Follow-ups not yet integrated (kit requests from the groups)
- DataTable: keyboard row focus (j/k/↵) gated on the shell's single-key setting; colSpan header groups (facility Compute "Live (jobs)" / "Daily rollup"); expose sorted row order for peek ↑/↓; an embedded (flush) variant inside SectionCard.
- Kit: a generic Combobox (repo picker is local), single-select facet, EntitySheet frame (peek/review sheets are local), StatTile, md AllocationMeter variant, `formatDuration`/count formatters, `useEnumParam`.
- Shared data: `usePendingRequestCount({ facility })` so the nav badge, facility tab and facilities list agree; add `facilities`/`eppns` to the viewer query; promote `facility-actions.js` to `src/redesign/actions/`.
- Shell: a nav-origin marker so the single-facility czar redirect fires only from the nav link; clear `imptk` on logout.
- Not verifiable with the admin dev identity: czar- and member-only variants (redirects, disabled purchase items, member-only views). Test with impersonation (now in the user menu) against non-admin users.
