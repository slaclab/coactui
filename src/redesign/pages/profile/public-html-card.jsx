"use client";

import { Switch } from "@/components/ui/switch";
import { SectionCard, Skeleton, StatusPill } from "../../kit";
import { useDialogParam } from "../../lib/navigation";

export const publicHtmlUrl = (username) => `https://s3df.slac.stanford.edu/people/${encodeURIComponent(username)}`;

export function publicHtmlFolder(me) {
  const home = (me?.storages ?? []).find((s) => s.purpose === "home");
  return home?.rootfolder ? `${home.rootfolder}/public_html` : "~/public_html";
}

export function PublicHtmlCard({ me, loading, pending }) {
  const { openDialog } = useDialogParam();
  const on = !!me?.publichtml;
  // Turning it off has no supported request flow yet (backend gap), so the switch only turns on.
  const reason = pending ? "A request is already in progress" : on ? "Contact s3df-help to turn off your public page" : undefined;
  const url = me ? publicHtmlUrl(me.username) : "";

  return (
    <SectionCard
      title="Public web page"
      action={
        <div className="tw:flex tw:items-center tw:gap-2" title={reason}>
          {pending && <StatusPill tone="warn">Request in progress</StatusPill>}
          <Switch
            aria-label="Public web page"
            checked={on}
            disabled={loading || !me || !!pending || on}
            onCheckedChange={(v) => v && openDialog("public-html")}
          />
        </div>
      }
      bodyClassName="tw:flex tw:flex-col tw:gap-2.5"
    >
      {loading || !me ? (
        <>
          <Skeleton className="tw:h-4 tw:w-full" />
          <Skeleton className="tw:h-4 tw:w-56" />
        </>
      ) : (
        <>
          <p className="tw:text-[13px] tw:leading-5 tw:text-muted-strong">
            {on ? "On. Files in " : "Off. Turning it on sends a request; once approved, files in "}
            <span className="tw:font-mono tw:text-xs">{publicHtmlFolder(me)}</span>
            {" are served at"}
          </p>
          {on ? (
            <a href={url} target="_blank" rel="noreferrer" className="tw:font-mono tw:text-xs tw:text-foreground tw:underline tw:underline-offset-2">{url}</a>
          ) : (
            <span className="tw:font-mono tw:text-xs tw:text-muted-foreground">{url}</span>
          )}
        </>
      )}
    </SectionCard>
  );
}
