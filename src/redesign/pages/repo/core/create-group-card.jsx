"use client";

import { useState } from "react";
import { useApolloClient } from "@apollo/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ACCESS_GROUP_CREATE, mutate, REFETCH, repoKey } from "./mutations";
import { REPO_GROUP_NAME_CHECK } from "./queries";

/** Dashed "Create access group" card: repo-name prefix + suffix (group names are global). */
export function CreateGroupCard({ repo, existing, onCreated }) {
  const client = useApolloClient();
  const [suffix, setSuffix] = useState(""); // form value
  const [serverError, setServerError] = useState(null);
  const [pending, setPending] = useState(false);
  const prefix = `${repo.name}-`;
  const name = `${prefix}${suffix.trim()}`;
  const localError = !suffix.trim()
    ? null
    : !/^[\w-]+$/.test(suffix.trim())
      ? "Use letters, digits, _ and - only"
      : existing.includes(name)
        ? `An access group named ${name} already exists`
        : null;
  const error = localError ?? serverError;

  const create = async (e) => {
    e.preventDefault();
    if (!suffix.trim() || localError) return;
    setPending(true);
    setServerError(null);
    try {
      const { data } = await client.query({ query: REPO_GROUP_NAME_CHECK, variables: { f: { name } }, fetchPolicy: "network-only" });
      if (data?.accessGroups?.length) throw new Error(`An access group named ${name} already exists`);
      await mutate(client, ACCESS_GROUP_CREATE, { repo: repoKey(repo), accessgroup: { name, repoid: repo.Id, members: [] } }, REFETCH.groups);
      toast.success(`Created ${name}`, { description: "The GID is assigned when the group is provisioned." });
      setSuffix("");
      onCreated?.(name);
    } catch (err) {
      setServerError(err.message ?? String(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={create} className="tw:flex tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:border-dashed tw:px-4 tw:py-4" noValidate>
      <h3 className="tw:text-[13px] tw:font-semibold">Create access group</h3>
      <div className={cn("tw:flex tw:h-9 tw:overflow-hidden tw:rounded-md tw:border tw:bg-primary-foreground tw:focus-within:ring-2 tw:focus-within:ring-ring/40", error && "tw:border-crit")}>
        <span className="tw:flex tw:max-w-[55%] tw:shrink-0 tw:items-center tw:truncate tw:border-r tw:bg-muted tw:px-2.5 tw:font-mono tw:text-[13px] tw:text-muted-strong" title={prefix}>{prefix}</span>
        <input
          value={suffix}
          onChange={(e) => { setSuffix(e.target.value); setServerError(null); }}
          placeholder="analysis"
          aria-label="Access group name (after the repo prefix)"
          aria-invalid={!!error || undefined}
          aria-describedby="create-group-help"
          disabled={pending}
          className="tw:min-w-0 tw:flex-1 tw:bg-transparent tw:px-2.5 tw:font-mono tw:text-[13px] tw:outline-none"
        />
      </div>
      <div className="tw:flex tw:items-center tw:justify-between tw:gap-3">
        <p id="create-group-help" className={cn("tw:text-xs", error ? "tw:text-crit-text" : "tw:text-muted-foreground")}>{error ?? "Name must start with the repo name"}</p>
        <Button type="submit" variant="outline" size="sm" disabled={!suffix.trim() || !!localError || pending}>
          {pending && <Loader2 className="tw:animate-spin" />}
          Create
        </Button>
      </div>
    </form>
  );
}
