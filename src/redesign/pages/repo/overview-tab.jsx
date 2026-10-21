"use client";

import { ClientOnly } from "../../providers/apollo";
import { SectionCard, Skeleton } from "../../kit";
import { useRepo } from "./repo-context";
import { DetailsCard } from "./core/details-card";
import { UsageCard } from "./core/usage-card";
import { PendingRequestsCard } from "./core/pending-requests-card";

/** Repo › Overview (spec §6, Paper "Repo — Overview"): Details on the left, usage + pending on the right. */
export function RepoOverviewTab() {
  return (
    <ClientOnly fallback={<OverviewFrame />}>
      <OverviewLive />
    </ClientOnly>
  );
}

function OverviewFrame({ side }) {
  return (
    <div className="tw:flex tw:flex-col tw:gap-5 tw:lg:flex-row tw:lg:items-start">
      <div className="tw:min-w-0 tw:flex-1"><DetailsCard /></div>
      <div className="tw:flex tw:w-full tw:shrink-0 tw:flex-col tw:gap-5 tw:lg:w-105">
        {side ?? (
          <SectionCard title="Usage · 7d">
            <div className="tw:flex tw:flex-col tw:gap-4">
              <Skeleton className="tw:h-4 tw:w-40" />
              <Skeleton className="tw:h-1.5 tw:w-20" />
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function OverviewLive() {
  const { repo } = useRepo();
  return (
    <OverviewFrame
      side={
        repo && (
          <>
            <UsageCard repo={repo} />
            <PendingRequestsCard repo={repo} />
          </>
        )
      }
    />
  );
}
