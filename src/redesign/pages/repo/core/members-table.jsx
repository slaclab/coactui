"use client";

import { useMemo, useState } from "react";
import { useApolloClient } from "@apollo/client";
import { toast } from "sonner";
import { Copy, Crown, Shield, UserMinus, UserPlus, Users } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ActionsMenu, BulkButton, DataTable, EmptyState, FacetFilter, SearchInput, sortHeader, Toolbar, ToolbarButton } from "../../../kit";
import { useDialogParam, useQueryList, useQueryParam } from "../../../lib/navigation";
import { mutate, REFETCH, REPO_TOGGLE_ROLE, repoKey, runSequential, TOGGLE_GROUP_MEMBERSHIP, userInput } from "./mutations";
import { REPO_MEMBERS, repoFilter } from "./queries";
import { memberActions } from "./member-row-actions";

const ROLES = ["PI", "Leader", "Member"];
const initials = (m) => {
  const parts = (m.fullname || m.username).trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)[0] : parts[0]?.[1] ?? "")).toUpperCase();
};

const copyUsernames = (names) =>
  navigator.clipboard?.writeText([...names].sort().join("\n")).then(() => toast.success(`Copied ${names.length} username${names.length === 1 ? "" : "s"}`));

/** Fresh repo membership (network-only), so non-idempotent toggles never act on stale data. */
async function freshMembers(client, repo) {
  const { data } = await client.query({ query: REPO_MEMBERS, variables: { filter: repoFilter(repo) }, fetchPolicy: "network-only" });
  return data.repo;
}

export function RoleBadge({ role }) {
  if (role === "PI")
    return (
      <span className="tw:inline-flex tw:h-5.5 tw:items-center tw:gap-1 tw:rounded-sm tw:bg-foreground tw:px-2 tw:text-xs tw:font-semibold tw:text-background">
        <Crown className="tw:size-3" strokeWidth={2} /> PI
      </span>
    );
  return <span className="tw:inline-flex tw:h-5.5 tw:items-center tw:rounded-sm tw:bg-neutral-bg tw:px-2 tw:text-xs tw:font-semibold tw:text-muted-strong">{role}</span>;
}

