import { Link } from "react-router";
import { BadgeCheck, Briefcase, Car, House, BedDouble, ShoppingBag, Tag as TagIcon, Utensils, HeartHandshake, type LucideIcon } from "lucide-react";
import { CATEGORY_BY_ID, UNIT_LABEL, type Listing, type ListingCategory } from "@/data/board";
import { cn } from "@/lib/cn";
import { formatNzd, relativeDay } from "@/lib/format";
import { TINT } from "./tints";

export const CATEGORY_ICON: Record<ListingCategory, LucideIcon> = {
  room: BedDouble,
  flat: House,
  homestay: Utensils,
  pickup: Car,
  item: ShoppingBag,
  job: Briefcase,
  deal: TagIcon,
  service: HeartHandshake,
};

export function priceText(l: Pick<Listing, "price_nzd" | "price_unit">): string {
  if (l.price_unit === "free" || l.price_nzd === null || l.price_nzd === 0) return "Free";
  return `${formatNzd(l.price_nzd)}${UNIT_LABEL[l.price_unit]}`;
}

export function ListingCard({ listing }: { listing: Listing }) {
  const cat = CATEGORY_BY_ID[listing.category];
  const Icon = CATEGORY_ICON[listing.category];
  const photo = listing.photos[0];
  return (
    <Link
      to={`/board/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-tile bg-surface shadow-card transition-transform active:scale-[0.99]"
    >
      <div className={cn("relative aspect-[16/10] max-w-full overflow-hidden", TINT[cat.tint].solid)}>
        {photo ? (
          <img src={photo} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <>
            <span className="topo-fill absolute inset-0 text-ink/[0.08]" aria-hidden />
            <Icon className="absolute top-1/2 left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 opacity-80" aria-hidden />
          </>
        )}
        <span className="absolute top-2.5 left-2.5 rounded-full bg-white/90 px-2.5 py-0.5 text-caption font-semibold text-ink">{cat.label}</span>
        {listing.sample && <span className="absolute top-2.5 right-2.5 rounded-full bg-night px-2.5 py-0.5 text-caption font-semibold text-paper">Sample</span>}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <p className="text-headline font-bold tabular">{priceText(listing)}</p>
        <p className="line-clamp-2 text-subhead font-medium">{listing.title}</p>
        <p className="mt-auto pt-1 text-footnote text-label-2">
          {[listing.suburb, listing.city].filter(Boolean).join(", ")} · {relativeDay(listing.created_at)}
        </p>
        {listing.owner?.verified && (
          <p className="inline-flex items-center gap-1 text-caption font-semibold text-teal-ink">
            <BadgeCheck className="size-3.5" aria-hidden /> Verified member
          </p>
        )}
      </div>
    </Link>
  );
}
