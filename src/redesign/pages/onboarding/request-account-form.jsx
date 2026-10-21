"use client";

import { useId, useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { EmptyState } from "../../kit";
import { useQueryParam } from "../../lib/navigation";
import { FacilityPicker } from "./facility-picker";
import { HALL_CTA } from "./night-hall";
import { useRequestAccount } from "./queries";
import { HELP_EMAIL, requestErrorMessage } from "./register-state";

const PLACEHOLDER = "I'm a PhD student in Dr. A's lab working on project Z and need compute to run simulations.";

/**
 * State 1 (and the re-request after a rejection): pick a facility, say what you'll work on,
 * requestNewSDFAccount. The step moves to "waiting" from the refetched registration — there is
 * no local "submitted" flag. ?facility=<name> preselects (invite deep links).
 */
export function RequestAccountForm({ registration, facilities, preview }) {
  const ids = { facility: useId(), notes: useId(), error: useId() };
  const [linked] = useQueryParam("facility");
  // Form values live only while the form is mounted.
  const [picked, setPicked] = useState(null);
  const [notes, setNotes] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [submit, { loading, error }] = useRequestAccount();

  const names = facilities.map((f) => f.name);
  const facility = picked ?? (names.includes(linked) ? linked : null);
  const errors = attempted
    ? {
        facility: !facility ? "Choose the facility you work with." : null,
        notes: !notes.trim() ? "Tell the czar what you'll work on." : null,
      }
    : {};
  const serverError = requestErrorMessage(error);

  if (!facilities.length) {
    return <EmptyState className="tw:py-8" title="No facilities are open for registration" description={`Contact ${HELP_EMAIL}.`} />;
  }

  const onSubmit = (e) => {
    e.preventDefault();
    setAttempted(true);
    if (!facility || !notes.trim() || preview) return;
    const promise = submit({ eppn: registration.eppn, username: registration.username, facility, notes: notes.trim() });
    toast.promise(promise, {
      loading: "Requesting your account…",
      success: `Request sent to the ${facility} czars`,
      error: (err) => requestErrorMessage(err),
    });
    promise.catch(() => {}); // shown inline and in the toast
  };

  return (
    <form onSubmit={onSubmit} noValidate className="tw:flex tw:flex-col tw:gap-5.5">
      <fieldset className="tw:flex tw:flex-col tw:gap-2">
        <legend id={ids.facility} className="tw:mb-2 tw:text-[13px] tw:leading-4.5 tw:font-semibold">Which facility are you joining?</legend>
        <FacilityPicker
          facilities={facilities}
          value={facility}
          onChange={setPicked}
          invalid={!!errors.facility}
          describedBy={errors.facility ? `${ids.facility}-err` : undefined}
          disabled={loading}
        />
        {errors.facility && <p id={`${ids.facility}-err`} className="tw:text-xs tw:text-crit-text">{errors.facility}</p>}
      </fieldset>

      <div className="tw:flex tw:flex-col tw:gap-2">
        <span className="tw:text-[13px] tw:leading-4.5 tw:font-semibold">Your username will be</span>
        <span className="tw:flex tw:h-9 tw:items-center tw:rounded-lg tw:border tw:bg-muted tw:px-3 tw:font-mono tw:text-[13px]" aria-readonly>
          {registration.username}
        </span>
      </div>

      <div className="tw:flex tw:flex-col tw:gap-2">
        <div className="tw:flex tw:items-baseline tw:justify-between">
          <label htmlFor={ids.notes} className="tw:text-[13px] tw:leading-4.5 tw:font-semibold">What will you work on?</label>
          <span className="tw:text-xs tw:text-muted-foreground">Shown to the facility czar</span>
        </div>
        <Textarea
          id={ids.notes}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={3}
          disabled={loading}
          aria-invalid={!!errors.notes || undefined}
          aria-describedby={errors.notes ? `${ids.notes}-err` : undefined}
          className="tw:min-h-21 tw:rounded-lg tw:bg-primary-foreground tw:text-[13px] tw:leading-5 tw:md:text-[13px]"
        />
        {errors.notes && <p id={`${ids.notes}-err`} className="tw:text-xs tw:text-crit-text">{errors.notes}</p>}
      </div>

      <div className="tw:flex tw:flex-col tw:gap-3">
        <Button type="submit" disabled={loading || !!preview} className={cn(HALL_CTA, "tw:w-full tw:text-sm")}>
          {loading ? "Requesting…" : "Request account"} <ArrowRight />
        </Button>
        {serverError && (
          <p id={ids.error} role="alert" className="tw:text-center tw:text-xs tw:text-crit-text">{serverError}</p>
        )}
        <p className="tw:text-center tw:text-xs tw:leading-4.5 tw:text-muted-foreground">
          A czar at your facility reviews the request. We'll email you when your account is ready.
        </p>
      </div>
    </form>
  );
}
