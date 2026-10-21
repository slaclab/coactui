"use client";

import { useMutation } from "@apollo/client";
import { toast } from "sonner";
import { FormDialog } from "../../../kit";
import { useFacility } from "../facility-context";
import { UPDATE_DESCRIPTION } from "../queries";

const FIELDS = [
  {
    name: "description",
    label: "Description",
    type: "textarea",
    rows: 4,
    helper: (v) => `${(v.description ?? "").length} characters`,
    validate: (v) => (String(v ?? "").trim() ? undefined : "Description can't be empty"),
  },
];

/** Edit description (spec §5 Dialogs): pre-filled textarea with a count; Undo in the toast. */
export function EditDescriptionDialog({ open, onOpenChange }) {
  const { name, facility } = useFacility();
  const previous = facility?.description ?? "";
  const [update] = useMutation(UPDATE_DESCRIPTION);
  const save = (newdescription) =>
    update({ variables: { facility: { name }, newdescription }, refetchQueries: ["FacilityCore"], awaitRefetchQueries: true });

  const onSubmit = async ({ description }) => {
    const text = description.trim();
    if (text === previous) return;
    try {
      await save(text);
    } catch (err) {
      toast.error("Couldn't update description", { description: err.message });
      throw err;
    }
    toast.success("Description updated", {
      action: { label: "Undo", onClick: () => toast.promise(save(previous), { loading: "Restoring…", success: "Description restored", error: (e) => e.message }) },
    });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit description"
      description={`Shown on the ${name} page and in the facilities list.`}
      fields={FIELDS}
      initialValues={{ description: previous }}
      onSubmit={onSubmit}
    />
  );
}
