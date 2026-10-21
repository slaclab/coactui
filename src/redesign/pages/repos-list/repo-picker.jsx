"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Local repo combobox (mirrors the kit UserCombobox look; kit candidate).
 *   options = [{ value, name, facility? }]   value = option.value | "" · onChange(value)
 * `showFacility` adds the facility as a muted hint (pickers spanning facilities).
 */
export function RepoPicker({ options, value, onChange, placeholder = "Choose a repo…", disabled, showFacility = false, id }) {
  const [open, setOpen] = useState(false); // popover open: local UI state
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const results = options.filter((o) => !needle || o.name.toLowerCase().includes(needle)).slice(0, 50);
  const current = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" size="sm" disabled={disabled} className="tw:w-full tw:justify-between tw:font-normal">
          <span className={cn("tw:truncate", current ? "tw:font-mono" : "tw:text-muted-foreground")}>
            {current ? current.name : placeholder}
            {current && showFacility && <span className="tw:ml-2 tw:font-sans tw:text-xs tw:text-muted-foreground">{current.facility}</span>}
          </span>
          <ChevronsUpDown className="tw:opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="tw:w-(--radix-popover-trigger-width) tw:p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={setQuery} placeholder="Search repos…" />
          <CommandList>
            <CommandEmpty>{options.length ? "No repos match." : "No repos available."}</CommandEmpty>
            <CommandGroup>
              {results.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.value}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("tw:size-4", o.value === value ? "tw:opacity-100" : "tw:opacity-0")} />
                  <span className="tw:truncate tw:font-mono">{o.name}</span>
                  {showFacility && o.facility && <span className="tw:ml-auto tw:text-xs tw:text-muted-foreground">{o.facility}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
            {options.length > results.length && results.length === 50 && (
              <div className="tw:px-3 tw:py-2 tw:text-xs tw:text-muted-foreground">Showing 50 of {options.length} — keep typing to narrow</div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
