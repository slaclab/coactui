import { gql } from "@apollo/client";

/*
 * Every mutation the repo-core tabs send, plus small runners. Never executed by automated
 * checks — the local API is backed by a real data copy.
 *
 * UserInput and CoactRequestInput declare publichtml (and isbot) as Boolean!, so they are
 * always sent (the legacy UI omitted them).
 */

export const REPO_CHANGE_PRINCIPAL = gql`
  mutation RepoCoreChangePrincipal($repo: RepoInput!, $user: UserInput!) {
    repoChangePrincipal(repo: $repo, user: $user) { Id principal }
  }
`;
export const REPO_UPDATE = gql`
  mutation RepoCoreUpdate($repo: RepoInput!) {
    repoUpdate(repo: $repo) { Id description group }
  }
`;
export const REQUEST_COMPUTE_REQUIREMENT = gql`
  mutation RepoCoreRequestComputeRequirement($request: CoactRequestInput!) {
    requestRepoChangeComputeRequirement(request: $request) { Id }
  }
`;
export const REQUEST_APPROVE = gql`
  mutation RepoCoreApproveRequest($id: String!) {
    requestApprove(id: $id)
  }
`;
export const REPO_RENAME = gql`
  mutation RepoCoreRename($repo: RepoInput!, $newname: String!) {
    repoRenameRepo(repo: $repo, newname: $newname) { Id name }
  }
`;
export const REPO_ADD_USER = gql`
  mutation RepoCoreAddUser($repo: RepoInput!, $user: UserInput!) {
    repoAddUser(repo: $repo, user: $user) { Id users }
  }
`;
export const REPO_REMOVE_USER = gql`
  mutation RepoCoreRemoveUser($repo: RepoInput!, $user: UserInput!) {
    repoRemoveUser(repo: $repo, user: $user) { Id users }
  }
`;
export const REPO_TOGGLE_ROLE = gql`
  mutation RepoCoreToggleUserRole($repo: RepoInput!, $user: UserInput!) {
    repoToggleUserRole(repo: $repo, user: $user) { Id leaders }
  }
`;
export const ACCESS_GROUP_CREATE = gql`
  mutation RepoCoreAccessGroupCreate($repo: RepoInput!, $accessgroup: AccessGroupInput!) {
    accessGroupCreate(repo: $repo, accessgroup: $accessgroup) { Id name gidnumber }
  }
`;
export const TOGGLE_GROUP_MEMBERSHIP = gql`
  mutation RepoCoreToggleGroupMembership($repo: RepoInput!, $user: UserInput!, $group: AccessGroupInput!) {
    repoToggleGroupMembership(repo: $repo, user: $user, group: $group) { Id name members }
  }
`;

export const repoKey = (repo) => ({ name: repo.name, facility: repo.facility });
export const userInput = (username) => ({ username, publichtml: false, isbot: false });

export const COMPUTE_REQUIREMENTS = [
  { value: "Normal", label: "Normal" },
  { value: "OnShift", label: "On shift" },
  { value: "OffShift", label: "Off shift" },
];
export const requirementLabel = (v) => COMPUTE_REQUIREMENTS.find((r) => r.value === v)?.label ?? v ?? "Normal";

/** Apollo puts GraphQL errors on result.errors when errorPolicy is "all"; turn them into throws. */
async function mutate(client, mutation, variables, refetchQueries) {
  const res = await client.mutate({ mutation, variables, refetchQueries, awaitRefetchQueries: !!refetchQueries, errorPolicy: "all" });
  if (res.errors?.length) throw new Error(res.errors.map((e) => e.message).join("; "));
  return res.data;
}
export { mutate };

/**
 * Run `fn(item)` for each item, one at a time; a failure never rolls back the others.
 * Resolves to { [key(item)]: true | "error message" } and an `ok` count.
 */
export async function runSequential(items, fn, key = (i) => i, onProgress) {
  const results = {};
  for (const item of items) {
    onProgress?.(key(item), "pending");
    try {
      await fn(item);
      results[key(item)] = true;
    } catch (err) {
      results[key(item)] = err.message ?? String(err);
    }
    onProgress?.(key(item), results[key(item)]);
  }
  const ok = Object.values(results).filter((r) => r === true).length;
  return { results, ok, failed: items.length - ok };
}

/**
 * Compute requirement goes through a Coact request + approve (spec §6), so coactd and
 * History see it. If approve fails after the request was created, the error says so.
 */
export async function setComputeRequirement(client, repo, computerequirement, refetchQueries) {
  const data = await mutate(client, REQUEST_COMPUTE_REQUIREMENT, {
    request: { reqtype: "RepoChangeComputeRequirement", reponame: repo.name, facilityname: repo.facility, computerequirement, publichtml: false },
  });
  const id = data?.requestRepoChangeComputeRequirement?.Id;
  try {
    await mutate(client, REQUEST_APPROVE, { id }, refetchQueries);
  } catch (err) {
    // The request exists either way: refresh History / Pending so it shows up there.
    if (refetchQueries) await client.refetchQueries({ include: refetchQueries }).catch(() => {});
    const e = new Error(`Request created but not approved: ${err.message}`);
    e.requestCreated = true;
    throw e;
  }
  return id;
}

/** Operation names refetched after repo-level changes. */
export const REFETCH = {
  core: ["RepoCore"],
  details: ["RepoCore", "RepoHistory", "RepoPendingRequests"],
  members: ["RepoCore", "RepoMembers", "RepoHistory"],
  groups: ["RepoCore", "RepoAccessGroups", "RepoMembers", "RepoHistory"],
};
