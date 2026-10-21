"use client";

import { Button } from "@/components/ui/button";
import { CopyButton, SectionCard, Skeleton } from "../../../kit";
import { useDialogParam } from "../../../lib/navigation";
import { useViewer } from "../../../providers/viewer";
import { useFacility } from "../facility-context";
import { DIALOGS } from "../facility-actions";

const initials = (fullname, username) =>
  (fullname ? fullname.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("") : username.slice(0, 2)).toUpperCase();

/** Overview › People (spec §5c; Paper titles it "Czars"): czars, Manage czars, service accounts. */
export function PeopleSection() {
  const { facility, loading, canManageCzars } = useFacility();
  const { viewer } = useViewer();
  const { openDialog } = useDialogParam();
  const fullnames = Object.fromEntries((facility?.czarObjs ?? []).map((c) => [c.username, c.fullname]));
  const czars = facility?.czars ?? [];
  const { serviceaccount, servicegroup } = facility ?? {};

  return (
    <SectionCard
      title="Czars"
      action={canManageCzars && <Button variant="ghost" size="sm" className="tw:-my-1 tw:-mr-2" onClick={() => openDialog(DIALOGS.manageCzars)}>Manage czars</Button>}
      className="tw:overflow-hidden"
      bodyClassName="tw:px-0 tw:pb-0"
      footer={
        (serviceaccount || servicegroup) && (
          <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-x-4 tw:gap-y-1 tw:text-[13px] tw:text-muted-foreground">
            Service accounts
            {[serviceaccount, servicegroup].filter(Boolean).map((v) => (
              <span key={v} className="tw:flex tw:items-center tw:gap-1">
                <span className="tw:font-mono tw:text-foreground">{v}</span>
                <CopyButton value={v} label={`Copy ${v}`} className="tw:size-5" />
              </span>
            ))}
          </div>
        )
      }
    >
      <ul>
        {loading
          ? Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="tw:flex tw:h-12 tw:items-center tw:gap-3 tw:border-t tw:px-5">
                <Skeleton className="tw:size-7 tw:rounded-full" />
                <Skeleton className="tw:h-4 tw:w-20" />
                <Skeleton className="tw:h-4 tw:w-28" />
              </li>
            ))
          : czars.map((u) => (
              <li key={u} className="tw:flex tw:h-12 tw:items-center tw:gap-3 tw:border-t tw:px-5 tw:text-[13px]">
                <span className="tw:flex tw:size-7 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-muted tw:text-[11px] tw:font-semibold tw:text-muted-strong" aria-hidden>
                  {initials(fullnames[u], u)}
                </span>
                <span className="tw:w-24 tw:shrink-0 tw:truncate tw:font-mono tw:text-foreground" title={u}>{u}</span>
                <span className="tw:truncate tw:text-muted-foreground">{[fullnames[u], u === viewer?.username && "you"].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
        {!loading && !czars.length && <li className="tw:border-t tw:px-5 tw:py-4 tw:text-[13px] tw:text-muted-foreground">No czars assigned</li>}
      </ul>
    </SectionCard>
  );
}
