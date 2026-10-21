/*
 * Registration state machine (Paper "Register — 3 states" + "night data hall").
 * Everything here is pure: the page derives its step from amIRegistered on every render —
 * there is no local "submitted" flag; a refetch after the mutation moves the step.
 */

export const HELP_EMAIL = "s3df-help@slac.stanford.edu";

/** amIRegistered → request | waiting | provisioning | complete | rejected | ready | no-username */
export function registrationStep(reg) {
  if (!reg) return null;
  if (reg.isRegistered) return "ready";
  // For users without a request the API returns an unset placeholder object, not null.
  const req = reg.requestObj?.Id ? reg.requestObj : null;
  const status = req?.approvalstatus;
  if (reg.isRegistrationPending || req) {
    // Same guards as the legacy page before offering self-completion.
    if (status === "PreApproved" && req.preferredUserName && req.eppn === reg.eppn) return "complete";
    if (status === "Approved") return "provisioning";
    if (status === "Rejected" || status === "Incomplete") return "rejected";
    if (reg.isRegistrationPending) return "waiting";
  }
  if (!reg.username) return "no-username";
  return "request";
}

/** Poll the API only while coactd is creating the account. */
export const shouldPoll = (step) => step === "provisioning" || step === "complete";

export const TRACKER_LABELS = ["Signed in", "Request", "Czar review", "Ready"];

const ACTIVE_INDEX = { request: 1, rejected: 1, "no-username": 1, waiting: 2, provisioning: 3, complete: 3, ready: 4 };

/** Four tracker segments: "done" | "active" | "todo". `ready` marks everything done. */
export function trackerFor(step) {
  const active = ACTIVE_INDEX[step] ?? 1;
  return TRACKER_LABELS.map((label, i) => ({
    label,
    status: i < active ? "done" : i === active ? "active" : "todo",
  }));
}

export const firstName = (fullname) => fullname?.trim().split(/\s+/)[0] || null;

/** S3DF home directory by convention (not in the API): /sdf/home/<initial>/<username>. */
export const homeDir = (username) => (username ? `/sdf/home/${username[0]}/${username}` : null);

/** The facility a pending request is for. */
export const requestFacility = (reg) => reg?.requestObj?.facilityname || null;

/** Most recent audit entry that carries notes / an actor (czar who acted). */
export function latestAudit(reg, field) {
  const audit = reg?.requestObj?.audit ?? [];
  const withField = audit.filter((a) => a?.[field]);
  if (!withField.length) return null;
  return [...withField].sort((a, b) => String(b.actedat ?? "").localeCompare(String(a.actedat ?? "")))[0];
}

/**
 * Map server errors to the spec's copy. coact-api rejects a second UserAccount request for the
 * same facility with "There is aready a request for this user in this facility with status X"
 * (sic) — for any status, including Rejected.
 */
export function requestErrorMessage(error) {
  if (!error) return null;
  const msg = error.message ?? String(error);
  const dup = msg.match(/(?:already|aready) a request for this user in this facility(?: with status (\w+))?/i) ?? (msg.includes("requests already exists") ? [msg] : null);
  if (!dup) return msg.replace(/<\/?b>/g, "");
  const status = dup[1];
  if (!status || ["NotActedOn", "Approved", "PreApproved"].includes(status)) return "A request for this facility is already pending.";
  return `Your earlier request for this facility was marked ${status.toLowerCase()}. Contact ${HELP_EMAIL} to reopen it, or choose another facility.`;
}

/** Facility picker order: described facilities first, then by name. */
export function orderFacilities(list) {
  return [...(list ?? [])].sort((a, b) => (!!b.description - !!a.description) || a.name.localeCompare(b.name));
}
