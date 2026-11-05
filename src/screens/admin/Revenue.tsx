import { useEffect, useMemo, useState } from "react";
import { FileDown, Receipt, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select, TextField } from "@/components/ui/Controls";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { fetchSettings, type Setting } from "@/lib/community";
import { formatLkr, formatNumber } from "@/lib/format";
import { downloadReceipt, PLAN_ITEM, receiptNumber } from "@/lib/receiptPdf";
import { downloadCsv, fetchPayments, isCharge, PLAN_LABEL, type Payment } from "./api";
import { Insight, Kpi, LineChart, Panel, Pills, SegmentBar, toWeekly, type Row, type Series } from "./charts";
import { RangeBar, Skeleton, useAnalytics, type Range } from "./Dashboard";

const MONEY: Series[] = [{ key: "revenue", label: "Revenue (Rs)", slot: 1 }];
const STATUS_TONE: Record<string, string> = {
  paid: "bg-green-soft text-green-ink",
  pending: "bg-gold-soft text-ink",
  failed: "bg-coral-soft text-coral-ink",
  cancelled: "bg-fill-2 text-label-2",
  refunded: "bg-lavender-soft text-ink",
};

export function receiptFor(p: Payment) {
  return {
    receiptNo: p.receipt_no,
    date: p.created_at,
    name: p.display_name ?? "KiwiPath member",
    email: p.email ?? "",
    description: (p.plan && PLAN_ITEM[p.plan]) ?? (p.kind === "session" ? "Expert session" : "KiwiPath payment"),
    periodEnd: p.period_end,
    amount: Number(p.amount),
    currency: p.currency,
    method: p.provider === "payhere" ? "Card via PayHere" : p.provider === "manual" ? "Recorded by KiwiPath" : p.provider,
    reference: p.provider_ref?.replace(/^pay:/, "PayHere ") ?? null,
    status: p.status,
  };
}

