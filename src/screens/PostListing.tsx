import { useState } from "react";
import { useNavigate } from "react-router";
import { ImagePlus, ShieldAlert, X } from "lucide-react";
import { CATEGORY_ICON } from "@/components/ListingCard";
import { Page } from "@/components/layout/Page";
import { RequireMember } from "@/components/RequireMember";
import { Notice } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { Select, TextArea, TextField } from "@/components/ui/Controls";
import { toast } from "@/components/ui/Toast";
import { BOARD_RULES, CATEGORIES, CATEGORY_BY_ID, NZ_CITIES, UNIT_LABEL, type ListingCategory, type PriceUnit } from "@/data/board";
import { cn } from "@/lib/cn";
import { createListing, uploadPhoto } from "@/lib/community";
import { analyzeMessage } from "@/logic/scam";

export function PostListing() {
  return (
    <Page title="Post a listing" back={{ to: "/board", label: "Board" }} lead="Share a room, offer an airport pickup, sell something or post a deal for the community.">
      <RequireMember reason="Sign in to post on the Board.">
        <PostForm />
      </RequireMember>
    </Page>
  );
}

const HOUSING: ListingCategory[] = ["room", "flat", "homestay"];

function PostForm() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<ListingCategory>("room");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState<PriceUnit>("week");
  const [city, setCity] = useState("Auckland");
  const [suburb, setSuburb] = useState("");
  const [available, setAvailable] = useState("");
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cat = CATEGORY_BY_ID[category];
  const risk = analyzeMessage(`${title}\n${description}`);
  const blocked = risk.level === "high";
  const valid = title.trim().length >= 5 && description.trim().length >= 20 && city;

  const chooseCategory = (c: ListingCategory) => {
    setCategory(c);
    if (!CATEGORY_BY_ID[c].units.includes(unit)) setUnit(CATEGORY_BY_ID[c].units[0]);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const photos: string[] = [];
      for (const f of files) photos.push(await uploadPhoto(f.file));
      const id = await createListing({
        category,
        title: title.trim(),
        description: description.trim(),
        price_nzd: unit === "free" ? null : Number(price) || null,
        price_unit: unit,
        city,
        suburb: suburb.trim(),
        available_from: HOUSING.includes(category) && available ? available : null,
        photos,
      });
      toast("Posted to the Board");
      navigate(`/board/${id}`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !blocked) void submit();
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="px-1 pb-2 text-subhead font-semibold">What are you posting?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICON[c.id];
            const selected = c.id === category;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={selected}
                onClick={() => chooseCategory(c.id)}
                className={cn("flex min-h-14 items-center gap-2 rounded-tile px-3 text-left text-subhead font-semibold", selected ? "bg-night text-paper" : "bg-surface shadow-card")}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                {c.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <TextField label="Title" required maxLength={90} placeholder={HOUSING.includes(category) ? "e.g. Sunny room near Riccarton mall" : "e.g. Airport pickup from Auckland Airport"} value={title} onChange={(e) => setTitle(e.target.value)} />
      <TextArea
        label="Description"
        required
        rows={5}
        maxLength={2000}
        hint="Include what's included, who it suits and how to view or meet. Don't share your phone number or bank details here."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Price (NZ$)"
          inputMode="decimal"
          disabled={unit === "free"}
          placeholder={unit === "free" ? "Free" : "0"}
          value={unit === "free" ? "" : price}
          onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
        />
        <Select label="Per" value={unit} onChange={(e) => setUnit(e.target.value as PriceUnit)}>
          {cat.units.map((u) => (
            <option key={u} value={u}>
              {u === "free" ? "Free" : u === "once" ? "One-off price" : UNIT_LABEL[u].replace("/", "per ")}
            </option>
          ))}
        </Select>
        <Select label="City" value={city} onChange={(e) => setCity(e.target.value)}>
          {NZ_CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <TextField label="Suburb" maxLength={60} placeholder="e.g. Mt Albert" value={suburb} onChange={(e) => setSuburb(e.target.value)} />
        {HOUSING.includes(category) && <TextField label="Available from" type="date" value={available} onChange={(e) => setAvailable(e.target.value)} />}
      </div>

      <div className="flex flex-col gap-2">
        <span className="px-1 text-subhead font-semibold">Photos (up to 4)</span>
        <div className="grid grid-cols-4 gap-2">
          {files.map((f, i) => (
            <div key={f.url} className="relative aspect-square max-w-full overflow-hidden rounded-xl bg-fill-2">
              <img src={f.url} alt={`Photo ${i + 1}`} className="size-full object-cover" />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => setFiles(files.filter((x) => x !== f))}
                className="absolute top-1 right-1 grid size-8 place-items-center rounded-full bg-night/80 text-paper"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          ))}
          {files.length < 4 && (
            <label className="grid aspect-square max-w-full cursor-pointer place-items-center rounded-xl bg-fill-2 text-label-2 hover:bg-fill-3">
              <ImagePlus className="size-6" aria-hidden />
              <span className="sr-only">Add photos</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []).slice(0, 4 - files.length);
                  setFiles([...files, ...picked.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      </div>

      {risk.level !== "empty" && risk.level !== "low" && (
        <div className={cn("flex gap-3 rounded-tile p-4", blocked ? "bg-coral-soft" : "bg-gold-soft")} role="alert">
          <ShieldAlert className={cn("mt-0.5 size-5 shrink-0", blocked ? "text-coral-ink" : "text-label-2")} aria-hidden />
          <div>
            <p className="text-headline font-semibold">{blocked ? "This can't be posted as written" : "Check your wording"}</p>
            <ul className="mt-1 text-subhead text-label-2">
              {risk.warnings.slice(0, 3).map((w) => (
                <li key={w.rule.id}>{w.rule.title}</li>
              ))}
            </ul>
            <p className="mt-1 text-footnote text-label-2">Scam Shield checks every post to keep the Board safe for newcomers.</p>
          </div>
        </div>
      )}

      <Notice title="Board rules">
        <ul className="mt-1 flex flex-col gap-1">
          {BOARD_RULES.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
      </Notice>

      {error && (
        <p className="rounded-tile bg-coral-soft px-4 py-3 text-subhead text-coral-ink" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" block disabled={!valid || blocked || busy}>
        {busy ? "Posting…" : "Post to the Board"}
      </Button>
    </form>
  );
}
