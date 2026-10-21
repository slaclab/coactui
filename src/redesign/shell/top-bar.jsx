"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, CircleHelp, Search } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import slacWordmark from "../../images/SLAC_short_white.png";
import { Chip } from "../kit";
import { routes } from "../lib/routes";
import { useAppTheme } from "../providers/theme";
import { useViewer } from "../providers/viewer";
import { MAIN_NAV } from "./nav";
import { useShellSlots } from "./slots";

/**
 * Top bar (Paper "Top Bar", updated design): SLAC red, white-on-red.
 *   Brand (SLAC | TID-SCS lockup · Coact S3DF) · MainNav | SearchButton · HelpButton · UserMenu
 * Colours come from the --topbar-* tokens in globals.css, so a theme can restyle the bar.
 */
export function TopBar() {
  return (
    <header className="tw:sticky tw:top-0 tw:z-40 tw:flex tw:h-13 tw:shrink-0 tw:items-center tw:justify-between tw:border-b tw:border-topbar-border tw:bg-topbar tw:px-6 tw:text-topbar-foreground">
      <div className="tw:flex tw:items-center tw:gap-5">
        <Brand />
        <span className="tw:h-5 tw:w-px tw:bg-topbar-divider" aria-hidden />
        <MainNav />
      </div>
      <TopBarEnd />
    </header>
  );
}

// Focus on red: a white ring (the graphite --ring would vanish against SLAC red).
const onRedFocus = "tw:outline-none tw:focus-visible:ring-2 tw:focus-visible:ring-topbar-foreground/80";

/** Right side: search · help · user menu for account holders; a sign-in hint otherwise. */
function TopBarEnd() {
  const { viewer, registration, loading } = useViewer();
  if (!viewer && !loading) {
    return (
      <div className="tw:flex tw:items-center tw:gap-3 tw:text-[13px] tw:text-topbar-subtle">
        {registration?.eppn ? <span>Signed in as <span className="tw:font-mono tw:text-topbar-foreground">{registration.eppn}</span></span> : null}
        <a href={registration?.eppn ? routes.logout() : routes.login()} className={cn("tw:rounded tw:font-medium tw:text-topbar-foreground tw:no-underline tw:hover:underline", onRedFocus)}>
          {registration?.eppn ? "Sign out" : "Sign in"}
        </a>
      </div>
    );
  }
  return (
    <div className="tw:flex tw:items-center tw:gap-2">
      <SearchButton />
      <HelpButton />
      <UserMenu />
    </div>
  );
}

/** "?" — keyboard shortcuts dialog (spec §3 Keyboard). */
export function HelpButton() {
  const { openShortcuts } = useShellSlots();
  return (
    <button type="button" onClick={openShortcuts} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)" className={cn("tw:flex tw:size-8 tw:items-center tw:justify-center tw:rounded-md tw:text-topbar-subtle tw:hover:bg-topbar-control tw:hover:text-topbar-foreground", onRedFocus)}>
      <CircleHelp className="tw:size-4" />
    </button>
  );
}

/** SLAC | TID-SCS lockup, then "Coact" with the S3DF tag on a shared baseline. */
export function Brand() {
  return (
    <Link href={routes.home()} aria-label="Coact home" className={cn("tw:flex tw:items-center tw:gap-3.5 tw:rounded tw:no-underline", onRedFocus)}>
      <span className="tw:flex tw:h-5 tw:items-center tw:gap-2" aria-label="SLAC TID-SCS">
        <img src={slacWordmark.src} alt="SLAC" className="tw:block tw:h-[15px] tw:w-auto" />
        <span className="tw:h-4 tw:w-px tw:bg-topbar-divider-strong" aria-hidden />
        <span className="tw:text-[18px] tw:leading-5 tw:font-extrabold tw:tracking-[-0.01em] tw:text-topbar-foreground">TID-SCS</span>
      </span>
      <span className="tw:h-5 tw:w-px tw:bg-topbar-divider-strong" aria-hidden />
      <span className="tw:flex tw:items-baseline tw:gap-2">
        <span className="tw:text-base tw:leading-5 tw:font-bold tw:tracking-[-0.01em] tw:text-topbar-foreground">Coact</span>
        <span className="tw:font-mono tw:text-[11px] tw:leading-3.5 tw:font-medium tw:tracking-[0.08em] tw:text-topbar-faint">S3DF</span>
      </span>
    </Link>
  );
}

