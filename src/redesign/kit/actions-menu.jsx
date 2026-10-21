"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Renders an actions registry (see src/redesign/actions/*) as a dropdown. One registry per
 * entity drives the row "…", the peek "…" and the page "…" (spec §3), so labels and gates
 * can't drift apart.
 *
 * groups = [{ key, label?, hint?, items: [item], submenu?: { label, icon, hint, items } }]
 * item   = { key, label, icon?, shortcut?, disabled?: string (reason),
 *            href?        → router.push(href)
 *            copy?        → clipboard (paths starting with "/" get the origin)
 *            dialog?      → onDialog(dialog, item)   (pages open it via ?dialog=)
 *            onSelect?    → custom
 *            destructive? → red text }
 */
export function ActionsMenu({ groups, onDialog, label = "Actions", trigger = "icon", align = "end", className }) {
  const router = useRouter();
  const run = (item) => {
    if (item.onSelect) return item.onSelect();
    if (item.href) return router.push(item.href, { scroll: false });
    if (item.copy != null) {
      const text = item.copy.startsWith("/") ? `${window.location.origin}${item.copy}` : item.copy;
      return navigator.clipboard?.writeText(text).then(() => toast.success("Copied", { description: text }));
    }
    if (item.dialog) return onDialog?.(item.dialog, item);
  };
  return (
    <DropdownMenu>
      {trigger === "icon" ? (
        <DropdownMenuTrigger className={cn("tw:flex tw:size-8 tw:items-center tw:justify-center tw:rounded-sm tw:text-muted-foreground tw:hover:bg-muted tw:data-[state=open]:bg-muted", className)}>
          <MoreHorizontal className="tw:size-4" />
          <span className="tw:sr-only">{label}</span>
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      )}
      <DropdownMenuContent align={align} className="tw:w-62">
        {groups.map((group, gi) => (
          <DropdownMenuGroup key={group.key}>
            {gi > 0 && <DropdownMenuSeparator />}
            {group.label && (
              <DropdownMenuLabel className="tw:flex tw:h-7 tw:items-center tw:justify-between tw:px-2 tw:py-0 tw:text-xs tw:font-medium tw:text-muted-strong">
                {group.label}
                {group.hint && <span className="tw:font-normal tw:text-muted-foreground">{group.hint}</span>}
              </DropdownMenuLabel>
            )}
            {group.items.map((item) => (
              <DropdownMenuItem
                key={item.key}
                disabled={!!item.disabled}
                title={typeof item.disabled === "string" ? item.disabled : undefined}
                onSelect={() => run(item)}
                className={cn("tw:h-8 tw:gap-2", item.destructive && "tw:text-crit-text")}
              >
                {item.icon && <item.icon className="tw:size-4 tw:text-muted-strong" strokeWidth={1.8} />}
                {item.label}
                {item.shortcut && <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>}
              </DropdownMenuItem>
            ))}
            {group.submenu && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="tw:h-8 tw:gap-2">
                  {group.submenu.icon && <group.submenu.icon className="tw:size-4 tw:text-muted-strong" strokeWidth={1.8} />}
                  {group.submenu.label}
                  {group.submenu.hint && <span className="tw:ml-auto tw:text-xs tw:text-muted-foreground">{group.submenu.hint}</span>}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="tw:w-44">
                  {group.submenu.items.map((item) => (
                    <DropdownMenuItem key={item.key} onSelect={() => run(item)} className="tw:h-8">{item.label}</DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
