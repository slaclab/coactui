import { Cpu, Crown, Database, ExternalLink, FolderGit2, Inbox, Link2, Text, UserPlus } from "lucide-react";
import { routes } from "../../lib/routes";

/** Dialog keys the facility page opens from ?dialog= (owned by the facility group). */
export const FACILITY_DIALOGS = {
  inviteUsers: "invite-users",
  manageCzars: "manage-czars",
  editDescription: "edit-description",
  addComputePurchase: "add-compute-purchase",
  addStoragePurchase: "add-storage-purchase",
};

/**
 * One registry for the facility card "…", the table row "…" and (later) the facility page "…"
 * (spec §4 "… menu"), so labels and gates can't drift apart. Render with <ActionsMenu groups />.
 *
 *   facilityActions({ name, pending }, can, { context: "card" | "row" | "page" })
 *
 * Off the facility page, dialog items deep-link to it with ?dialog=<key>; on the page
 * (context "page") they become `dialog` items the page opens in place via useDialogParam.
 * Candidate for promotion to src/redesign/actions/facility-actions.js.
 */
export function facilityActions(facility, can, { context = "card" } = {}) {
  const { name } = facility;
  const onPage = context === "page";
  const act = (key, label, icon, dialog, extra) =>
    onPage ? { key, label, icon, dialog, ...extra } : { key, label, icon, href: `${routes.facility(name)}?dialog=${dialog}`, ...extra };

  const manage = can.isCzarOf(name);
  const purchaseGate = can.canEditPurchases() ? undefined : "Only admins can change purchases";

  return [
    {
      key: "open",
      items: [
        !onPage && { key: "open", label: "Open", icon: ExternalLink, href: routes.facility(name) },
        // Admins have no "facilities" scope on /repos/info (only mine | all).
        { key: "repos", label: "View repos", icon: FolderGit2, href: routes.repos({ scope: can.isAdmin ? "all" : "facilities", facility: name }) },
        {
          key: "requests",
          label: "Review requests",
          icon: Inbox,
          href: routes.requests({ facilityname: name }),
          shortcut: facility.pending ? String(facility.pending) : undefined,
        },
      ].filter(Boolean),
    },
    manage && {
      key: "people",
      items: [
        act("invite", "Invite users…", UserPlus, FACILITY_DIALOGS.inviteUsers),
        can.canManageCzars(name) && act("czars", "Manage czars…", Crown, FACILITY_DIALOGS.manageCzars),
        act("description", "Edit description…", Text, FACILITY_DIALOGS.editDescription),
      ].filter(Boolean),
    },
    manage && {
      key: "purchases",
      items: [
        act("compute-purchase", "Add compute purchase…", Cpu, FACILITY_DIALOGS.addComputePurchase, { disabled: purchaseGate }),
        act("storage-purchase", "Add storage purchase…", Database, FACILITY_DIALOGS.addStoragePurchase, { disabled: purchaseGate }),
      ],
    },
    { key: "copy", items: [{ key: "copy-link", label: "Copy link", icon: Link2, copy: routes.facility(name) }] },
  ].filter(Boolean);
}
