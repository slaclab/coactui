"use client";

import { useMemo, useState } from "react";
import { useApolloClient, useQuery } from "@apollo/client";
import { toast } from "sonner";
import { Check, Loader2, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Segmented, useDebounced } from "../../../kit";
import { useQueryParam, useQueryState } from "../../../lib/navigation";
import { mutate, REFETCH, REPO_ADD_USER, repoKey, TOGGLE_GROUP_MEMBERSHIP, userInput } from "./mutations";
import { REPO_SEARCH_USERS, useRepoMembers } from "./queries";
import { DISPLAY_CAP, PasteChecklist, usePasteResolution } from "./paste-resolver";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Add members (Paper "Members · Add members"): right Sheet with Search people / Paste a list.
 * Calls run one at a time with per-row results; the sheet stays open until Done.
 * Only usernames resolved from the API are sent (repoAddUser doesn't check existence).
 */
export function AddMembersSheet({ repo, open }) {
  const client = useApolloClient();
  const [mode, setMode] = useQueryParam("mode", "search");
  const [params, setParams] = useQueryState();
  // Closing drops ?dialog, ?target and the sheet's own ?mode in one navigation.
  const onOpenChange = (o) => {
    if (o) return;
    const next = new URLSearchParams(params);
    for (const k of ["dialog", "target", "mode"]) next.delete(k);
    setParams(next);
  };
  const { groups } = useRepoMembers(repo);
  // Local UI state while the sheet is open.
  const [staged, setStaged] = useState([]); // search picks: [{ username, fullname }]
  const [text, setText] = useState(""); // paste box
  const [results, setResults] = useState({}); // username → "pending" | true | message
  const [alsoGroup, setAlsoGroup] = useState(false);
  const [group, setGroup] = useState("");
  const [running, setRunning] = useState(false);

  const members = repo.users ?? [];
  const resolution = usePasteResolution(mode === "paste" ? text : "", members);
  const candidates = (mode === "paste" ? resolution.toAdd : staged).filter((u) => results[u.username] !== true);
  const groupName = group || groups[0]?.name || "";
  const groupMembers = new Set(groups.find((g) => g.name === groupName)?.members ?? []);

  const addOne = async (username) => {
    setResults((r) => ({ ...r, [username]: "pending" }));
    try {
      // On Retry after a failed group step the user is already a member: don't re-add.
      if (!members.includes(username)) await mutate(client, REPO_ADD_USER, { repo: repoKey(repo), user: userInput(username) });
      if (alsoGroup && groupName && !groupMembers.has(username))
        await mutate(client, TOGGLE_GROUP_MEMBERSHIP, { repo: repoKey(repo), user: userInput(username), group: { name: groupName } });
      setResults((r) => ({ ...r, [username]: true }));
      return true;
    } catch (err) {
      setResults((r) => ({ ...r, [username]: err.message ?? String(err) }));
      return false;
    }
  };

  const addAll = async () => {
    const list = candidates.map((u) => u.username);
    setRunning(true);
    const added = [];
    for (const u of list) if (await addOne(u)) added.push(u);
    const ok = added.length;
    await client.refetchQueries({ include: [...REFETCH.members, "RepoAccessGroups"] });
    setRunning(false);
    (ok === list.length ? toast.success : toast.error)(`Added ${ok} of ${list.length} to ${repo.name}`);
    setStaged((s) => s.filter((u) => !added.includes(u.username)));
  };

  const retry = async (username) => {
    setRunning(true);
    const ok = await addOne(username);
    await client.refetchQueries({ include: REFETCH.members });
    setRunning(false);
    if (ok) toast.success(`Added ${username} to ${repo.name}`);
  };

  const done = Object.keys(results).length > 0;
  const n = candidates.length;

  return (
    <Sheet open={open} onOpenChange={(o) => !running && onOpenChange(o)}>
      <SheetContent side="right" className="tw:w-full tw:gap-0 tw:sm:max-w-[540px]">
        <SheetHeader className="tw:gap-1 tw:border-b tw:px-6 tw:pt-5 tw:pb-4">
          <SheetTitle className="tw:text-lg">Add members</SheetTitle>
          <SheetDescription>
            to <span className="tw:font-mono">{repo.name}</span> · {repo.name === "default" ? `they get access to ${repo.facility}` : "they get repo storage and the LDAP group"}
          </SheetDescription>
        </SheetHeader>

        <div className="tw:flex tw:min-h-0 tw:flex-1 tw:flex-col tw:gap-5 tw:overflow-y-auto tw:px-6 tw:py-5">
          <div className="tw:w-fit">
            <Segmented
              label="How to add"
              value={mode}
              onChange={setMode}
              items={[
                { value: "search", label: "Search people" },
                { value: "paste", label: "Paste a list" },
              ]}
            />
          </div>

          {mode === "search" ? (
            <SearchPeople members={members} staged={staged} onPick={(u) => setStaged((s) => (s.some((x) => x.username === u.username) ? s.filter((x) => x.username !== u.username) : [...s, u]))} />
          ) : (
            <div className="tw:flex tw:flex-col tw:gap-3">
              <div className="tw:flex tw:items-baseline tw:justify-between">
                <span className="tw:text-[13px] tw:font-semibold">Paste a list</span>
                <span className="tw:text-xs tw:text-muted-foreground">usernames or regex · one per line</span>
              </div>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder={"jdoe\n^xpp_user[0-9]+$"}
                aria-label="Usernames or patterns, one per line"
                className="tw:font-mono tw:text-[13px]"
              />
              <PasteChecklist resolution={resolution} />
              {resolution.lines.length > 0 && (
                <p className="tw:text-xs tw:text-muted-foreground tw:tabular-nums">
                  {resolution.toAdd.length} to add · {resolution.skipped} skipped · {resolution.notFound} not found
                  {resolution.capped && <> · showing the first {DISPLAY_CAP}; refine your pattern</>}
                </p>
              )}
            </div>
          )}

          {(mode === "search" ? staged.length > 0 : resolution.toAdd.length > 0) || done ? (
            <ToAddList
              title={mode === "search" ? `To add · ${staged.length}` : `To add · ${resolution.toAdd.length}`}
              users={mode === "search" ? staged : resolution.toAdd.slice(0, DISPLAY_CAP)}
              results={results}
              onRemove={mode === "search" && !running ? (u) => setStaged((s) => s.filter((x) => x.username !== u)) : null}
              onClear={mode === "search" && !running ? () => setStaged([]) : null}
              onRetry={running ? null : retry}
            />
          ) : null}

          {groups.length > 0 && (
            <div className="tw:flex tw:items-center tw:gap-2.5 tw:text-[13px]">
              <Checkbox id="also-group" checked={alsoGroup} onCheckedChange={(v) => setAlsoGroup(!!v)} disabled={running} />
              <label htmlFor="also-group">Also add to access group</label>
              <Select value={groupName} onValueChange={setGroup} disabled={!alsoGroup || running}>
                <SelectTrigger size="sm" className="tw:h-7 tw:w-auto tw:font-mono tw:text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {groups.map((g) => <SelectItem key={g.name} value={g.name} className="tw:font-mono">{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="tw:flex tw:items-center tw:justify-between tw:border-t tw:px-6 tw:py-4">
          <span className="tw:text-[13px] tw:text-muted-foreground tw:tabular-nums">{n} to add</span>
          <div className="tw:flex tw:gap-2">
            <Button variant="outline" size="sm" disabled={running} onClick={() => onOpenChange(false)}>{done ? "Done" : "Cancel"}</Button>
            <Button size="sm" disabled={!n || running || resolution.pending && mode === "paste"} onClick={addAll}>
              {running && <Loader2 className="tw:animate-spin" />}
              {n ? `Add ${n} member${n === 1 ? "" : "s"}` : "Add members"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SearchPeople({ members, staged, onPick }) {
  const [query, setQuery] = useState("");
  const q = useDebounced(query.trim());
  const { data, loading } = useQuery(REPO_SEARCH_USERS, { skip: q.length < 2, variables: { regex: `^${escapeRegex(q)}` } });
  const memberSet = useMemo(() => new Set(members), [members]);
  const results = (data?.usersMatchingUserName ?? []).slice(0, 50);
  const picked = new Set(staged.map((u) => u.username));
  return (
    <Command shouldFilter={false} className="tw:h-auto tw:rounded-lg tw:border">
      <CommandInput value={query} onValueChange={setQuery} placeholder="Search by username…" autoFocus />
      <CommandList className="tw:max-h-64">
        {q.length < 2 ? (
          <div className="tw:px-3 tw:py-5 tw:text-center tw:text-xs tw:text-muted-foreground">Type at least 2 characters</div>
        ) : loading || query.trim() !== q ? (
          <div className="tw:flex tw:justify-center tw:py-5"><Loader2 className="tw:size-4 tw:animate-spin tw:text-muted-foreground" /></div>
        ) : (
          <>
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {results.map((u) => {
                const member = memberSet.has(u.username);
                return (
                  <CommandItem key={u.username} value={u.username} disabled={member} onSelect={() => onPick(u)} className="tw:items-start">
                    <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col">
                      <span className={cn("tw:flex tw:gap-2", member && "tw:text-muted-foreground")}>
                        <span className="tw:font-mono">{u.username}</span>
                        {u.fullname && <span className="tw:truncate">{u.fullname}</span>}
                      </span>
                      <span className="tw:truncate tw:text-xs tw:text-muted-foreground">{member ? "Already a member" : u.preferredemail}</span>
                    </div>
                    {picked.has(u.username) && <Check className="tw:mt-1 tw:size-4 tw:text-primary" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  );
}

function ToAddList({ title, users, results, onRemove, onClear, onRetry }) {
  const shown = [...users, ...Object.keys(results).filter((u) => !users.some((x) => x.username === u)).map((username) => ({ username, fullname: "" }))];
  return (
    <div className="tw:flex tw:flex-col tw:gap-2">
      <div className="tw:flex tw:items-center tw:justify-between">
        <span className="tw:text-[13px] tw:font-semibold">{title}</span>
        {onClear && users.length > 0 && <button type="button" onClick={onClear} className="tw:text-[13px] tw:font-medium tw:text-muted-strong tw:hover:text-foreground">Clear</button>}
      </div>
      <ul className="tw:divide-y tw:rounded-lg tw:border">
        {shown.map((u) => {
          const r = results[u.username];
          return (
            <li key={u.username} className="tw:flex tw:h-11 tw:items-center tw:gap-2.5 tw:px-3 tw:text-[13px]">
              {r === true ? <Check className="tw:size-3.5 tw:text-ok" /> : typeof r === "string" && r !== "pending" ? <X className="tw:size-3.5 tw:text-crit-text" /> : r === "pending" ? <Loader2 className="tw:size-3.5 tw:animate-spin tw:text-muted-foreground" /> : <Plus className="tw:size-3.5 tw:text-muted-foreground" />}
              <span className="tw:font-mono">{u.username}</span>
              <span className="tw:min-w-0 tw:flex-1 tw:truncate tw:text-muted-foreground">{u.fullname}</span>
              {r === true ? (
                <span className="tw:text-xs tw:text-muted-foreground">Added</span>
              ) : r === "pending" ? (
                <span className="tw:text-xs tw:text-muted-foreground">Adding…</span>
              ) : typeof r === "string" ? (
                <span className="tw:flex tw:min-w-0 tw:items-center tw:gap-2">
                  <span className="tw:truncate tw:text-xs tw:text-crit-text" title={r}>{r}</span>
                  {onRetry && <button type="button" onClick={() => onRetry(u.username)} className="tw:text-xs tw:font-medium">Retry</button>}
                </span>
              ) : (
                onRemove && (
                  <button type="button" aria-label={`Remove ${u.username}`} onClick={() => onRemove(u.username)} className="tw:rounded tw:p-1 tw:text-muted-foreground tw:hover:bg-muted"><X className="tw:size-3.5" /></button>
                )
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
