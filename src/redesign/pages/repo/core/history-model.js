// Pure functions for the repo History tab and the Overview "Pending requests" card:
// audit-trail + request merging, copy per action / request type, grouping, status tones.

import { formatStorage } from "../../../lib/format";

const REQ = { Normal: "Normal", OnShift: "On shift", OffShift: "Off shift" };
const req = (v) => REQ[v] ?? v ?? "Normal";

/** Status pill tone + label for a request's approvalstatus. */
export function requestStatus(r) {
  const approver = [...(r.audit ?? [])].reverse().find((a) => a.actedby)?.actedby;
  switch (r.approvalstatus) {
    case "NotActedOn":
      return { tone: "warn", label: "Pending" };
    case "PreApproved":
      return { tone: "warn", label: "Pre-approved" };
    case "Approved":
      return { tone: "ok", label: approver ? `Approved by ${approver}` : "Approved" };
    case "Completed":
      return { tone: "ok", label: "Completed" };
    case "Rejected":
      return { tone: "crit", label: approver ? `Rejected by ${approver}` : "Rejected" };
    case "Incomplete":
      return { tone: "neutral", label: "Incomplete" };
    default:
      return { tone: "neutral", label: r.approvalstatus ?? "—" };
  }
}

/** Short request summary: "Storage · data +5 TB", "Membership · tnguyen". */
export function requestSummary(r) {
  switch (r.reqtype) {
    case "RepoMembership":
      return { kind: "Membership", what: r.username ?? r.requestedby };
    case "RepoRemoveUser":
      return { kind: "Removal", what: r.username };
    case "RepoComputeAllocation":
      return { kind: "Compute", what: [r.clustername, r.percentOfFacility != null && `${r.percentOfFacility}% of facility`].filter(Boolean).join(" · ") };
    case "RepoStorageAllocation":
      return { kind: "Storage", what: [r.purpose, r.gigabytes != null && formatStorage(r.gigabytes)].filter(Boolean).join(" ") };
    case "RepoChangeComputeRequirement":
      return { kind: "Compute requirement", what: req(r.computerequirement) };
    case "NewRepo":
      return { kind: "New repo", what: "" };
    case "RenameRepo":
      return { kind: "Rename", what: r.previousName ? `from ${r.previousName}` : "" };
    case "RepoUpdateFeature":
      return { kind: "Feature", what: "" };
    default:
      return { kind: r.reqtype ?? "Request", what: "" };
  }
}

/** Sentence for a request on the timeline (after the mono actor). */
export function requestTitle(r) {
  switch (r.reqtype) {
    case "RepoMembership":
      return r.username && r.username !== r.requestedby ? `requested membership for ${r.username}` : "requested membership";
    case "RepoRemoveUser":
      return `requested removal of ${r.username ?? "a member"}`;
    case "RepoComputeAllocation":
      return `requested compute on ${r.clustername ?? "a cluster"}${r.percentOfFacility != null ? ` · ${r.percentOfFacility}% of facility` : ""}${r.burstPercentOfFacility ? ` · burst ${r.burstPercentOfFacility}%` : ""}`;
    case "RepoStorageAllocation":
      return `requested storage ${r.purpose ?? ""}${r.gigabytes != null ? ` ${formatStorage(r.gigabytes)}` : ""}${r.storagename ? ` on ${r.storagename}` : ""}`.replace(/\s+/g, " ");
    case "RepoChangeComputeRequirement":
      return `set compute requirement to ${req(r.computerequirement)}`;
    case "NewRepo":
      return "requested the repo";
    case "RenameRepo":
      return r.previousName ? `renamed the repo from ${r.previousName}` : "renamed the repo";
    case "RepoUpdateFeature":
      return "requested a feature change";
    default:
      return `requested ${r.reqtype ?? "a change"}`;
  }
}

/** "field: old -> new" lines (dict_diffs) → "description, group". */
const diffFields = (details) =>
  [...new Set((details ?? "").split("\n").map((l) => l.split(":")[0].replace(/\[\d+\]$/, "").trim()).filter(Boolean))].join(", ");

/** Sentence for an audit-trail action (after the mono actor). */
export function auditTitle(a, count = 1, names = []) {
  const d = a.details ?? "";
  switch (a.action) {
    case "repoAddUser":
      return count > 1 ? `added ${count} members ${names.join(", ")}` : `added ${d || "a member"}`;
    case "repoRemoveUser":
      return count > 1 ? `removed ${count} members ${names.join(", ")}` : `removed ${d || "a member"}`;
    case "repoChangePrincipal":
      return `changed PI to ${d || "—"}`;
    case "repoToggleUserRole":
      return `changed leader role of ${d || "a member"}`;
    case "repoAddLeader":
      return `made ${d || "a member"} a leader`;
    case "repoUpdate":
      return d ? `updated details: ${diffFields(d)}` : "updated details";
    case "repoRenameRepo":
      return d ? d.charAt(0).toLowerCase() + d.slice(1) : "renamed the repo";
    case "repoComputeAllocationUpsert":
      return `set compute allocation ${d}`.trim();
    case "repoStorageAllocationUpsert":
      return `set storage allocation ${d}`.trim();
    case "accessGroupCreate":
      return `created access group ${d}`.trim();
    case "accessGroupUpdate":
      return d ? `changed access group membership (${diffFields(d)})` : "changed access group membership";
    case "repoToggleGroupMembership":
      return `changed access group membership (${d || "a member"})`;
    case "RepoUpsert":
    case "repoCreate":
      return "created the repo";
    case "repoNewFeature":
      return "added a feature";
    case "repoDeleteFeature":
      return "deleted a feature";
    case "repoUpdateFeature":
      return "updated a feature";
    case "repoUpdateUserAllocation":
      return "updated user allocations";
    default:
      return a.action;
  }
}

const GROUPABLE = new Set(["repoAddUser", "repoRemoveUser"]);
const FIVE_MIN = 5 * 60 * 1000;

/**
 * Merge audit trail (kind "change") and requests (kind "request"), newest first.
 * Consecutive add/remove-user rows by the same actor within 5 minutes collapse into one.
 */
export function buildHistory(audits = [], requests = []) {
  const changes = audits.map((a) => ({ kind: "change", key: `a-${a.Id}`, at: a.actedat, actor: a.actedby, audit: a }));
  const reqs = requests.map((r) => ({ kind: "request", key: `r-${r.Id}`, at: r.timeofrequest, actor: r.requestedby, request: r }));
  const all = [...changes, ...reqs].sort((x, y) => (Date.parse(y.at) || 0) - (Date.parse(x.at) || 0));

  const out = [];
  for (const e of all) {
    const prev = out.at(-1);
    if (
      e.kind === "change" &&
      prev?.kind === "change" &&
      GROUPABLE.has(e.audit.action) &&
      prev.audit.action === e.audit.action &&
      prev.actor === e.actor &&
      Math.abs(Date.parse(prev.lastAt ?? prev.at) - Date.parse(e.at)) <= FIVE_MIN
    ) {
      prev.names.push(e.audit.details);
      prev.lastAt = e.at;
      continue;
    }
    out.push(e.kind === "change" && GROUPABLE.has(e.audit.action) ? { ...e, names: [e.audit.details] } : e);
  }
  return out.map((e) =>
    e.kind === "change"
      ? { ...e, title: auditTitle(e.audit, e.names?.length ?? 1, e.names ?? []) }
      : { ...e, title: requestTitle(e.request), status: requestStatus(e.request), note: e.request.notes },
  );
}
