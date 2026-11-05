import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import { IconTile } from "@/components/ui/Bits";
import { ListGroup, ListRow } from "@/components/ui/List";
import { toast } from "@/components/ui/Toast";
import { fetchMyReceipts, useMember, type MyPayment } from "@/lib/community";
import { formatLkr } from "@/lib/format";
import { downloadReceipt, PLAN_ITEM, receiptNumber } from "@/lib/receiptPdf";
import { useAuth } from "@/lib/sync";

/** Me → Receipts: PDF receipts for the member's own payments. Hidden until they've paid. */
export function MyReceipts() {
  const user = useAuth((s) => s.user);
  const profile = useMember((s) => s.profile);
  const [rows, setRows] = useState<MyPayment[]>([]);
  useEffect(() => {
    if (user) fetchMyReceipts().then(setRows, () => setRows([]));
  }, [user]);
  if (!user || rows.length === 0) return null;
  return (
    <ListGroup header="Receipts" footer="PDF receipts for your KiwiPath payments.">
      {rows.map((p) => (
        <ListRow
          key={p.id}
          icon={
            <IconTile tint="green">
              <Receipt className="size-5" aria-hidden />
            </IconTile>
          }
          title={`${(p.plan && PLAN_ITEM[p.plan]) ?? "KiwiPath payment"} · ${p.currency === "LKR" ? formatLkr(Number(p.amount)) : `${p.currency} ${p.amount}`}`}
          subtitle={`${receiptNumber(p.receipt_no)} · ${new Date(p.created_at).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}`}
          accessory="chevron"
          onClick={() =>
            downloadReceipt({
              receiptNo: p.receipt_no,
              date: p.created_at,
              name: profile?.display_name ?? "KiwiPath member",
              email: user.email ?? "",
              description: (p.plan && PLAN_ITEM[p.plan]) ?? "KiwiPath payment",
              periodEnd: p.period_end,
              amount: Number(p.amount),
              currency: p.currency,
              method: p.provider === "payhere" ? "Card via PayHere" : "Recorded by KiwiPath",
              reference: p.provider_ref?.replace(/^pay:/, "PayHere ") ?? null,
              status: p.status,
            }).catch(() => toast("Couldn't make the receipt", "warn"))
          }
        />
      ))}
    </ListGroup>
  );
}
