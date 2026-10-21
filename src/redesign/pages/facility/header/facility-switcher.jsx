"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FACILITY_TABS, routes } from "../../../lib/routes";
import { useViewer } from "../../../providers/viewer";
import { useFacility } from "../facility-context";

/**
 * D1 breadcrumb switcher "LCLS ⌄": alphabetical, searchable. Keeps the current tab. Admins
 * see every facility, czars the ones they manage; anyone else gets a plain crumb.
 */
export function FacilitySwitcher({ name }) {
  const [open, setOpen] = useState(false); // popover open: local UI state
  const router = useRouter();
  const pathname = usePathname();
  const { viewer, can } = useViewer();
  const { names } = useFacility(); // loaded once by FacilityProvider (browser only)
  const options = (names ?? []).filter((n) => can.isAdmin || viewer?.czarOf.includes(n));
  const tab = FACILITY_TABS.find((t) => t !== "overview" && pathname.endsWith(`/${t}`));

  if (!can.isAdmin && !viewer?.czarOf.length) return <span className="tw:text-foreground">{name}</span>;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`${name} — switch facility`}
        className="tw:-my-0.5 tw:flex tw:h-6 tw:items-center tw:gap-1 tw:rounded-sm tw:bg-muted tw:px-1.5 tw:font-medium tw:text-foreground tw:hover:bg-neutral-bg tw:data-[state=open]:bg-neutral-bg"
      >
        {name}
        <ChevronsUpDown className="tw:size-3 tw:text-muted-strong" />
      </PopoverTrigger>
      <PopoverContent align="start" className="tw:w-60 tw:p-0">
        <Command>
          <CommandInput placeholder="Find facility…" />
          <CommandList>
            <CommandEmpty>No facilities found.</CommandEmpty>
            <CommandGroup>
              {options.map((n) => (
                <CommandItem
                  key={n}
                  value={n}
                  onSelect={() => {
                    setOpen(false);
                    if (n !== name) router.push(routes.facility(n, tab));
                  }}
                >
                  <Check className={cn("tw:size-4", n === name ? "tw:opacity-100" : "tw:opacity-0")} />
                  {n}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
