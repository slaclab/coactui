"use client";

import { Check, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyButton } from "../../../../kit";
import { featureSummary, lintsFeature, parseOption } from "./option-lint";

const LABEL = "tw:text-[11px] tw:leading-3.5 tw:font-semibold tw:tracking-[0.06em] tw:text-muted-strong tw:uppercase";

/** Lint chip: ok (check) or warn (triangle). Status colours only as tinted pills. */
export function LintChip({ ok, children, mono }) {
  const Icon = ok ? Check : TriangleAlert;
  return (
    <span className={cn("tw:inline-flex tw:h-5.5 tw:items-center tw:gap-1.25 tw:rounded-full tw:px-2 tw:text-[11px] tw:leading-3.5 tw:font-semibold", ok ? "tw:bg-ok-bg tw:text-ok-text" : "tw:bg-warn-bg tw:text-warn-text", mono && "tw:font-mono tw:font-medium")}>
      <Icon className="tw:size-2.5" strokeWidth={3} />
      {children}
    </span>
  );
}

function TypeTag({ children }) {
  return <span className="tw:flex tw:h-4.5 tw:items-center tw:rounded-full tw:bg-neutral-bg tw:px-1.5 tw:font-mono tw:text-[10px] tw:leading-3 tw:font-semibold tw:text-muted-strong">{children}</span>;
}

/** One option: parsed view (posixgroup/netgroup) + RAW line with copy; raw only otherwise. */
export function OptionView({ featureName, raw }) {
  const raw0 = (
    <div className="tw:flex tw:items-center tw:gap-3 tw:px-3.5 tw:py-2">
      <span className={cn(LABEL, "tw:w-11 tw:shrink-0")}>Raw</span>
      <span className="tw:min-w-0 tw:grow tw:font-mono tw:text-xs tw:leading-4.5 tw:break-all tw:whitespace-pre-wrap">{raw}</span>
      <CopyButton value={raw} label="Copy raw option" />
    </div>
  );
  if (!lintsFeature(featureName)) return <div className="tw:overflow-hidden tw:rounded-lg tw:border tw:bg-muted">{raw0}</div>;

  const p = parseOption(raw);
  const summary = featureSummary(featureName, raw);
  return (
    <div className="tw:flex tw:flex-col tw:overflow-hidden tw:rounded-lg tw:border tw:bg-primary-foreground">
      <div className="tw:flex tw:items-center tw:gap-7 tw:px-3.5 tw:py-3">
        {p.isObject ? (
          <>
            <div className="tw:flex tw:w-65 tw:shrink-0 tw:flex-col tw:gap-0.5">
              <span className={LABEL}>name</span>
              <span className="tw:truncate tw:font-mono tw:text-[13px] tw:leading-4.5">{p.name != null ? String(p.name) : <span className="tw:text-muted-foreground">—</span>}</span>
            </div>
            {featureName === "posixgroup" && (
              <div className="tw:flex tw:w-50 tw:shrink-0 tw:flex-col tw:gap-0.5">
                <span className={LABEL}>gidNumber</span>
                <span className="tw:flex tw:items-center tw:gap-2">
                  <span className="tw:font-mono tw:text-[13px] tw:leading-4.5">{p.gidNumber != null ? String(p.gidNumber) : <span className="tw:text-muted-foreground">—</span>}</span>
                  {p.gidType && <TypeTag>{p.gidType}</TypeTag>}
                </span>
              </div>
            )}
          </>
        ) : (
          <span className="tw:text-[13px] tw:text-muted-foreground">{p.isJson ? "Not a JSON object" : "Doesn’t parse as JSON"}</span>
        )}
        <span className="tw:grow" />
        <div className="tw:flex tw:items-center tw:gap-1.5">
          {summary.map((c) => <LintChip key={c.label} ok={c.ok}>{c.label}</LintChip>)}
        </div>
      </div>
      <div className="tw:border-t tw:bg-muted">{raw0}</div>
    </div>
  );
}
