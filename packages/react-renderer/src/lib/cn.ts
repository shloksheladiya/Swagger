// The standard shadcn/ui `cn()` utility: clsx handles conditional class
// composition, tailwind-merge resolves conflicts between Tailwind classes
// (e.g. `cn("p-md", condition && "p-lg")` correctly keeps only one padding
// class instead of emitting both). Every component that accepts a
// `className` prop should merge it through this, not string concatenation.

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