export function Revenue() {
  const [range, setRange] = useState<Range>("30");
  const [grain, setGrain] = useState<"daily" | "weekly">("daily");
  const { data, error } = useAnalytics(range);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("charges");

  useEffect(() => {
    setPayments(null);
    fetchPayments(Math.max(Number(range), 30)).then(setPayments, (e: Error) => (toast(e.message, "warn"), setPayments([])));
  }, [range]);
  useEffect(() => {
    fetchSettings().then(setSettings, () => undefined);
  }, []);

  const rows = useMemo<Row[]>(() => (data ? (grain === "weekly" ? toWeekly(data.daily, ["revenue"]) : data.daily) : []), [data, grain]);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (payments ?? [])
      .filter((p) => (status === "charges" ? isCharge(p) : status === "all" ? true : p.status === status))
      .filter((p) => !term || [p.display_name, p.email, p.provider_ref, receiptNumber(p.receipt_no)].some((v) => (v ?? "").toLowerCase().includes(term)));
  }, [payments, q, status]);

  if (error) return <p className="rounded-card bg-coral-soft p-5 text-subhead text-coral-ink">{error}</p>;
  const k = data?.kpis;
  const paymentsOn = settings.find((s) => s.key === "payments_enabled")?.value === true;
  const arpu = k && k.paying ? k.mrr_lkr / k.paying : 0;

  return (
    <div className="flex flex-col gap-5">
      <RangeBar range={range} setRange={setRange}>
        <Button
          size="sm"
          variant="dark"
          disabled={!shown.length}
          icon={<FileDown className="size-4" aria-hidden />}
          onClick={() =>
            downloadCsv(
              "kiwipath-payments",
              shown.map((p) => ({
                receipt: receiptNumber(p.receipt_no),
                date: p.created_at,
                member: p.display_name,
                email: p.email,
                package: p.plan ? PLAN_LABEL[p.plan] : p.kind,
                amount: p.amount,
                currency: p.currency,
                status: p.status,
                provider: p.provider,
                reference: p.provider_ref,
                access_until: p.period_end,
              })),
            )
          }
        >
          Payments (CSV)
        </Button>
      </RangeBar>

      <div className={cn("flex flex-wrap items-center gap-3 rounded-card border-l-4 bg-surface p-4 shadow-card", paymentsOn ? "border-green-ink" : "border-gold")}>
        <p className="min-w-0 flex-1 text-subhead">
          {paymentsOn ? (
            <>
              <b>Online payments are on.</b> PayHere checkout is live for Main and Ultra.
            </>
          ) : (
            <>
              <b>Online payments are off.</b> Members see "Tell me when payments open". Add the PayHere secrets in Supabase and turn on payments_enabled in Settings.
            </>
          )}
        </p>
      </div>

      {!k ? (
        <Skeleton h="h-32" />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Monthly revenue" value={formatLkr(k.mrr_lkr)} sub="MRR, active packages" tone="blue" />
          <Kpi label="Collected" value={formatLkr(k.revenue_lkr)} sub="in this range" />
          <Kpi label="Lifetime" value={formatLkr(k.revenue_all_lkr)} sub="all successful charges" tone="muted" />
          <Kpi label="Paying members" value={formatNumber(k.paying)} sub={`${k.main} Main · ${k.ultra} Ultra`} />
          <Kpi label="Avg per payer" value={formatLkr(arpu)} sub="ARPU per month" tone="gold" />
          <Kpi label="Expert fees" value={formatLkr(k.platform_fees_lkr)} sub={`from ${formatLkr(k.bookings_value_lkr)} of sessions`} tone="green" />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Revenue over time"
          sub="Successful package charges, in rupees."
          actions={
            <Pills
              label="Chart grain"
              dark
              value={grain}
              onChange={setGrain}
              options={[
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
              ]}
            />
          }
        >
          {data ? <LineChart rows={rows} series={MONEY} label="Revenue per day" format={(n) => formatNumber(n)} weekly={grain === "weekly"} /> : <Skeleton h="h-64" />}
        </Panel>
        <Panel title="Package mix" sub="Share of monthly revenue.">
          {k ? (
            <>
              <SegmentBar
                format={formatLkr}
                parts={[
                  { label: "Ultra", value: k.ultra * k.ultra_price, slot: 1 },
                  { label: "Main", value: k.main * k.main_price, slot: 2 },
                ]}
              />
              <Insight
                label="Free month"
                title="Members who could upgrade"
                value={formatNumber(k.trial + k.free)}
                sub={`Each upgrade to Main adds ${formatLkr(k.main_price)} a month`}
                status="info"
              />
            </>
          ) : (
            <Skeleton />
          )}
        </Panel>
      </div>

      <Panel title="Payments and receipts" sub={`${shown.length} shown. Download a PDF receipt for any charge.`}>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-label-3" aria-hidden />
            <TextField label="Search payments" hideLabel placeholder="Search name, email, receipt or reference" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
          </div>
          <Select label="Status" hideLabel value={status} onChange={(e) => setStatus(e.target.value)} wrapClassName="w-full sm:w-64">
            <option value="charges">Successful charges</option>
            <option value="all">Everything</option>
            <option value="pending">Pending checkouts</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </Select>
        </div>
        {!payments ? (
          <Skeleton />
        ) : shown.length === 0 ? (
          <p className="py-6 text-center text-subhead text-label-2">No payments yet. They'll appear here as soon as members pay through PayHere.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-subhead">
              <thead className="text-caption font-bold tracking-wide text-label-2 uppercase">
                <tr>
                  <th className="py-2 pr-3">Receipt</th>
                  <th className="px-3 py-2">Member</th>
                  <th className="px-3 py-2">Package</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="py-2 pl-3" />
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id} className="border-t border-sep">
                    <td className="py-2.5 pr-3 font-mono text-footnote">{receiptNumber(p.receipt_no)}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold">{p.display_name ?? "Deleted member"}</p>
                      <p className="text-footnote text-label-2">{p.email ?? "—"}</p>
                    </td>
                    <td className="px-3 py-2.5">{p.plan ? PLAN_LABEL[p.plan] : p.kind}</td>
                    <td className="px-3 py-2.5 text-right font-bold tabular">{p.currency === "LKR" ? formatLkr(Number(p.amount)) : `${p.currency} ${p.amount}`}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("rounded-full px-2.5 py-1 text-caption font-bold capitalize", STATUS_TONE[p.status] ?? "bg-fill-2")}>{p.status}</span>
                    </td>
                    <td className="px-3 py-2.5 text-footnote text-label-2">{new Date(p.created_at).toLocaleString("en-NZ", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</td>
                    <td className="py-2.5 pl-3 text-right">
                      {isCharge(p) && p.status === "paid" && (
                        <Button size="sm" variant="tinted" icon={<Receipt className="size-4" aria-hidden />} onClick={() => downloadReceipt(receiptFor(p)).catch(() => toast("Couldn't make the receipt", "warn"))}>
                          Receipt
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
