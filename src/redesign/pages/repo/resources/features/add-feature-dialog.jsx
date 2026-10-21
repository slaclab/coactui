"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { emptyIndices, FEATURE_NAME_RE, KNOWN_FEATURES } from "./option-lint";
import { OptionsEditor } from "./options-editor";

/** ?dialog=add-feature (Paper "Repo — Features · Add feature"). Admin only. */
export function AddFeatureDialog({ open, onClose, repoName, existing, onAdd }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {open && <AddFeatureBody repoName={repoName} existing={existing} onAdd={onAdd} onClose={onClose} />}
    </Dialog>
  );
}

function nameError(name, existing) {
  if (!name) return "Name is required";
  if (!FEATURE_NAME_RE.test(name)) return "Use letters and digits only (no hyphens or underscores).";
  if (existing.includes(name)) return `The feature ${name} is already defined`;
  return null;
}

function AddFeatureBody({ repoName, existing, onAdd, onClose }) {
  // Form values live here only while the dialog is open (remounted on reopen).
  const [name, setName] = useState("");
  const [options, setOptions] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  // Live checks once something is typed (regex, uniqueness); "required" after submit.
  const nErr = name || submitted ? nameError(name, existing) : null;
  const empties = emptyIndices(options);
  const invalid = !!nameError(name, existing) || empties.size > 0;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (invalid) return;
    setPending(true);
    setError(null);
    try {
      await onAdd({ name, state: true, options });
      onClose();
    } catch (err) {
      setError(err.message ?? String(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <DialogContent className="tw:sm:max-w-xl">
      <form onSubmit={submit} noValidate className="tw:flex tw:flex-col tw:gap-5">
        <DialogHeader>
          <DialogTitle>Add feature</DialogTitle>
          <DialogDescription className="tw:font-mono">{repoName}</DialogDescription>
        </DialogHeader>

        <div className="tw:flex tw:flex-col tw:gap-1.5">
          <Label htmlFor="feature-name" className="tw:text-[13px] tw:font-medium">Name</Label>
          <Input id="feature-name" value={name} onChange={(e) => setName(e.target.value)} disabled={pending} autoFocus spellCheck={false} autoComplete="off" aria-invalid={!!nErr || undefined} aria-describedby="feature-name-help" className="tw:font-mono" />
          <div id="feature-name-help" className="tw:flex tw:flex-col tw:gap-0.5 tw:text-xs">
            {nErr && <span className="tw:text-crit-text">{nErr}</span>}
            <span className="tw:text-muted-foreground">Letters and digits only. Must be unique on this repo. Can’t be changed later.</span>
          </div>
        </div>

        <div className="tw:flex tw:flex-col tw:gap-2">
          <span className="tw:text-[11px] tw:font-semibold tw:tracking-[0.06em] tw:text-muted-strong tw:uppercase">Names coactd reads</span>
          <div className="tw:flex tw:flex-wrap tw:gap-2">
            {KNOWN_FEATURES.map((k) => {
              const taken = existing.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  disabled={taken || pending}
                  onClick={() => setName(k)}
                  aria-pressed={name === k}
                  className={cn(
                    "tw:flex tw:h-7.5 tw:items-center tw:gap-1.5 tw:rounded-full tw:border tw:px-2.5 tw:text-[13px]",
                    taken ? "tw:cursor-not-allowed tw:border-dashed tw:text-muted-foreground" : "tw:bg-primary-foreground tw:hover:bg-muted",
                    name === k && "tw:border-foreground",
                  )}
                >
                  {!taken && <Plus className="tw:size-3" />}
                  <span className="tw:font-mono">{k}</span>
                  {taken && <span className="tw:text-[11px]">already on this repo</span>}
                </button>
              );
            })}
          </div>
          <p className="tw:text-xs tw:text-muted-foreground">Pick one or type your own. Other names are stored but nothing reads them today.</p>
        </div>

        <div className="tw:flex tw:flex-col tw:gap-2">
          <span className="tw:text-[13px] tw:font-semibold">Options <span className="tw:font-normal tw:text-muted-foreground">optional</span></span>
          <OptionsEditor featureName={name} value={options} onChange={setOptions} showErrors={submitted} disabled={pending} />
          <p className="tw:text-xs tw:text-muted-foreground">
            Free-form strings, saved exactly as typed. Empty strings aren’t allowed. For posixgroup and netgroup, coactd reads each option as JSON; saving never checks it.
          </p>
        </div>

        {error && <p role="alert" className="tw:rounded-md tw:bg-crit-bg tw:px-3 tw:py-2 tw:text-[13px] tw:text-crit-text">{error}</p>}

        <DialogFooter className="tw:items-center tw:border-t tw:pt-4 tw:sm:justify-between">
          <span className="tw:text-[13px] tw:text-muted-strong">New features start On.</span>
          <div className="tw:flex tw:gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button type="submit" size="sm" disabled={pending || (submitted && invalid)}>
              {pending && <Loader2 className="tw:animate-spin" />}
              Add feature
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
