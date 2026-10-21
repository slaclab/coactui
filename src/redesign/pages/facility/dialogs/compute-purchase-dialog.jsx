"use client";

import { useMutation } from "@apollo/client";
import { Info } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormDialog } from "../../../kit";
import { formatInt, formatPct } from "../../../lib/format";
import { useFacility } from "../facility-context";
import { COMPUTE_PURCHASE, usePurchaseCoverage, useSharedRepoShares } from "../queries";

const nodesOf = (purchase, pct) => (purchase * pct) / 100;
const fmtNodes = (n) => (Number.isInteger(n) ? formatInt(n) : n.toFixed(1));
const isNum = (v) => v !== "" && v != null && Number.isFinite(Number(v));

function capacityHelper(cluster, nodes) {
  if (!cluster) return "Decimals allowed.";
  const n = isNum(nodes) ? Number(nodes) : 0;
  return cluster.nodegpucount ? `= ${formatInt(Math.round(n * cluster.nodegpucount))} GPUs` : `= ${formatInt(Math.round(n * cluster.nodecpucount))} cores`;
}

/**
 * Add / edit a compute purchase (admin only; spec §5). ?target=<cluster> edits that cluster's
 * purchase; no target adds one on a cluster without a purchase. The API records a
 * FacilityComputeAllocation request itself, which feeds the History tab.
 */
export function ComputePurchaseDialog({ open, onOpenChange, target }) {
  const { name, facility, shares: ctxShares } = useFacility();
  const { clusters, unpurchased } = usePurchaseCoverage(facility);
  const shares = useSharedRepoShares(ctxShares, name, open);
  const [save] = useMutation(COMPUTE_PURCHASE);
  const existing = (facility?.computepurchases ?? []).find((p) => p.clustername === target);
  const editing = !!existing;
  const clusterByName = Object.fromEntries(clusters.map((c) => [c.name, c]));

  const fields = [
    !editing && {
      name: "cluster",
      label: "Cluster",
      type: "select",
      required: true,
      placeholder: unpurchased.length ? "Choose a cluster…" : "Every cluster has a purchase",
      options: unpurchased.map((c) => ({ value: c.name, label: c.name })),
    },
    {
      name: "nodes",
      label: "Nodes",
      type: "number",
      min: 0,
      step: "any",
      suffix: "nodes",
      required: true,
      helper: (v) => capacityHelper(clusterByName[editing ? target : v.cluster], v.nodes),
      validate: (v) => (!isNum(v) ? "Enter a number of nodes" : Number(v) < 0 ? "Nodes can't be negative" : undefined),
    },
    {
      name: "burst",
      label: "Burst",
      type: "number",
      min: 0,
      step: "any",
      suffix: "%",
      helper: `Extra capacity above the purchase that ${name} jobs may burst into, as % of purchase.`,
      validate: (v) => (v === "" || v == null ? undefined : !isNum(v) ? "Enter a percentage" : Number(v) < 0 ? "Burst can't be negative" : undefined),
    },
  ].filter(Boolean);

  const preview = (values) => {
    const cluster = editing ? target : values.cluster;
    if (!cluster) return null;
    const list = shares.byCluster[cluster] ?? [];
    const total = list.reduce((t, s) => t + s.pct, 0);
    const before = existing?.purchased ?? 0;
    const after = isNum(values.nodes) ? Number(values.nodes) : before;
    return (
      <Alert>
        <Info />
        <AlertDescription className="tw:flex tw:flex-col tw:gap-2 tw:text-[13px]">
          <span className="tw:text-foreground">
            {shares.loading ? "Loading repo shares…" : list.length ? `Repo shares stay at ${formatPct(total)} allocated.` : `No repos are allocated on ${cluster} yet.`}
          </span>
          {list.length > 0 && (
            <ul className="tw:flex tw:flex-col tw:gap-1">
              {list.slice(0, 3).map((s) => (
                <li key={s.repo} className="tw:flex tw:items-baseline tw:gap-2 tw:tabular-nums">
                  <span className="tw:min-w-0 tw:flex-1 tw:truncate tw:font-mono tw:text-foreground">{s.repo}</span>
                  <span>{formatPct(s.pct)}</span>
                  <span className="tw:w-32 tw:text-right">{fmtNodes(nodesOf(before, s.pct))} → {fmtNodes(nodesOf(after, s.pct))} nodes</span>
                </li>
              ))}
            </ul>
          )}
          <span className="tw:text-xs tw:text-muted-foreground">Stored repo node allocations are computed when allocated and will not update automatically.</span>
        </AlertDescription>
      </Alert>
    );
  };

  const onSubmit = (values) =>
    save({
      variables: {
        facility: { name },
        cluster: { name: editing ? target : values.cluster },
        purchase: Number(values.nodes),
        burstPercent: isNum(values.burst) ? Number(values.burst) : 0,
      },
      refetchQueries: ["FacilityCore", "FacilityRollups", "FacilityPurchaseHistory", "RedesignClusters"],
      awaitRefetchQueries: true,
    });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? `${target} · compute purchase` : "Add compute purchase"}
      description={editing ? `Change ${name}'s purchase on ${target}.` : `Purchase nodes for ${name} on a cluster it doesn't have yet.`}
      fields={fields}
      initialValues={editing ? { nodes: String(existing.purchased), burst: String(existing.burstPercent ?? 0) } : { cluster: unpurchased.some((c) => c.name === target) ? target : "", burst: "0" }}
      submitLabel={editing ? "Save purchase" : "Add purchase"}
      onSubmit={onSubmit}
      preview={preview}
      toastMessages={{ loading: "Saving purchase…", success: editing ? `${target} purchase updated` : "Compute purchase added" }}
    />
  );
}
