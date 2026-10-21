import { AppProviders } from "@/redesign/providers/app-providers";
import { AppShell } from "@/redesign/shell/app-shell";

// Every redesigned page: theme, browser-only Apollo, viewer context, toasts — then the shell.
export default function AppLayout({ children }) {
  return (
    <AppProviders>
      <AppShell>{children}</AppShell>
    </AppProviders>
  );
}
