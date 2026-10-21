// Pure label maps shared by the audit trail page and the profile's "Recent account changes".
// Nothing here touches React or the network.

/** Facet values for the audit trail's "Kind" filter. */
export const KINDS = [
  { value: "account", label: "Account" },
  { value: "shell", label: "Shell" },
  { value: "eppn", label: "EPPNs" },
  { value: "storage", label: "Storage" },
  { value: "repos", label: "Repos" },
  { value: "groups", label: "Unix groups" },
  { value: "public-html", label: "Public web page" },
  { value: "requests", label: "Requests" },
];

/** audit_trail.action (emitted by coact-api) → human label + kind. */
const AUDIT_ACTIONS = {
  userUpsert: { label: "Account created", kind: "account" },
  userUpdate: { label: "Account updated", kind: "account" },
  userUpdateEppn: { label: "EPPNs updated", kind: "eppn" },
  userChangeShell: { label: "Shell changed", kind: "shell" },
  userChangePublicHtml: { label: "Public web page changed", kind: "public-html" },
  UserStorageAllocation: { label: "Storage quota changed", kind: "storage" },
  "+RepoMembership": { label: "Added to repo", kind: "repos" },
  "-RepoMembership": { label: "Removed from repo", kind: "repos" },
  "+FacilityCzar": { label: "Made czar of", kind: "account" },
  "-FacilityCzar": { label: "Removed as czar of", kind: "account" },
  userPosixInit: { label: "POSIX identity initialised", kind: "groups" },
  userPosixGroupUpdate: { label: "Unix group membership changed", kind: "groups" },
};

export function auditAction(action) {
  return AUDIT_ACTIONS[action] ?? { label: action ?? "Change", kind: "account" };
}

/** Request type → noun used in request lifecycle events + the kind it belongs to. */
const REQUEST_TYPES = {
  UserChangeShell: { noun: "Shell change", kind: "shell" },
  UserPublicHtml: { noun: "Public web page request", kind: "public-html" },
  UserStorageAllocation: { noun: "Quota request", kind: "storage" },
  RepoMembership: { noun: "Repo membership request", kind: "repos" },
  UserAccount: { noun: "Account request", kind: "account" },
};

export function requestType(reqtype) {
  return REQUEST_TYPES[reqtype] ?? { noun: `${reqtype ?? "Unknown"} request`, kind: "requests" };
}

/** Verb for the status a request moved INTO. */
const STATUS_VERBS = {
  Approved: "approved",
  Rejected: "rejected",
  Completed: "completed",
  Incomplete: "marked incomplete",
  PreApproved: "pre-approved",
  NotActedOn: "reopened",
};
export const statusVerb = (status) => STATUS_VERBS[status] ?? (status ? status.toLowerCase() : "updated");

/** Short, mono-friendly summary of what a request asks for (audit "Details"). */
export function requestSummary(r) {
  switch (r.reqtype) {
    case "UserChangeShell":
      return r.shell ? `shell: ${r.shell}` : "";
    case "UserPublicHtml":
      return r.publichtml === false ? "turn off" : "turn on";
    case "UserStorageAllocation":
      return [r.gigabytes != null && `${r.gigabytes} GB`, r.storagename && `on ${r.storagename}`, r.purpose && `· ${r.purpose}`].filter(Boolean).join(" ");
    case "RepoMembership":
      return [r.reponame, r.facilityname].filter(Boolean).join(" · ");
    case "UserAccount":
      return r.facilityname ? `facility ${r.facilityname}` : "";
    default:
      return [r.reponame, r.facilityname].filter(Boolean).join(" · ");
  }
}

/** Human title for an open request in the "Pending requests" card. */
export function pendingTitle(r) {
  switch (r.reqtype) {
    case "UserChangeShell":
      return r.shell ? `Shell change to ${r.shell}` : "Shell change";
    case "UserPublicHtml":
      return "Public web page";
    case "UserStorageAllocation":
      return `Storage: ${r.gigabytes ?? "?"} GB on ${r.storagename ?? "?"}`;
    case "RepoMembership":
      return r.reponame ? `Membership in ${r.reponame}` : "Repo membership";
    case "UserAccount":
      return r.facilityname ? `Account in ${r.facilityname}` : "Account";
    default:
      return requestType(r.reqtype).noun;
  }
}

/** Open = not yet applied. Completed/Rejected are closed. */
export const OPEN_STATUSES = ["NotActedOn", "PreApproved", "Approved", "Incomplete"];
/** "In flight" for shell/public-html/quota: waiting for approval or for coactd to apply it. */
export const IN_FLIGHT_STATUSES = ["NotActedOn", "PreApproved", "Approved"];

/** Request status → StatusPill tone + label. */
const STATUS_PILLS = {
  NotActedOn: { tone: "warn", label: "Pending" },
  PreApproved: { tone: "brand", label: "Pre-approved" },
  Approved: { tone: "ok", label: "Approved · applying" },
  Incomplete: { tone: "crit", label: "Incomplete" },
  Completed: { tone: "neutral", label: "Completed" },
  Rejected: { tone: "crit", label: "Rejected" },
};
export const statusPill = (status) => STATUS_PILLS[status] ?? { tone: "neutral", label: status ?? "Unknown" };
