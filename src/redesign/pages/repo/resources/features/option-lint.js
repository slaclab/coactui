// Feature option parsing and advisory lint (features-tab-spec.md "Redesign decisions").
// Options are free-form strings stored byte-for-byte; nothing here rewrites them. Lint only
// mirrors what coactd will do for posixgroup / netgroup, and never blocks a save.

export const FEATURE_NAME_RE = /^[a-z0-9]+$/i;
export const KNOWN_FEATURES = ["slurm", "posixgroup", "netgroup"];
export const POSIXGROUP_TEMPLATE = '{"name": "", "gidNumber": 0}';

const typeOf = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);

/** { isJson, isObject, value, name, gidNumber, gidType, error } */
export function parseOption(raw) {
  try {
    const value = JSON.parse(raw);
    const isObject = typeOf(value) === "object";
    return {
      isJson: true,
      isObject,
      value,
      name: isObject ? value.name : undefined,
      gidNumber: isObject ? value.gidNumber : undefined,
      gidType: isObject && "gidNumber" in value ? typeOf(value.gidNumber) : null,
    };
  } catch (err) {
    return { isJson: false, isObject: false, error: err.message };
  }
}

export const lintsFeature = (featureName) => featureName === "posixgroup" || featureName === "netgroup";

/**
 * Checks for one option: [{ key, label, ok, message? }]. Empty for features nothing parses.
 * posixgroup: JSON object · name · gidNumber (with its value type); netgroup: JSON object · name.
 */
export function lintOption(featureName, raw) {
  if (!lintsFeature(featureName)) return [];
  const p = parseOption(raw);
  const checks = [
    {
      key: "json",
      label: "JSON object",
      ok: p.isObject,
      message: !p.isJson ? "Won’t parse as JSON. coactd will fail on this repo’s next membership change." : !p.isObject ? "Parses, but isn’t a JSON object; coactd reads keys from an object." : undefined,
    },
  ];
  if (p.isObject) {
    checks.push({ key: "name", label: "name", ok: typeof p.name === "string" && p.name !== "", message: "No name: coactd asserts a name exists." });
    if (featureName === "posixgroup") {
      const gidOk = p.gidType === "number" || (p.gidType === "string" && /^\d+$/.test(p.gidNumber));
      checks.push({ key: "gid", label: p.gidType ? `gidNumber · ${p.gidType}` : "gidNumber", ok: gidOk, message: p.gidType ? "gidNumber must be a number or a numeric string (coactd int()s it)." : "No gidNumber: coactd asserts one exists." });
    }
  }
  return checks;
}

/** Whole-feature summary chips for the read view: "JSON object", "name + gidNumber". */
export function featureSummary(featureName, raw) {
  const checks = lintOption(featureName, raw);
  if (!checks.length) return [];
  const json = checks.find((c) => c.key === "json");
  const keys = checks.filter((c) => c.key !== "json");
  const out = [{ label: "JSON object", ok: json.ok }];
  if (json.ok) out.push({ label: featureName === "posixgroup" ? "name + gidNumber" : "name", ok: keys.every((c) => c.ok) });
  return out;
}

/** Indices of options whose exact string appears more than once (allowed but flagged). */
export function duplicateIndices(options) {
  const seen = new Map();
  options.forEach((o, i) => seen.set(o, [...(seen.get(o) ?? []), i]));
  return new Set([...seen.values()].filter((ix) => ix.length > 1).flat());
}

/** Validation that does block a save: empty strings (the only rule the UI enforces today). */
export const emptyIndices = (options) => new Set(options.map((o, i) => (o.trim() === "" ? i : -1)).filter((i) => i >= 0));

export const hasLintWarnings = (featureName, options) => options.some((o) => lintOption(featureName, o).some((c) => !c.ok));
