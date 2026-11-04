import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { BadgeCheck, CalendarDays, Flag, Heart, Link2, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { CATEGORY_ICON, priceText } from "@/components/ListingCard";
import { Page } from "@/components/layout/Page";
import { Mascot } from "@/components/Mascot";
import { SignInSheet } from "@/components/SignInSheet";
import { TINT } from "@/components/tints";
import { Avatar, Card, Notice, Tag } from "@/components/ui/Bits";
import { Button, IconButton } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Controls";
import { AlertDialog, Sheet } from "@/components/ui/Sheet";
import { toast } from "@/components/ui/Toast";
import { BOARD_RULES, CATEGORY_BY_ID, ROLE_LABEL, SAMPLE_LISTINGS, type Listing } from "@/data/board";
import { cn } from "@/lib/cn";
import { fetchListing, fetchSavedIds, reportTarget, setListingStatus, startConversation, toggleSaved } from "@/lib/community";
import { HAS_SUPABASE } from "@/lib/env";
import { formatLkr, relativeDay } from "@/lib/format";
import { copyText } from "@/lib/platform";
import { useRate } from "@/lib/rates";
import { useAuth } from "@/lib/sync";
import { analyzeMessage } from "@/logic/scam";

export function ListingDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const rate = useRate();
  const [listing, setListing] = useState<Listing | null | undefined>(undefined);
  const [photo, setPhoto] = useState(0);
  const [saved, setSaved] = useState(false);
  const [signIn, setSignIn] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [confirm, setConfirm] = useState<"sold" | "removed" | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sample = SAMPLE_LISTINGS.find((l) => l.id === id);
    if (sample || !HAS_SUPABASE) {
      setListing(sample ?? null);
      return;
    }
    fetchListing(id)
      .then(setListing)
      .catch(() => setListing(null));
  }, [id]);

  useEffect(() => {
    if (user && HAS_SUPABASE) fetchSavedIds().then((ids) => setSaved(ids.has(id)), () => undefined);
  }, [user, id]);

  if (listing === undefined) return <Page title="Listing" back={{ to: "/board", label: "Board" }}><div className="h-80 animate-pulse rounded-card bg-fill-2" /></Page>;
  if (listing === null)
    return (
      <Page title="Listing" back={{ to: "/board", label: "Board" }}>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Mascot mood="thinking" className="w-32" />
          <p className="text-headline font-semibold">This listing isn't available any more</p>
          <Button onClick={() => navigate("/board")}>Back to the Board</Button>
        </div>
      </Page>
    );

  const cat = CATEGORY_BY_ID[listing.category];
  const Icon = CATEGORY_ICON[listing.category];
  const mine = user?.id === listing.owner_id;
  const risk = analyzeMessage(`${listing.title}\n${listing.description}`);
  const needUser = () => {
    if (listing.sample) {
      toast("This is a sample listing", "info");
      return false;
    }
    if (!user) {
      setSignIn(true);
      return false;
    }
    return true;
  };

  const message = async () => {
    if (!needUser()) return;
    setBusy(true);
    try {
      const conv = await startConversation(listing.id);
      navigate(`/chats/${conv}`);
    } catch (e) {
      toast((e as Error).message, "warn");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page title={listing.title} back={{ to: "/board", label: "Board" }} hero={<div className="pb-4" />}>
      <div className="flex flex-col gap-5">
        <div className={cn("relative aspect-[4/3] max-w-full overflow-hidden rounded-card", TINT[cat.tint].solid)}>
          {listing.photos.length ? (
            <img src={listing.photos[photo]} alt={`Photo ${photo + 1} of ${listing.photos.length}`} className="size-full object-cover" />
          ) : (
            <>
              <span className="topo-fill absolute inset-0 text-ink/[0.08]" aria-hidden />
              <Icon className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 opacity-80" aria-hidden />
            </>
          )}
          {listing.photos.length > 1 && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
              {listing.photos.map((_, i) => (
                <button key={i} type="button" onClick={() => setPhoto(i)} aria-label={`Show photo ${i + 1}`} className="grid size-8 place-items-center">
                  <span className={cn("size-2.5 rounded-full", i === photo ? "bg-white" : "bg-white/50")} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            <Tag tint={cat.tint}>{cat.label}</Tag>
            {listing.sample && <Tag tint="lavender" solid={false}>Sample</Tag>}
            {listing.status !== "active" && <Tag tint="coral" solid={false}>{listing.status === "sold" ? "Sold" : "Not visible"}</Tag>}
          </div>
          <h1 className="type-display mt-3 text-title1 leading-tight">{listing.title}</h1>
          <p className="mt-2 text-title2 font-bold tabular">
            {priceText(listing)}
            {listing.price_nzd ? <span className="ml-2 text-callout font-medium text-label-2">≈ {formatLkr(listing.price_nzd * rate.lkrPerNzd)}</span> : null}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-subhead text-label-2">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden /> {[listing.suburb, listing.city].filter(Boolean).join(", ")}
            </span>
            {listing.available_from && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden /> From {new Date(listing.available_from).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}
              </span>
            )}
            <span>Posted {relativeDay(listing.created_at).toLowerCase()}</span>
          </div>
        </div>

        {!mine && (
          <div className="flex gap-2.5">
            <Button className="flex-1" onClick={message} disabled={busy} icon={<MessageCircle className="size-5" aria-hidden />}>
              Message
            </Button>
            <IconButton
              label={saved ? "Remove from saved" : "Save"}
              size="lg"
              variant="tinted"
              onClick={async () => {
                if (!needUser()) return;
                setSaved(!saved);
                try {
                  await toggleSaved(listing.id, !saved);
                } catch (e) {
                  setSaved(saved);
                  toast((e as Error).message, "warn");
                }
              }}
            >
              <Heart className={cn("size-5", saved && "fill-coral text-coral")} aria-hidden />
            </IconButton>
            <IconButton
              label="Copy link"
              size="lg"
              variant="tinted"
              onClick={async () => toast((await copyText(`${location.origin}/board/${listing.id}`)) ? "Link copied" : "Couldn't copy", "info")}
            >
              <Link2 className="size-5" aria-hidden />
            </IconButton>
          </div>
        )}

        {mine && listing.status === "active" && (
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="dark" onClick={() => setConfirm("sold")}>
              Mark as taken
            </Button>
            <Button variant="destructive" onClick={() => setConfirm("removed")}>
              Remove
            </Button>
          </div>
        )}

        {risk.level === "high" || risk.level === "caution" ? (
          <Notice tone="warn" title="Scam Shield noticed something">
            {risk.warnings[0]?.rule.title}. Don't pay anything before you've checked it in person.
          </Notice>
        ) : null}

        <Card className="p-5">
          <p className="text-body leading-relaxed whitespace-pre-wrap">{listing.description}</p>
        </Card>

        {listing.owner && (
          <Card className="flex items-center gap-3 p-4">
            <Avatar name={listing.owner.display_name} size={48} tint="malibu" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-headline font-semibold">
                {listing.owner.display_name}
                {listing.owner.verified && <BadgeCheck className="size-4 text-teal-ink" aria-label="Verified member" />}
              </p>
              <p className="text-footnote text-label-2">{ROLE_LABEL[listing.owner.role] ?? "Member"}</p>
            </div>
          </Card>
        )}

        <section className="rounded-tile bg-green-soft p-4" aria-labelledby="safety">
          <h2 id="safety" className="flex items-center gap-2 text-headline font-semibold">
            <ShieldCheck className="size-5 text-green-ink" aria-hidden /> Stay safe
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5 text-subhead text-label-2">
            {BOARD_RULES.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-green-ink" aria-hidden />
                {r}
              </li>
            ))}
          </ul>
        </section>

        {!mine && (
          <Button variant="plain" className="self-start text-coral-ink" icon={<Flag className="size-4" aria-hidden />} onClick={() => needUser() && setReporting(true)}>
            Report this listing
          </Button>
        )}
      </div>

      <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
      <ReportSheet open={reporting} onClose={() => setReporting(false)} listingId={listing.id} />
      <AlertDialog
        open={confirm !== null}
        title={confirm === "sold" ? "Mark as taken?" : "Remove this listing?"}
        message={confirm === "sold" ? "It will leave the Board, and people can't message you about it." : "It will be removed from the Board."}
        confirmLabel={confirm === "sold" ? "Mark taken" : "Remove"}
        destructive={confirm === "removed"}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          const status = confirm!;
          setConfirm(null);
          try {
            await setListingStatus(listing.id, status);
            toast(status === "sold" ? "Marked as taken" : "Listing removed");
            navigate("/board");
          } catch (e) {
            toast((e as Error).message, "warn");
          }
        }}
      />
    </Page>
  );
}

const REASONS = ["Asks for money before viewing", "Fake or misleading", "Asks for passport or documents", "Offensive or discriminatory", "Other"];

function ReportSheet({ open, onClose, listingId }: { open: boolean; onClose: () => void; listingId: string }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState("");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Report this listing"
      description="Moderators review reports. Listings reported by three members are hidden straight away."
      footer={
        <Button
          block
          variant="destructive"
          onClick={async () => {
            try {
              await reportTarget("listing", listingId, `${reason}${detail ? `: ${detail}` : ""}`.slice(0, 500));
              toast("Thanks. A moderator will review it");
              onClose();
            } catch (e) {
              toast((e as Error).message, "warn");
            }
          }}
        >
          Send report
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Reason">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={reason === r}
              onClick={() => setReason(r)}
              className={cn("min-h-12 rounded-tile px-4 text-left text-callout font-medium", reason === r ? "bg-night text-paper" : "bg-surface shadow-card")}
            >
              {r}
            </button>
          ))}
        </div>
        <TextArea label="Anything else? (optional)" rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} />
      </div>
    </Sheet>
  );
}
