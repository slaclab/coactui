"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/*
 * URL state (spec §1.5: tab, filters, scope, open peek and open dialog live in the URL).
 * Components read state from here and derive the rest; they don't mirror it in useState.
 */

/** react-router-shaped [params, setParams] over next/navigation. */
export function useQueryState() {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const params = useMemo(() => new URLSearchParams(search.toString()), [search]);
  const setParams = useCallback(
    (next, { replace = true } = {}) => {
      const qs = next.toString();
      router[replace ? "replace" : "push"](qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );
  return [params, setParams];
}

/** One query param as a value with a setter. Default values are kept out of the URL. */
export function useQueryParam(key, fallback = null) {
  const [params, setParams] = useQueryState();
  const value = params.get(key) ?? fallback;
  const set = useCallback(
    (v) => {
      const next = new URLSearchParams(params);
      if (v == null || v === "" || v === fallback) next.delete(key);
      else next.set(key, v);
      setParams(next);
    },
    [params, setParams, key, fallback],
  );
  return [value, set];
}

/** Comma-separated list param (facets): ["LCLS", "SSRL"] ⇄ ?facility=LCLS,SSRL */
export function useQueryList(key) {
  const [raw, set] = useQueryParam(key, "");
  const list = useMemo(() => (raw ? raw.split(",") : []), [raw]);
  return [list, useCallback((v) => set(v.join(",")), [set])];
}

/** Open dialog in the URL (?dialog=edit-description&target=…), so deep links can open it. */
export function useDialogParam() {
  const [params, setParams] = useQueryState();
  const dialog = params.get("dialog");
  const target = params.get("target");
  const openDialog = useCallback(
    (name, t) => {
      const next = new URLSearchParams(params);
      next.set("dialog", name);
      if (t != null) next.set("target", t);
      else next.delete("target");
      setParams(next, { replace: false });
    },
    [params, setParams],
  );
  const closeDialog = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete("dialog");
    next.delete("target");
    setParams(next);
  }, [params, setParams]);
  return { dialog, target, openDialog, closeDialog, isOpen: (name) => dialog === name };
}

/** Resolve "?peek=…"-style hrefs against the current page (next/link wants a full path). */
export function useResolveHref() {
  const pathname = usePathname();
  return useCallback((href) => (href.startsWith("?") ? `${pathname}${href}` : href), [pathname]);
}
