"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConfirmDialog, CopyButton, EmptyState, ErrorAlert, FormDialog, SectionCard, Skeleton } from "../../kit";
import { formatDate } from "../../lib/format";
import { useDialogParam } from "../../lib/navigation";

/** Base URL of the MFA SSH key REST service; the card renders only when it is configured. */
export const SSH_KEYS_SERVER = process.env.NEXT_PUBLIC_SLAC_MFA_SSH_KEYS_SERVER;

const HOUR = 3600000;

async function call(path, init) {
  const res = await fetch(`${SSH_KEYS_SERVER}${path}`, { credentials: "include", ...init });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}${init?.method ? ` — ${await res.text().catch(() => "")}` : ""}`.trim());
  return res;
}

/**
 * REST, not GraphQL, so there is no Apollo cache: the fetched list is held in local state
 * and `refresh()` bumps a tick to refetch. Never mounted when the service is unset.
 */
function useSshKeys(username) {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ tick: -1, keys: null, error: null });
  useEffect(() => {
    let cancelled = false;
    call(`list/${encodeURIComponent(username)}`)
      .then(async (res) => {
        // A misrouted request gets an HTML page with a 200, so don't try to parse it.
        if (!(res.headers.get("content-type") ?? "").includes("application/json")) throw new Error("Unexpected response from the SSH key service");
        const body = await res.json();
        if (!cancelled) setResult({ tick, keys: body.message ?? [], error: null });
      })
      .catch((error) => !cancelled && setResult({ tick, keys: null, error }));
    return () => { cancelled = true; };
  }, [username, tick]);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { keys: result.keys ?? [], loading: result.tick !== tick, error: result.tick === tick ? result.error : null, refresh };
}

// The service stores non-expiring keys with expires_at at the unix epoch.
const neverExpires = (k) => !k.expires_at || Date.parse(k.expires_at) <= 0;

function expiresIn(k) {
  const ms = Date.parse(k.expires_at) - Date.now();
  if (ms <= 0) return { text: "Expired", warn: true };
  if (ms < HOUR) return { text: `Expires in ${Math.max(1, Math.round(ms / 60000))} min`, warn: true };
  if (ms < 48 * HOUR) return { text: `Expires in ${Math.round(ms / HOUR)} h`, warn: false };
  return { text: `Expires ${formatDate(k.expires_at)}`, warn: false };
}

const shortFingerprint = (fp) => (fp && fp.length > 20 ? `${fp.slice(0, 11)}…${fp.slice(-4)}` : fp);

export function SshKeysCard({ username }) {
  const { openDialog } = useDialogParam();
  const { keys, loading, error, refresh } = useSshKeys(username);
  const showExpiry = !keys.every(neverExpires);

  const renew = (fp) =>
    toast.promise(call(`refresh/${encodeURIComponent(username)}/${encodeURIComponent(fp)}`, { method: "PATCH" }).then(refresh), {
      loading: "Renewing key…",
      success: "Key renewed for 24 hours",
      error: (err) => err.message,
    });

  return (
    <SectionCard
      title="SSH keys"
      caption="Keys expire after 24 hours unless renewed"
      action={<Button size="sm" onClick={() => openDialog("ssh-upload")}><Plus />Upload key</Button>}
      bodyClassName="tw:border-t tw:p-0"
    >
      {loading ? (
        Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="tw:flex tw:h-14 tw:items-center tw:border-b tw:px-5 tw:last:border-b-0"><Skeleton className="tw:h-4 tw:w-48" /></div>
        ))
      ) : error ? (
        <ErrorAlert error={error} onRetry={refresh} what="SSH keys" className="tw:m-4" />
      ) : keys.length ? (
        keys.map((k) => {
          const exp = showExpiry && !neverExpires(k) ? expiresIn(k) : null;
          const meta = [k.key_type ?? k.type, k.comment, k.is_active === false && "inactive", k.created_at && `added ${formatDate(k.created_at)}`].filter(Boolean).join(" · ");
          return (
            <div key={k.finger_print} className="tw:flex tw:h-14 tw:items-center tw:gap-3 tw:border-b tw:pr-4 tw:pl-5 tw:last:border-b-0">
              <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col">
                <span className="tw:truncate tw:font-mono tw:text-[13px] tw:leading-4.5" title={k.finger_print}>{shortFingerprint(k.finger_print)}</span>
                {meta && <span className="tw:truncate tw:text-xs tw:text-muted-foreground">{meta}</span>}
              </div>
              <span className={cn("tw:flex tw:w-45 tw:shrink-0 tw:items-center tw:gap-1.5 tw:text-[13px]", exp?.warn && "tw:text-warn-text")}>
                {exp?.warn && <span className="tw:size-1.75 tw:rounded-full tw:bg-warn" aria-hidden />}
                {exp?.text}
              </span>
              <div className="tw:flex tw:gap-1.5">
                <Button variant="outline" size="sm" onClick={() => renew(k.finger_print)}>Renew 24 h</Button>
                <Button variant="outline" size="sm" className="tw:text-crit-text" onClick={() => openDialog("revoke-ssh-key", k.finger_print)}>Revoke</Button>
              </div>
            </div>
          );
        })
      ) : (
        <EmptyState icon={KeyRound} className="tw:m-4 tw:py-8" title="No SSH keys yet" description="Upload a public key to log in with MFA-backed keys" />
      )}
      <SshDialogs username={username} onChanged={refresh} />
    </SectionCard>
  );
}

/* ------------------------------------------------------------------------------------- */

const STEPS = (username) => [
  { note: "Set up the local directory for the keypairs", code: ["mkdir -p ~/.ssh/s3df && chmod 700 ~/.ssh/s3df"] },
  { note: "Generate a new keypair", code: [`ssh-keygen -t ed25519 -f ~/.ssh/s3df/temp-key -C "${username}"`] },
  {
    note: "Name the key by its SHA256 fingerprint",
    code: [
      "fingerprint=$(ssh-keygen -lf ~/.ssh/s3df/temp-key | cut -f2 -d' ' | sed 's|[/+]|.|g')",
      "mv ~/.ssh/s3df/temp-key ~/.ssh/s3df/${fingerprint}",
      "mv ~/.ssh/s3df/temp-key.pub ~/.ssh/s3df/${fingerprint}.pub",
    ],
  },
  { note: "Optionally list old keypairs that have probably expired", code: ["find ~/.ssh/s3df -type f -name 'SHA256:*' ! -name '*.pub' -print0 -atime +14 # -delete"] },
  { note: "Include the S3DF config from your ssh config", code: ["grep -q \"Include ~/.ssh/s3df/s3df.conf\" ~/.ssh/config || sed -i '1s@^@Include ~/.ssh/s3df/s3df.conf\\n\\n@' ~/.ssh/config"] },
  {
    note: "Write the S3DF drop-in config that uses these keys",
    code: [
      "cat > ~/.ssh/s3df/s3df.conf << EOF\nHost sdfssh001 sdfssh001.slac.stanford.edu sdfssh001.sdf.slac.stanford.edu sdfssh002 sdfssh002.slac.stanford.edu sdfssh002.sdf.slac.stanford.edu s3dflogin-mfa.slac.stanford.edu\n$(find ~/.ssh/s3df -type f -name 'SHA256:*' ! -name '*.pub' -print0 | xargs -0 -n1 echo '    IdentityFile ')\nEOF",
    ],
  },
  { note: "Print the public key and paste it below", code: ["ssh-keygen -e -f ~/.ssh/s3df/${fingerprint}"] },
];

function Instructions({ username }) {
  return (
    <ol className="tw:flex tw:max-h-72 tw:list-decimal tw:flex-col tw:gap-3 tw:overflow-y-auto tw:pl-5 tw:text-[13px]">
      {STEPS(username).map((s) => (
        <li key={s.note} className="tw:pl-1">
          <span className="tw:text-muted-strong">{s.note}</span>
          {s.code.map((c) => (
            <div key={c} className="tw:mt-1 tw:flex tw:items-start tw:gap-1 tw:rounded-md tw:bg-muted tw:py-1.5 tw:pr-1 tw:pl-2.5">
              <code className="tw:flex-1 tw:font-mono tw:text-xs tw:break-all tw:whitespace-pre-wrap">{c}</code>
              <CopyButton value={c} label="Copy command" />
            </div>
          ))}
        </li>
      ))}
    </ol>
  );
}

const PLACEHOLDER = `---- BEGIN SSH2 PUBLIC KEY ----
Comment: "256-bit ED25519, converted by user@mylaptop from OpenSSH"
AAAAC3NzaC1lZDI1NTE5AAAAIG+FlqJttIGCNqIewiBPCCTCN2EACKMs8uOCaTlPOY5q
---- END SSH2 PUBLIC KEY ----`;

function SshDialogs({ username, onChanged }) {
  const { dialog, target, closeDialog } = useDialogParam();
  const close = (open) => !open && closeDialog();

  const upload = async ({ public_key }) => {
    await call(`upload/${encodeURIComponent(username)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, public_key: public_key.trim() }),
    });
    onChanged();
  };
  const revoke = async () => {
    await call(`inactivate/${encodeURIComponent(username)}/${encodeURIComponent(target)}`, { method: "DELETE" });
    onChanged();
  };

  return (
    <>
      <FormDialog
        open={dialog === "ssh-upload"}
        onOpenChange={close}
        size="lg"
        title="Upload SSH public key"
        description="Run these commands in a terminal on your own computer, then paste the public key. Time-limited keys let you log in to S3DF without entering your password and Duo each time; register each public key you create."
        submitLabel="Upload"
        toastMessages={{ loading: "Uploading key…", success: "SSH key uploaded" }}
        onSubmit={upload}
        fields={[
          { name: "instructions", label: "Create a keypair", type: "custom", render: () => <Instructions username={username} /> },
          { name: "public_key", label: "Public key", type: "textarea", rows: 5, required: true, placeholder: PLACEHOLDER },
        ]}
      />
      <ConfirmDialog
        open={dialog === "revoke-ssh-key" && !!target}
        onOpenChange={close}
        destructive
        title="Revoke this SSH key?"
        description={<>The key <span className="tw:font-mono">{target}</span> stops working immediately. Upload a new one to log in with keys again.</>}
        confirmLabel="Revoke key"
        toastMessages={{ loading: "Revoking key…", success: "SSH key revoked" }}
        onConfirm={revoke}
      />
    </>
  );
}
