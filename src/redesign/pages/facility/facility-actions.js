import { BarChart3, Cpu, Crown, Database, FolderGit2, Link2, Pencil, Text } from "lucide-react";
import { routes } from "../../lib/routes";

/**
 * Dialog keys the facility page opens from ?dialog= (useDialogParam). The /facilities list
 * deep-links with the add-* aliases, which open the same dialogs in "add" mode.
 */
export const DIALOGS = {
  editDescription: "edit-description",
  inviteUsers: "invite-users",
  manageCzars: "manage-czars",
  computePurchase: "compute-purchase",
  storagePurchase: "storage-purchase",
};
export const DIALOG_ALIASES = { "add-compute-purchase": DIALOGS.computePurchase, "add-storage-purchase": DIALOGS.storagePurchase };

/** Why "Add compute purchase" can't be used, or undefined when it can. */
export function computeAddGate(f, allPurchased) {
  if (!f.canEditPurchases) return f.purchaseGate;
  if (allPurchased) return "Every cluster has a purchase — edit one.";
  return undefined;
}

/**
 * Header "…" (spec D2): Edit description… · Manage czars… | Add compute purchase… ·
 * Add storage purchase… (admin; disabled with a reason for czars) | Copy link.
 * `f` is the useFacility() value. Items are `dialog` items the page opens in place.
 */
export function facilityHeaderActions(f, { allPurchased } = {}) {
  return [
    f.canManage && {
      key: "edit",
      items: [
        { key: "desc", label: "Edit description…", icon: Text, dialog: DIALOGS.editDescription },
        f.canManageCzars && { key: "czars", label: "Manage czars…", icon: Crown, dialog: DIALOGS.manageCzars },
      ].filter(Boolean),
    },
    f.canManage && {
      key: "purchases",
      items: [
        { key: "compute", label: "Add compute purchase…", icon: Cpu, dialog: DIALOGS.computePurchase, disabled: computeAddGate(f, allPurchased) },
        { key: "storage", label: "Add storage purchase…", icon: Database, dialog: DIALOGS.storagePurchase, disabled: f.purchaseGate },
      ],
    },
    { key: "copy", items: [{ key: "copy-link", label: "Copy link", icon: Link2, copy: routes.facility(f.name) }] },
  ].filter(Boolean);
}

/** Compute row "…": Edit purchase… (admin) · View cluster usage · View <facility> repos. */
export function computeRowActions(f, clustername) {
  return [
    f.canEditPurchases && {
      key: "edit",
      items: [{ key: "edit", label: "Edit purchase…", icon: Pencil, dialog: DIALOGS.computePurchase, target: clustername }],
    },
    {
      key: "view",
      items: [
        { key: "usage", label: "View cluster usage", icon: BarChart3, href: routes.cluster(clustername) },
        // The repos list can't filter by cluster yet, so this opens the facility's repos.
        { key: "repos", label: `View ${f.name} repos`, icon: FolderGit2, href: routes.repos({ scope: "facilities", facility: f.name }) },
      ],
    },
  ].filter(Boolean);
}

/** Storage row "…": Edit purchase… (admin) · View usage. */
export function storageRowActions(f, p) {
  return [
    f.canEditPurchases && {
      key: "edit",
      items: [{ key: "edit", label: "Edit purchase…", icon: Pencil, dialog: DIALOGS.storagePurchase, target: `${p.storagename}/${p.purpose}` }],
    },
    { key: "view", items: [{ key: "usage", label: "View usage", icon: BarChart3, href: routes.storage(p.storagename, p.purpose) }] },
  ].filter(Boolean);
}
