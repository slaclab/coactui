"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResolveHref } from "../../../lib/navigation";

export const gidLabel = (g) => (g.gidnumber != null ? `GID ${g.gidnumber}` : "GID pending");

/** Selectable access-group list (master side of Paper "Repo — Access groups"). */
export function GroupList({ groups, selected }) {
  const resolve = useResolveHref();
  return (
    <nav aria-label="Access groups" className="tw:overflow-hidden tw:rounded-xl tw:border tw:bg-background">
      <ul className="tw:divide-y">
        {groups.map((g) => {
          const active = g.name === selected;
          const n = g.members?.length ?? 0;
          return (
            <li key={g.Id ?? g.name}>
              <Link
                href={resolve(`?group=${encodeURIComponent(g.name)}`)}
                scroll={false}
                replace
                aria-current={active ? "true" : undefined}
                className={cn(
                  "tw:flex tw:items-center tw:justify-between tw:gap-3 tw:px-4 tw:py-3 tw:text-foreground tw:no-underline",
                  active ? "tw:bg-muted tw:shadow-[inset_2px_0_0_var(--primary)]" : "tw:hover:bg-muted/50",
                )}
              >
                <span className="tw:min-w-0">
                  <span className="tw:block tw:truncate tw:font-mono tw:text-sm tw:font-medium">{g.name}</span>
                  <span className="tw:block tw:text-xs tw:text-muted-foreground tw:tabular-nums">{gidLabel(g)} · {n} member{n === 1 ? "" : "s"}</span>
                </span>
                <ChevronRight className={cn("tw:size-4 tw:shrink-0", active ? "tw:text-foreground" : "tw:text-muted-foreground")} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
