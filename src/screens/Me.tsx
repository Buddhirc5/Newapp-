import { useEffect, useState } from "react";
import { Cloud, CloudOff, Copy, Crown, Database, Download, Info, Lock, LogOut, Mail, RefreshCcw, Trash2, UserRound } from "lucide-react";
import { useUpgrade } from "@/components/UpgradeSheet";
import { Page } from "@/components/layout/Page";
import { Mascot } from "@/components/Mascot";
import { TINT } from "@/components/tints";
import { Avatar, Card, IconTile, PointsPill } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { SegmentedControl, Select, TextField } from "@/components/ui/Controls";
import { ListGroup, ListRow } from "@/components/ui/List";
import { AlertDialog, Sheet } from "@/components/ui/Sheet";
import { toast } from "@/components/ui/Toast";
import { OCCUPATIONS } from "@/data/occupations";
import { CITIES } from "@/data/places";
import { SOURCES } from "@/data/pathways";
import { cn } from "@/lib/cn";
import { usePathways } from "@/lib/content";
import { HAS_SUPABASE } from "@/lib/env";
import { formatLkr, relativeDay, todayKey } from "@/lib/format";
import { LANG_LABEL, useT } from "@/lib/i18n";
import { copyText, saveFile } from "@/lib/platform";
import { deleteMyAccount, loadMember, PLAN_NAME, useMember } from "@/lib/community";
import { signOut, useAuth } from "@/lib/sync";
import { SignInSheet } from "@/components/SignInSheet";
import { MemberCard } from "@/components/MemberCard";
import { MyReceipts } from "@/components/MyReceipts";
import { useCanInstall, useInstallAction } from "@/components/InstallApp";
import { BADGES, currentStreak, journeyProgress, totalPoints } from "@/logic/progress";
import { pickData, useApp } from "@/store/app";
import type { Lang, Profile, ThemePref } from "@/types";

