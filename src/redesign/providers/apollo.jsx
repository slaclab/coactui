"use client";

import { useSyncExternalStore } from "react";
import { ApolloClient, ApolloLink, ApolloProvider as Provider, HttpLink, InMemoryCache } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";

// Browser-only Apollo client. GraphQL never runs on the Next server (plan §0): coact-api
// trusts identity headers from any in-cluster caller.
function makeClient() {
  // Per-operation headers (spec "Apollo"): pass `context: { showAll }` from scope tabs.
  // Impersonation reuses the legacy app's localStorage key so both halves agree.
  const headers = setContext((_, { headers: h, showAll }) => {
    const imp = window.localStorage.getItem("imptk");
    return {
      headers: {
        ...h,
        ...(imp && imp !== "null" ? { coactimp: imp } : {}),
        coactshowall: String(!!showAll),
      },
    };
  });
  // An expired Vouch session turns /graphql into a cross-origin redirect, which fetch reports
  // as a network error rather than a 401 (plan §3.3). Surface it once for the shell to show.
  const network = onError(({ networkError }) => {
    if (networkError) window.dispatchEvent(new CustomEvent("coact:network-error", { detail: networkError }));
  });
  return new ApolloClient({
    link: ApolloLink.from([network, headers, new HttpLink({ uri: process.env.NEXT_PUBLIC_COACT_GRAPHQL_URI || "/graphql" })]),
    // The API emits `Id`, not `id`, and legacy documents select partial objects, so no
    // keyFields yet (plan §3.1). Refetch after mutations with `refetchQueries`.
    cache: new InMemoryCache(),
    defaultOptions: { watchQuery: { errorPolicy: "all" }, query: { errorPolicy: "all" } },
  });
}

let client;
const getClient = () => (client ??= makeClient());

// true after hydration, false on the server and during the hydrating render.
const subscribe = () => () => {};
export function useMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

/**
 * Data components must render under <ClientOnly>: the server and the hydrating render show
 * `fallback` (the page skeleton), then the subtree mounts in the browser and queries run.
 */
export function ClientOnly({ children, fallback = null }) {
  return useMounted() ? children : fallback;
}

export function ApolloProvider({ children }) {
  // Constructing the client is side-effect free (window is only touched per operation), so
  // the provider renders on the server too and the tree never remounts after hydration.
  // Nothing queries on the server: data components sit under <ClientOnly>.
  return <Provider client={getClient()}>{children}</Provider>;
}
