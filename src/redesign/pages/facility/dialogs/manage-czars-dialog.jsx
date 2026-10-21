"use client";

import { useState } from "react";
import { useApolloClient, useMutation } from "@apollo/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog, ListEditor, UserCombobox } from "../../../kit";
import { useViewer } from "../../../providers/viewer";
import { useFacility } from "../facility-context";
import { ADD_CZAR, REMOVE_CZAR } from "../queries";

/**
 * Manage czars (spec §5): staged adds/removes in the kit ListEditor, "Save N changes", calls in
 * sequence (adds, then removes). Removing yourself asks first. Failed rows stay staged.
 */
export function ManageCzarsDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <ManageCzarsBody onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function ManageCzarsBody({ onClose }) {
  const { name, facility } = useFacility();
  const { viewer } = useViewer();
  const me = viewer?.username;
  const [addCzar] = useMutation(ADD_CZAR);
  const [removeCzar] = useMutation(REMOVE_CZAR);
  const client = useApolloClient();
  // subjectFacilities (AppViewer) changes when the viewer adds or removes themselves.
  const refetch = () => client.refetchQueries({ include: ["FacilityCore", "AppViewer"] });
  // Pending self-removal confirmation: holds the resolver ListEditor's onApply is waiting on.
  const [confirm, setConfirm] = useState(null);
  const fullname = Object.fromEntries((facility.czarObjs ?? []).map((c) => [c.username, c.fullname]));

  const onApply = async ({ added, removed }) => {
    if (removed.includes(me)) {
      const ok = await new Promise((resolve) => setConfirm({ resolve }));
      setConfirm(null);
      if (!ok) return {};
    }
    const vars = (username) => ({ variables: { facility: { name }, user: { username } } });
    const results = {};
    for (const [list, run] of [[added, addCzar], [removed, removeCzar]]) {
      for (const u of list) {
        try {
          await run(vars(u));
          results[u] = true;
        } catch (err) {
          results[u] = err.message;
        }
      }
    }
    const ok = Object.values(results).filter((r) => r === true).length;
    const total = added.length + removed.length;
    if (ok) await refetch();
    if (ok === total) toast.success(`Saved ${ok} czar change${ok === 1 ? "" : "s"}`);
    else toast.error(`Saved ${ok} of ${total} changes`, { description: "Failed rows are still staged with their error." });
    return results;
  };

  return (
    <DialogContent className="tw:sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Manage czars · {name}</DialogTitle>
        <DialogDescription>Czars manage repos, members, allocations and requests in {name}. Changes apply when you save.</DialogDescription>
      </DialogHeader>
      <ListEditor
        items={facility.czars ?? []}
        emptyLabel="No czars assigned"
        renderItem={(u) => (
          <span className="tw:flex tw:items-baseline tw:gap-2">
            <span className="tw:font-mono">{u}</span>
            {(fullname[u] || u === me) && (
              <span className="tw:text-xs tw:text-muted-foreground">{[fullname[u], u === me && "you"].filter(Boolean).join(" · ")}</span>
            )}
          </span>
        )}
        addControl={({ add, exclude }) => <UserCombobox value={null} onChange={add} exclude={exclude} placeholder="Add czar — search by username…" />}
        onApply={onApply}
      />
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>Done</Button>
      </DialogFooter>
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && confirm?.resolve(false)}
        title={`Remove yourself as a czar of ${name}?`}
        description="You'll lose czar access to this facility as soon as the change is saved. Another czar or an admin would have to add you back."
        confirmLabel="Remove me"
        destructive
        onConfirm={async () => confirm?.resolve(true)}
      />
    </DialogContent>
  );
}
