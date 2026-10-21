"use client";

import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import { Check, CircleMinus, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useDebounced } from "../../../kit";
import { REPO_MEMBERS_PASTE } from "./queries";

const DISPLAY_CAP = 200;

/**
 * Paste a list (spec §6 Members › Add members): one entry per line. A plain username becomes
 * ^name$; a line with regex metacharacters is sent as-is. Everything resolves in one
 * usersMatchingUserNames(regexes) call and is attributed back to lines client-side.
 * Emails can't be resolved (no email lookup in the API) and show as not found.
 */
export function parseLines(text) {
  return [...new Set(text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")))].map((line) => {
    if (line.includes("@") && !/[\^$*+?()[\]{}|\\]/.test(line)) return { line, kind: "email" };
    const regex = /^[\w-]+$/.test(line) ? `^${line}$` : line;
    try {
      return { line, kind: /^[\w-]+$/.test(line) ? "username" : "pattern", regex, re: new RegExp(regex) };
    } catch {
      return { line, kind: "invalid" };
    }
  });
}

/** Derived resolution: per-line matches, the users to add, and the summary counts. */
export function usePasteResolution(text, members) {
  const debounced = useDebounced(text, 400);
  const parsed = useMemo(() => parseLines(debounced), [debounced]);
  const regexes = parsed.filter((p) => p.regex).map((p) => p.regex);
  const { data, loading, error } = useQuery(REPO_MEMBERS_PASTE, { skip: !regexes.length, variables: { regexes } });
  const pending = text !== debounced || loading;

  return useMemo(() => {
    const memberSet = new Set(members);
    const found = data?.usersMatchingUserNames ?? [];
    const lines = parsed.map((p) => {
      if (!p.re) return { ...p, status: p.kind === "invalid" ? "invalid" : "notfound", matches: [] };
      const matches = found.filter((u) => p.re.test(u.username));
      if (!data) return { ...p, status: "pending", matches };
      if (!matches.length) return { ...p, status: "notfound", matches };
      const fresh = matches.filter((u) => !memberSet.has(u.username));
      return { ...p, status: fresh.length ? "match" : "skipped", matches, fresh };
    });
    const toAdd = [];
    const seen = new Set();
    for (const l of lines) for (const u of l.fresh ?? []) if (!seen.has(u.username)) { seen.add(u.username); toAdd.push(u); }
    return {
      lines,
      toAdd,
      skipped: lines.filter((l) => l.status === "skipped").length,
      notFound: lines.filter((l) => l.status === "notfound" || l.status === "invalid").length,
      pending,
      error,
      capped: toAdd.length > DISPLAY_CAP,
    };
  }, [parsed, data, members, pending, error]);
}

/** The matched / skipped / not-found checklist under the paste box (CRUD kit 02). */
export function PasteChecklist({ resolution }) {
  const { lines, pending, error } = resolution;
  if (error) return <p role="alert" className="tw:rounded-md tw:bg-crit-bg tw:px-3 tw:py-2 tw:text-[13px] tw:text-crit-text">Couldn’t resolve the list — {error.message}</p>;
  if (!lines.length) return null;
  return (
    <ul className="tw:max-h-80 tw:divide-y tw:overflow-y-auto tw:rounded-lg tw:border">
      {lines.map((l) => (
        <li key={l.line} className="tw:flex tw:min-h-10 tw:items-center tw:gap-2.5 tw:px-3 tw:py-2 tw:text-[13px]">
          <StatusIcon status={pending && l.status === "pending" ? "pending" : l.status} />
          <span className={cn("tw:min-w-0 tw:truncate tw:font-mono", (l.status === "notfound" || l.status === "invalid") && "tw:text-crit-text")}>
            {l.kind === "pattern" && l.matches.length ? l.matches.slice(0, 3).map((u) => u.username).join(", ") + (l.matches.length > 3 ? ", …" : "") : l.line}
          </span>
          <span className={cn("tw:shrink-0 tw:text-xs", l.status === "notfound" || l.status === "invalid" ? "tw:text-crit-text" : "tw:text-muted-foreground")}>
            {lineNote(l)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function lineNote(l) {
  switch (l.status) {
    case "pending":
      return "resolving…";
    case "invalid":
      return "not a valid pattern";
    case "notfound":
      return l.kind === "email" ? "no user found · paste the username" : "no user found";
    case "skipped":
      return l.matches.length > 1 ? `${l.matches.length} matches · all already members · skipped` : "already a member · skipped";
    default:
      if (l.kind === "pattern") return `${l.matches.length} match${l.matches.length === 1 ? "" : "es"} from pattern${l.fresh.length < l.matches.length ? ` · ${l.matches.length - l.fresh.length} already members` : ""}`;
      return l.matches[0]?.fullname || "matched";
  }
}

function StatusIcon({ status }) {
  if (status === "pending") return <Loader2 className="tw:size-3.5 tw:shrink-0 tw:animate-spin tw:text-muted-foreground" />;
  if (status === "match") return <Check className="tw:size-3.5 tw:shrink-0 tw:text-ok" />;
  if (status === "skipped") return <CircleMinus className="tw:size-3.5 tw:shrink-0 tw:text-muted-foreground" />;
  return <X className="tw:size-3.5 tw:shrink-0 tw:text-crit-text" />;
}

export { DISPLAY_CAP };
