import { NextResponse } from "next/server";

// Local development only: stand in for the Vouch/nginx ingress in front of coact-api.
//
// In the cluster the ingress routes /graphql straight to coact-api and adds the identity
// headers, so COACT_API_DEV_URL is unset and this proxy only passes requests through.
// Locally (docker compose or `next dev`) it forwards /graphql to the API and, when the
// API's own DEV_MODE flag is on, adds the identity header the API reads (USERNAME_FIELD)
// for its DEV_USERNAME — the same values coact-api's dev_middleware was written to use.
//
// Client-supplied identity headers are always stripped, so a browser can never pick a user.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const truthy = (v) => /^(1|true|yes|on)$/i.test(v ?? "");

export function proxy(request) {
  const api = process.env.COACT_API_DEV_URL;
  if (!api) return NextResponse.next();

  const headers = new Headers(request.headers);
  const userField = process.env.USERNAME_FIELD;
  const eppnField = process.env.EPPN_FIELD;
  for (const h of [userField, eppnField, "x-vouch-user", "remote_user"]) if (h) headers.delete(h);

  // Inject only for requests addressed to this machine. request.nextUrl reflects the server's
  // bind address, so check the Host (and any X-Forwarded-Host) the client actually sent.
  const hostOf = (h) => (h ?? "").split(",")[0].trim().replace(/:\d+$/, "").toLowerCase();
  const forwarded = request.headers.get("x-forwarded-host");
  const local = LOCAL_HOSTS.has(hostOf(request.headers.get("host"))) && (!forwarded || LOCAL_HOSTS.has(hostOf(forwarded)));
  const devUser = process.env.DEV_USERNAME;
  if (truthy(process.env.DEV_MODE) && userField && devUser && local) {
    headers.set(userField, devUser);
  }
  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, api);
  return NextResponse.rewrite(target, { request: { headers } });
}

export const config = { matcher: ["/graphql", "/graphql/:path*"] };
