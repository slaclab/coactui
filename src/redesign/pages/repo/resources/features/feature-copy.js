// What each feature does, from its consumers (features-tab-spec.md "Who reads features").
import { parseOption } from "./option-lint";

const lastKey = (options, key) => {
  let v;
  for (const o of options ?? []) {
    const p = parseOption(o);
    if (p.isObject && p.value[key] != null) v = p.value[key];
  }
  return v;
};

export function featureConsequence(feature) {
  const opts = feature.options ?? [];
  switch (feature.name) {
    case "slurm":
      return "Read on compute-allocation and membership changes. While off, the next allocation change removes this repo’s Slurm account and its users.";
    case "posixgroup": {
      const gid = lastKey(opts, "gidNumber");
      return `On each membership change, coactd adds or removes the member in this LDAP posixGroup${gid != null ? ` (gid ${gid}, created if missing)` : " (created if missing)"}. The API also derives an access group for members from it. Turning it off stops those updates; existing LDAP members stay.`;
    }
    case "netgroup":
      return "On each membership change, coactd adds or removes the member in this LDAP netgroup (created if missing). Turning it off stops those updates; existing LDAP members stay.";
    default:
      return "Stored, but nothing reads it today.";
  }
}

/** Delete confirm copy. */
export function deleteConsequence(feature) {
  switch (feature.name) {
    case "slurm":
      return "This removes slurm from the repo. coactd reads it on compute-allocation and membership changes.";
    case "posixgroup": {
      const gid = lastKey(feature.options, "gidNumber");
      return `This removes posixgroup and its options from the repo. Later membership changes no longer apply it, and the API stops deriving${gid != null ? ` a gid ${gid}` : " an"} access group for members. The LDAP group and its existing members are left as they are.`;
    }
    case "netgroup":
      return "This removes netgroup and its options from the repo. Later membership changes no longer apply it. The LDAP netgroup and its existing members are left as they are.";
    default:
      return `This removes ${feature.name} and its options from the repo. Nothing reads it today.`;
  }
}

export const optionCountLabel = (n) => (n === 1 ? "1 option" : `${n} options`);
