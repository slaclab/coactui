"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useNavBadges } from "./features/badges";
import { CommandPalette } from "./features/command-palette";
import { ImpersonateDialog, ImpersonationMenuItems } from "./features/impersonation";
import { ShortcutsDialog, ShortcutsMenuItem, useGlobalShortcuts } from "./features/shortcuts";

/*
 * Extension points of the shell. The top bar renders them; the features live in
 * shell/features/* so they can be built without touching top-bar.jsx:
 *   badges          { requests: 7 }         ← useNavBadges()              (features/badges.js)
 *   userMenuItems   <DropdownMenuItem>s     ← impersonation + shortcuts   (features/impersonation.jsx, shortcuts.jsx)
 *   openPalette()   opens <CommandPalette>  ← ⌘K, "/" fallback, top-bar search (features/command-palette.jsx)
 *   openShortcuts() opens <ShortcutsDialog> ← "?", user menu            (features/shortcuts.jsx)
 *   openImpersonate() opens <ImpersonateDialog>                          (features/impersonation.jsx)
 */
const SlotsContext = createContext(null);

export function ShellSlotsProvider({ children }) {
  // UI-only: which shell dialog is open (null | "palette" | "impersonate" | "shortcuts").
  // One value, so at most one shell dialog is ever open.
  const [dialog, setDialog] = useState(null);
  const openPalette = useCallback(() => setDialog("palette"), []);
  const openShortcuts = useCallback(() => setDialog("shortcuts"), []);
  const openImpersonate = useCallback(() => setDialog("impersonate"), []);
  const togglePalette = useCallback(() => setDialog((d) => (d === "palette" ? null : "palette")), []);
  const openChange = (name) => (open) => setDialog(open ? name : null);
  const badges = useNavBadges();

  useGlobalShortcuts({ togglePalette, openPalette, openShortcuts });

  const value = useMemo(
    () => ({
      badges,
      openPalette,
      openShortcuts,
      openImpersonate,
      userMenuItems: (
        <>
          <ImpersonationMenuItems onImpersonate={openImpersonate} />
          <DropdownMenuSeparator />
          <ShortcutsMenuItem onSelect={openShortcuts} />
        </>
      ),
    }),
    [badges, openPalette, openShortcuts, openImpersonate],
  );
  return (
    <SlotsContext.Provider value={value}>
      {children}
      <CommandPalette open={dialog === "palette"} onOpenChange={openChange("palette")} />
      <ImpersonateDialog open={dialog === "impersonate"} onOpenChange={openChange("impersonate")} />
      <ShortcutsDialog open={dialog === "shortcuts"} onOpenChange={openChange("shortcuts")} />
    </SlotsContext.Provider>
  );
}

const NOOP = () => {};
export function useShellSlots() {
  return useContext(SlotsContext) ?? { badges: {}, openPalette: NOOP, openShortcuts: NOOP, openImpersonate: NOOP, userMenuItems: null };
}
