"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Segmented } from "../../kit";
import { routes } from "../../lib/routes";

/**
 * "All purposes | data | group …". The purpose is a path segment (/storageusage/x/purpose/y),
 * so switching pushes the new route and carries the table filters (?q, ?facility) along.
 */
export function PurposeSwitch({ storagename, purpose, purposes }) {
  const router = useRouter();
  const search = useSearchParams();
  const items = [{ value: "all", label: "All purposes" }, ...[...new Set([...purposes, ...(purpose ? [purpose] : [])])].map((p) => ({ value: p, label: p }))];
  const go = (v) => {
    const qs = search.toString();
    router.push(`${routes.storage(storagename, v === "all" ? undefined : v)}${qs ? `?${qs}` : ""}`, { scroll: false });
  };
  return <Segmented label="Purpose" items={items} value={purpose ?? "all"} onChange={go} />;
}
