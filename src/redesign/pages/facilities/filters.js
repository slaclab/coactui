// Filter + sort for /facilities, derived from URL state (?q, ?health, ?sort). Pure helpers so
// the card grid and the table agree on order and matches.

export const storageUsedPct = (r) => (r.storage ? (r.storage.usedGb / r.storage.purchasedGb) * 100 : -1);

/** Sort values per preset; the table columns use the same accessors. */
export const SORT_VALUE = {
  name: (r) => r.name.toLowerCase(),
  health: (r) => r.health?.order ?? 99,
  storage: storageUsedPct,
  pending: (r) => r.pending ?? -1,
};
const DESC = { name: false, health: false, storage: true, pending: true };

/** DataTable initialSorting for a preset. Column ids match the preset keys. */
export const tableSorting = (sort) => [{ id: sort, desc: DESC[sort] }];

export function matchesQuery(r, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [r.name, r.description, r.serviceaccount, ...r.czars].some((s) => s?.toLowerCase().includes(needle));
}

export function filterAndSort(rows, { q, health, sort }) {
  const value = SORT_VALUE[sort] ?? SORT_VALUE.name;
  const dir = DESC[sort] ? -1 : 1;
  return rows
    .filter((r) => matchesQuery(r, q) && (!health.length || (r.health && health.includes(r.health.key))))
    .sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      if (va !== vb) return (va < vb ? -1 : 1) * dir;
      return a.name.localeCompare(b.name);
    });
}
