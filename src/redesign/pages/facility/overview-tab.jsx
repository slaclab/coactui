"use client";

import { ClientOnly } from "../../providers/apollo";
import { ComputeSection } from "./overview/compute-section";
import { PeopleSection } from "./overview/people-section";
import { CardSkeleton } from "./overview/section-parts";
import { StorageSection } from "./overview/storage-section";

/** /facilities/[name] — Overview (spec §5): Compute, then Storage | Czars as in Paper. */
export function FacilityOverviewTab() {
  return (
    <ClientOnly fallback={<OverviewLayout compute={<CardSkeleton title="Compute" />} storage={<CardSkeleton title="Storage" />} people={<CardSkeleton title="Czars" />} />}>
      <OverviewLayout compute={<ComputeSection />} storage={<StorageSection />} people={<PeopleSection />} />
    </ClientOnly>
  );
}

function OverviewLayout({ compute, storage, people }) {
  return (
    <div className="tw:flex tw:flex-col tw:gap-5">
      {compute}
      <div className="tw:grid tw:grid-cols-1 tw:items-start tw:gap-5 tw:xl:grid-cols-[minmax(0,1fr)_420px]">
        {storage}
        {people}
      </div>
    </div>
  );
}
