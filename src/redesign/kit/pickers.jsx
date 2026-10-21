"use client";

import { useEffect, useState } from "react";
import { gql, useQuery } from "@apollo/client";
import { Check, ChevronsUpDown, Loader2, Minus, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const SEARCH_USERS = gql`
  query KitSearchUsers($regex: String!) {
    usersMatchingUserName(regex: $regex) { username fullname }
  }
`;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Debounced value (300 ms by default) — for search-as-you-type. */
export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * User picker (spec Invite users / Add members / Change PI). Searches usernames on the API
 * (usersMatchingUserName), debounced 300 ms. `options` (e.g. a repo's members) switches it
 * to a local list instead of the API search.
 *   single: value = "jdoe" | null, onChange(username)
 *   multi : value = ["jdoe"],      onChange(usernames)
 */
export function UserCombobox({ value, onChange, multiple = false, options, placeholder = "Search by username…", disabled, exclude = [] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = useDebounced(query.trim());
  const remote = !options;
  const { data, loading } = useQuery(SEARCH_USERS, { skip: !remote || q.length < 2, variables: { regex: `^${escapeRegex(q)}` } });
  const results = (remote ? data?.usersMatchingUserName ?? [] : options.filter((o) => !q || o.username.includes(q) || o.fullname?.toLowerCase().includes(q.toLowerCase())))
    .filter((u) => !exclude.includes(u.username))
    .slice(0, 50);
  const selected = multiple ? value ?? [] : value ? [value] : [];
  const toggle = (username) => {
    if (multiple) onChange(selected.includes(username) ? selected.filter((u) => u !== username) : [...selected, username]);
    else {
      onChange(username);
      setOpen(false);
    }
  };
  return (
    <div className="tw:flex tw:w-full tw:flex-col tw:gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={disabled} className="tw:w-full tw:justify-between tw:font-normal">
            <span className={cn("tw:truncate", !multiple && value ? "tw:font-mono" : "tw:text-muted-foreground")}>
              {!multiple && value ? value : multiple && selected.length ? `${selected.length} selected` : placeholder}
            </span>
            <ChevronsUpDown className="tw:opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="tw:w-(--radix-popover-trigger-width) tw:p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput value={query} onValueChange={setQuery} placeholder={placeholder} />
            <CommandList>
              {remote && q.length < 2 ? (
                <div className="tw:px-3 tw:py-6 tw:text-center tw:text-xs tw:text-muted-foreground">Type at least 2 characters</div>
              ) : loading ? (
                <div className="tw:flex tw:justify-center tw:py-6"><Loader2 className="tw:size-4 tw:animate-spin tw:text-muted-foreground" /></div>
              ) : (
                <>
                  <CommandEmpty>No users found.</CommandEmpty>
                  <CommandGroup>
                    {results.map((u) => (
                      <CommandItem key={u.username} value={u.username} onSelect={() => toggle(u.username)}>
                        <Check className={cn("tw:size-4", selected.includes(u.username) ? "tw:opacity-100" : "tw:opacity-0")} />
                        <span className="tw:font-mono">{u.username}</span>
                        {u.fullname && <span className="tw:truncate tw:text-xs tw:text-muted-foreground">{u.fullname}</span>}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {multiple && selected.length > 0 && (
        <div className="tw:flex tw:flex-wrap tw:gap-1.5">
          {selected.map((u) => (
            <span key={u} className="tw:inline-flex tw:h-6 tw:items-center tw:gap-1 tw:rounded-sm tw:bg-neutral-bg tw:pr-1 tw:pl-2 tw:font-mono tw:text-xs">
              {u}
              <button type="button" aria-label={`Remove ${u}`} onClick={() => toggle(u)} className="tw:rounded tw:p-0.5 tw:hover:bg-muted"><X className="tw:size-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * ListEditor (spec "Manage czars"): staged add/remove with a diff list, then
 * "Save N changes". `onApply({ added, removed })` runs the calls (in sequence) and resolves
 * to { [item]: true | errorMessage }; failed rows stay staged with their error.
 *   items: current string[]   ·   addControl: ({ add, exclude }) => node (e.g. a UserCombobox)
 *   locked(item) → reason it can't be removed (e.g. "PI"), or falsy
 */
export function ListEditor({ items, addControl, onApply, locked, renderItem = (i) => <span className="tw:font-mono">{i}</span>, emptyLabel = "None yet" }) {
  const [added, setAdded] = useState([]);
  const [removed, setRemoved] = useState([]);
  const [results, setResults] = useState({});
  const [pending, setPending] = useState(false);
  const changes = added.length + removed.length;
  const toggleRemove = (i) => setRemoved((r) => (r.includes(i) ? r.filter((x) => x !== i) : [...r, i]));
  const apply = async () => {
    setPending(true);
    const res = (await onApply({ added, removed })) ?? {};
    setResults(res);
    setAdded((a) => a.filter((i) => res[i] !== true));
    setRemoved((r) => r.filter((i) => res[i] !== true));
    setPending(false);
  };
  return (
    <div className="tw:flex tw:flex-col tw:gap-3">
      <ul className="tw:divide-y tw:rounded-lg tw:border">
        {items.length === 0 && added.length === 0 && <li className="tw:px-3 tw:py-3 tw:text-[13px] tw:text-muted-foreground">{emptyLabel}</li>}
        {items.map((i) => {
          const isRemoved = removed.includes(i);
          const reason = locked?.(i);
          return (
            <li key={i} className="tw:flex tw:h-11 tw:items-center tw:justify-between tw:px-3 tw:text-sm">
              <span className={cn(isRemoved && "tw:text-muted-foreground tw:line-through")}>{renderItem(i)}</span>
              <span className="tw:flex tw:items-center tw:gap-2">
                {typeof results[i] === "string" && <span className="tw:text-xs tw:text-crit-text">{results[i]}</span>}
                {reason ? (
                  <span className="tw:text-xs tw:text-muted-foreground">{reason}</span>
                ) : (
                  <button type="button" aria-label={isRemoved ? `Keep ${i}` : `Remove ${i}`} onClick={() => toggleRemove(i)} className="tw:rounded tw:p-1 tw:text-muted-foreground tw:hover:bg-muted">
                    {isRemoved ? <Plus className="tw:size-3.5" /> : <X className="tw:size-3.5" />}
                  </button>
                )}
              </span>
            </li>
          );
        })}
        {added.map((i) => (
          <li key={`+${i}`} className="tw:flex tw:h-11 tw:items-center tw:justify-between tw:px-3 tw:text-sm tw:text-ok-text">
            <span>+ {renderItem(i)}</span>
            <span className="tw:flex tw:items-center tw:gap-2">
              {typeof results[i] === "string" && <span className="tw:text-xs tw:text-crit-text">{results[i]}</span>}
              <button type="button" aria-label={`Undo add ${i}`} onClick={() => setAdded((a) => a.filter((x) => x !== i))} className="tw:rounded tw:p-1 tw:text-muted-foreground tw:hover:bg-muted"><Minus className="tw:size-3.5" /></button>
            </span>
          </li>
        ))}
      </ul>
      {addControl?.({ add: (i) => !items.includes(i) && !added.includes(i) && setAdded((a) => [...a, i]), exclude: [...items, ...added] })}
      <div className="tw:flex tw:justify-end">
        <Button size="sm" disabled={!changes || pending} onClick={apply}>
          {pending && <Loader2 className="tw:animate-spin" />}
          {changes ? `Save ${changes} change${changes === 1 ? "" : "s"}` : "No changes"}
        </Button>
      </div>
    </div>
  );
}
