"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Check, Circle, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DefinitionList } from "../../kit";
import { formatDate } from "../../lib/format";
import { routes } from "../../lib/routes";
import { useViewer } from "../../providers/viewer";
import { HALL_CTA } from "./night-hall";
import { PREVIEW_REQUESTED_AT } from "./preview";
import { useCompletePreApproved, useRequestDate, useRegistrationPoll } from "./queries";
import { HELP_EMAIL, homeDir, latestAudit, requestFacility, requestErrorMessage } from "./register-state";
import { RequestAccountForm } from "./request-account-form";

/* Card bodies for each registration step (Paper "Register — 3 states"). Each one derives
   what it shows from the registration; none keeps its own copy of server state. */

const P = "tw:text-sm tw:leading-5.5 tw:text-muted-strong";

/** Requested → Czar review → Account provisioned, as a small checklist (done / current / todo). */
function ProgressList({ items }) {
  return (
    <ol className="tw:flex tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:bg-muted/40 tw:px-4 tw:py-3.5">
      {items.map((it) => (
        <li key={it.label} aria-current={it.status === "active" ? "step" : undefined} className="tw:flex tw:items-center tw:gap-2.5 tw:text-[13px]">
          {it.status === "done" ? (
            <Check className="tw:size-3.5 tw:text-ok" strokeWidth={2.5} aria-label="Done" />
          ) : it.status === "active" ? (
            <LoaderCircle className="tw:size-3.5 tw:animate-spin tw:text-muted-strong tw:motion-reduce:animate-none" aria-label="In progress" />
          ) : (
            <Circle className="tw:size-3.5 tw:text-border" aria-label="Not started" />
          )}
          <span className={cn(it.status === "todo" ? "tw:text-muted-foreground" : "tw:text-foreground")}>{it.label}</span>
        </li>
      ))}
    </ol>
  );
}

function useRequestedLabel(registration, preview) {
  const date = useRequestDate(registration, !preview);
  const when = preview ? PREVIEW_REQUESTED_AT : date;
  return when ? `Requested · ${formatDate(when)}` : "Requested";
}

function HelpFooter() {
  return (
    <p className="tw:text-xs tw:text-muted-foreground">
      Waiting more than 3 days?{" "}
      <a href={`mailto:${HELP_EMAIL}`} className="tw:font-medium tw:text-muted-strong tw:underline tw:underline-offset-2 tw:hover:text-foreground">
        Contact SDF help
      </a>
    </p>
  );
}

export function WaitingPanel({ registration, preview }) {
  const facility = requestFacility(registration) ?? "your facility";
  const requested = useRequestedLabel(registration, preview);
  return (
    <div className="tw:flex tw:flex-col tw:gap-5">
      <p className={P}>Your request is with the {facility} czars. You'll get an email when it's approved; you can close this page.</p>
      <ProgressList
        items={[
          { label: requested, status: "done" },
          { label: "Czar review", status: "active" },
          { label: "Account provisioned", status: "todo" },
        ]}
      />
      <HelpFooter />
    </div>
  );
}

export function ProvisioningPanel({ registration, preview }) {
  const requested = useRequestedLabel(registration, preview);
  const approver = latestAudit(registration, "actedby")?.actedby;
  return (
    <div className="tw:flex tw:flex-col tw:gap-5">
      {!preview && <RegistrationPoll />}
      <p className={P}>
        {approver ? <><span className="tw:font-mono">{approver}</span> approved your request. </> : "Your request was approved. "}
        Your account is being created. This page updates on its own.
      </p>
      <ProgressList
        items={[
          { label: requested, status: "done" },
          { label: "Czar review", status: "done" },
          { label: "Account provisioned", status: "active" },
        ]}
      />
      <HelpFooter />
    </div>
  );
}

/** Polls while mounted; unmounts when the step moves on. */
function RegistrationPoll() {
  useRegistrationPoll();
  return null;
}

export function CompleteRegistrationPanel({ registration, preview }) {
  const req = registration.requestObj;
  const facility = req.facilityname;
  const approver = latestAudit(registration, "actedby")?.actedby;
  const [complete, { loading, error, called }] = useCompletePreApproved();
  const onComplete = () => {
    if (preview) return;
    const promise = complete(req.Id);
    toast.promise(promise, {
      loading: "Completing registration…",
      success: "Registration complete — creating your account",
      error: (err) => err.message,
    });
    promise.catch(() => {});
  };
  return (
    <div className="tw:flex tw:flex-col tw:gap-5">
      {/* After completing, coactd provisions the account; keep checking until it's there. */}
      {called && !error && !preview && <RegistrationPoll />}
      <p className={P}>
        {approver ? <><span className="tw:font-mono">{approver}</span> approved your {facility} account. </> : `Your ${facility} account is pre-approved. `}
        Finish registration to create your home directory and Unix account.
      </p>
      <DefinitionList
        className="tw:grid-cols-[1fr_auto] tw:rounded-xl tw:border tw:bg-muted/40 tw:px-4 tw:py-3.5 tw:text-[13px] tw:[&_dd]:text-right"
        items={[
          { term: "Username", value: <span className="tw:font-mono">{req.preferredUserName}</span> },
          { term: "Facility", value: facility },
          { term: "Home", value: <span className="tw:font-mono">{homeDir(req.preferredUserName)}</span> },
        ]}
      />
      {error && <p role="alert" className="tw:text-xs tw:text-crit-text">{requestErrorMessage(error)}</p>}
      <Button type="button" onClick={onComplete} disabled={loading || (called && !error) || !!preview} className={cn(HALL_CTA, "tw:w-full tw:text-sm")}>
        {loading ? "Completing…" : called && !error ? "Creating your account…" : "Complete registration"}
      </Button>
    </div>
  );
}

export function ReadyPanel({ preview }) {
  const router = useRouter();
  const { refetch } = useViewer();
  // The shell's viewer was loaded before the account existed: refresh it, then let "/" pick
  // the right front door.
  const onContinue = async () => {
    if (!preview) await refetch().catch(() => {});
    router.push(routes.home());
  };
  return (
    <div className="tw:flex tw:flex-col tw:gap-5">
      <p className={P}>Your S3DF account is active. Coact shows your repos, your team, and the compute and storage behind them.</p>
      <Button type="button" onClick={onContinue} className={cn(HALL_CTA, "tw:w-full tw:text-sm")}>
        Continue to Coact <ArrowRight />
      </Button>
    </div>
  );
}

export function RejectedPanel({ registration, facilities, preview }) {
  const notes = latestAudit(registration, "notes")?.notes;
  const facility = requestFacility(registration);
  return (
    <div className="tw:flex tw:flex-col tw:gap-5">
      <div className="tw:flex tw:flex-col tw:gap-2">
        <p className={P}>
          {facility ? `Your previous request to ${facility} wasn't approved.` : "Your previous request wasn't approved."} You can send a new request below.
        </p>
        {notes && <blockquote className="tw:border-l-2 tw:border-border tw:pl-3 tw:text-[13px] tw:text-muted-foreground tw:italic">{notes}</blockquote>}
      </div>
      {registration.username ? (
        <RequestAccountForm registration={registration} facilities={facilities} preview={preview} />
      ) : (
        <NoUsernamePanel />
      )}
    </div>
  );
}

export function NoUsernamePanel() {
  return (
    <p className={P}>
      We can't determine your user id yet. Your account setup may not have finished, or an upstream service may be down. Try again later, or contact{" "}
      <a href={`mailto:${HELP_EMAIL}`} className="tw:font-medium tw:text-foreground tw:underline tw:underline-offset-2">{HELP_EMAIL}</a>.
    </p>
  );
}
