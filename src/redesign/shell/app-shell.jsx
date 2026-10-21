"use client";

import { ImpersonationStrip } from "./features/impersonation";
import { ShellSlotsProvider } from "./slots";
import { TopBar } from "./top-bar";

/** App chrome for every redesigned page: TopBar · ImpersonationStrip · main. */
export function AppShell({ children }) {
  return (
    <ShellSlotsProvider>
      <div className="tw-page tw:flex tw:min-h-screen tw:flex-col">
        <TopBar />
        <ImpersonationStrip />
        <main className="tw:flex tw:flex-1 tw:flex-col tw:gap-5 tw:px-6 tw:pt-6 tw:pb-24">{children}</main>
      </div>
    </ShellSlotsProvider>
  );
}
