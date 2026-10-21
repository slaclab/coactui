"use client";

import { ConfirmDialog } from "../../../../kit";
import { deleteConsequence } from "./feature-copy";

/** "Turn off slurm?" (Paper "Confirmations + toast", 1). */
export function DisableFeatureConfirm({ open, onClose, feature, repoName, onConfirm }) {
  if (!feature) return null;
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`Turn off ${feature.name}?`}
      description={
        feature.name === "slurm"
          ? `While slurm is off, the next compute-allocation change for ${repoName} removes its Slurm account and its users on that cluster. Nothing changes until then.`
          : `coactd stops applying ${feature.name} on this repo’s next membership change.`
      }
      confirmLabel="Turn off"
      onConfirm={() => onConfirm({ ...feature, state: false })}
    >
      <p className="tw:text-[13px] tw:text-muted-foreground">Logged as a RepoUpdateFeature request and an audit entry.</p>
    </ConfirmDialog>
  );
}

/** "Delete posixgroup?" with the exact stored value (Paper "Confirmations + toast", 2). */
export function DeleteFeatureConfirm({ open, onClose, feature, onConfirm }) {
  if (!feature) return null;
  const options = feature.options ?? [];
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`Delete ${feature.name}?`}
      description={deleteConsequence(feature)}
      confirmLabel="Delete feature"
      destructive
      onConfirm={() => onConfirm(feature.name)}
    >
      <div className="tw:flex tw:flex-col tw:gap-2">
        <span className="tw:text-[11px] tw:font-semibold tw:tracking-[0.06em] tw:text-muted-strong tw:uppercase">Stored value</span>
        <dl className="tw:flex tw:flex-col tw:gap-2.5 tw:rounded-lg tw:border tw:bg-muted tw:px-3.5 tw:py-3 tw:font-mono tw:text-xs">
          <div className="tw:flex tw:gap-6">
            <dt className="tw:w-20 tw:text-muted-strong">state</dt>
            <dd>{String(!!feature.state)}</dd>
          </div>
          {options.length === 0 ? (
            <div className="tw:flex tw:gap-6">
              <dt className="tw:w-20 tw:text-muted-strong">options</dt>
              <dd>[]</dd>
            </div>
          ) : (
            options.map((o, i) => (
              <div key={i} className="tw:flex tw:flex-col tw:gap-0.5">
                <dt className="tw:text-muted-strong">options[{i}]</dt>
                <dd className="tw:break-all tw:whitespace-pre-wrap">{o}</dd>
              </div>
            ))
          )}
        </dl>
        <p className="tw:text-xs tw:text-muted-foreground">Logged as a RepoUpdateFeature request and an audit entry, which keeps this value.</p>
      </div>
    </ConfirmDialog>
  );
}
