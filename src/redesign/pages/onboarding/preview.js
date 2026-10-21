"use client";

import { useSearchParams } from "next/navigation";

/*
 * DEVELOPMENT ONLY: ?preview=<state> forces an onboarding state with fixture data, because the
 * local dev identity is an already-registered admin and states can't be reached without
 * mutations. Production builds ignore the parameter (NODE_ENV is inlined at build time).
 * The fixtures are fictional sample people, not records from the API.
 */
const DEV = process.env.NODE_ENV !== "production";

export function usePreview() {
  const search = useSearchParams();
  return DEV ? search.get("preview") : null;
}

const base = {
  isRegistered: false,
  isRegistrationPending: false,
  eppn: "jdoe@slac.stanford.edu",
  username: "jdoe",
  fullname: "Jordan Doe",
  email: null,
  requestId: null,
  requestObj: { Id: null, approvalstatus: null, preferredUserName: null, eppn: null, facilityname: null, notes: null, audit: [] },
};
const pending = (approvalstatus, audit = []) => ({
  ...base,
  isRegistrationPending: true,
  requestObj: { Id: "preview-request", approvalstatus, preferredUserName: "jdoe", eppn: base.eppn, facilityname: "LCLS", notes: "Sample request", audit },
});

export const PREVIEW_REGISTRATIONS = {
  request: base,
  "no-username": { ...base, username: null },
  waiting: pending("NotActedOn"),
  provisioning: pending("Approved", [{ actedat: "2026-10-14T16:02:00Z", actedby: "czar", notes: null, previous: null }]),
  complete: pending("PreApproved", [{ actedat: "2026-10-14T16:02:00Z", actedby: "kchen", notes: null, previous: null }]),
  rejected: { ...pending("Rejected", [{ actedat: "2026-10-14T16:02:00Z", actedby: "czar", notes: "Please ask your PI to confirm which repo you will join.", previous: null }]), isRegistrationPending: false },
  ready: { ...base, isRegistered: true },
};

export const PREVIEW_REQUESTED_AT = "2026-10-13T17:20:00Z";
