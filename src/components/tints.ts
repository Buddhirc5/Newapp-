import type { Tint } from "@/types";

/**
 * Class sets per brand colour. Written out in full so Tailwind can see every class.
 * `solid` fills always carry dark ink text: every brand colour is light enough for it.
 */
export const TINT: Record<Tint, { solid: string; soft: string; text: string; ring: string; dot: string }> = {
  gold: { solid: "bg-gold text-ink", soft: "bg-gold-soft", text: "text-label", ring: "ring-gold", dot: "bg-gold" },
  teal: { solid: "bg-teal text-ink", soft: "bg-teal-soft", text: "text-teal-ink", ring: "ring-teal", dot: "bg-teal" },
  malibu: { solid: "bg-malibu text-ink", soft: "bg-malibu-soft", text: "text-label", ring: "ring-malibu", dot: "bg-malibu" },
  lavender: { solid: "bg-lavender text-ink", soft: "bg-lavender-soft", text: "text-label", ring: "ring-lavender", dot: "bg-lavender" },
  pink: { solid: "bg-pink text-ink", soft: "bg-pink-soft", text: "text-label", ring: "ring-pink", dot: "bg-pink" },
  coral: { solid: "bg-coral text-ink", soft: "bg-coral-soft", text: "text-coral-ink", ring: "ring-coral", dot: "bg-coral" },
  green: { solid: "bg-green text-ink", soft: "bg-green-soft", text: "text-green-ink", ring: "ring-green", dot: "bg-green" },
};

/** Hex values for SVG illustrations, which can't use Tailwind classes. */
export const TINT_HEX: Record<Tint, { body: string; shade: string }> = {
  gold: { body: "#FFDA57", shade: "#E8B92A" },
  teal: { body: "#2BB89F", shade: "#00917A" },
  malibu: { body: "#7DCAF6", shade: "#4FA8DD" },
  lavender: { body: "#A293FF", shade: "#7F6CF0" },
  pink: { body: "#FFBBF4", shade: "#F08FE0" },
  coral: { body: "#F47575", shade: "#D95454" },
  green: { body: "#8FD694", shade: "#5DB765" },
};
