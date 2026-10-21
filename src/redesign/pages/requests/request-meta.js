import {
  Building2,
  CheckCheck,
  Copy,
  Cpu,
  Database,
  FileCheck2,
  FileX2,
  FolderPlus,
  Globe,
  HardDrive,
  KeyRound,
  ListChecks,
  Pencil,
  RotateCcw,
  RefreshCw,
  Search,
  Server,
  Shuffle,
  SlidersHorizontal,
  Terminal,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { formatDate, formatPct, formatStorage } from "../../lib/format";

/* ======================================================================================
 * Request vocabulary: one place for type labels, status wording, row/sheet descriptions,
 * the activity log, and the permission gates for every request action. The row cells, the
 * review sheet, the bulk bar and the dialogs all read from here so they can't disagree.
 * ====================================================================================== */

/** Request "parts": strings, or { mono } for usernames, repos, clusters (rendered mono). */
const m = (v) => ({ mono: v ?? "—" });

/**
 * CoactRequestType → { label, icon, describe(req) → { parts, subtitle } }.
 * subtitle is the muted second line in tables (facility, purpose, quoted justification…).
 */
export const TYPE_META = {
  UserAccount: {
    label: "Facility access",
    icon: KeyRound,
    describe: (r) => ({ parts: [m(r.preferredUserName || r.eppn), " → ", r.facilityname ?? "—"], subtitle: r.notes ? `“${oneLine(r.notes)}”` : r.eppn }),
  },
  NewRepo: {
    label: "New repo",
    icon: FolderPlus,
    describe: (r) => ({ parts: [m(r.reponame)], subtitle: join(r.facilityname, r.principal && `PI ${r.principal}`) }),
  },
  RenameRepo: {
    label: "Rename repo",
    icon: Pencil,
    describe: (r) => ({ parts: [m(r.previousName), " → ", m(r.reponame)], subtitle: r.facilityname }),
  },
  NewFacility: {
    label: "New facility",
    icon: Building2,
    describe: (r) => ({ parts: [r.facilityname ?? "—"], subtitle: r.notes ? `“${oneLine(r.notes)}”` : null }),
  },
  RepoMembership: {
    label: "Repo membership",
    icon: UserPlus,
    describe: (r) => ({ parts: [m(r.username), " → ", m(r.reponame)], subtitle: r.facilityname }),
  },
  RepoRemoveUser: {
    label: "Remove member",
    icon: UserMinus,
    describe: (r) => ({ parts: [m(r.username), " ✕ ", m(r.reponame)], subtitle: r.facilityname }),
  },
  RepoUpdateFeature: {
    label: "Repo features",
    icon: SlidersHorizontal,
    describe: (r) => ({ parts: [m(r.reponame)], subtitle: join(r.facilityname, r.notes && oneLine(r.notes)) }),
  },
  UserStorageAllocation: {
    label: "User quota",
    icon: HardDrive,
    describe: (r) => ({ parts: [m(r.username), ` · ${r.purpose ?? "home"} → ${formatStorage(r.gigabytes)}`], subtitle: r.storagename }),
  },
  RepoComputeAllocation: {
    label: "Compute",
    icon: Cpu,
    describe: (r) => ({
      parts: [m(r.reponame), " · ", m(r.clustername), ` → ${formatPct(r.percentOfFacility)}`],
      subtitle: join(r.facilityname, r.burstPercentOfFacility ? `burst ${formatPct(r.burstPercentOfFacility)}` : null),
    }),
  },
  RepoStorageAllocation: {
    label: "Storage",
    icon: Database,
    describe: (r) => ({ parts: [m(r.reponame), ` · ${r.purpose ?? "—"} → ${formatStorage(r.gigabytes)}`], subtitle: join(r.facilityname, r.storagename) }),
  },
  FacilityComputeAllocation: {
    label: "Facility compute",
    icon: Server,
    describe: (r) => ({ parts: [r.facilityname ?? "—", " · ", m(r.clustername), r.allocated != null ? ` → ${r.allocated} nodes` : ""], subtitle: "Compute purchase" }),
  },
  FacilityStorageAllocation: {
    label: "Facility storage",
    icon: Database,
    describe: (r) => ({ parts: [r.facilityname ?? "—", " · ", m(r.storagename), ` → ${formatStorage(r.gigabytes)}`], subtitle: join("Storage purchase", r.purpose) }),
  },
  RepoChangeComputeRequirement: {
    label: "Compute requirement",
    icon: SlidersHorizontal,
    describe: (r) => ({ parts: [m(r.reponame), ` → ${r.computerequirement ?? "—"}`], subtitle: r.facilityname }),
  },
  UserChangeShell: {
    label: "Shell",
    icon: Terminal,
    describe: (r) => ({ parts: ["Change shell to ", m(r.shell)], subtitle: null }),
  },
  UserPublicHtml: {
    label: "Public HTML",
    icon: Globe,
    describe: (r) => ({ parts: [r.publichtml === false ? "Turn off ~/public_html" : "Turn on ~/public_html"], subtitle: null }),
  },
};

const FALLBACK = (type) => ({
  label: humanize(type),
  icon: FileCheck2,
  describe: (r) => ({ parts: [m(r.reponame || r.username || r.facilityname)], subtitle: r.facilityname }),
});

export const typeMeta = (type) => TYPE_META[type] ?? FALLBACK(type);
export const typeLabel = (type) => typeMeta(type).label;

/** "RepoChangeComputeRequirement" → "Repo change compute requirement" (for enums the UI doesn't know yet). */
export function humanize(e) {
  if (!e) return "—";
  const words = e.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** CoactRequestStatus → label, the requester-side label (My requests), tone, and a hint (tooltip). */
export const STATUS_META = {
  NotActedOn: { label: "Pending", tone: "warn", hint: "Waiting for a czar, admin or repo leader to act on it" },
  PreApproved: { label: "Pre-approved", mineLabel: "Waiting on you", tone: "neutral", hint: "Approved in advance; it completes when the user finishes registration" },
  Approved: { label: "Applying", tone: "brand", hint: "Approved; waiting for coactd to apply the change" },
  Completed: { label: "Done", tone: "ok", hint: "Approved and applied" },
  Incomplete: { label: "Failed", tone: "crit", hint: "Approved, but provisioning reported errors" },
  Rejected: { label: "Rejected", tone: "crit", hint: "Rejected by a czar or admin" },
};
export const statusMeta = (s) => STATUS_META[s] ?? { label: humanize(s), tone: "neutral", hint: null };
export const statusLabel = (s, view) => {
  const meta = statusMeta(s);
  return view === "mine" ? (meta.mineLabel ?? meta.label) : meta.label;
};

/** Table/sheet description for a request, with My-requests wording (spec v2 artboard 3K9). */
export function describeRequest(req, view) {
  const { parts, subtitle } = typeMeta(req.reqtype).describe(req);
  const text = parts.map((p) => (typeof p === "string" ? p : p.mono)).join("");
  if (view !== "mine") return { parts, text, subtitle };
  const lastAct = (req.audit ?? []).at(-1);
  const mine =
    req.approvalstatus === "Rejected" && lastAct
      ? `${lastAct.notes ? `“${oneLine(stripPrefix(req, lastAct.notes))}” — ` : "Rejected by "}${lastAct.actedby}`
      : req.approvalstatus === "Incomplete"
        ? "Provisioning reported errors · an admin can re-run it"
        : ["UserChangeShell", "UserPublicHtml"].includes(req.reqtype) && ["PreApproved", "Approved"].includes(req.approvalstatus)
          ? "Finishes the next time you log in"
          : ["Approved", "Completed"].includes(req.approvalstatus) && approver(req)
            ? `Approved by ${approver(req)}`
            : subtitle;
  return { parts, text, subtitle: mine };
}

/** Who moved the request out of NotActedOn/PreApproved (the first audit entry that did). */
function approver(req) {
  return (req.audit ?? []).find((a) => ["NotActedOn", "PreApproved"].includes(a.previous))?.actedby ?? null;
}

const join = (...xs) => xs.filter(Boolean).join(" · ") || null;
const oneLine = (s) => {
  const t = String(s).replace(/\s+/g, " ").trim();
  return t.length > 90 ? `${t.slice(0, 89)}…` : t;
};

/** reject/complete/incomplete store `curreq.notes + "\n" + note`; show only the new note. */
export function stripPrefix(req, note) {
  if (!note) return "";
  if (req.notes && note.startsWith(req.notes)) return note.slice(req.notes.length).replace(/^\n/, "").trim();
  return note.trim();
}

// "an LCLS", "a CryoEM", "an SSRL": acronyms read letter by letter.
const article = (w) => (/^[aeiou]/i.test(w) || (/^[A-Z0-9]+$/.test(w) && /^[AEFHILMNORSX]/.test(w)) ? "an" : "a");

/** Who asked: requestedby, or the account being requested for self-service account requests. */
export const requesterOf = (req) => req.requestedby || req.preferredUserName || req.eppn || null;

export const shortId = (id) => `REQ-${String(id ?? "").slice(-6).toUpperCase()}`;

/**
 * Activity log (ports bpl/requests.js req2audit): created, then one entry per audit record.
 * audit[i].previous is the status before that action, so the status after it is
 * audit[i + 1].previous, or the current status for the last record.
 */
export function auditEntries(req) {
  const audit = req.audit ?? [];
  const entries = [{ key: "created", title: `Created by ${requesterOf(req) ?? "—"}`, meta: formatDate(req.timeofrequest, { time: true }) }];
  audit.forEach((a, i) => {
    const next = audit[i + 1]?.previous ?? req.approvalstatus;
    const note = stripPrefix(req, a.notes);
    entries.push({
      key: `a${i}`,
      title: `${a.actedby ?? "—"} · ${statusMeta(a.previous ?? "NotActedOn").label} → ${statusMeta(next).label}`,
      meta: [formatDate(a.actedat, { time: true }), note && `“${note}”`].filter(Boolean).join(" · "),
    });
  });
  const f = req.facilityname;
  const who = f ? `${article(f)} ${f} czar or admin` : "an admin";
  if (req.approvalstatus === "NotActedOn") entries.push({ key: "waiting", title: `Waiting for ${who}`, meta: null });
  if (req.approvalstatus === "Approved") entries.push({ key: "applying", title: "Applying — coactd hasn’t run yet", meta: null });
  return entries;
}

/* ------------------------------- Permission gates ----------------------------------- */

// Types requestApprove implements (schema.py requestApprove); anything else raises
// "Approval of requests of type … is not yet implemented".
export const APPROVABLE = new Set([
  "RepoMembership",
  "UserAccount",
  "UserStorageAllocation",
  "NewRepo",
  "RepoComputeAllocation",
  "RepoStorageAllocation",
  "RepoChangeComputeRequirement",
]);

/** IsFacilityCzarOrAdmin on the request's facility (admin-only when it has none). */
export const canManage = (req, can) => (req.facilityname ? can.isCzarOf(req.facilityname) : can.isAdmin);

/** Approve now: API-implemented type, canapprove from the API, still waiting. */
export function canApprove(req) {
  return !!req.canapprove && req.approvalstatus === "NotActedOn" && APPROVABLE.has(req.reqtype);
}
/** Why Approve is unavailable on a pending row the viewer could otherwise act on. */
export function approveBlockedReason(req) {
  if (req.approvalstatus !== "NotActedOn" || !req.canapprove) return null;
  return APPROVABLE.has(req.reqtype) ? null : `Approving ${typeLabel(req.reqtype).toLowerCase()} requests isn’t supported by coact-api yet`;
}
export function canReject(req, can) {
  return canManage(req, can) && ["NotActedOn", "PreApproved"].includes(req.approvalstatus);
}
/** A row is "needs you": pending and the API says the viewer may approve it. */
export const needsViewer = (req) => !!req.canapprove && req.approvalstatus === "NotActedOn";

/**
 * Sheet "…" menu groups (ActionsMenu schema). Dialog keys are opened via ?dialog=&target=Id.
 * `onLookup` re-runs the requester lookup for UserAccount requests.
 */
export function requestActions(req, can, { onLookup } = {}) {
  const manage = canManage(req, can);
  const s = req.approvalstatus;
  const groups = [];
  if (manage && req.reqtype === "UserAccount") {
    groups.push({
      key: "account",
      items: [
        { key: "lookup", label: "Look up requester…", icon: Search, onSelect: onLookup },
        ["NotActedOn", "Rejected", "PreApproved"].includes(s) && { key: "reassign", label: "Reassign to another facility…", icon: Shuffle, dialog: "reassign" },
      ].filter(Boolean),
    });
  }
  if (manage) {
    const refireOk = !!req.canrefire && ["Approved", "Incomplete", "Completed"].includes(s);
    groups.push({
      key: "lifecycle",
      items: [
        s === "PreApproved" && { key: "approve-now", label: "Approve now", icon: CheckCheck, dialog: "approve-now" },
        ["Approved", "Incomplete"].includes(s) && { key: "complete", label: "Mark complete…", icon: ListChecks, dialog: "complete" },
        ["Approved", "Completed"].includes(s) && { key: "incomplete", label: "Mark incomplete…", icon: FileX2, dialog: "incomplete" },
        { key: "refire", label: "Re-run provisioning", icon: RefreshCw, dialog: "refire", disabled: refireOk ? undefined : "Only after a request has been approved", shortcut: refireOk ? undefined : "failed only" },
        { key: "reopen", label: "Reopen", icon: RotateCcw, dialog: "reopen", disabled: s === "Rejected" ? undefined : "Only rejected requests can be reopened", shortcut: s === "Rejected" ? undefined : "closed only" },
      ].filter(Boolean),
    });
  }
  groups.push({ key: "copy", items: [{ key: "copy-id", label: "Copy request ID", icon: Copy, copy: req.Id }] });
  return groups;
}
