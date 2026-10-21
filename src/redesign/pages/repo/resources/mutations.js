"use client";

import { useCallback, useMemo } from "react";
import { gql, useApolloClient, useMutation } from "@apollo/client";
import { toast } from "sonner";
import { routes } from "../../../lib/routes";
import { useRepo } from "../repo-context";

/*
 * Writes for Compute / Storage / Features. Allocation changes always go through a Coact
 * request; czars and admins approve their own request straight away (spec §6, Bugs list:
 * keep the burst % field and the request + approve chain). Never run these in checks.
 */

const REQUEST_COMPUTE = gql`
  mutation RepoResourcesRequestCompute($request: CoactRequestInput!) {
    requestRepoComputeAllocation(request: $request) { Id }
  }
`;
const REQUEST_STORAGE = gql`
  mutation RepoResourcesRequestStorage($request: CoactRequestInput!) {
    requestRepoStorageAllocation(request: $request) { Id }
  }
`;
const APPROVE = gql`
  mutation RepoResourcesApprove($id: String!) {
    requestApprove(id: $id)
  }
`;

const FEATURE_FIELDS = "Id name facility features { name state options }";
const ADD_FEATURE = gql`
  mutation RepoResourcesAddFeature($repo: RepoInput!, $feature: RepoFeatureInput!) {
    repoAddNewFeature(repo: $repo, feature: $feature) { ${FEATURE_FIELDS} }
  }
`;
const UPDATE_FEATURE = gql`
  mutation RepoResourcesUpdateFeature($repo: RepoInput!, $feature: RepoFeatureInput!) {
    repoUpdateFeature(repo: $repo, feature: $feature) { ${FEATURE_FIELDS} }
  }
`;
const DELETE_FEATURE = gql`
  mutation RepoResourcesDeleteFeature($repo: RepoInput!, $featurename: String!) {
    repoDeleteFeature(repo: $repo, featurename: $featurename) { ${FEATURE_FIELDS} }
  }
`;

const REFETCH = {
  compute: ["RepoComputeAllocations", "RepoComputeRecent", "RepoCore", "RepoResourceRequests", "RepoComputeAllocationDetail"],
  storage: ["RepoStorageAllocations", "RepoResourceRequests", "RepoStorageAllocationDetail"],
  features: ["RepoFeatures", "RepoFeatureHistory", "RepoCore"],
};

/**
 * submit(request, { approve }) → { message, href } for RequestDialog. A failed approve after
 * the request was created is reported (not thrown): the request exists and shows in Requests.
 */
export function useAllocationRequest(kind) {
  const [request] = useMutation(kind === "compute" ? REQUEST_COMPUTE : REQUEST_STORAGE);
  const [approve] = useMutation(APPROVE);
  const client = useApolloClient();
  const field = kind === "compute" ? "requestRepoComputeAllocation" : "requestRepoStorageAllocation";
  return useCallback(
    async (input, { approve: selfApprove }) => {
      const { data } = await request({ variables: { request: input }, refetchQueries: selfApprove ? [] : REFETCH[kind] });
      const id = data?.[field]?.Id;
      const mine = routes.requests({ view: "mine" });
      if (!selfApprove || !id) return { message: "Request submitted", href: mine };
      try {
        await approve({ variables: { id }, refetchQueries: REFETCH[kind] });
      } catch (err) {
        // The request exists (pending): refresh the banners/blocks so it shows up.
        client.refetchQueries({ include: REFETCH[kind] }).catch(() => {});
        return { message: `Request created but not approved: ${err.message}`, href: routes.requests() };
      }
      return { message: "Allocation updated · approved — it can take a few seconds to apply", href: routes.requests() };
    },
    [request, approve, client, field, kind],
  );
}

export const FEATURE_SAVED_COPY =
  "Recorded as a RepoUpdateFeature request and an audit entry. Nothing is provisioned until the next membership or allocation change.";

/** Feature writes (admin only in the API). Options are sent byte-for-byte as typed. */
export function useFeatureMutations() {
  const { facility, name } = useRepo();
  const repo = useMemo(() => ({ facility, name }), [facility, name]);
  const opts = { refetchQueries: REFETCH.features, awaitRefetchQueries: true };
  const [addM] = useMutation(ADD_FEATURE, opts);
  const [updateM] = useMutation(UPDATE_FEATURE, opts);
  const [deleteM] = useMutation(DELETE_FEATURE, opts);

  return useMemo(() => {
    const saved = (featureName) => toast.success(`${featureName} saved`, { description: FEATURE_SAVED_COPY });
    const clean = (f) => ({ name: f.name, state: !!f.state, options: f.options ?? [] });
    // Errors show inline in the dialog (the caller) and as a toast here; rethrown for the caller.
    const failed = (what) => (err) => {
      toast.error(`Couldn’t ${what}`, { description: err.message });
      throw err;
    };
    return {
      add: async (feature) => {
        await addM({ variables: { repo, feature: clean({ ...feature, state: true }) } }).catch(failed(`add ${feature.name}`));
        saved(feature.name);
      },
      update: async (feature) => {
        await updateM({ variables: { repo, feature: clean(feature) } }).catch(failed(`save ${feature.name}`));
        saved(feature.name);
      },
      remove: async (featureName) => {
        await deleteM({ variables: { repo, featurename: featureName } }).catch(failed(`delete ${featureName}`));
        toast.success(`${featureName} deleted`, { description: FEATURE_SAVED_COPY });
      },
    };
  }, [repo, addM, updateM, deleteM]);
}
