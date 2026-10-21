"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Crown, FolderX, Shield } from "lucide-react";
import { Chip, EmptyState, ErrorAlert, PageHeader, Skeleton } from "../../kit";
import { routes } from "../../lib/routes";
import { RepoProvider, useRepo } from "./repo-context";
import { requirementLabel } from "./core/mutations";
import { RepoHeaderActions } from "./core/header-actions";
import { RepoDialogs } from "./core/repo-dialogs";

/** Shell of /repos/[facility]/[name]/** (spec §6 "Repo full page"): header, badges, tabs, repo dialogs. */
export function RepoLayout({ facility, name, children }) {
  return (
    <RepoProvider facility={facility} name={name}>
      <RepoHeader />
      <RepoBody>{children}</RepoBody>
      {/* Every repo-level ?dialog= renders here, so deep links work from any tab. */}
      <Suspense>
        <RepoDialogs />
      </Suspense>
    </RepoProvider>
  );
}

function RepoHeader() {
  const { facility, name, repo, loading, role, roleLabel, isDefault } = useRepo();
  const tab = (key, label, count) => ({ label, count, href: routes.repo(facility, name, key), exact: key === "overview" });
  const requirement = repo?.computerequirement && repo.computerequirement !== "Normal" ? requirementLabel(repo.computerequirement) : null;
  const members = repo?.users?.length ?? 0;
  return (
    <PageHeader
      breadcrumbs={[{ label: "Repos", href: routes.repos() }, { label: facility, href: routes.facility(facility) }, { label: name, mono: true }]}
      title={name}
      mono
      meta={
        <span className="tw:mt-2 tw:flex tw:flex-wrap tw:items-center tw:gap-2">
          <Chip>{facility}</Chip>
          {loading ? (
            <Skeleton className="tw:h-5.5 tw:w-24 tw:rounded-sm" />
          ) : (
            role && <Chip icon={role === "PI" ? Crown : Shield}>You: {roleLabel}</Chip>
          )}
          {requirement && <Chip>{requirement}</Chip>}
          {isDefault && <Chip>Facility access</Chip>}
          {repo && (
            <span className="tw:text-[13px] tw:text-muted-foreground">
              PI <span className="tw:font-mono">{repo.principal ?? "—"}</span> · {members} member{members === 1 ? "" : "s"}
            </span>
          )}
        </span>
      }
      actions={
        <Suspense>
          <RepoHeaderActions />
        </Suspense>
      }
      tabs={[
        tab("overview", "Overview"),
        tab("members", "Members", repo?.users?.length),
        tab("compute", "Compute"),
        tab("storage", "Storage"),
        tab("groups", "Access groups", repo?.accessGroupObjs?.length),
        tab("features", "Features", repo?.features?.length),
        tab("history", "History"),
      ]}
    />
  );
}

function RepoBody({ children }) {
  const { facility, name, error, refetch, notFound } = useRepo();
  if (error) return <ErrorAlert error={error} onRetry={refetch} what="repo" />;
  if (notFound)
    return (
      <EmptyState
        icon={FolderX}
        title={`Repo “${facility}/${name}” not found`}
        actions={<Link href={routes.repos()} className="tw:text-[13px] tw:font-medium tw:text-foreground tw:underline">Back to repos</Link>}
      />
    );
  return children;
}
