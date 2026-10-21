"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Long enough that two lines at max-w-3xl probably overflow; avoids measuring the DOM.
const CLAMP_CHARS = 180;

/** D2 row 2: description, line-clamp-2 with "Show more"; editors get "+ Add description" when empty. */
export function ClampedDescription({ text, canEdit, onAdd }) {
  const [expanded, setExpanded] = useState(false); // local UI state
  if (!text) {
    return canEdit ? (
      <Button variant="ghost" size="xs" className="tw:-ml-2 tw:w-fit tw:text-muted-strong" onClick={onAdd}>
        <Plus /> Add description
      </Button>
    ) : null;
  }
  const long = text.length > CLAMP_CHARS;
  return (
    <div className="tw:flex tw:max-w-3xl tw:flex-col tw:items-start tw:gap-0.5">
      <p className={cn("tw:text-sm tw:leading-5.5 tw:whitespace-pre-line tw:text-muted-strong", !expanded && "tw:line-clamp-2")}>{text}</p>
      {long && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="tw:text-xs tw:font-medium tw:text-foreground tw:underline tw:underline-offset-2">
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
