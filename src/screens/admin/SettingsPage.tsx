import { ThemeToggle } from "@/components/ThemeToggle";
import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch, TextField } from "@/components/ui/Controls";
import { toast } from "@/components/ui/Toast";
import { fetchSettings, loadMember, saveSetting, type Setting } from "@/lib/community";
import { Panel } from "./charts";
import { Skeleton } from "./Dashboard";

interface Field {
  key: string;
  label: string;
  help: string;
  unit?: string;
  min?: number;
  max?: number;
}

const GROUPS: { title: string; sub: string; fields: Field[] }[] = [
  {
    title: "Packages and prices",
    sub: "What members pay monthly or yearly. Changes apply to new checkouts.",
    fields: [
      { key: "main_price_lkr", label: "Main package", help: "Monthly price in rupees", unit: "Rs", min: 300, max: 50000 },
      { key: "ultra_price_lkr", label: "Ultra package", help: "Monthly price in rupees", unit: "Rs", min: 300, max: 50000 },
      { key: "main_yearly_price_lkr", label: "Main, yearly", help: "Yearly price in rupees", unit: "Rs", min: 3000, max: 500000 },
      { key: "ultra_yearly_price_lkr", label: "Ultra, yearly", help: "Yearly price in rupees", unit: "Rs", min: 3000, max: 500000 },
      { key: "trial_days", label: "Free month length", help: "Days of full access for new members", unit: "days", min: 0, max: 90 },
      { key: "platform_fee_percent", label: "Expert session fee", help: "Share of paid sessions KiwiPath keeps", unit: "%", min: 0, max: 50 },
    ],
  },
  {
    title: "AI",
    sub: "Claude Haiku 5.5 at low effort, with Sonnet 5.5 as the fallback.",
    fields: [
      { key: "ai_enabled", label: "AI features", help: "Document Check, CV polish, SOP drafts and the journey coach. Needs the ANTHROPIC_API_KEY secret." },
      { key: "ai_batch_enabled", label: "Nightly journey review", help: "Half-price batch review for active Main and Ultra members" },
      { key: "ai_daily_limit_trial", label: "Free month limit", help: "AI requests per member per day", unit: "per day", min: 0, max: 500 },
      { key: "ai_daily_limit_pro", label: "Main limit", help: "AI requests per member per day", unit: "per day", min: 0, max: 500 },
      { key: "ai_daily_limit_ultra", label: "Ultra limit", help: "AI requests per member per day", unit: "per day", min: 0, max: 500 },
    ],
  },
  {
    title: "Payments",
    sub: "PayHere monthly and yearly subscriptions.",
    fields: [{ key: "payments_enabled", label: "Online payments", help: "Shows PayHere checkout. Needs the PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET secrets." }],
  },
];
const KNOWN = new Set([...GROUPS.flatMap((g) => g.fields.map((f) => f.key)), "pro_price_lkr", "ai_daily_limit"]);

export function SettingsPage() {
  const [rows, setRows] = useState<Setting[] | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const load = () =>
    fetchSettings().then(
      (s) => {
        setRows(s);
        setDraft(Object.fromEntries(s.map((x) => [x.key, x.value])));
      },
      () => setRows([]),
    );
  useEffect(() => {
    void load();
  }, []);

  const original = useMemo(() => Object.fromEntries((rows ?? []).map((r) => [r.key, r.value])), [rows]);
  const changed = Object.keys(draft).filter((k) => JSON.stringify(draft[k]) !== JSON.stringify(original[k]));
  const invalid = GROUPS.flatMap((g) => g.fields).filter((f) => f.min !== undefined && changed.includes(f.key) && (!Number.isFinite(Number(draft[f.key])) || Number(draft[f.key]) < f.min! || Number(draft[f.key]) > f.max!));

  const save = async () => {
    setBusy(true);
    try {
      for (const key of changed) await saveSetting(key, draft[key]);
      toast(`Saved ${changed.length} setting${changed.length === 1 ? "" : "s"}`);
      await load();
      void loadMember();
    } catch (e) {
      toast((e as Error).message, "warn");
    } finally {
      setBusy(false);
    }
  };

  if (!rows) return <Skeleton h="h-96" />;
  const has = (k: string) => rows.some((r) => r.key === k);
  const other = rows.filter((r) => !KNOWN.has(r.key));

  return (
    <div className="flex flex-col gap-5">
      <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-card bg-night px-4 py-3 text-paper shadow-float">
        <p className="text-subhead">
          {changed.length ? `${changed.length} unsaved change${changed.length === 1 ? "" : "s"}` : "All settings saved"}
          {invalid.length > 0 && <span className="ml-2 text-gold">· check {invalid.map((f) => f.label).join(", ")}</span>}
        </p>
        <div className="flex gap-2">
          {changed.length > 0 && (
            <Button size="sm" variant="plain" className="text-paper" onClick={() => setDraft(original)}>
              Discard
            </Button>
          )}
          <Button size="sm" variant="light" disabled={!changed.length || invalid.length > 0 || busy} icon={<Save className="size-4" aria-hidden />} onClick={save}>
            {busy ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </div>

      <Panel title="Appearance" sub="Light, dark, or match this device. Saved for your account.">
        <ThemeToggle />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-3">
        {GROUPS.map((g) => (
          <Panel key={g.title} title={g.title} sub={g.sub}>
            <ul className="flex flex-col divide-y divide-sep">
              {g.fields
                .filter((f) => has(f.key))
                .map((f) => {
                  const v = draft[f.key];
                  const isBool = typeof original[f.key] === "boolean";
                  return (
                    <li key={f.key} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-callout font-bold">{f.label}</p>
                        <p className="text-footnote text-label-2">{f.help}</p>
                      </div>
                      {isBool ? (
                        <Switch checked={v === true} onChange={(on) => setDraft({ ...draft, [f.key]: on })} label={f.label} />
                      ) : (
                        <div className="flex w-36 shrink-0 items-center gap-2">
                          <TextField
                            label={f.label}
                            hideLabel
                            inputMode="numeric"
                            value={String(v ?? "")}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^\d.]/g, "");
                              setDraft({ ...draft, [f.key]: raw === "" ? "" : Number(raw) });
                            }}
                            className="text-right tabular"
                          />
                          {f.unit && <span className="shrink-0 text-footnote text-label-2">{f.unit}</span>}
                        </div>
                      )}
                    </li>
                  );
                })}
            </ul>
          </Panel>
        ))}
      </div>

      {other.length > 0 && (
        <Panel title="Other settings" sub="Advanced values. Numbers, true/false, or text in quotes.">
          <ul className="grid gap-3 md:grid-cols-2">
            {other.map((s) => (
              <li key={s.key}>
                <TextField
                  label={s.description || s.key}
                  hint={s.key}
                  value={JSON.stringify(draft[s.key] ?? null)}
                  onChange={(e) => {
                    try {
                      setDraft({ ...draft, [s.key]: JSON.parse(e.target.value) });
                    } catch {
                      /* keep typing */
                    }
                  }}
                />
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <p className="px-1 text-footnote text-label-2">Prices, limits and fees are also range-checked by the database, and every change is written to the audit log.</p>
    </div>
  );
}
