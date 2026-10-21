import {
  Clock,
  Copy,
  Cpu,
  Crown,
  Database,
  ExternalLink,
  Eye,
  Link2,
  Menu,
  Pencil,
  Server,
  Text,
  UserPlus,
  Users,
} from "lucide-react";
import { routes } from "../lib/routes";

/**
 * One registry for the repo row "…", the peek "…" and the repo page "…" (spec §3, §6), so
 * labels and permission gates can't drift apart. Render with <ActionsMenu groups={…} />.
 *
 *   repoActions(repo, can, { peekHref, context: "row" | "peek" | "page" })
 *
 * `dialog` items are opened by the page through ?dialog=<key>&target=<facility/name>
 * (useDialogParam); the repo page's dialogs live under pages/repo/*. From the list they
 * deep-link to the full page with the dialog open, as the spec says Manage items do.
 */
export function repoActions(repo, can, { peekHref, context = "row" } = {}) {
  const page = (tab, dialog) => `${routes.repo(repo.facility, repo.name, tab)}${dialog ? `?dialog=${dialog}` : ""}`;
  const onPage = context === "page";
  // On the full page, the repo-level dialogs (REPO_PAGE_DIALOGS, mounted by the repo layout on
  // every tab) open in place; tab-owned dialogs (compute/storage) navigate to their tab with
  // ?dialog=. Elsewhere every item navigates to the page with ?dialog=.
  const act = (key, label, icon, tab, dialog) =>
    onPage && REPO_PAGE_DIALOGS.includes(dialog) ? { key, label, icon, dialog } : { key, label, icon, href: page(tab, dialog) };

  const groups = [
    {
      key: "open",
      items: [
        context === "row" && peekHref && { key: "peek", label: "Quick look", icon: Eye, shortcut: "↵", href: peekHref },
        !onPage && { key: "full", label: "Open full page", icon: ExternalLink, href: page() },
      ].filter(Boolean),
      submenu: {
        key: "goto",
        label: "Go to",
        icon: Menu,
        hint: "Members, Compute…",
        items: [
          { key: "members", label: "Members", href: page("members") },
          { key: "compute", label: "Compute", href: page("compute") },
          { key: "storage", label: "Storage", href: page("storage") },
          { key: "groups", label: "Access groups", href: page("groups") },
          { key: "features", label: "Features", href: page("features") },
          { key: "history", label: "History", href: page("history") },
        ],
      },
    },
    can.canEditMembers(repo) && {
      key: "do",
      items: [
        act("add-member", "Add members…", UserPlus, "members", "add-members"),
        act("req-compute", can.canEditAllocation(repo) ? "Edit compute allocation…" : "Request compute change…", Cpu, "compute", "compute-allocation"),
        act("req-storage", can.canEditAllocation(repo) ? "Edit storage allocation…" : "Request storage change…", Database, "storage", "storage-allocation"),
      ],
    },
    can.canManageRepo(repo) && {
      key: "manage",
      label: "Manage",
      hint: can.isAdmin ? "Admin" : `${repo.facility} czar`,
      items: [
        act("change-pi", "Change PI…", Crown, "overview", "change-pi"),
        act("ldap", "Change LDAP group…", Users, "overview", "change-ldap"),
        act("desc", "Edit description…", Text, "overview", "edit-description"),
        act("req", "Set compute requirement…", Clock, "overview", "compute-requirement"),
        act("alloc", "Allocate on another cluster…", Server, "compute", "allocate-cluster"),
        can.canRenameRepo(repo) && act("rename", "Rename repo…", Pencil, "overview", "rename"),
      ].filter(Boolean),
    },
    {
      key: "copy",
      items: [
        { key: "copy-name", label: "Copy repo name", icon: Copy, copy: repo.name },
        { key: "copy-link", label: "Copy link", icon: Link2, copy: page() },
      ],
    },
  ];
  return groups.filter(Boolean).filter((g) => g.items.length || g.submenu);
}

/** Dialog keys the repo layout renders on any tab (pages/repo/core/repo-dialogs.jsx). */
export const REPO_PAGE_DIALOGS = ["add-members", "change-pi", "change-ldap", "edit-description", "compute-requirement", "rename"];

/** Row checkbox: czar of the repo's facility or admin; never `default` rows. */
export const canSelectRepo = (repo, can) => repo.name !== "default" && can.isCzarOf(repo.facility);

/** "Needs attention" facet (spec §6): storage ≥ 80% or compute past 100%. Needs repoUsageSummaries. */
export function needsAttention(repo) {
  const storagePct = repo.storage ? (repo.storage.usedGb / repo.storage.allocatedGb) * 100 : 0;
  return Math.round(storagePct) >= 80 || (repo.compute?.pct ?? 0) > 100;
}
