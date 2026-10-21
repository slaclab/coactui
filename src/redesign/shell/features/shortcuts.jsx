"use client";

import { useEffect, useId } from "react";
import { Keyboard } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem, DropdownMenuShortcut } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Kbd } from "../../kit";
import { createLocalStore } from "./local-store";

/** Every shortcut the app documents, grouped for the "?" dialog. */
export const SHORTCUTS = [
  {
    group: "Global",
    items: [
      { keys: ["⌘", "K"], label: "Open the command palette", always: true },
      { keys: ["/"], label: "Focus the page search" },
      { keys: ["?"], label: "Show keyboard shortcuts" },
    ],
  },
  {
    group: "Tables",
    items: [
      { keys: ["j"], label: "Next row" },
      { keys: ["k"], label: "Previous row" },
      { keys: ["↵"], label: "Open the row’s peek" },
      { keys: ["Esc"], label: "Clear selection", always: true },
    ],
  },
];

// "true" / "false"; default on. Read through useSyncExternalStore — no useState copy.
const singleKeyStore = createLocalStore("coact:single-key-shortcuts", { fallback: "true" });

/** [enabled, setEnabled] for single-key shortcuts ("/", "?", table j/k/↵). WCAG 2.1.4. */
export function useSingleKeyShortcuts() {
  const enabled = singleKeyStore.useValue() !== "false";
  return [enabled, (on) => singleKeyStore.set(on ? "true" : "false")];
}

/** Non-hook read for event handlers. */
export const singleKeyShortcutsEnabled = () => singleKeyStore.get() !== "false";

const isTypingTarget = (el) =>
  !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.closest?.("[contenteditable=''],[contenteditable='true']"));

const overlayOpen = () => !!document.querySelector("[role='dialog'][data-state='open'],[role='alertdialog'][data-state='open'],[role='menu'][data-state='open'],[role='listbox'][data-state='open']");

/** The page's own search box: kit SearchInput (data-page-search, once added) or a filter input in <main>. */
function findPageSearch() {
  return (
    document.querySelector("main [data-page-search]") ??
    [...document.querySelectorAll("main input[placeholder]")].find((el) => /filter|search/i.test(el.placeholder) && !el.disabled && el.offsetParent !== null) ??
    null
  );
}

/**
 * Global key handling for the shell:
 *   ⌘K / Ctrl+K — toggle the palette (always)
 *   /          — focus the page search, or open the palette when there is none
 *   ?          — open the shortcuts dialog
 * Single keys fire only when enabled, outside text fields, with no dialog/menu open.
 */
export function useGlobalShortcuts({ togglePalette, openPalette, openShortcuts }) {
  // Pass stable callbacks (useCallback); the listener is re-bound only if they change.
  useEffect(() => {
    const h = { togglePalette, openPalette, openShortcuts };
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        h.togglePalette();
        return;
      }
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (e.key !== "/" && e.key !== "?") return;
      if (!singleKeyShortcutsEnabled() || isTypingTarget(e.target) || overlayOpen()) return;
      e.preventDefault();
      if (e.key === "?") return h.openShortcuts();
      const search = findPageSearch();
      if (search) {
        search.focus();
        search.select?.();
      } else h.openPalette();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [togglePalette, openPalette, openShortcuts]);
}

function KeyCombo({ keys }) {
  return (
    <span className="tw:flex tw:items-center tw:gap-1">
      {keys.map((k) => <Kbd key={k} className="tw:min-w-5 tw:justify-center tw:font-mono">{k}</Kbd>)}
    </span>
  );
}

/** "?" dialog: the shortcut list and the "Enable single-key shortcuts" preference. */
export function ShortcutsDialog({ open, onOpenChange }) {
  const [enabled, setEnabled] = useSingleKeyShortcuts();
  const switchId = useId();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="tw:gap-5 tw:sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="tw:flex tw:items-center tw:gap-2 tw:text-base"><Keyboard className="tw:size-4 tw:text-muted-foreground" /> Keyboard shortcuts</DialogTitle>
          <DialogDescription className="tw:text-[13px]">Shortcuts never fire while you are typing in a field.</DialogDescription>
        </DialogHeader>
        {SHORTCUTS.map((section) => (
          <section key={section.group} className="tw:flex tw:flex-col tw:gap-1">
            <h3 className="tw:pb-1 tw:text-xs tw:font-medium tw:text-muted-strong">{section.group}</h3>
            <ul className="tw:flex tw:flex-col">
              {section.items.map((s) => (
                <li key={s.label} className="tw:flex tw:h-8 tw:items-center tw:justify-between tw:gap-4 tw:border-b tw:text-[13px] tw:last:border-b-0">
                  <span className={enabled || s.always ? "tw:text-foreground" : "tw:text-muted-foreground tw:line-through"}>{s.label}</span>
                  <KeyCombo keys={s.keys} />
                </li>
              ))}
            </ul>
          </section>
        ))}
        <div className="tw:flex tw:items-start tw:justify-between tw:gap-4 tw:rounded-lg tw:border tw:bg-muted/40 tw:px-3.5 tw:py-3">
          <div className="tw:flex tw:flex-col tw:gap-0.5">
            <Label htmlFor={switchId} className="tw:text-[13px] tw:font-medium">Enable single-key shortcuts</Label>
            <p className="tw:text-xs tw:text-muted-foreground">
              {enabled ? "/, ? and the table keys (j, k, ↵) are on." : "/ and ? and table keys (j, k, ↵) are off; ⌘K still works."}
            </p>
          </div>
          <Switch id={switchId} checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** User-menu entry, so the dialog is reachable with single keys off. */
export function ShortcutsMenuItem({ onSelect }) {
  return (
    <DropdownMenuItem onSelect={() => onSelect?.()}>
      <Keyboard /> Keyboard shortcuts
      <DropdownMenuShortcut>?</DropdownMenuShortcut>
    </DropdownMenuItem>
  );
}
