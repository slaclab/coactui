import LegacyRoot from "./legacy-root";

// Any URL no redesigned route owns falls through to the legacy SPA. Routes in src/app/(app)
// always win over this catch-all; old URLs that moved are redirected in next.config.mjs.
export default function LegacyPage() {
  return <LegacyRoot />;
}