export function Me() {
  const t = useT();
  const state = useApp();
  const auth = useAuth();
  const [editing, setEditing] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const showUpgrade = useUpgrade((s) => s.show);
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const memberPlan = useMember((s) => s.profile?.plan);

  // Coming back from PayHere's payment page.
  useEffect(() => {
    const payment = new URLSearchParams(window.location.search).get("payment");
    if (!payment) return;
    window.history.replaceState(null, "", window.location.pathname);
    if (payment === "cancelled") {
      toast("Payment cancelled. Nothing was charged.", "info");
      return;
    }
    toast("Payment received. Your package switches on within a minute.");
    const timer = window.setTimeout(() => void loadMember(), 4000);
    return () => window.clearTimeout(timer);
  }, []);
  const [confirmReset, setConfirmReset] = useState(false);

  const pathway = usePathways()[state.pathId];
  const progress = journeyProgress(pathway, state.tasks);
  const points = totalPoints({ tasks: state.tasks, quizCorrect: state.quiz.correct, practice: state.practice, scamChecks: state.scamChecks });
  const streak = currentStreak(state.activeDays, todayKey());
  const badgeInput = {
    tasks: state.tasks,
    quizCorrect: state.quiz.correct,
    practice: state.practice,
    scamChecks: state.scamChecks,
    finderDone: Boolean(state.finder),
    quizBest: state.quiz.best,
    cvChecked: state.cvChecked,
    savingsGoalSet: state.savings.goalSet,
    docsDone: Object.values(state.docs).filter((d) => d === "done").length,
    streak,
    journeyPercent: progress.percent,
  };
  const earned = BADGES.filter((b) => b.earned(badgeInput)).length;
  const json = () => JSON.stringify(pickData(state), null, 2);

  return (
    <Page title={t("me.title")}>
      <div className="flex flex-col gap-7">
        <Card className="relative overflow-hidden p-5">
          <div className="flex items-center gap-4">
            <Avatar name={state.profile.name || "You"} tint="lavender" size={64} />
            <div className="min-w-0 flex-1">
              <p className="type-display truncate text-title2">{state.profile.name || "Your profile"}</p>
              <p className="mt-0.5 text-subhead text-label-2">{pathway.name} · {progress.percent}% of the journey</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <PointsPill points={points} />
            <span className="inline-flex min-h-11 items-center rounded-full bg-fill-2 px-4 text-subhead font-semibold tabular">{streak}-day streak</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Practice sessions", value: state.practice.length },
              { label: "Quiz best", value: `${state.quiz.best}%` },
              { label: "Scam checks", value: state.scamChecks.length },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-fill px-2 py-3">
                <p className="text-title3 font-bold tabular">{s.value}</p>
                <p className="mt-0.5 text-caption text-label-2">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <MemberCard />

        <section aria-labelledby="badges" className="flex flex-col gap-3">
          <div className="flex items-end justify-between px-1">
            <h2 id="badges" className="text-title3 font-bold">
              Badges
            </h2>
            <span className="text-subhead text-label-2 tabular">
              {earned} of {BADGES.length}
            </span>
          </div>
          <ul className="grid grid-cols-3 gap-3">
            {BADGES.map((b) => {
              const got = b.earned(badgeInput);
              return (
                <li key={b.id} className={cn("flex flex-col items-center gap-2 rounded-tile p-3 text-center", got ? TINT[b.tint].solid : "bg-fill text-label-3")}>
                  <span className={cn("grid size-12 place-items-center rounded-full", got ? "bg-white/70" : "bg-fill-2")}>
                    {got ? <Mascot className="size-10" mood="happy" tint={b.tint === "malibu" ? "lavender" : "malibu"} animate={false} /> : <Lock className="size-5" aria-hidden />}
                  </span>
                  <span className="text-footnote leading-tight font-semibold">{b.title}</span>
                  <span className="sr-only">{got ? "Earned" : "Not earned yet"}: {b.detail}</span>
                  <span className={cn("text-caption leading-tight", got ? "opacity-75" : "")} aria-hidden>
                    {b.detail}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <ListGroup header="Profile">
          <ListRow
            icon={
              <IconTile tint="lavender">
                <UserRound className="size-5" aria-hidden />
              </IconTile>
            }
            title="Edit profile"
            subtitle={`${CITIES.find((c) => c.id === state.profile.city)?.name ?? ""} · savings ${formatLkr(state.profile.savingsLkr)}`}
            accessory="chevron"
            onClick={() => setEditing(true)}
          />
          <ListRow
            icon={
              <IconTile tint="malibu">
                <RefreshCcw className="size-5" aria-hidden />
              </IconTile>
            }
            title="Retake the Pathway Finder"
            accessory="chevron"
            to="/welcome"
          />
        </ListGroup>

        <section className="flex flex-col gap-1.5" aria-labelledby="appearance">
          <h3 id="appearance" className="px-4 text-footnote font-semibold tracking-wide text-label-2 uppercase">
            Appearance
          </h3>
          <SegmentedControl<ThemePref>
            label="Appearance"
            value={state.settings.theme}
            onChange={state.setTheme}
            options={[
              { value: "system", label: "Automatic" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </section>

        <section className="flex flex-col gap-1.5" aria-labelledby="language">
          <h3 id="language" className="px-4 text-footnote font-semibold tracking-wide text-label-2 uppercase">
            {t("language")}
          </h3>
          <SegmentedControl<Lang>
            label="Language"
            value={state.settings.lang}
            onChange={state.setLang}
            options={(Object.keys(LANG_LABEL) as Lang[]).map((l) => ({ value: l, label: <span lang={l}>{LANG_LABEL[l]}</span> }))}
          />
          <p className="px-4 text-footnote text-label-2">Sinhala and Tamil cover navigation and headings (beta). Visa guidance stays in English so nothing is lost in translation.</p>
        </section>

        <ListGroup
          header="Account & sync"
          footer={
            HAS_SUPABASE
              ? auth.user
                ? auth.lastSyncedAt
                  ? `Last synced ${relativeDay(auth.lastSyncedAt).toLowerCase()}.`
                  : "Your progress syncs automatically."
                : "Sign in to back up your progress and use it on other devices."
              : "This copy of KiwiPath runs in local mode: everything is saved in this browser only."
          }
        >
          {HAS_SUPABASE && auth.user ? (
            <>
              <ListRow
                icon={
                  <IconTile tint="teal">
                    <Cloud className="size-5" aria-hidden />
                  </IconTile>
                }
                title={auth.user.email ?? "Signed in"}
                subtitle={auth.status === "error" ? `Sync problem: ${auth.error}` : auth.status === "syncing" ? "Syncing…" : "Synced"}
              />
              <ListRow
                icon={
                  <IconTile tint="coral">
                    <LogOut className="size-5" aria-hidden />
                  </IconTile>
                }
                title="Sign out"
                subtitle="On this device, all devices, or clear this device"
                destructive
                onClick={() => setSigningOut(true)}
              />
              <ListRow
                icon={
                  <IconTile tint="coral">
                    <Trash2 className="size-5" aria-hidden />
                  </IconTile>
                }
                title="Delete my account"
                subtitle="Removes your account and everything you've posted"
                destructive
                onClick={() => setDeleting(true)}
              />
            </>
          ) : HAS_SUPABASE ? (
            <ListRow
              icon={
                <IconTile tint="teal">
                  <Mail className="size-5" aria-hidden />
                </IconTile>
              }
              title="Sign in with email"
              subtitle="Get a one-time code. No password needed."
              accessory="chevron"
              onClick={() => setSigningIn(true)}
            />
          ) : (
            <ListRow
              icon={
                <IconTile tint="gold">
                  <CloudOff className="size-5" aria-hidden />
                </IconTile>
              }
              title="Saved on this device"
            />
          )}
        </ListGroup>

        <ListGroup header="Packages">
          <ListRow
            icon={
              <IconTile tint="gold">
                <Crown className="size-5" aria-hidden />
              </IconTile>
            }
            title={memberPlan === "pro" || memberPlan === "ultra" ? `KiwiPath ${PLAN_NAME[memberPlan]}` : "Main and Ultra packages"}
            subtitle={
              memberPlan === "pro" || memberPlan === "ultra"
                ? "Manage your package"
                : state.waitlist.pro
                  ? "You're on the list for payments"
                  : "AI help, document checks and community after your free month"
            }
            accessory="chevron"
            onClick={() => showUpgrade()}
          />
        </ListGroup>

        <MyReceipts />

        <ListGroup header="Your data" footer="Your data belongs to you. Export it any time, or delete it from this device.">
          <ListRow
            icon={
              <IconTile tint="teal">
                <Download className="size-5" aria-hidden />
              </IconTile>
            }
            title="Export my data"
            subtitle="A JSON file with your profile and progress"
            onClick={async () => {
              const outcome = await saveFile("kiwipath-data.json", json(), "application/json");
              if (outcome === "saved") toast("Data exported");
              else if (outcome === "unavailable") toast("Saving files isn't available here. Use Copy my data instead.", "warn");
            }}
          />
          <ListRow
            icon={
              <IconTile tint="malibu">
                <Copy className="size-5" aria-hidden />
              </IconTile>
            }
            title="Copy my data"
            onClick={async () => toast((await copyText(json())) ? "Data copied" : "Couldn't copy", "info")}
          />
          <ListRow
            icon={
              <IconTile tint="coral">
                <Trash2 className="size-5" aria-hidden />
              </IconTile>
            }
            title="Reset everything"
            destructive
            onClick={() => setConfirmReset(true)}
          />
        </ListGroup>

        <ListGroup header="About">
          <ListRow
            icon={
              <IconTile tint="green">
                <Info className="size-5" aria-hidden />
              </IconTile>
            }
            title="Not immigration advice"
            subtitle="KiwiPath summarises public information. For advice on your situation, talk to a licensed immigration adviser."
          />
          <InstallRow />
          <ListRow
            icon={
              <IconTile tint="teal">
                <Lock className="size-5" aria-hidden />
              </IconTile>
            }
            title="Privacy and your data"
            subtitle="What we keep, who can see it and how to delete it"
            accessory="chevron"
            to="/privacy"
          />
          <ListRow
            icon={
              <IconTile tint="lavender">
                <Database className="size-5" aria-hidden />
              </IconTile>
            }
            title="Official sources"
            subtitle="Immigration New Zealand"
            accessory="external"
            href={SOURCES.inz.href}
          />
        </ListGroup>
        <p className="text-center text-caption text-label-3">KiwiPath 0.1 · Content checked Nov 2026</p>
      </div>

      <ProfileSheet open={editing} onClose={() => setEditing(false)} />
      <SignInSheet open={signingIn} onClose={() => setSigningIn(false)} />
      <SignOutSheet open={signingOut} onClose={() => setSigningOut(false)} onClear={() => state.resetAll()} />
      <DeleteAccountSheet open={deleting} onClose={() => setDeleting(false)} onDeleted={() => state.resetAll()} />
      <AlertDialog
        open={confirmReset}
        title="Reset KiwiPath?"
        message="This deletes your profile, progress and plans from this device. It can't be undone."
        confirmLabel="Reset"
        destructive
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          state.resetAll();
          setConfirmReset(false);
          toast("Everything was reset", "info");
        }}
      />
    </Page>
  );
}

function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);
  const set = (patch: Partial<Profile>) => setProfile(patch);
  return (
    <Sheet open={open} onClose={onClose} title="Edit profile" description="Changes update your budget and suggestions. Retake the Pathway Finder to re-rank your paths." size="tall" footer={<Button block onClick={onClose}>Done</Button>}>
      <div className="flex flex-col gap-4">
        <TextField label="First name" value={profile.name} onChange={(e) => set({ name: e.target.value.slice(0, 40) })} autoComplete="given-name" />
        <Select label="Main goal" value={profile.goal} onChange={(e) => set({ goal: e.target.value as Profile["goal"] })}>
          <option value="study">Study</option>
          <option value="work">Work in my field</option>
          <option value="family">Join my partner or family</option>
          <option value="business">Invest or run a business</option>
          <option value="explore">Not sure yet</option>
        </Select>
        <Select label="Occupation" value={profile.occupationId ?? ""} onChange={(e) => set({ occupationId: e.target.value || null })}>
          <option value="">Not listed</option>
          {OCCUPATIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Qualification" value={profile.qualification} onChange={(e) => set({ qualification: e.target.value as Profile["qualification"] })}>
            <option value="school">A/Levels or certificate</option>
            <option value="diploma">Diploma or trade</option>
            <option value="bachelor">Bachelor's degree</option>
            <option value="postgrad">Postgrad or Masters</option>
            <option value="phd">PhD</option>
          </Select>
          <Select label="Experience" value={profile.experience} onChange={(e) => set({ experience: e.target.value as Profile["experience"] })}>
            <option value="0-1">Under 2 years</option>
            <option value="2-3">2–3 years</option>
            <option value="4-5">4–5 years</option>
            <option value="6+">6+ years</option>
          </Select>
          <Select label="English test" value={profile.english} onChange={(e) => set({ english: e.target.value as Profile["english"] })}>
            <option value="not-started">Not started</option>
            <option value="preparing">Preparing</option>
            <option value="booked">Test booked</option>
            <option value="below">Below IELTS 6.5</option>
            <option value="ready">IELTS 6.5+</option>
          </Select>
          <Select label="City" value={profile.city} onChange={(e) => set({ city: e.target.value as Profile["city"] })}>
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <TextField
          label="Savings (rupees)"
          inputMode="numeric"
          value={String(profile.savingsLkr)}
          onChange={(e) => set({ savingsLkr: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })}
          hint={formatLkr(profile.savingsLkr)}
        />
      </div>
    </Sheet>
  );
}

function SignOutSheet({ open, onClose, onClear }: { open: boolean; onClose: () => void; onClear: () => void }) {
  const [busy, setBusy] = useState(false);
  const run = async (everywhere: boolean, clear: boolean) => {
    setBusy(true);
    await signOut(everywhere);
    if (clear) onClear();
    setBusy(false);
    onClose();
    toast(everywhere ? "Signed out on every device" : clear ? "Signed out and cleared this device" : "Signed out", "info");
  };
  return (
    <Sheet open={open} onClose={onClose} title="Sign out" description="Your progress stays saved in your account.">
      <div className="flex flex-col gap-3">
        <Button block variant="tinted" disabled={busy} onClick={() => run(false, false)}>
          Sign out on this device
        </Button>
        <Button block variant="tinted" disabled={busy} onClick={() => run(false, true)}>
          Sign out and clear this device
        </Button>
        <p className="px-1 text-footnote text-label-2">Use this on a shared or borrowed phone. Your saved progress is removed from this browser only.</p>
        <Button block variant="destructive" disabled={busy} onClick={() => run(true, false)}>
          Sign out of all devices
        </Button>
        <p className="px-1 text-footnote text-label-2">If you think someone else used your account, sign out everywhere.</p>
      </div>
    </Sheet>
  );
}

function DeleteAccountSheet({ open, onClose, onDeleted }: { open: boolean; onClose: () => void; onDeleted: () => void }) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Delete your account?"
      description="This can't be undone."
      footer={
        <Button
          block
          variant="destructive"
          disabled={busy || typed !== "DELETE"}
          onClick={async () => {
            setBusy(true);
            try {
              await deleteMyAccount();
              onDeleted();
              onClose();
              toast("Your account and data were deleted", "info");
            } catch (e) {
              toast((e as Error).message, "warn");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Deleting…" : "Delete my account"}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <ul className="list-disc pl-5 text-subhead text-label-2">
          <li>Your profile, journey, CV drafts, listings, messages, bookings and AI reviews are deleted.</li>
          <li>Uploaded documents and photos are deleted.</li>
          <li>Payment receipts are kept without your name, because the law requires businesses to keep financial records.</li>
          <li>Export your data first from "Your data" if you want a copy.</li>
        </ul>
        <TextField label="Type DELETE to confirm" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value.trim())} />
      </div>
    </Sheet>
  );
}

/** "Install KiwiPath" row, shown only where installing is possible. */
function InstallRow() {
  const can = useCanInstall();
  const { run, sheet } = useInstallAction();
  if (!can) return sheet;
  return (
    <>
      <ListRow
        icon={
          <IconTile tint="green">
            <Download className="size-5" aria-hidden />
          </IconTile>
        }
        title="Install KiwiPath"
        subtitle="Add it to your home screen like an app"
        accessory="chevron"
        onClick={() => void run()}
      />
      {sheet}
    </>
  );
}
