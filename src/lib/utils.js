import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Tailwind runs with prefix(tw) while Bootstrap is still loaded; tailwind-merge must know.
const twMerge = extendTailwindMerge({ prefix: "tw" });

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
