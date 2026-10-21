"use client";

import { Braces, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { LintChip } from "./option-view";
import { duplicateIndices, lintOption, POSIXGROUP_TEMPLATE } from "./option-lint";

/**
 * Controlled options list (value: string[], onChange). Edit in place, add explicitly, remove
 * by index. Empty strings are errors (shown after a submit attempt); duplicates and JSON
 * lint are advice only. Strings are kept exactly as typed.
 */
export function OptionsEditor({ featureName, value, onChange, showErrors, disabled }) {
  const options = value ?? [];
  const dupes = duplicateIndices(options);
  const set = (i, v) => onChange(options.map((o, j) => (j === i ? v : o)));
  const remove = (i) => onChange(options.filter((_, j) => j !== i));
  const add = (v = "") => onChange([...options, v]);

  return (
    <div className="tw:flex tw:flex-col tw:gap-3">
      {options.length === 0 ? (
        <div className="tw:flex tw:items-center tw:justify-between tw:rounded-lg tw:border tw:border-dashed tw:bg-muted tw:px-4 tw:py-3">
          <span className="tw:text-[13px] tw:text-muted-strong">No options yet</span>
          <Button type="button" variant="outline" size="sm" onClick={() => add()} disabled={disabled}><Plus /> Add option</Button>
        </div>
      ) : (
        <ol className="tw:flex tw:flex-col tw:gap-3">
          {options.map((o, i) => {
            const checks = lintOption(featureName, o);
            const empty = o.trim() === "";
            const failed = checks.find((c) => !c.ok);
            const id = `option-${i}`;
            return (
              <li key={i} className="tw:flex tw:items-start tw:gap-3">
                <label htmlFor={id} className="tw:w-4 tw:shrink-0 tw:pt-2.5 tw:text-right tw:text-xs tw:text-muted-foreground tw:tabular-nums">{i + 1}</label>
                <div className="tw:flex tw:min-w-0 tw:grow tw:flex-col tw:gap-2">
                  <Textarea
                    id={id}
                    rows={2}
                    value={o}
                    disabled={disabled}
                    spellCheck={false}
                    aria-invalid={(showErrors && empty) || undefined}
                    onChange={(e) => set(i, e.target.value)}
                    className={cn("tw:font-mono tw:text-[13px]", failed && !empty && "tw:border-warn")}
                  />
                  {showErrors && empty && <p className="tw:text-xs tw:text-crit-text">Empty options aren’t allowed. Type a value or remove it.</p>}
                  {!empty && checks.length > 0 && !failed && (
                    <div className="tw:flex tw:flex-wrap tw:gap-1.5">{checks.map((c) => <LintChip key={c.key} ok mono={c.key !== "json"}>{c.label}</LintChip>)}</div>
                  )}
                  {!empty && failed && (
                    <div className="tw:flex tw:gap-2 tw:rounded-md tw:bg-warn-bg tw:px-3 tw:py-2.5 tw:text-xs tw:text-warn-text">
                      <TriangleAlert className="tw:mt-0.5 tw:size-3.5 tw:shrink-0" />
                      <div className="tw:flex tw:flex-col tw:gap-1">
                        <span className="tw:font-semibold">{failed.message}</span>
                        <span>You can still save — the API stores options as plain strings.</span>
                      </div>
                    </div>
                  )}
                  {dupes.has(i) && !empty && <p className="tw:text-xs tw:text-warn-text">Same string as another option. Allowed, but coactd reads both.</p>}
                </div>
                <Button type="button" variant="outline" size="icon-sm" onClick={() => remove(i)} disabled={disabled} aria-label={`Remove option ${i + 1}`}>
                  <Trash2 className="tw:size-3.5" />
                </Button>
              </li>
            );
          })}
        </ol>
      )}
      {(options.length > 0 || featureName === "posixgroup") && (
        <div className="tw:flex tw:flex-col tw:gap-1.5 tw:pl-7">
          <div className="tw:flex tw:items-center tw:gap-2">
            {options.length > 0 && <Button type="button" variant="outline" size="sm" onClick={() => add()} disabled={disabled}><Plus /> Add option</Button>}
            {featureName === "posixgroup" && (
              <Button type="button" variant="ghost" size="sm" onClick={() => add(POSIXGROUP_TEMPLATE)} disabled={disabled}><Braces /> Insert posixgroup template</Button>
            )}
          </div>
          {featureName === "posixgroup" && (
            <p className="tw:text-xs tw:text-muted-foreground">Template adds <span className="tw:font-mono">{POSIXGROUP_TEMPLATE}</span> as a new option. Never automatic.</p>
          )}
        </div>
      )}
    </div>
  );
}
