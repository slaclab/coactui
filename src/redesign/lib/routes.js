// Every in-app URL, in one place. Pages link with these helpers, never with string literals,
// so the route table (src/app/(app)/**) and the links can't drift apart.
const enc = encodeURIComponent;

export const routes = {
  home: () => "/",
  register: () => "/register",
  /** Full page load: /login is behind the gateway SSO route, then forwards to a door (pages/onboarding/login-page). */
  login: () => "/login",
  repos: (query) => withQuery("/repos/info", query),
  /** tab: overview (default) | members | compute | storage | groups | features | history */
  repo: (facility, name, tab) => `/repos/${enc(facility)}/${enc(name)}${tab && tab !== "overview" ? `/${tab}` : ""}`,
  computeAllocation: (facility, name, id) => `/repos/${enc(facility)}/${enc(name)}/compute/${enc(id)}`,
  storageAllocation: (facility, name, id) => `/repos/${enc(facility)}/${enc(name)}/storage/${enc(id)}`,
  facilities: (query) => withQuery("/facilities", query),
  /** tab: overview (default) | repos | requests | history */
  facility: (name, tab) => `/facilities/${enc(name)}${tab && tab !== "overview" ? `/${tab}` : ""}`,
  requests: (query) => withQuery("/requests", query),
  cluster: (name, query) => withQuery(`/clusterusage/${enc(name)}`, query),
  storage: (name, purpose) => `/storageusage/${enc(name)}${purpose ? `/purpose/${enc(purpose)}` : ""}`,
  profile: () => "/myprofile",
  auditTrail: () => "/myaudittrail",
  logout: () => "/logout",
};

export const REPO_TABS = ["overview", "members", "compute", "storage", "groups", "features", "history"];
export const FACILITY_TABS = ["overview", "repos", "requests", "history"];

function withQuery(path, query) {
  if (!query) return path;
  const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== "")).toString();
  return qs ? `${path}?${qs}` : path;
}
