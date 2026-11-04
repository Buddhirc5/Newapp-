import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { BadgeCheck, ChevronRight, MessageCircle, Shield, Sparkles, Store } from "lucide-react";
import { ROLE_LABEL, type Listing } from "@/data/board";
import { cn } from "@/lib/cn";
import { accessLevel, fetchMyListings, trialDaysLeft, updateMember, useMember, type MemberProfile } from "@/lib/community";
import { HAS_SUPABASE } from "@/lib/env";
import { useAuth } from "@/lib/sync";
import { SignInSheet } from "./SignInSheet";
import { Card, IconTile, Meter } from "./ui/Bits";
import { Button } from "./ui/Button";
import { Select, TextArea, TextField } from "./ui/Controls";
import { Sheet } from "./ui/Sheet";
import { toast } from "./ui/Toast";

/** Community membership: trial status, public profile and shortcuts. */
export function MemberCard() {
  const user = useAuth((s) => s.user);
  const { profile, isAdmin } = useMember();
  const [signIn, setSignIn] = useState(false);
  const [editing, setEditing] = useState(false);
  const [mine, setMine] = useState<Listing[]>([]);

  useEffect(() => {
    if (user) fetchMyListings().then(setMine, () => undefined);
  }, [user]);

  if (!HAS_SUPABASE) return null;

  if (!user)
    return (
      <Card className="relative overflow-hidden bg-night p-5 text-paper">
        <Sparkles className="size-6 text-gold" aria-hidden />
        <p className="type-display mt-2 text-title3">Join the KiwiPath community</p>
        <p className="mt-1 text-subhead text-paper/75">Post rooms and pickups, message members and get news alerts. Every feature is free for your first month.</p>
        <Button className="mt-4" variant="light" onClick={() => setSignIn(true)}>
          Sign in with email
        </Button>
        <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
      </Card>
    );

  const days = trialDaysLeft(profile);
  const access = accessLevel(profile);

  return (
    <section className="flex flex-col gap-3" aria-label="Community membership">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-headline font-semibold">
              {profile?.display_name ?? "Member"}
              {profile?.verified && <BadgeCheck className="size-4 text-teal-ink" aria-label="Verified" />}
            </p>
            <p className="text-subhead text-label-2">
              {profile ? ROLE_LABEL[profile.role] : "Loading…"}
              {profile?.city ? ` · ${profile.city}` : ""}
            </p>
          </div>
          <Button size="sm" variant="tinted" onClick={() => setEditing(true)} disabled={!profile}>
            Edit
          </Button>
        </div>
        {profile?.plan === "trial" && (
          <div className="mt-4 rounded-tile bg-gold-soft p-3">
            <p className="text-subhead font-semibold">{days > 0 ? `Free first month: ${days} day${days === 1 ? "" : "s"} left` : "Your free month has ended"}</p>
            <Meter value={days / 30} className="mt-2" barClass="bg-teal-ink" />
            <p className="mt-2 text-footnote text-label-2">
              {access === "full" ? "Every feature is unlocked. Paid sessions with mentors and advisers are always paid separately." : "Core tools stay free. Pro will unlock the extras."}
            </p>
          </div>
        )}
      </Card>
      <ul className="overflow-hidden rounded-tile bg-surface shadow-card">
        <Row to="/board" icon={<Store className="size-5" aria-hidden />} tint="teal" title="My listings" value={String(mine.filter((l) => l.status === "active").length)} />
        <Row to="/chats" icon={<MessageCircle className="size-5" aria-hidden />} tint="lavender" title="Messages" />
        {isAdmin && <Row to="/admin" icon={<Shield className="size-5" aria-hidden />} tint="coral" title="Moderation" />}
      </ul>
      {profile && <ProfileSheet open={editing} onClose={() => setEditing(false)} profile={profile} />}
    </section>
  );
}

function Row({ to, icon, tint, title, value }: { to: string; icon: ReactNode; tint: "teal" | "lavender" | "coral"; title: string; value?: string }) {
  return (
    <li className="group">
      <Link to={to} className="flex items-center gap-3 pl-4 hover:bg-fill">
        <IconTile tint={tint}>{icon}</IconTile>
        <span className="flex min-h-[3.25rem] flex-1 items-center gap-3 border-b border-sep pr-4 group-last:border-b-0">
          <span className="flex-1 text-body">{title}</span>
          {value && <span className="text-body text-label-2 tabular">{value}</span>}
          <ChevronRight className="size-5 text-label-3" aria-hidden />
        </span>
      </Link>
    </li>
  );
}

function ProfileSheet({ open, onClose, profile }: { open: boolean; onClose: () => void; profile: MemberProfile }) {
  const [draft, setDraft] = useState(profile);
  const [busy, setBusy] = useState(false);
  useEffect(() => setDraft(profile), [profile, open]);
  const save = async () => {
    setBusy(true);
    try {
      await updateMember({
        display_name: draft.display_name.trim() || "Member",
        role: draft.role,
        country: draft.country,
        city: draft.city.trim(),
        bio: draft.bio.trim(),
      });
      toast("Profile saved");
      onClose();
    } catch (e) {
      toast((e as Error).message, "warn");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Community profile"
      description="Other members see your name, role, city and bio."
      size="tall"
      footer={
        <Button block onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField label="Display name" maxLength={40} value={draft.display_name} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} />
        <Select label="I am" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as MemberProfile["role"] })}>
          <option value="planner">Planning my move from Sri Lanka</option>
          <option value="newcomer">New in New Zealand</option>
          <option value="helper">Settled in NZ and happy to help</option>
          {draft.role === "provider" && <option value="provider">Verified provider</option>}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Living in" value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value as "lk" | "nz" })}>
            <option value="lk">Sri Lanka</option>
            <option value="nz">New Zealand</option>
          </Select>
          <TextField label="City" maxLength={60} value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
        </div>
        <TextArea label="About you" rows={4} maxLength={400} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />
        <p className={cn("text-footnote text-label-2")}>Lawyers and licensed advisers can become verified providers in the next release.</p>
      </div>
    </Sheet>
  );
}
