"use client";

import { ErrorAlert } from "../../kit";
import { ClientOnly } from "../../providers/apollo";
import { HallStats } from "./hall-stats";
import { NightHall } from "./night-hall";
import { PREVIEW_REGISTRATIONS, usePreview } from "./preview";
import { useRegistration } from "./queries";
import { RegisterCard, RegisterCardSkeleton } from "./register-card";
import { firstName, registrationStep, requestFacility } from "./register-state";
import { CompleteRegistrationPanel, NoUsernamePanel, ProvisioningPanel, ReadyPanel, RejectedPanel, WaitingPanel } from "./status-panels";
import { RequestAccountForm } from "./request-account-form";
import { HALL_ENTRANCE_KEY, useEntranceOnce } from "./use-entrance-once";

/** /register — the "night data hall" entrance; one page shows every registration state. */
export function RegisterPage() {
  return (
    <ClientOnly fallback={<RegisterFrame entrance="pending" card={<RegisterCardSkeleton />} />}>
      <RegisterLive />
    </ClientOnly>
  );
}

const TITLES = {
  request: () => "Enable your S3DF account",
  "no-username": () => "Enable your S3DF account",
  rejected: () => "Enable your S3DF account",
  waiting: (f) => `Waiting for ${f ?? "your facility"}`,
  provisioning: () => "Your account is being created",
  complete: () => "You're approved",
  ready: () => "You're all set",
};

const BODIES = {
  request: RequestAccountForm,
  "no-username": NoUsernamePanel,
  rejected: RejectedPanel,
  waiting: WaitingPanel,
  provisioning: ProvisioningPanel,
  complete: CompleteRegistrationPanel,
  ready: ReadyPanel,
};

function RegisterLive() {
  const { entrance, markSeen } = useEntranceOnce(HALL_ENTRANCE_KEY);
  const preview = usePreview();
  const fixture = preview ? PREVIEW_REGISTRATIONS[preview] : null;
  const live = useRegistration();
  const registration = fixture ?? live.registration;
  // Derived on every render from the server's answer: no local copy of the step.
  const step = registrationStep(registration);
  const Body = BODIES[step];

  let card;
  if (live.error && !fixture) {
    card = (
      <RegisterCard title="Enable your S3DF account">
        <ErrorAlert error={live.error} onRetry={live.refetch} what="your registration" />
      </RegisterCard>
    );
  } else if (!registration) {
    card = <RegisterCardSkeleton />;
  } else {
    card = (
      <RegisterCard title={TITLES[step](requestFacility(registration))} eppn={registration.eppn} step={step}>
        <Body registration={registration} facilities={live.facilities} preview={fixture ? preview : null} />
      </RegisterCard>
    );
  }

  return (
    <RegisterFrame
      entrance={entrance}
      onEntranceEnd={markSeen}
      name={firstName(registration?.fullname)}
      card={card}
      bottom={<HallStats />}
    />
  );
}

function RegisterFrame({ entrance, onEntranceEnd, name, card, bottom }) {
  return (
    <NightHall
      variant="register"
      entrance={entrance}
      onEntranceEnd={onEntranceEnd}
      eyebrow="SLAC National Accelerator Laboratory · SRCF-II"
      title={name ? `Welcome to Coact, ${name}` : "Welcome to Coact"}
      lead="The front door to S3DF. Request an account, join your facility's repos and see the compute and storage behind your science."
      aside={card}
      bottom={bottom}
    />
  );
}
