// Pure storage-usage derivations (no React). Purchases and allocations are in gigabytes.

const ALL = null;

/** Known storage names: the API list plus any name a purchase or allocation references. */
export function knownStorage(storagenames, facilities, repos) {
  return new Set([
    ...storagenames,
    ...facilities.flatMap((f) => (f.storagepurchases ?? []).map((p) => p.storagename)),
    ...repos.flatMap((r) => (r.currentStorageAllocations ?? []).map((a) => a.storagename)),
  ]);
}

/** Purposes present on this storage (purchases ∪ allocations), sorted. */
export function purposesFor(storagename, facilities, repos) {
  return [
    ...new Set([
      ...facilities.flatMap((f) => (f.storagepurchases ?? []).filter((p) => p.storagename === storagename).map((p) => p.purpose)),
      ...repos.flatMap((r) => (r.currentStorageAllocations ?? []).filter((a) => a.storagename === storagename).map((a) => a.purpose)),
    ]),
  ]
    .filter(Boolean)
    .sort();
}

/**
 * One row per facility with a purchase on this storage (summed over purposes for "All"):
 * { facility, purchased, allocated, used, pct } sorted by purchase, largest first.
 */
export function facilityMeterRows(facilities, storagename, purpose = ALL) {
  return facilities
    .map((f) => {
      const ps = (f.storagepurchases ?? []).filter((p) => p.storagename === storagename && (!purpose || p.purpose === purpose));
      if (!ps.length) return null;
      const purchased = ps.reduce((t, p) => t + (p.purchased ?? 0), 0);
      const allocated = ps.reduce((t, p) => t + (p.allocated ?? 0), 0);
      const used = ps.reduce((t, p) => t + (p.used ?? 0), 0);
      return { facility: f.name, purchased, allocated, used, pct: purchased ? (used / purchased) * 100 : null };
    })
    .filter((r) => r && r.purchased > 0)
    .sort((a, b) => b.purchased - a.purchased);
}

/** Current allocations on this storage (and purpose): one row per allocation, pct = used / allocated. */
export function repoRows(repos, storagename, purpose = ALL) {
  return repos.flatMap((r) =>
    (r.currentStorageAllocations ?? [])
      .filter((a) => a.storagename === storagename && (!purpose || a.purpose === purpose))
      .map((a) => {
        const used = a.usage?.gigabytes ?? null;
        return {
          id: a.Id,
          allocationId: a.Id,
          name: r.name,
          facility: r.facility,
          purpose: a.purpose,
          rootfolder: a.rootfolder,
          gigabytes: a.gigabytes ?? 0,
          used,
          pct: a.gigabytes && used != null ? (used / a.gigabytes) * 100 : null,
          inodes: a.inodes ?? null,
          inodesUsed: a.usage?.inodes ?? null,
        };
      }),
  );
}

/** Subtitle totals: summed purchase and the number of purchasing facilities. */
export function purchaseTotals(meterRows) {
  return { purchased: meterRows.reduce((t, r) => t + r.purchased, 0), facilities: meterRows.length };
}
