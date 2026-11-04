import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Newspaper } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { RequireMember } from "@/components/RequireMember";
import { Card, Notice, SectionHeader } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import type { Listing } from "@/data/board";
import { fetchHiddenListings, fetchOpenReports, refreshNews, resolveReports, useMember, type ReportRow } from "@/lib/community";
import { relativeDay } from "@/lib/format";

export function Admin() {
  return (
    <Page title="Moderation" back={{ to: "/me", label: "Me" }}>
      <RequireMember reason="Sign in as a moderator.">
        <AdminBody />
      </RequireMember>
    </Page>
  );
}

function AdminBody() {
  const isAdmin = useMember((s) => s.isAdmin);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [hidden, setHidden] = useState<Listing[]>([]);

  const load = () => {
    fetchOpenReports().then(setReports, () => undefined);
    fetchHiddenListings().then(setHidden, () => undefined);
  };
  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (!isAdmin) return <Notice tone="warn" title="Moderators only">Ask the KiwiPath owner to add your account to the admins table.</Notice>;

  const act = async (id: string, status?: Listing["status"]) => {
    try {
      await resolveReports(id, status);
      toast("Done");
      load();
    } catch (e) {
      toast((e as Error).message, "warn");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="tinted"
        icon={<Newspaper className="size-5" aria-hidden />}
        onClick={async () => {
          await refreshNews().catch(() => undefined);
          toast("News refreshed");
        }}
      >
        Fetch immigration news now
      </Button>

      <section className="flex flex-col gap-3">
        <SectionHeader title={`Hidden listings (${hidden.length})`} />
        {hidden.length === 0 && <p className="px-1 text-subhead text-label-2">Nothing is waiting for review.</p>}
        {hidden.map((l) => (
          <Card key={l.id} className="flex flex-col gap-3 p-4">
            <div>
              <Link to={`/board/${l.id}`} className="text-headline font-semibold text-teal-ink">
                {l.title}
              </Link>
              <p className="text-footnote text-label-2">
                {l.city} · by {l.owner?.display_name ?? "member"} · {relativeDay(l.created_at)}
              </p>
            </div>
            <ul className="text-subhead text-label-2">
              {reports
                .filter((r) => r.target_id === l.id)
                .map((r) => (
                  <li key={r.id}>• {r.reason}</li>
                ))}
            </ul>
            <div className="grid grid-cols-2 gap-2">
              <Button size="md" variant="tinted" onClick={() => act(l.id, "active")}>
                Restore
              </Button>
              <Button size="md" variant="destructive" onClick={() => act(l.id, "removed")}>
                Remove
              </Button>
            </div>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader title={`Open reports (${reports.length})`} />
        {reports.map((r) => (
          <Card key={r.id} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-callout font-semibold">{r.reason}</p>
              <p className="text-footnote text-label-2">
                {r.target_type} · {relativeDay(r.created_at)}
              </p>
            </div>
            {r.target_type === "listing" && (
              <Link to={`/board/${r.target_id}`} className="text-subhead font-semibold text-teal-ink">
                View
              </Link>
            )}
            <Button size="sm" variant="plain" onClick={() => act(r.target_id)}>
              Dismiss
            </Button>
          </Card>
        ))}
      </section>
    </div>
  );
}
