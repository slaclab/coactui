"use client";

import { useMutation } from "@apollo/client";
import { FormDialog } from "../../../kit";
import { useFacility } from "../facility-context";
import { STORAGE_PURCHASE, useStorageOptions } from "../queries";

const isNum = (v) => v !== "" && v != null && Number.isFinite(Number(v));

/**
 * Add / edit a storage purchase (admin only; spec §5). ?target=<storagename>/<purpose> edits;
 * no target adds. The input is TB; the API stores GB (×1000, as in legacy).
 */
export function StoragePurchaseDialog({ open, onOpenChange, target }) {
  const { name, facility } = useFacility();
  const opts = useStorageOptions();
  const [save] = useMutation(STORAGE_PURCHASE);
  const purchases = facility?.storagepurchases ?? [];
  const [tStorage, tPurpose] = (target ?? "").split("/");
  const existing = purchases.find((p) => p.storagename === tStorage && p.purpose === tPurpose);
  const editing = !!existing;
  // storagenames omits names already used by purchases (e.g. sdfscratch), so merge them in.
  const storagenames = [...new Set([...opts.storagenames, ...purchases.map((p) => p.storagename).filter(Boolean)])].sort();
  const taken = new Set(purchases.map((p) => `${p.storagename}/${p.purpose}`));

  const fields = [
    !editing && {
      name: "purpose",
      label: "Purpose",
      type: "select",
      required: true,
      placeholder: opts.loading ? "Loading…" : "Choose a purpose…",
      options: opts.storagepurposes.map((p) => ({ value: p, label: p })),
    },
    !editing && {
      name: "storagename",
      label: "Storage",
      type: "select",
      required: true,
      placeholder: opts.loading ? "Loading…" : "Choose a storage…",
      options: storagenames.map((s) => ({ value: s, label: s })),
      validate: (v, values) => (v && values.purpose && taken.has(`${v}/${values.purpose}`) ? `${name} already has ${v} · ${values.purpose} — edit it from its row instead` : undefined),
    },
    {
      name: "tb",
      label: "Purchased",
      type: "number",
      min: 0,
      step: "any",
      suffix: "TB",
      required: true,
      helper: "Decimal terabytes (1 TB = 1,000 GB).",
      validate: (v) => (!isNum(v) ? "Enter a size in TB" : Number(v) < 0 ? "Size can't be negative" : undefined),
    },
  ].filter(Boolean);

  const onSubmit = (values) =>
    save({
      variables: {
        facility: { name },
        purpose: editing ? existing.purpose : values.purpose,
        storagename: editing ? existing.storagename : values.storagename,
        purchase: Number(values.tb) * 1000,
      },
      refetchQueries: ["FacilityCore"],
      awaitRefetchQueries: true,
    });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? `${existing.storagename} · ${existing.purpose} · storage purchase` : "Add storage purchase"}
      description={editing ? `Change ${name}'s purchased storage.` : `Purchase storage for ${name}.`}
      fields={fields}
      initialValues={editing ? { tb: String(existing.purchased / 1000) } : {}}
      submitLabel={editing ? "Save purchase" : "Add purchase"}
      onSubmit={onSubmit}
      toastMessages={{ loading: "Saving purchase…", success: "Storage purchase saved" }}
    />
  );
}
