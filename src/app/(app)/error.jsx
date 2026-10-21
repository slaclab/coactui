"use client";

import { EmptyState } from "@/redesign/kit/states";
import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";

// Route-level error boundary: a page that throws renders this inside the shell, so the top
// bar and navigation keep working (spec §9 Error).
export default function AppError({ error, reset }) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title="Something went wrong on this page"
      description={error?.message}
      actions={<Button size="sm" onClick={() => reset()}>Try again</Button>}
    />
  );
}
