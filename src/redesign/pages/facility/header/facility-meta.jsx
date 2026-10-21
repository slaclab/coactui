"use client";

import Link from "next/link";
import { CopyButton, Skeleton } from "../../../kit";
import { routes } from "../../../lib/routes";

const Divider = () => <span className="tw:h-3.5 tw:w-px tw:shrink-0 tw:bg-border" aria-hidden />;

/** D2 row 3: Czars · N repos (czar/admin) · Service account `x` [copy] · group `y` [copy]. */
export function FacilityMeta({ facility, repoCount, showRepos }) {
  const { name, czars = [], serviceaccount, servicegroup } = facility;
  const parts = [
    <span key="czars">Czars: {czars.length ? czars.join(", ") : "none"}</span>,
    showRepos && (
      <Link
        key="repos"
        href={routes.repos({ scope: "facilities", facility: name })}
        className="tw:font-medium tw:text-foreground tw:underline tw:decoration-border tw:underline-offset-4 tw:hover:decoration-foreground"
      >
        {repoCount == null ? <Skeleton className="tw:inline-block tw:h-3.5 tw:w-14 tw:align-middle" /> : `${repoCount} repo${repoCount === 1 ? "" : "s"}`}
      </Link>
    ),
    (serviceaccount || servicegroup) && (
      <span key="svc" className="tw:flex tw:items-center tw:gap-4">
        {serviceaccount && <Copyable label="Service account" value={serviceaccount} />}
        {servicegroup && <Copyable label="group" value={servicegroup} />}
      </span>
    ),
  ].filter(Boolean);
  return (
    <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-x-4 tw:gap-y-1 tw:text-[13px] tw:leading-5 tw:text-muted-foreground">
      {parts.flatMap((p, i) => (i ? [<Divider key={`d${i}`} />, p] : [p]))}
    </div>
  );
}

function Copyable({ label, value }) {
  return (
    <span className="tw:flex tw:items-center tw:gap-1.5">
      {label}
      <span className="tw:font-mono tw:text-foreground">{value}</span>
      <CopyButton value={value} label={`Copy ${label.toLowerCase()} ${value}`} className="tw:-ml-1 tw:size-5" />
    </span>
  );
}
