"use client";

import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import { Users } from "lucide-react";

import { ClientOnly } from "../../providers/apollo";
import { EmptyState, ErrorAlert, Skeleton } from "../../kit";
import { useQueryParam } from "../../lib/navigation";
import { useRepo } from "./repo-context";
import { REPO_ACCESS_GROUPS, repoFilter } from "./core/queries";
import { GroupList } from "./core/group-list";
import { CreateGroupCard } from "./core/create-group-card";
import { GroupMembersEditor } from "./core/group-members-editor";

/** Repo › Access groups (Paper "Repo — Access groups"): master list + member editor; ?group=. */
export function RepoGroupsTab() {
  return (
    <ClientOnly fallback={<GroupsSkeleton />}>
      <GroupsLive />
    </ClientOnly>
  );
}

function GroupsSkeleton() {
  return (
    <div className="tw:flex tw:flex-col tw:gap-5 tw:lg:flex-row tw:lg:items-start">
      <div className="tw:flex tw:w-full tw:shrink-0 tw:flex-col tw:divide-y tw:rounded-xl tw:border tw:bg-background tw:lg:w-95">
        {[0, 1, 2].map((i) => (
          <div key={i} className="tw:flex tw:flex-col tw:gap-1.5 tw:px-4 tw:py-3">
            <Skeleton className="tw:h-4 tw:w-40" />
            <Skeleton className="tw:h-3 tw:w-24" />
          </div>
        ))}
      </div>
      <div className="tw:flex tw:min-h-60 tw:flex-1 tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:bg-background tw:p-5">
        <Skeleton className="tw:h-5 tw:w-56" />
        <Skeleton className="tw:h-3 tw:w-40" />
        <Skeleton className="tw:mt-4 tw:h-9 tw:w-full" />
      </div>
    </div>
  );
}

function GroupsLive() {
  const { repo, canEdit } = useRepo();
  if (!repo) return <GroupsSkeleton />;
  return <GroupsBody repo={repo} canEdit={canEdit} />;
}

function GroupsBody({ repo, canEdit }) {
  const { data, loading, error, refetch } = useQuery(REPO_ACCESS_GROUPS, { variables: { filter: repoFilter(repo) } });
  const [requested, setGroup] = useQueryParam("group", "");
  const r = data?.repo;
  const groups = useMemo(() => [...(r?.accessGroupObjs ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [r]);
  const names = useMemo(() => Object.fromEntries((r?.allUsers ?? []).map((u) => [u.username, u.fullname])), [r]);

  if (error && !data) return <ErrorAlert error={error} onRetry={refetch} what="access groups" />;
  if (loading && !data) return <GroupsSkeleton />;

  // Derived: the requested group if it exists, else the first.
  const selected = groups.find((g) => g.name === requested) ?? groups[0];
  const create = canEdit && <CreateGroupCard repo={repo} existing={groups.map((g) => g.name)} onCreated={setGroup} />;

  if (!groups.length)
    return (
      <div className="tw:flex tw:flex-col tw:gap-5">
        <EmptyState
          icon={Users}
          title="No access groups"
          description={canEdit ? "Access groups give a subset of repo members their own POSIX group." : "This repo has no access groups."}
        />
        {create && <div className="tw:mx-auto tw:w-full tw:max-w-md">{create}</div>}
      </div>
    );

  return (
    <div className="tw:flex tw:flex-col tw:gap-5 tw:lg:flex-row tw:lg:items-start">
      <div className="tw:flex tw:w-full tw:shrink-0 tw:flex-col tw:gap-3 tw:lg:w-95">
        <GroupList groups={groups} selected={selected?.name} />
        {create}
      </div>
      <div className="tw:min-w-0 tw:flex-1">
        {selected && <GroupMembersEditor repo={repo} group={selected} members={r.users ?? []} names={names} canEdit={canEdit} />}
      </div>
    </div>
  );
}
