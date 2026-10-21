"use client";

import Link from "next/link";
import { FolderGit2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip, EmptyState, ErrorAlert, SectionCard, Skeleton } from "../../kit";
import { routes } from "../../lib/routes";
import { useViewer } from "../../providers/viewer";

const linkClass = "tw:text-[13px] tw:font-medium tw:text-foreground tw:no-underline tw:hover:underline";

/** Compact list of the viewer's repos. (ReposTable is too heavy here: it adds 7-day usage queries.) */
export function ReposCard({ data }) {
  const { can } = useViewer();
  const { repos, loading, error, refetch } = data;
  return (
    <SectionCard
      title="Repos"
      caption={loading ? "Loading…" : `${repos.length} ${repos.length === 1 ? "repo" : "repos"}`}
      bodyClassName="tw:border-t tw:py-0"
      footer={repos.length > 0 && <Link href={routes.repos()} className={linkClass}>All repos →</Link>}
    >
      {loading ? (
        Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="tw:flex tw:h-12 tw:items-center tw:border-b tw:last:border-b-0"><Skeleton className="tw:h-4 tw:w-40" /></div>
        ))
      ) : error ? (
        <ErrorAlert error={error} onRetry={refetch} what="your repos" className="tw:my-4" />
      ) : repos.length ? (
        <ul>
          {repos.map((r) => {
            const role = can.roleIn(r);
            return (
              <li key={`${r.facility}/${r.name}`} className="tw:flex tw:h-12 tw:items-center tw:gap-3 tw:border-b tw:last:border-b-0">
                <Link href={routes.repo(r.facility, r.name)} className="tw:min-w-0 tw:flex-1 tw:truncate tw:font-mono tw:text-[13px] tw:text-foreground tw:no-underline tw:hover:underline">
                  {r.name}
                </Link>
                <Chip>{r.facility}</Chip>
                {role && <Chip className="tw:bg-transparent tw:font-medium tw:text-muted-foreground">{role}</Chip>}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={FolderGit2}
          className="tw:my-4 tw:py-8"
          title="You're not in any repos yet"
          description="Ask a PI to add you, or request membership."
          actions={<Button asChild variant="outline" size="sm"><Link href={routes.repos()} className="tw:no-underline">Go to Repos</Link></Button>}
        />
      )}
    </SectionCard>
  );
}
