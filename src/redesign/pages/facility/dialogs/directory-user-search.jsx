"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import { Check, Loader2, Search } from "lucide-react";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDebounced } from "../../../kit";
import { INVITE_LOOKUP } from "../queries";

/**
 * Multi-select search over the SLAC directory (usersLookupFromService), for people who may not
 * have a Coact account yet. Runs the username / full name / email lookups in parallel,
 * debounced 300 ms, and de-duplicates by username.
 *   selected = [{ username, fullname, preferredemail }]; onToggle(user)
 * Kit candidate: DirectoryUserCombobox next to UserCombobox.
 */
export function DirectoryUserSearch({ selected, onToggle, disabled }) {
  const [query, setQuery] = useState(""); // typed text: local UI state
  const [open, setOpen] = useState(false);
  const q = useDebounced(query.trim());
  const skip = q.length < 2;
  const byUsername = useQuery(INVITE_LOOKUP, { skip, variables: { filter: { username: q } } });
  const byName = useQuery(INVITE_LOOKUP, { skip, variables: { filter: { fullname: q } } });
  const byEmail = useQuery(INVITE_LOOKUP, { skip, variables: { filter: { preferredemail: q } } });
  const lookups = [byUsername, byName, byEmail];
  const loading = !skip && lookups.some((l) => l.loading);
  const failed = !skip && lookups.every((l) => l.error) ? lookups[0].error : null;

  const results = useMemo(() => {
    const seen = new Map();
    for (const l of lookups) for (const u of l.data?.usersLookupFromService ?? []) if (u?.username && !seen.has(u.username)) seen.set(u.username, u);
    return [...seen.values()].slice(0, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byUsername.data, byName.data, byEmail.data]);
  const isSelected = (u) => selected.some((s) => s.username === u.username);

  return (
    <Popover open={open && !skip} onOpenChange={setOpen}>
      <Command shouldFilter={false} className="tw:overflow-visible tw:bg-transparent">
        <PopoverAnchor asChild>
          <div className="tw:rounded-md tw:border tw:bg-primary-foreground tw:focus-within:ring-2 tw:focus-within:ring-ring/40 tw:[&_[data-slot=command-input-wrapper]]:border-b-0">
            <CommandInput
              value={query}
              onValueChange={(v) => { setQuery(v); setOpen(true); }}
              onFocus={() => setOpen(true)}
              disabled={disabled}
              placeholder="Search by name, username or email"
              aria-label="Search people to invite"
            />
          </div>
        </PopoverAnchor>
        <PopoverContent align="start" className="tw:w-(--radix-popover-trigger-width) tw:p-0" onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.target.closest?.("[data-slot=popover-anchor]") && e.preventDefault()}
        >
          <CommandList>
            {loading ? (
              <div className="tw:flex tw:items-center tw:justify-center tw:gap-2 tw:py-6 tw:text-xs tw:text-muted-foreground">
                <Loader2 className="tw:size-4 tw:animate-spin" /> Searching…
              </div>
            ) : failed ? (
              <div className="tw:px-3 tw:py-6 tw:text-center tw:text-xs tw:text-crit-text">Directory lookup failed — {failed.message}</div>
            ) : (
              <>
                <CommandEmpty>
                  <span className="tw:flex tw:items-center tw:justify-center tw:gap-1.5"><Search className="tw:size-3.5" /> No people match “{q}”</span>
                </CommandEmpty>
                <CommandGroup>
                  {results.map((u) => (
                    <CommandItem key={u.username} value={u.username} onSelect={() => onToggle(u)}>
                      <Check className={cn("tw:size-4", isSelected(u) ? "tw:opacity-100" : "tw:opacity-0")} />
                      <span className="tw:truncate">{u.fullname || u.username}</span>
                      <span className="tw:ml-auto tw:font-mono tw:text-xs tw:text-muted-foreground">{u.username}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </PopoverContent>
      </Command>
    </Popover>
  );
}
