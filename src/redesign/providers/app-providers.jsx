"use client";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApolloProvider } from "./apollo";
import { ThemeProvider } from "./theme";
import { ViewerProvider } from "./viewer";

/** Everything a redesigned page needs, in one place. Mounted by src/app/(app)/layout.jsx. */
export function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <ApolloProvider>
        <ViewerProvider>
          <TooltipProvider delayDuration={300}>
            {children}
            {/* Spec §3 Feedback: Sonner bottom-right; mutations use toast.promise. */}
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </ViewerProvider>
      </ApolloProvider>
    </ThemeProvider>
  );
}
