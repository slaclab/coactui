import Link from "next/link";
import { EmptyState } from "@/redesign/kit/states";
import { routes } from "@/redesign/lib/routes";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Page not found"
      description="The page you asked for doesn’t exist or has moved."
      actions={<Link href={routes.repos()} className="tw:rounded-md tw:bg-primary tw:px-3 tw:py-1.5 tw:text-[13px] tw:font-medium tw:text-primary-foreground tw:no-underline">Back to repos</Link>}
    />
  );
}
