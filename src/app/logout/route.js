import { NextResponse } from "next/server";

// GET /logout → the SSO logout endpoint. Read per request (not inlined at build time), so one
// image serves every deployment: COACT_LOGOUT_URL is runtime config; NEXT_PUBLIC_LOGOUT_URL
// is honoured for parity with the legacy app.
export const dynamic = "force-dynamic";

const DEFAULT_LOGOUT_URL = "https://vouch.slac.stanford.edu/logout";

// Looked up by computed key: Next inlines literal `process.env.NEXT_PUBLIC_*` reads at build time.
const env = (key) => process.env[key];

export function GET() {
  const target = env("COACT_LOGOUT_URL") || env("NEXT_PUBLIC_LOGOUT_URL") || DEFAULT_LOGOUT_URL;
  return NextResponse.redirect(target, 302);
}
