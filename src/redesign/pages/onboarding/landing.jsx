"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { routes } from "../../lib/routes";
import { HALL_CTA, NightHall, PUBLIC_LINKS } from "./night-hall";
import { RepoPreviewCard } from "./repo-preview-card";
import { HALL_ENTRANCE_KEY, useEntranceOnce } from "./use-entrance-once";

/**
 * Signed out (Paper "Landing (signed out)"): no identity reached the API — an expired or
 * missing SSO session. Static, no data. Client-only (rendered by the home router).
 */
export function Landing() {
  const { entrance, markSeen } = useEntranceOnce(HALL_ENTRANCE_KEY);
  return (
    <NightHall
      variant="landing"
      entrance={entrance}
      onEntranceEnd={markSeen}
      eyebrow="SLAC Shared Science Data Facility · S3DF"
      title="Compute and storage for SLAC science."
      lead="Coact is where you get an S3DF account, join your facility's repos, add your team, and see how your compute and storage are being used."
      actions={
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-3 tw:pt-1">
          {/* Full page load: /login goes through SSO (gateway authn route), then forwards to a door. */}
          <Button asChild className={cn(HALL_CTA)}>
            <a href={routes.login()}>
              Sign in with SLAC <ArrowRight />
            </a>
          </Button>
          <span className="tw:text-sm tw:text-primary-foreground/65">Stanford and partner identities accepted</span>
        </div>
      }
      aside={<RepoPreviewCard />}
      footer={<LandingFooter />}
    />
  );
}

function LandingFooter() {
  const links = [
    { label: "Status", href: PUBLIC_LINKS.status },
    { label: "Privacy", href: PUBLIC_LINKS.privacy },
    { label: "Contact", href: PUBLIC_LINKS.contact },
  ];
  return (
    <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:px-6 tw:py-5 tw:text-[13px] tw:leading-5 tw:text-primary-foreground/55 tw:sm:px-14">
      <span>SLAC National Accelerator Laboratory · Operated by Stanford University for the U.S. DOE</span>
      <nav aria-label="About" className="tw:flex tw:items-center tw:gap-1">
        {links.map((l, i) => (
          <span key={l.label} className="tw:flex tw:items-center tw:gap-1">
            {i > 0 && <span aria-hidden>·</span>}
            <a href={l.href} className="tw:hover:text-primary-foreground" {...(l.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
              {l.label}
            </a>
          </span>
        ))}
      </nav>
    </div>
  );
}