export function MainNav() {
  const pathname = usePathname();
  const { viewer, can } = useViewer();
  const { badges } = useShellSlots();
  if (!viewer) return null;
  return (
    <nav className="tw:flex tw:items-center tw:gap-1" aria-label="Main">
      {MAIN_NAV.filter((item) => !item.show || item.show(can, viewer)).map((item) => {
        const active = item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
        const badge = item.badge ? badges[item.badge] : null;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "tw:flex tw:h-13 tw:items-center tw:gap-1.5 tw:border-b-2 tw:px-2.5 tw:text-sm tw:leading-5 tw:no-underline",
              onRedFocus,
              active ? "tw:border-topbar-foreground tw:font-semibold tw:text-topbar-foreground" : "tw:border-transparent tw:font-medium tw:text-topbar-muted tw:hover:text-topbar-foreground",
            )}
          >
            {item.label}
            {badge ? (
              <span className="tw:flex tw:h-5 tw:items-center tw:rounded-full tw:bg-topbar-foreground tw:px-1.5 tw:font-mono tw:text-xs tw:font-semibold tw:text-primary-text tw:tabular-nums">{badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Opens the ⌘K palette (spec §3). The palette itself registers via shell slots. */
export function SearchButton() {
  const { openPalette } = useShellSlots();
  return (
    <button
      type="button"
      onClick={openPalette}
      className={cn(
        "tw:flex tw:h-8 tw:w-60 tw:shrink-0 tw:items-center tw:justify-between tw:rounded-md tw:border tw:border-topbar-control-border tw:bg-topbar-control tw:pr-2 tw:pl-2.5 tw:text-[13px] tw:leading-5 tw:text-topbar-subtle tw:hover:bg-topbar-control-hover",
        onRedFocus,
      )}
    >
      <span className="tw:flex tw:items-center tw:gap-2">
        <Search className="tw:size-3.5" strokeWidth={2} /> Search repos, facilities…
      </span>
      <kbd className="tw:flex tw:h-5 tw:items-center tw:rounded tw:bg-topbar-kbd tw:px-1.5 tw:font-sans tw:text-xs tw:font-medium tw:text-topbar-foreground">⌘K</kbd>
    </button>
  );
}

export function UserMenu() {
  const { viewer, can } = useViewer();
  const { theme, setTheme, themes } = useAppTheme();
  const { userMenuItems } = useShellSlots();
  const username = viewer?.username ?? "";
  const role = can.isAdmin ? "Admin" : can.isCzar ? `Czar · ${viewer.czarOf.join(", ")}` : null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn("tw:flex tw:h-8 tw:items-center tw:gap-2 tw:rounded-md tw:pr-2 tw:pl-1 tw:hover:bg-topbar-control tw:data-[state=open]:bg-topbar-control", onRedFocus)}
        aria-label="User menu"
        disabled={!viewer}
      >
        <span className="tw:flex tw:size-6 tw:items-center tw:justify-center tw:rounded-full tw:bg-topbar-foreground tw:text-[11px] tw:font-semibold tw:text-primary-text">{username.slice(0, 2).toUpperCase()}</span>
        <span className="tw:min-w-10 tw:font-mono tw:text-[13px] tw:leading-5 tw:text-topbar-foreground">{username}</span>
        <ChevronDown className="tw:size-3.5 tw:text-topbar-subtle" strokeWidth={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="tw:w-56">
        <DropdownMenuLabel className="tw:flex tw:flex-col tw:gap-1">
          <span className="tw:font-mono">{username}</span>
          {viewer?.fullname && <span className="tw:text-xs tw:font-normal tw:text-muted-foreground">{viewer.fullname}</span>}
          {role && <Chip className="tw:mt-0.5">{role}</Chip>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href={routes.profile()}>My profile</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href={routes.auditTrail()}>My audit trail</Link></DropdownMenuItem>
        {userMenuItems}
        {themes.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="tw:text-xs tw:text-muted-strong">Theme</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              {themes.map((t) => <DropdownMenuRadioItem key={t.value} value={t.value}>{t.label}</DropdownMenuRadioItem>)}
            </DropdownMenuRadioGroup>
          </>
        )}
        <DropdownMenuSeparator />
        {/* Full page load: logout leaves the app for Vouch. */}
        <DropdownMenuItem asChild><a href={routes.logout()}>Log out</a></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
