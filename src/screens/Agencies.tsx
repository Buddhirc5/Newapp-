import { useEffect, useState } from "react";
import { ArrowUpRight, BadgeCheck, Building2, Plus } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { RequireMember } from "@/components/RequireMember";
import { Card, Notice } from "@/components/ui/Bits";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Controls";
import { Sheet } from "@/components/ui/Sheet";
import { toast } from "@/components/ui/Toast";
import { fetchAgencies, suggestAgency, type Agency } from "@/lib/community";
import { HAS_SUPABASE } from "@/lib/env";

export function Agencies() {
  const [items, setItems] = useState<Agency[] | null>(HAS_SUPABASE ? null : []);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (HAS_SUPABASE) fetchAgencies().then(setItems, () => setItems([]));
  }, []);

  return (
    <Page
      title="Agencies"
      back={{ to: "/tools", label: "Tools" }}
      lead="Education agencies in Sri Lanka that members recommend. Our team checks each one before it appears here."
      actions={
        <Button size="sm" variant="tinted" icon={<Plus className="size-4" aria-hidden />} onClick={() => setOpen(true)}>
          Suggest
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <ButtonLink to="/guides/working-with-agencies" variant="tinted">
          How to choose an agency safely
        </ButtonLink>
        {items === null && <div className="h-40 animate-pulse rounded-card bg-fill-2" />}
        {items?.length === 0 && (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <Building2 className="size-8 text-label-3" aria-hidden />
            <p className="text-headline font-semibold">No checked agencies yet</p>
            <p className="max-w-sm text-subhead text-label-2">Used a good agency? Suggest it, and we'll list it once we've checked it with the institutions it represents.</p>
          </Card>
        )}
        <ul className="flex flex-col gap-3">
          {items?.map((a) => (
            <li key={a.id}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-headline font-semibold">
                      {a.name} <BadgeCheck className="size-4 text-teal-ink" aria-label="Checked by KiwiPath" />
                    </p>
                    <p className="text-subhead text-label-2">{a.city}</p>
                  </div>
                  {a.website && (
                    <a href={a.website} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 text-subhead font-semibold text-teal-ink">
                      Website <ArrowUpRight className="size-4" aria-hidden />
                    </a>
                  )}
                </div>
                {a.description && <p className="mt-2 text-subhead text-label-2">{a.description}</p>}
                {a.nz_partners.length > 0 && <p className="mt-2 text-footnote">Represents: {a.nz_partners.join(", ")}</p>}
                {a.verified_note && <p className="mt-2 rounded-xl bg-green-soft px-3 py-2 text-footnote">{a.verified_note}</p>}
              </Card>
            </li>
          ))}
        </ul>
        <Notice>Listing isn't an endorsement. Always confirm an agent with the university, and check visa advisers on the Immigration Advisers Authority register.</Notice>
      </div>
      <SuggestSheet open={open} onClose={() => setOpen(false)} />
    </Page>
  );
}

function SuggestSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("Colombo");
  const [website, setWebsite] = useState("");
  const [partners, setPartners] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await suggestAgency({
        name: name.trim(),
        city: city.trim(),
        website: website.trim() ? (/^https?:\/\//.test(website.trim()) ? website.trim() : `https://${website.trim()}`) : null,
        services: [],
        nz_partners: partners.split(",").map((p) => p.trim()).filter(Boolean),
        description: description.trim(),
      });
      toast("Thanks! We'll check it before listing");
      onClose();
    } catch (e) {
      toast((e as Error).message, "warn");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Suggest an agency" size="tall" footer={<Button block disabled={busy || name.trim().length < 2} onClick={submit}>Send suggestion</Button>}>
      <RequireMember reason="Sign in to suggest an agency.">
        <div className="flex flex-col gap-4">
          <TextField label="Agency name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <TextField label="Website (optional)" inputMode="url" value={website} onChange={(e) => setWebsite(e.target.value)} />
          <TextField label="NZ institutions they represent" hint="Separate with commas" value={partners} onChange={(e) => setPartners(e.target.value)} />
          <TextArea label="Your experience with them" rows={4} maxLength={800} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </RequireMember>
    </Sheet>
  );
}
