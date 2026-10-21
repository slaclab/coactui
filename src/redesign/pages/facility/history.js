// Facility History (spec §5): compute purchase changes, from FacilityComputeAllocation
// request records (the API writes one per purchase add/edit). Pure, so it is easy to test.

const int = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });

/** Capacity suffix for an "added" entry: "80 GPUs" / "15,360 cores", or null without cluster data. */
function capacity(nodes, cluster) {
  if (!cluster) return null;
  return cluster.nodegpucount ? `${int.format(Math.round(nodes * cluster.nodegpucount))} GPUs` : `${int.format(Math.round(nodes * cluster.nodecpucount))} cores`;
}

/**
 * records: [{ Id, requestedby, timeofrequest, clustername, allocated (nodes), burstPercentOfFacility, approvalstatus }]
 * clusters: [{ name, nodecpucount, nodegpucount }]
 * → newest-first [{ key, actor, verb: "added" | "changed", cluster, change, time, first }]
 *   change = "100 → 120 nodes · burst 20% → 25%" (burst only when it is set and differs).
 */
export function diffPurchaseHistory(records, clusters = []) {
  const byName = Object.fromEntries(clusters.map((c) => [c.name, c]));
  const usable = records
    .filter((r) => r.clustername && r.approvalstatus !== "Rejected")
    .sort((a, b) => String(a.timeofrequest).localeCompare(String(b.timeofrequest)));
  const prevByCluster = {};
  const entries = usable.map((r) => {
    const prev = prevByCluster[r.clustername];
    prevByCluster[r.clustername] = r;
    const nodes = r.allocated ?? 0;
    const burst = r.burstPercentOfFacility ?? 0;
    let change;
    if (!prev) {
      change = [`${int.format(nodes)} nodes`, capacity(nodes, byName[r.clustername]), burst > 0 && `burst ${int.format(burst)}%`].filter(Boolean).join(" · ");
    } else {
      const prevBurst = prev.burstPercentOfFacility ?? 0;
      const parts = [prev.allocated === nodes ? `${int.format(nodes)} nodes (unchanged)` : `${int.format(prev.allocated ?? 0)} → ${int.format(nodes)} nodes`];
      if (prevBurst !== burst && (prevBurst > 0 || burst > 0)) parts.push(`burst ${int.format(prevBurst)}% → ${int.format(burst)}%`);
      change = parts.join(" · ");
    }
    return { key: r.Id, actor: r.requestedby, verb: prev ? "changed" : "added", cluster: r.clustername, change, time: r.timeofrequest, first: false };
  });
  if (entries.length) entries[0].first = true;
  return entries.reverse();
}
