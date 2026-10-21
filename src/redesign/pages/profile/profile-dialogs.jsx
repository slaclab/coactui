"use client";

import { useMutation } from "@apollo/client";

import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog, FormDialog, RequestDialog } from "../../kit";
import { useDialogParam } from "../../lib/navigation";
import { routes } from "../../lib/routes";
import { publicHtmlFolder, publicHtmlUrl } from "./public-html-card";
import { REFETCH, REQUEST_PUBLIC_HTML, REQUEST_QUOTA, REQUEST_SHELL, UPDATE_EPPNS } from "./queries";

const SHELLS = ["/bin/bash", "/bin/tcsh", "/bin/zsh"];
// Legacy EPPN check (email-shaped: userid@institution.org).
const EPPN_RE = /^(([^<>()[\]\.,;:\s@"]+(\.[^<>()[\]\.,;:\s@"]+)*)|(".+"))@(([^<>()[\]\.,;:\s@"]+\.)+[^<>()[\]\.,;:\s@"]{2,})$/i;
const AUP_URL = "https://www2.slac.stanford.edu/comp/slacwide/account/IT-057-Acceptable-Use-of-Information-Technology-Resources.pdf";
const STATIC_SITES_URL = "https://s3df.slac.stanford.edu/public/doc/#/service-compute?id=s3df-static-sites";
const MINE = routes.requests({ view: "mine" });

const extLink = "tw:font-medium tw:text-foreground tw:underline tw:underline-offset-2";

/** Every profile dialog, opened from the URL (?dialog=…&target=…). */
export function ProfileDialogs({ me, pendingShell, pendingPublicHtml }) {
  const { dialog, target, closeDialog } = useDialogParam();
  const close = (open) => !open && closeDialog();
  const [requestShell] = useMutation(REQUEST_SHELL, { refetchQueries: REFETCH.request, awaitRefetchQueries: true });
  const [requestPublicHtml] = useMutation(REQUEST_PUBLIC_HTML, { refetchQueries: REFETCH.request, awaitRefetchQueries: true });
  const [requestQuota] = useMutation(REQUEST_QUOTA, { refetchQueries: REFETCH.quota, awaitRefetchQueries: true });
  const [updateEppns] = useMutation(UPDATE_EPPNS, { refetchQueries: REFETCH.eppns, awaitRefetchQueries: true });

  if (!me) return null;
  const eppns = me.eppns ?? [];
  const storage = dialog === "request-quota" ? (me.storages ?? []).find((s) => s.Id === target) : null;
  const removeTarget = dialog === "remove-eppn" && eppns.length > 1 && eppns.includes(target) ? target : null;

  // Pending states are checked in validation, not in `open`: the refetch after a successful
  // submit would otherwise close the RequestDialog's success screen.
  return (
    <>
      <RequestDialog
        open={dialog === "change-shell"}
        onOpenChange={close}
        title="Change login shell"
        description="Applied by SDF automation; takes effect at your next login."
        submitLabel="Request change"
        initialValues={{ shell: SHELLS.includes(me.shell) ? me.shell : "" }}
        fields={[
          {
            name: "shell",
            label: "Shell",
            type: "select",
            required: true,
            options: SHELLS.map((s) => ({ value: s, label: <span className="tw:font-mono">{s}</span> })),
            validate: (v) => (pendingShell ? "A shell change is already in progress" : v === me.shell ? "That is already your shell" : undefined),
          },
        ]}
        onSubmit={async ({ shell }) => {
          await requestShell({ variables: { request: { reqtype: "UserChangeShell", shell } } });
          return { message: "Shell change submitted", href: MINE };
        }}
      />

      <RequestDialog
        open={dialog === "public-html"}
        onOpenChange={close}
        title="Turn on your public web page"
        description={
          <>
            Files in <span className="tw:font-mono">{publicHtmlFolder(me)}</span> will be served at{" "}
            <span className="tw:font-mono">{publicHtmlUrl(me.username)}</span>. Public content in S3DF is subject to the{" "}
            <a href={AUP_URL} target="_blank" rel="noreferrer" className={extLink}>SLAC Acceptable Use of Information Technology Resources Policy</a>. See the{" "}
            <a href={STATIC_SITES_URL} target="_blank" rel="noreferrer" className={extLink}>S3DF static sites documentation</a> for details.
          </>
        }
        submitLabel="Request public page"
        initialValues={{ agree: false }}
        fields={[
          {
            name: "agree",
            label: "Terms",
            type: "custom",
            validate: (v) =>
              pendingPublicHtml ? "A request is already in progress" : me.publichtml ? "Your public web page is already on" : v ? undefined : "Please agree to the terms and conditions to turn on your public web page",
            render: ({ value, onChange, disabled }) => (
              <label className="tw:flex tw:items-center tw:gap-2 tw:text-[13px]">
                <Checkbox id="field-agree" checked={!!value} disabled={disabled} onCheckedChange={(v) => onChange(!!v)} />
                I agree to these terms and conditions
              </label>
            ),
          },
        ]}
        onSubmit={async () => {
          await requestPublicHtml({ variables: { request: { reqtype: "UserPublicHtml", publichtml: true } } });
          return { message: "Public web page requested", href: MINE };
        }}
      />

      <RequestDialog
        open={!!storage}
        onOpenChange={close}
        title="Request more storage"
        description={storage && <>On <span className="tw:font-mono">{storage.storagename}</span> for {storage.purpose}. You currently have <span className="tw:tabular-nums">{storage.gigabytes}</span> GB.</>}
        initialValues={{ gigabytes: storage ? String(storage.gigabytes) : "" }}
        fields={[
          {
            name: "gigabytes",
            label: "New quota",
            type: "number",
            suffix: "GB",
            min: 1,
            required: true,
            validate: (v) => {
              const n = Number(v);
              if (!Number.isFinite(n) || n <= 0) return "Enter a size in GB";
              if (storage && n <= storage.gigabytes) return `Must be more than your current ${storage.gigabytes} GB`;
              return undefined;
            },
            helper: "An admin or facility czar reviews quota requests.",
          },
          { name: "notes", label: "Notes", type: "textarea", rows: 3, placeholder: "What the extra space is for" },
        ]}
        onSubmit={async ({ gigabytes, notes }) => {
          await requestQuota({
            variables: {
              request: { reqtype: "UserStorageAllocation", storagename: storage.storagename, purpose: storage.purpose, gigabytes: Number(gigabytes), notes: notes || undefined },
            },
          });
          return { message: "Quota request submitted", href: MINE };
        }}
      />

      <FormDialog
        open={dialog === "add-eppn"}
        onOpenChange={close}
        title="Add an EPPN"
        description="An EPPN (eduPersonPrincipalName) lets you sign in through another institution's identity provider."
        submitLabel="Add EPPN"
        toastMessages={{ loading: "Adding EPPN…", success: "EPPN added" }}
        fields={[
          {
            name: "eppn",
            label: "EPPN",
            type: "text",
            mono: true,
            required: true,
            placeholder: "userid@institution.org",
            validate: (v) => {
              const e = String(v).trim();
              if (!EPPN_RE.test(e)) return "Use a valid EPPN, for example userid@institution.org";
              if (eppns.includes(e)) return `${e} is already on your account`;
              return undefined;
            },
          },
        ]}
        onSubmit={({ eppn }) => updateEppns({ variables: { eppns: [...eppns, eppn.trim()] } })}
      />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={close}
        destructive
        title="Remove this EPPN?"
        description={<>You will no longer be able to sign in as <span className="tw:font-mono">{removeTarget}</span>.</>}
        confirmLabel="Remove EPPN"
        toastMessages={{ loading: "Removing EPPN…", success: "EPPN removed" }}
        onConfirm={() => updateEppns({ variables: { eppns: eppns.filter((e) => e !== removeTarget) } })}
      />
    </>
  );
}
