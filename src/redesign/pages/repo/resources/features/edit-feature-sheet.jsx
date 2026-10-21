"use client";

import { useState } from "react";
import { Info, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { emptyIndices, hasLintWarnings, lintsFeature } from "./option-lint";
import { OptionsEditor } from "./options-editor";

/** ?dialog=edit-feature&target=<name> (Paper "Edit options" side panel). Admin only. */
export function EditFeatureSheet({ open, onClose, feature, onSave }) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="tw:flex tw:w-full tw:flex-col tw:gap-0 tw:p-0 tw:sm:max-w-140">
        {open && feature && <EditBody key={feature.name} feature={feature} onSave={onSave} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function summarize(before, after) {
  const added = after.filter((o) => !before.includes(o)).length;
  const removed = before.filter((o) => !after.includes(o)).length;
  if (!added && !removed && before.length === after.length && before.every((o, i) => o === after[i])) return "No changes";
  return [added && `${added} ${added === 1 ? "option" : "options"} added or changed`, removed && `${removed} removed`].filter(Boolean).join(" · ") || "Order changed";
}

function EditBody({ feature, onSave, onClose }) {
  // Local form state while the sheet is open (remounted per feature by key).
  const [options, setOptions] = useState(() => [...(feature.options ?? [])]);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const empties = emptyIndices(options);
  const linted = hasLintWarnings(feature.name, options);
  const change = summarize(feature.options ?? [], options);

  const save = async () => {
    setSubmitted(true);
    if (empties.size) return;
    setPending(true);
    setError(null);
    try {
      // Today's behaviour: saving an edit always sends state: true (open question).
      await onSave({ name: feature.name, state: true, options });
      onClose();
    } catch (err) {
      setError(err.message ?? String(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <SheetHeader className="tw:gap-1 tw:border-b tw:px-7 tw:pt-6 tw:pb-5">
        <SheetTitle className="tw:text-xl">Edit <span className="tw:font-mono">{feature.name}</span></SheetTitle>
        <SheetDescription className="tw:flex tw:items-center tw:gap-1.5 tw:text-[13px]">
          <Lock className="tw:size-3.5" /> Name can’t be changed after creation.
        </SheetDescription>
      </SheetHeader>

      <div className="tw:flex tw:min-h-0 tw:grow tw:flex-col tw:gap-6 tw:overflow-y-auto tw:px-7 tw:py-5">
        <div className="tw:flex tw:gap-2.5 tw:rounded-lg tw:bg-muted tw:px-4 tw:py-3">
          <Info className="tw:mt-0.5 tw:size-3.5 tw:shrink-0 tw:text-muted-strong" />
          <div className="tw:flex tw:flex-col tw:gap-1 tw:text-[13px]">
            <span className="tw:flex tw:items-center tw:gap-2 tw:font-semibold">
              Saving keeps this feature On.
              <span className="tw:rounded-full tw:border tw:bg-primary-foreground tw:px-2 tw:text-[10px] tw:leading-4.5 tw:font-semibold tw:tracking-[0.06em] tw:uppercase">Open question</span>
            </span>
            <span className="tw:text-muted-strong">
              Today, saving an edit always sets state to true{feature.state ? "." : " — this feature is Off now and will be turned On."}
            </span>
          </div>
        </div>

        <div className="tw:flex tw:flex-col tw:gap-2">
          <div>
            <h3 className="tw:text-sm tw:font-semibold">Options <span className="tw:font-normal tw:text-muted-foreground tw:tabular-nums">{options.length}</span></h3>
            <p className="tw:mt-0.5 tw:text-xs tw:text-muted-foreground">
              Free-form strings, stored exactly as typed.{lintsFeature(feature.name) ? ` coactd reads each one as JSON for ${feature.name}.` : " Nothing parses them for this feature."}
            </p>
          </div>
          <OptionsEditor featureName={feature.name} value={options} onChange={setOptions} showErrors={submitted} disabled={pending} />
        </div>
        {error && <p role="alert" className="tw:rounded-md tw:bg-crit-bg tw:px-3 tw:py-2 tw:text-[13px] tw:text-crit-text">{error}</p>}
      </div>

      <SheetFooter className="tw:gap-3 tw:border-t tw:px-7 tw:py-4">
        <p className="tw:text-xs tw:text-muted-strong">Saving records a RepoUpdateFeature request and an audit entry. Nothing is provisioned until this repo’s next membership change.</p>
        <div className="tw:flex tw:items-center tw:justify-between">
          <span className="tw:font-mono tw:text-xs tw:text-muted-foreground">{change}</span>
          <div className="tw:flex tw:gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={pending}>
              {pending && <Loader2 className="tw:animate-spin" />}
              {linted ? "Save anyway" : "Save"}
            </Button>
          </div>
        </div>
      </SheetFooter>
    </>
  );
}
