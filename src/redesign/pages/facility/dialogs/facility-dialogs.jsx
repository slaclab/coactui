"use client";

import { useDialogParam } from "../../../lib/navigation";
import { useFacility } from "../facility-context";
import { DIALOG_ALIASES, DIALOGS } from "../facility-actions";
import { ComputePurchaseDialog } from "./compute-purchase-dialog";
import { EditDescriptionDialog } from "./edit-description-dialog";
import { InviteUsersDialog } from "./invite-users-dialog";
import { ManageCzarsDialog } from "./manage-czars-dialog";
import { StoragePurchaseDialog } from "./storage-purchase-dialog";

/**
 * Mounted once by the facility layout so ?dialog=<key>[&target=…] opens on any tab (deep
 * links from /facilities included). A key the viewer may not use renders nothing.
 */
export function FacilityDialogs() {
  const f = useFacility();
  const { dialog: raw, target, closeDialog } = useDialogParam();
  const dialog = DIALOG_ALIASES[raw] ?? raw;
  const allowed = {
    [DIALOGS.editDescription]: f.canManage,
    [DIALOGS.inviteUsers]: f.canManage,
    [DIALOGS.manageCzars]: f.canManageCzars,
    [DIALOGS.computePurchase]: f.canEditPurchases,
    [DIALOGS.storagePurchase]: f.canEditPurchases,
  };
  const open = (key) => dialog === key && !!allowed[key];
  const onOpenChange = (o) => !o && closeDialog();
  const props = (key) => ({ open: open(key), onOpenChange });
  return (
    <>
      <EditDescriptionDialog {...props(DIALOGS.editDescription)} />
      <InviteUsersDialog {...props(DIALOGS.inviteUsers)} />
      <ManageCzarsDialog {...props(DIALOGS.manageCzars)} />
      <ComputePurchaseDialog {...props(DIALOGS.computePurchase)} target={target} />
      <StoragePurchaseDialog {...props(DIALOGS.storagePurchase)} target={target} />
    </>
  );
}
