"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CircleCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { routes } from "../lib/routes";

/* ======================================================================================
 * CRUD kit (spec: DataTable · ListEditor · FieldsForm · ConfirmDialog · RequestDialog)
 *
 * Open/close is controlled by the caller, normally from URL state:
 *   const { dialog, openDialog, closeDialog } = useDialogParam();   // lib/navigation.js
 *   <FormDialog open={dialog === "edit-description"} onOpenChange={(o) => !o && closeDialog()} … />
 *
 * Every submit is async and may throw; the error is shown inline (FieldError) and as a
 * toast. Success closes the dialog (FormDialog/ConfirmDialog) or shows the success state
 * (RequestDialog). Never call mutations during automated checks.
 * ====================================================================================== */

/**
 * Field schema for FieldsForm:
 * { name, label, type: "text" | "textarea" | "number" | "select" | "custom", placeholder,
 *   helper, suffix, mono, required, options: [{ value, label }], rows, min, step,
 *   validate: (value, values) => string | undefined,
 *   render: ({ value, onChange, values }) => node   // type "custom", e.g. a UserCombobox }
 */
export function FieldsForm({ fields, values, onChange, errors = {}, disabled }) {
  const set = (name) => (v) => onChange({ ...values, [name]: v });
  return (
    <div className="tw:flex tw:flex-col tw:gap-4">
      {fields.filter(Boolean).map((f) => {
        const id = `field-${f.name}`;
        const value = values[f.name] ?? "";
        const err = errors[f.name];
        const common = { id, disabled, "aria-invalid": !!err || undefined, "aria-describedby": f.helper || err ? `${id}-help` : undefined };
        return (
          <div key={f.name} className="tw:flex tw:flex-col tw:gap-1.5">
            <Label htmlFor={id} className="tw:text-[13px] tw:font-medium">
              {f.label}
              {f.required && <span className="tw:text-muted-foreground"> *</span>}
            </Label>
            <div className="tw:flex tw:items-center tw:gap-2">
              {f.type === "textarea" ? (
                <Textarea {...common} rows={f.rows ?? 4} value={value} placeholder={f.placeholder} onChange={(e) => set(f.name)(e.target.value)} />
              ) : f.type === "select" ? (
                <Select value={value} onValueChange={set(f.name)} disabled={disabled}>
                  <SelectTrigger {...common} className="tw:w-full"><SelectValue placeholder={f.placeholder ?? "Choose…"} /></SelectTrigger>
                  <SelectContent>
                    {(f.options ?? []).map((o) => <SelectItem key={o.value} value={o.value}>{o.label ?? o.value}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : f.type === "custom" ? (
                f.render({ value: values[f.name], onChange: set(f.name), values, disabled })
              ) : (
                <Input
                  {...common}
                  type={f.type === "number" ? "number" : "text"}
                  min={f.min}
                  step={f.step}
                  value={value}
                  placeholder={f.placeholder}
                  className={cn(f.mono && "tw:font-mono")}
                  onChange={(e) => set(f.name)(e.target.value)}
                />
              )}
              {f.suffix && <span className="tw:shrink-0 tw:text-[13px] tw:text-muted-foreground">{f.suffix}</span>}
            </div>
            {(err || f.helper) && (
              <p id={`${id}-help`} className={cn("tw:text-xs", err ? "tw:text-crit-text" : "tw:text-muted-foreground")}>
                {err ?? (typeof f.helper === "function" ? f.helper(values) : f.helper)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function validateAll(fields, values) {
  const errors = {};
  for (const f of fields.filter(Boolean)) {
    const v = values[f.name];
    if (f.required && (v == null || String(v).trim() === "")) errors[f.name] = `${f.label} is required`;
    else if (f.validate) {
      const msg = f.validate(v, values);
      if (msg) errors[f.name] = msg;
    }
  }
  return errors;
}

/** Form state lives here while the dialog is open; remount (key) resets it on reopen. */
function useFormState(fields, initialValues) {
  const [values, setValues] = useState(() => ({ ...Object.fromEntries(fields.filter(Boolean).map((f) => [f.name, f.defaultValue ?? ""])), ...initialValues }));
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState(null);
  const errors = submitted ? validateAll(fields, values) : {};
  return { values, setValues, errors, submitted, setSubmitted, pending, setPending, serverError, setServerError };
}

/**
 * FieldsForm in a Dialog. `onSubmit(values)` may throw. `toastMessages` = { loading, success }.
 * `preview(values)` renders an impact preview under the fields (e.g. purchase changes).
 */
export function FormDialog({ open, onOpenChange, ...props }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <FormDialogBody {...props} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function FormDialogBody({ title, description, fields, initialValues = {}, submitLabel = "Save", onSubmit, onClose, toastMessages, preview, size = "md", destructive }) {
  const f = useFormState(fields, initialValues);
  const submit = async (e) => {
    e.preventDefault();
    f.setSubmitted(true);
    if (Object.keys(validateAll(fields, f.values)).length) return;
    f.setPending(true);
    f.setServerError(null);
    const run = onSubmit(f.values);
    if (toastMessages) toast.promise(run, { loading: toastMessages.loading ?? "Saving…", success: toastMessages.success ?? "Saved", error: (err) => err.message });
    try {
      await run;
      onClose();
    } catch (err) {
      f.setServerError(err.message ?? String(err));
    } finally {
      f.setPending(false);
    }
  };
  return (
    <DialogContent className={cn(size === "lg" ? "tw:sm:max-w-xl" : "tw:sm:max-w-lg")}>
      <form onSubmit={submit} className="tw:flex tw:flex-col tw:gap-5" noValidate>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <FieldsForm fields={fields} values={f.values} onChange={f.setValues} errors={f.errors} disabled={f.pending} />
        {preview?.(f.values)}
        {f.serverError && <p role="alert" className="tw:rounded-md tw:bg-crit-bg tw:px-3 tw:py-2 tw:text-[13px] tw:text-crit-text">{f.serverError}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={f.pending}>Cancel</Button>
          <Button type="submit" size="sm" variant={destructive ? "destructive" : "default"} disabled={f.pending}>
            {f.pending && <Loader2 className="tw:animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

/**
 * Request flow (spec §6 "Request dialogs", §1.6): every provisioning change goes through a
 * Coact request. `onSubmit(values)` performs the request mutation (and requestApprove when
 * the viewer may self-approve) and returns { message?, href? }. The dialog then shows
 * "Request submitted · track it in Requests →" until Done.
 */
export function RequestDialog({ open, onOpenChange, ...props }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <RequestDialogBody {...props} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function RequestDialogBody({ title, description, fields, initialValues = {}, submitLabel = "Submit request", onSubmit, onClose, preview }) {
  const f = useFormState(fields, initialValues);
  const [result, setResult] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    f.setSubmitted(true);
    if (Object.keys(validateAll(fields, f.values)).length) return;
    f.setPending(true);
    f.setServerError(null);
    try {
      const r = (await onSubmit(f.values)) ?? {};
      setResult(r);
      toast.success(r.message ?? "Request submitted");
    } catch (err) {
      f.setServerError(err.message ?? String(err));
      toast.error("Request failed", { description: err.message });
    } finally {
      f.setPending(false);
    }
  };
  return (
    <DialogContent className="tw:sm:max-w-lg">
      {result ? (
        <div className="tw:flex tw:flex-col tw:items-center tw:gap-3 tw:py-4 tw:text-center">
          <CircleCheck className="tw:size-8 tw:text-ok" strokeWidth={1.5} />
          <DialogTitle>{result.message ?? "Request submitted"}</DialogTitle>
          <DialogDescription>
            Track it in <Link href={result.href ?? routes.requests({ view: "mine" })} className="tw:font-medium tw:text-foreground tw:underline">Requests →</Link>
          </DialogDescription>
          <Button size="sm" onClick={onClose} className="tw:mt-2">Done</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="tw:flex tw:flex-col tw:gap-5" noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <FieldsForm fields={fields} values={f.values} onChange={f.setValues} errors={f.errors} disabled={f.pending} />
          {preview?.(f.values)}
          {f.serverError && <p role="alert" className="tw:rounded-md tw:bg-crit-bg tw:px-3 tw:py-2 tw:text-[13px] tw:text-crit-text">{f.serverError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={f.pending}>Cancel</Button>
            <Button type="submit" size="sm" disabled={f.pending}>
              {f.pending && <Loader2 className="tw:animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      )}
    </DialogContent>
  );
}

/** AlertDialog confirm. `onConfirm` may throw; errors stay inline. destructive = red confirm. */
export function ConfirmDialog({ open, onOpenChange, title, description, children, confirmLabel = "Confirm", destructive, onConfirm, toastMessages, confirmDisabled = false }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const confirm = async () => {
    setPending(true);
    setError(null);
    const run = onConfirm();
    if (toastMessages) toast.promise(run, { loading: toastMessages.loading ?? "Working…", success: toastMessages.success ?? "Done", error: (err) => err.message });
    try {
      await run;
      onOpenChange(false);
    } catch (err) {
      setError(err.message ?? String(err));
    } finally {
      setPending(false);
    }
  };
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) setError(null); onOpenChange(o); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        {error && <p role="alert" className="tw:rounded-md tw:bg-crit-bg tw:px-3 tw:py-2 tw:text-[13px] tw:text-crit-text">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button size="sm" variant={destructive ? "destructive" : "default"} disabled={pending || confirmDisabled} onClick={confirm}>
            {pending && <Loader2 className="tw:animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
