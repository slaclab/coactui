"use client";

import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";

import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Skeleton } from "../../kit";

/*
 * Shared frame for the shell's command-style dialogs (⌘K palette, Impersonate user), after
 * Paper "Panel: Command palette": w-130 card, h-13 search row, 12px group headings,
 * h-9 rows with a muted selected state, and a h-9 muted footer of hints.
 * Filtering is always done by the caller (shouldFilter=false) so results are derived data.
 */
export function PaletteDialog({ open, onOpenChange, title, description, children }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="tw:top-[14vh] tw:w-130 tw:max-w-[calc(100%-2rem)] tw:translate-y-0 tw:gap-0 tw:overflow-hidden tw:rounded-xl tw:border tw:p-0 tw:shadow-2xl tw:sm:max-w-130"
      >
        <DialogTitle className="tw:sr-only">{title}</DialogTitle>
        <DialogDescription className="tw:sr-only">{description}</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/** Search row + result list + footer. `query`/`onQueryChange` are the caller's local input state. */
export function PaletteBody({ query, onQueryChange, placeholder, label, footer, children }) {
  return (
    <Command shouldFilter={false} loop label={label} className="tw:rounded-none tw:bg-background">
      <div className="tw:flex tw:h-13 tw:shrink-0 tw:items-center tw:gap-2.5 tw:border-b tw:px-4">
        <Search className="tw:size-4 tw:shrink-0 tw:text-muted-foreground" aria-hidden />
        <CommandPrimitive.Input
          autoFocus
          value={query}
          onValueChange={onQueryChange}
          placeholder={placeholder}
          className="tw:h-full tw:w-full tw:bg-transparent tw:text-[15px] tw:leading-5.5 tw:text-foreground tw:outline-none tw:placeholder:text-muted-foreground"
        />
      </div>
      <CommandList className="tw:max-h-[min(420px,60vh)] tw:p-2">{children}</CommandList>
      {footer && <PaletteFooter>{footer}</PaletteFooter>}
    </Command>
  );
}

export function PaletteGroup({ heading, children, className }) {
  return (
    <CommandGroup
      heading={heading}
      className={cn(
        "tw:p-0 tw:[&_[cmdk-group-heading]]:px-2 tw:[&_[cmdk-group-heading]]:pt-2.5 tw:[&_[cmdk-group-heading]]:pb-1.5 tw:[&_[cmdk-group-heading]]:text-xs tw:[&_[cmdk-group-heading]]:leading-4 tw:[&_[cmdk-group-heading]]:font-medium tw:[&_[cmdk-group-heading]]:text-muted-strong",
        className,
      )}
    >
      {children}
    </CommandGroup>
  );
}

/** One h-9 row: `children` on the left, `meta` (12px muted) on the right. */
export function PaletteItem({ value, onSelect, children, meta, icon: Icon }) {
  return (
    <CommandItem
      value={value}
      onSelect={onSelect}
      className="tw:h-9 tw:justify-between tw:gap-3 tw:rounded-sm tw:px-2 tw:py-0 tw:text-[13px] tw:leading-5 tw:text-foreground tw:data-[selected=true]:bg-muted tw:data-[selected=true]:text-foreground"
    >
      <span className="tw:flex tw:min-w-0 tw:flex-1 tw:items-center tw:gap-2">
        {Icon && <Icon className="tw:size-3.5 tw:text-muted-foreground" aria-hidden />}
        {children}
      </span>
      {meta && <span className="tw:max-w-[45%] tw:shrink-0 tw:truncate tw:text-xs tw:leading-4 tw:text-muted-foreground">{meta}</span>}
    </CommandItem>
  );
}

/** Centered note inside the list (hints, empty results). */
export function PaletteNote({ children }) {
  return <div className="tw:px-3 tw:py-6 tw:text-center tw:text-[13px] tw:text-muted-foreground">{children}</div>;
}

/** Loading rows inside a group, shaped like PaletteItem. */
export function PaletteSkeleton({ rows = 3 }) {
  return Array.from({ length: rows }, (_, i) => (
    <div key={i} className="tw:flex tw:h-9 tw:items-center tw:justify-between tw:px-2" aria-hidden>
      <Skeleton className="tw:h-3.5 tw:w-44" />
      <Skeleton className="tw:h-3 tw:w-20" />
    </div>
  ));
}

export function PaletteFooter({ children }) {
  return (
    <div className="tw:flex tw:h-9 tw:shrink-0 tw:items-center tw:gap-4 tw:border-t tw:bg-muted/60 tw:px-4 tw:text-xs tw:leading-4 tw:text-muted-foreground">
      {children}
    </div>
  );
}
