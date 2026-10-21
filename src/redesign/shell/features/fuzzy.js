/*
 * Small fuzzy ranking for the ⌘K palette. Pure functions: callers memoize on (rows, query).
 * Score per field: exact > prefix > word-boundary substring > substring > subsequence.
 * The best field wins, earlier fields weigh slightly more (name before facility before PI).
 */

const BOUNDARY = /[-_./\s]/;

function fieldScore(q, text) {
  if (!text) return 0;
  const t = String(text).toLowerCase();
  if (t === q) return 1000;
  if (t.startsWith(q)) return 800 - Math.min(t.length - q.length, 100);
  const idx = t.indexOf(q);
  if (idx > 0) {
    const atBoundary = BOUNDARY.test(t[idx - 1]);
    return (atBoundary ? 600 : 400) - Math.min(idx, 100);
  }
  // Subsequence: every query char in order; reward consecutive runs and boundary hits.
  let ti = 0;
  let score = 0;
  let run = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found < 0) return 0;
    run = found === ti ? run + 1 : 0;
    score += 1 + run * 2 + (found === 0 || BOUNDARY.test(t[found - 1]) ? 3 : 0);
    ti = found + 1;
  }
  return Math.min(score * 4, 300);
}

/** Score `query` against `fields` (strings, most important first). 0 = no match. */
export function fuzzyScore(query, fields) {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  let best = 0;
  fields.forEach((f, i) => {
    const s = fieldScore(q, f);
    if (s > 0) best = Math.max(best, s - i * 25);
  });
  return best;
}

/** Rank `rows` by fuzzy score over `fieldsOf(row)`; top `limit` matches, ties broken by name. */
export function rankBy(rows, query, fieldsOf, limit = 8) {
  if (!rows?.length) return [];
  const scored = [];
  for (const row of rows) {
    const fields = fieldsOf(row);
    const score = fuzzyScore(query, fields);
    if (score > 0) scored.push({ row, score, key: String(fields[0] ?? "") });
  }
  scored.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  return scored.slice(0, limit).map((s) => s.row);
}

export const rankRepos = (rows, query, limit = 8) => rankBy(rows, query, (r) => [r.name, r.facility, r.principal], limit);
export const rankFacilities = (rows, query, limit = 6) => rankBy(rows, query, (f) => [f.name, f.description], limit);
