"use client";

import { ClientOnly } from "../../providers/apollo";
import { DataTable, ErrorAlert, SearchInput, Toolbar } from "../../kit";
import { useRepo } from "./repo-context";
import { useRepoMembers } from "./core/queries";
import { MembersTable } from "./core/members-table";

/** Repo › Members (spec §6 Members). Toolbar + table header render while loading. */
export function RepoMembersTab() {
  return (
    <ClientOnly fallback={<MembersSkeleton />}>
      <MembersLive />
    </ClientOnly>
  );
}

const SKELETON_COLUMNS = ["Member", "Role", "Email", "Access groups", "EPPNs"].map((h) => ({ id: h, header: h }));

function MembersSkeleton() {
  return (
    <DataTable
      columns={SKELETON_COLUMNS}
      data={[]}
      loading
      skeleton={["tw:w-40", "tw:w-14", "tw:w-36", "tw:w-20", "tw:w-6 tw:ml-auto"]}
      footer={false}
      toolbar={<Toolbar start={<SearchInput value="" onChange={() => {}} placeholder="Filter members…" />} />}
    />
  );
}

function MembersLive() {
  const { repo, canEdit, canManage } = useRepo();
  if (!repo) return <MembersSkeleton />;
  return <MembersBody repo={repo} canEdit={canEdit} canManage={canManage} />;
}

function MembersBody({ repo, canEdit, canManage }) {
  const m = useRepoMembers(repo);
  if (m.error && !m.data) return <ErrorAlert error={m.error} onRetry={m.refetch} what="members" />;
  return <MembersTable repo={repo} rows={m.rows} groups={m.groups} loading={m.loading} canEdit={canEdit} canManage={canManage} />;
}