/** Members tab table (Paper "Repo — Members (select + row menu)"). */
export function MembersTable({ repo, rows, groups, loading, canEdit, canManage }) {
  const client = useApolloClient();
  const { openDialog } = useDialogParam();
  const [q, setQ] = useQueryParam("q", "");
  const [roles, setRoles] = useQueryList("role");
  const [busy, setBusy] = useState([]); // usernames whose leader toggle is in flight

  const filtered = useMemo(() => (roles.length ? rows.filter((r) => roles.includes(r.role)) : rows), [rows, roles]);
  const counts = useMemo(() => Object.fromEntries(ROLES.map((r) => [r, rows.filter((m) => m.role === r).length])), [rows]);

  const toggleLeader = async (member, makeLeader) => {
    setBusy((b) => [...b, member.username]);
    try {
      const fresh = await freshMembers(client, repo);
      if ((fresh.leaders ?? []).includes(member.username) !== makeLeader)
        await mutate(client, REPO_TOGGLE_ROLE, { repo: repoKey(repo), user: userInput(member.username) }, ["RepoMembers", "RepoCore", "RepoHistory"]);
      toast.success(makeLeader ? `${member.username} is now a leader` : `${member.username} is no longer a leader`);
    } catch (err) {
      toast.error("Couldn’t change the leader role", { description: err.message });
    } finally {
      setBusy((b) => b.filter((u) => u !== member.username));
    }
  };

  const makeLeaders = async (selected, table) => {
    const fresh = await freshMembers(client, repo);
    const todo = selected.map((m) => m.username).filter((u) => u !== fresh.principal && !(fresh.leaders ?? []).includes(u));
    if (!todo.length) return toast.info("They are already leaders");
    const run = runSequential(todo, (u) => mutate(client, REPO_TOGGLE_ROLE, { repo: repoKey(repo), user: userInput(u) })).then(async (r) => {
      await client.refetchQueries({ include: ["RepoMembers", "RepoCore", "RepoHistory"] });
      if (r.failed) throw new Error(`Made ${r.ok} of ${todo.length} leaders`);
      table.resetRowSelection();
      return r;
    });
    toast.promise(run, { loading: "Updating roles…", success: (r) => `Made ${r.ok} leader${r.ok === 1 ? "" : "s"}`, error: (e) => e.message });
  };

  const addToGroup = async (selected, groupName) => {
    const fresh = await freshMembers(client, repo);
    const current = new Set(fresh.accessGroupObjs.find((g) => g.name === groupName)?.members ?? []);
    const todo = selected.map((m) => m.username).filter((u) => !current.has(u));
    if (!todo.length) return toast.info(`They are already in ${groupName}`);
    const run = runSequential(todo, (u) => mutate(client, TOGGLE_GROUP_MEMBERSHIP, { repo: repoKey(repo), user: userInput(u), group: { name: groupName } })).then(async (r) => {
      await client.refetchQueries({ include: REFETCH.groups });
      if (r.failed) throw new Error(`Added ${r.ok} of ${todo.length} to ${groupName}`);
      return r;
    });
    toast.promise(run, { loading: `Adding to ${groupName}…`, success: (r) => `Added ${r.ok} to ${groupName}`, error: (e) => e.message });
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "username",
        header: sortHeader("Member"),
        cell: ({ row: { original: m } }) => (
          <div className="tw:flex tw:min-w-52 tw:items-center tw:gap-3">
            <span className="tw:flex tw:size-7 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-neutral-bg tw:text-[11px] tw:font-semibold tw:text-muted-strong" aria-hidden>{initials(m)}</span>
            <div className="tw:flex tw:min-w-0 tw:flex-col">
              <span className="tw:font-mono tw:text-sm tw:leading-5">{m.username}</span>
              {m.fullname && <span className="tw:truncate tw:text-xs tw:text-muted-foreground">{m.fullname}</span>}
            </div>
          </div>
        ),
        enableHiding: false,
      },
      {
        accessorKey: "role",
        header: sortHeader("Role"),
        sortingFn: (a, b) => ROLES.indexOf(a.original.role) - ROLES.indexOf(b.original.role),
        cell: ({ getValue }) => <RoleBadge role={getValue()} />,
        size: 110,
      },
      { accessorKey: "email", header: sortHeader("Email"), cell: ({ getValue }) => <span className="tw:text-[13px]">{getValue() || "—"}</span> },
      {
        id: "groups",
        accessorFn: (m) => m.groups.join(" "),
        header: "Access groups",
        cell: ({ row: { original: m } }) =>
          m.groups.length ? (
            <span className="tw:font-mono tw:text-[13px]" title={m.groups.join(", ")}>{m.groups[0]}{m.groups.length > 1 && <span className="tw:text-muted-foreground"> +{m.groups.length - 1}</span>}</span>
          ) : (
            <span className="tw:text-muted-foreground">–</span>
          ),
      },
      {
        id: "eppns",
        accessorFn: (m) => m.eppns.length,
        header: () => <span className="tw:block tw:text-right">EPPNs</span>,
        cell: ({ row: { original: m } }) => <EppnPopover member={m} />,
        size: 80,
      },
      {
        id: "actions",
        header: () => <span className="tw:sr-only">Actions</span>,
        cell: ({ row: { original: m } }) => (
          <ActionsMenu
            groups={memberActions(m, { repo, canEdit, canManage, busy: busy.includes(m.username), onToggleLeader: toggleLeader, openDialog })}
            label={`Actions for ${m.username}`}
          />
        ),
        enableSorting: false,
        size: 48,
        meta: { cellClassName: "tw:px-0 tw:w-12", headerClassName: "tw:w-12" },
      },
    ],
    // toggleLeader/openDialog are recreated per render; the menu reads `busy` for its labels.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [repo, canEdit, canManage, busy, openDialog],
  );

  if (!loading && rows.length === 0)
    return (
      <EmptyState
        icon={Users}
        title="No members yet"
        description={canEdit ? "Add people so they get repo storage and the LDAP group." : undefined}
        actions={canEdit && <Button size="sm" onClick={() => openDialog("add-members")}><UserPlus /> Add members</Button>}
        className="tw:mt-4"
      />
    );

  const reset = () => { setQ(""); setRoles([]); };
  return (
    <DataTable
      columns={columns}
      data={filtered}
      getRowId={(m) => m.username}
      loading={loading}
      skeleton={canEdit ? [null, "tw:w-40", "tw:w-14", "tw:w-36", "tw:w-20", "tw:w-6 tw:ml-auto", null] : ["tw:w-40", "tw:w-14", "tw:w-36", "tw:w-20", "tw:w-6 tw:ml-auto", null]}
      globalFilter={q}
      globalFilterFn={(m, needle) => [m.username, m.fullname, m.email].some((s) => s?.toLowerCase().includes(needle))}
      enableRowSelection={canEdit ? (m) => m.role !== "PI" : undefined}
      initialSorting={[{ id: "role", desc: false }]}
      empty={
        <>
          No members match{q ? ` “${q}”` : " these filters"}.{" "}
          <button type="button" onClick={reset} className="tw:font-medium tw:text-foreground tw:underline">Clear filters</button>
        </>
      }
      toolbar={
        <Toolbar
          start={
            <>
              <SearchInput value={q} onChange={setQ} placeholder="Filter members…" />
              <FacetFilter label="Role" options={ROLES.map((r) => ({ value: r, count: counts[r] }))} selected={roles} onChange={setRoles} />
            </>
          }
          end={
            <>
              {rows.length > 0 && (
                <span className="tw:text-[13px] tw:text-muted-foreground tw:tabular-nums">
                  {rows.length} member{rows.length === 1 ? "" : "s"} · {counts.PI} PI · {counts.Leader} leader{counts.Leader === 1 ? "" : "s"}
                </span>
              )}
              <ToolbarButton icon={Copy} disabled={!rows.length} onClick={() => copyUsernames(filtered.map((m) => m.username))}>Copy usernames</ToolbarButton>
            </>
          }
        />
      }
      bulkActions={({ selected, table }) => (
        <>
          <BulkButton icon={Shield} onClick={() => makeLeaders(selected, table)}>Make leaders</BulkButton>
          {groups.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger className="tw:flex tw:h-8 tw:items-center tw:gap-1.5 tw:rounded-md tw:px-2.5 tw:text-[13px] tw:font-medium tw:hover:bg-muted">
                <Users className="tw:size-3.5 tw:text-muted-strong" /> Add to access group…
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="tw:w-56">
                <DropdownMenuLabel className="tw:text-xs tw:font-medium tw:text-muted-strong">Add {selected.length} to</DropdownMenuLabel>
                {groups.map((g) => (
                  <DropdownMenuItem key={g.name} onSelect={() => addToGroup(selected, g.name)} className="tw:font-mono tw:text-[13px]">{g.name}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <BulkButton icon={Copy} onClick={() => copyUsernames(selected.map((m) => m.username))}>Copy usernames</BulkButton>
          <button
            type="button"
            onClick={() => openDialog("remove-members", selected.map((m) => m.username).join(","))}
            className="tw:ml-1 tw:flex tw:h-8 tw:items-center tw:gap-1.5 tw:rounded-md tw:border tw:border-crit/30 tw:px-2.5 tw:text-[13px] tw:font-medium tw:text-crit-text tw:hover:bg-crit-bg"
          >
            <UserMinus className="tw:size-3.5" /> Remove from repo…
          </button>
        </>
      )}
    />
  );
}

function EppnPopover({ member }) {
  const n = member.eppns.length;
  if (!n) return <span className="tw:block tw:text-right tw:text-muted-foreground">0</span>;
  return (
    <Popover>
      <PopoverTrigger className="tw:ml-auto tw:flex tw:h-7 tw:min-w-7 tw:items-center tw:justify-center tw:rounded tw:px-1.5 tw:text-[13px] tw:tabular-nums tw:hover:bg-muted" aria-label={`${n} EPPNs for ${member.username}`}>
        {n}
      </PopoverTrigger>
      <PopoverContent align="end" className="tw:w-80 tw:p-0">
        <div className="tw:border-b tw:px-3 tw:py-2 tw:text-xs tw:font-medium tw:text-muted-strong">EPPNs · <span className="tw:font-mono">{member.username}</span></div>
        <ul className="tw:max-h-64 tw:divide-y tw:overflow-y-auto">
          {member.eppns.map((e) => (
            <li key={e.eppn} className="tw:px-3 tw:py-2">
              <div className="tw:truncate tw:font-mono tw:text-[13px]">{e.eppn}</div>
              {(e.organization || e.fullname) && <div className="tw:truncate tw:text-xs tw:text-muted-foreground">{[e.fullname, e.organization].filter(Boolean).join(" · ")}</div>}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
