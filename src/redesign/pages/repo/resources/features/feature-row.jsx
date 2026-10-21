"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ActionsMenu, Skeleton } from "../../../../kit";
import { featureConsequence, optionCountLabel } from "./feature-copy";
import { OptionView } from "./option-view";

/** Admin row "…" (registry style, rendered by ActionsMenu). */
export function featureActions(feature) {
  return [
    { key: "edit", items: [{ key: "edit", label: "Edit…", icon: Pencil, dialog: "edit-feature" }] },
    { key: "danger", items: [{ key: "delete", label: "Delete…", icon: Trash2, dialog: "delete-feature", destructive: true }] },
  ];
}

/** Paper "Repo — Features" row: Switch · name + state caption · options · consequence · "…". */
export function FeatureRow({ feature, editable, pending, onToggle, onDialog }) {
  const n = feature.options?.length ?? 0;
  const caption = feature.state ? (n ? `On · ${optionCountLabel(n)}` : "On") : n ? `Off · ${optionCountLabel(n)}` : "Off";
  const switchId = `feature-${feature.name}`;
  return (
    <li className="tw:flex tw:items-start tw:gap-4 tw:border-t tw:px-5 tw:py-4.5 tw:first:border-t-0">
      <Switch
        id={switchId}
        checked={!!feature.state}
        disabled={!editable || pending}
        onCheckedChange={(on) => onToggle(feature, on)}
        aria-label={`${feature.name} ${feature.state ? "on" : "off"}`}
        className="tw:mt-0.5"
      />
      <div className="tw:flex tw:w-45 tw:shrink-0 tw:flex-col tw:gap-1">
        <label htmlFor={switchId} className="tw:font-mono tw:text-sm tw:leading-5 tw:font-semibold">{feature.name}</label>
        <span className={cn("tw:text-xs tw:leading-4", feature.state ? "tw:text-ok-text" : "tw:text-muted-foreground")}>{caption}</span>
      </div>
      <div className="tw:flex tw:min-w-0 tw:grow tw:basis-0 tw:flex-col tw:gap-2.5">
        {n === 0 ? (
          <span className="tw:text-[13px] tw:leading-5 tw:text-muted-foreground">No options</span>
        ) : (
          feature.options.map((o, i) => <OptionView key={i} featureName={feature.name} raw={o} />)
        )}
        <p className="tw:text-xs tw:leading-4.5 tw:text-muted-foreground">{featureConsequence(feature)}</p>
      </div>
      <div className="tw:w-8 tw:shrink-0">
        {editable && <ActionsMenu groups={featureActions(feature)} onDialog={(d) => onDialog(d, feature.name)} label={`Actions for ${feature.name}`} />}
      </div>
    </li>
  );
}

export function FeatureRowsSkeleton({ rows = 2 }) {
  return Array.from({ length: rows }, (_, i) => (
    <li key={i} className="tw:flex tw:items-start tw:gap-4 tw:border-t tw:px-5 tw:py-4.5 tw:first:border-t-0" aria-hidden>
      <Skeleton className="tw:h-5 tw:w-9 tw:rounded-full" />
      <div className="tw:flex tw:w-45 tw:flex-col tw:gap-1.5">
        <Skeleton className="tw:h-4 tw:w-24" />
        <Skeleton className="tw:h-3 tw:w-12" />
      </div>
      <Skeleton className="tw:h-4 tw:w-96" />
    </li>
  ));
}
