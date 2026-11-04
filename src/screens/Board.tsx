import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { MessageCircle, Plus, Search } from "lucide-react";
import { CATEGORY_ICON, ListingCard } from "@/components/ListingCard";
import { Page } from "@/components/layout/Page";
import { Mascot } from "@/components/Mascot";
import { Notice } from "@/components/ui/Bits";
import { Button, IconButton } from "@/components/ui/Button";
import { CATEGORIES, NZ_CITIES, SAMPLE_LISTINGS, type Listing, type ListingCategory } from "@/data/board";
import { cn } from "@/lib/cn";
import { fetchListings } from "@/lib/community";
import { HAS_SUPABASE } from "@/lib/env";

export function Board() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<ListingCategory | "all">("all");
  const [city, setCity] = useState("All cities");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [listings, setListings] = useState<Listing[] | null>(HAS_SUPABASE ? null : SAMPLE_LISTINGS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (!HAS_SUPABASE) return;
    let active = true;
    setListings(null);
    fetchListings({ category, city, q: debounced })
      .then((rows) => active && (setListings(rows), setError(null)))
      .catch((e: Error) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [category, city, debounced]);

  const shown = useMemo(() => {
    if (HAS_SUPABASE || !listings) return listings;
    const q = debounced.toLowerCase();
    return listings.filter(
      (l) => (category === "all" || l.category === category) && (city === "All cities" || l.city === city) && (!q || `${l.title} ${l.description} ${l.suburb}`.toLowerCase().includes(q)),
    );
  }, [listings, category, city, debounced]);

  return (
    <Page
      title="Board"
      lead="Rooms, airport pickups, deals and help, posted by Sri Lankans in New Zealand."
      actions={
        <>
          <IconButton label="Messages" onClick={() => navigate("/chats")}>
            <MessageCircle className="size-5" aria-hidden />
          </IconButton>
          <IconButton label="Post a listing" variant="dark" onClick={() => navigate("/board/new")}>
            <Plus className="size-5" aria-hidden />
          </IconButton>
        </>
      }
      wide
    >
      <div className="flex flex-col gap-5">
        {!HAS_SUPABASE && (
          <Notice title="Sample listings">These are examples. Real listings, posting and chat work in the online version of KiwiPath.</Notice>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-label-3" aria-hidden />
            <label htmlFor="board-q" className="sr-only">
              Search the board
            </label>
            <input
              id="board-q"
              type="search"
              placeholder="Search, e.g. room near university"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-12 w-full rounded-full bg-surface py-3 pr-4 pl-12 text-body shadow-card outline-none ring-teal-ink/60 focus:ring-2"
            />
          </div>
          <label className="sr-only" htmlFor="board-city">
            City
          </label>
          <select
            id="board-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="min-h-12 appearance-none rounded-full bg-surface bg-[length:12px] bg-[right_1rem_center] bg-no-repeat px-5 pr-10 text-body shadow-card outline-none focus:ring-2 focus:ring-teal-ink/60"
            style={{ backgroundImage: "var(--chevron)" }}
          >
            {["All cities", ...NZ_CITIES].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="radiogroup" aria-label="Category">
          {[{ id: "all" as const, plural: "All" }, ...CATEGORIES].map((c) => {
            const Icon = c.id === "all" ? null : CATEGORY_ICON[c.id];
            const selected = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setCategory(c.id)}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-subhead font-semibold transition-colors",
                  selected ? "bg-night text-paper" : "bg-surface shadow-card hover:bg-surface-2",
                )}
              >
                {Icon && <Icon className="size-4" aria-hidden />}
                {c.plural}
              </button>
            );
          })}
        </div>

        {error && <Notice tone="warn" title="Couldn't load listings">{error}</Notice>}

        {shown === null ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading listings">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="h-64 animate-pulse rounded-tile bg-fill-2 motion-reduce:animate-none" />
            ))}
          </ul>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-card bg-surface p-8 text-center shadow-card">
            <Mascot mood="thinking" className="w-28" />
            <p className="text-headline font-semibold">Nothing here yet</p>
            <p className="max-w-sm text-subhead text-label-2">Be the first to post a room, a pickup or a tip for newcomers in this category.</p>
            <Button onClick={() => navigate("/board/new")} icon={<Plus className="size-5" aria-hidden />}>
              Post a listing
            </Button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 min-[430px]:grid-cols-2 lg:grid-cols-3">
            {shown.map((l) => (
              <li key={l.id} className="flex">
                <ListingCard listing={l} />
              </li>
            ))}
          </ul>
        )}

        <p className="px-1 text-footnote text-label-2">
          Listings come from members. KiwiPath doesn't inspect properties or handle payments, so read the safety tips on each listing before you
          pay anyone.
        </p>
      </div>
    </Page>
  );
}
