import { extendTailwindMerge } from "tailwind-merge";

type ClassValue = string | false | null | undefined | 0;

// Teach tailwind-merge the app's own type scale, radii and shadows, so that
// `text-subhead` (a size) never knocks out `text-paper` (a colour).
const merge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["caption", "caption2", "footnote", "subhead", "callout", "body", "headline", "title1", "title2", "title3", "large-title", "hero"],
      radius: ["card", "tile", "sheet"],
      shadow: ["card", "float"],
    },
  },
});

/** Joins class names, skipping falsy values. Later classes win when two set the same property. */
export function cn(...values: ClassValue[]): string {
  return merge(values.filter(Boolean).join(" "));
}
