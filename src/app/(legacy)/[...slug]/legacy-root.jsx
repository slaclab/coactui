"use client";

import dynamic from "next/dynamic";

// Client-only: the legacy app reads localStorage and window at import time and owns its
// own react-router BrowserRouter.
const LegacyApp = dynamic(() => import("@/legacy-app"), { ssr: false });

export default function LegacyRoot() {
  return <LegacyApp />;
}
