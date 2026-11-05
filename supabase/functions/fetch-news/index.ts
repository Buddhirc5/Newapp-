// Collects New Zealand immigration news from free public RSS/Atom feeds and
// stores headline, short summary and link in public.news_items.
// Runs on a schedule (pg_cron, every 3 hours) and can be called manually.
import { createClient } from "npm:@supabase/supabase-js@2";

const FEEDS = [
  { source: "NZ Government", url: "https://www.beehive.govt.nz/rss.xml" },
  { source: "RNZ", url: "https://www.rnz.co.nz/rss/national.xml" },
  { source: "RNZ Politics", url: "https://www.rnz.co.nz/rss/political.xml" },
  { source: "Stuff", url: "https://www.stuff.co.nz/rss" },
  // Google News search feeds: free, no key, and always the latest coverage.
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22New+Zealand%22+(visa+OR+immigration+OR+%22Immigration+New+Zealand%22)+when:7d&hl=en-NZ&gl=NZ&ceid=NZ:en" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22New+Zealand%22+(%22international+students%22+OR+%22student+visa%22+OR+%22post-study%22)+when:14d&hl=en-NZ&gl=NZ&ceid=NZ:en" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22Sri+Lanka%22+%22New+Zealand%22+(visa+OR+migrants+OR+jobs+OR+students)+when:30d&hl=en-NZ&gl=NZ&ceid=NZ:en" },
];

// Stories that mention migrants but aren't about moving to New Zealand.
const OFF_TOPIC = /\b(electoral commission|election results?|polling booths?|enrol(?:ment)? to vote)\b/i;

const RELEVANT =
  /\b(immigra\w*|visas?|migrants?|international students?|green list|accredited employer|residence class|skilled migrant|deport\w*|sri lank\w*|working holiday|refugees?)\b/i;

const TAGS: [string, RegExp][] = [
  ["student", /\b(student|universit|study|post-study)\w*/i],
  ["work", /\b(work visa|aewv|accredited employer|employer|worker|labour|job)\w*/i],
  ["residence", /\b(residen\w*|skilled migrant|green list|citizenship)\b/i],
  ["family", /\b(partner|parent|family|children)\w*/i],
  ["visitor", /\b(visitor|tourist|tourism|levy)\b/i],
  ["policy", /\b(minister|government|announc\w*|changes?|policy|rules?)\b/i],
  ["sri-lanka", /\bsri lank\w*/i],
];

function decode(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function field(block: string, names: string[]): string {
  for (const name of names) {
    const m = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i"));
    if (m) return decode(m[1]);
  }
  return "";
}

function link(block: string): string {
  const href = block.match(/<link\b[^>]*href="([^"]+)"/i);
  if (href) return href[1];
  return field(block, ["link", "guid"]);
}

interface Item {
  source: string;
  title: string;
  url: string;
  summary: string;
  tags: string[];
  published_at: string;
}

function parse(xml: string, source: string): Item[] {
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];
  const items: Item[] = [];
  for (const block of blocks) {
    const title = field(block, ["title"]);
    const summary = field(block, ["description", "summary", "content"]).slice(0, 280);
    const url = link(block).trim();
    if (!title || !/^https?:\/\//.test(url)) continue;
    const text = `${title} ${summary}`;
    if (!RELEVANT.test(text) || OFF_TOPIC.test(text)) continue;
    // Google News titles end with " - Outlet"; show the real outlet as the source.
    const outlet = source === "Google News" ? field(block, ["source"]) : "";
    const date = new Date(field(block, ["pubDate", "published", "updated", "dc:date"]) || Date.now());
    items.push({
      source: outlet || source,
      title: (outlet ? title.replace(new RegExp(`\\s+-\\s+${outlet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), "") : title).slice(0, 240),
      url,
      summary: outlet ? "" : summary,
      tags: TAGS.filter(([, re]) => re.test(text)).map(([tag]) => tag),
      published_at: isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
    });
  }
  return items;
}

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const results: Record<string, number | string> = {};
  const all: Item[] = [];
  await Promise.all(
    FEEDS.map(async (feed) => {
      try {
        const res = await fetch(feed.url, { headers: { "user-agent": "KiwiPath news reader (+https://kiwipath-nz.vercel.app)" }, signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const items = parse(await res.text(), feed.source);
        all.push(...items);
        results[feed.source] = (Number(results[feed.source]) || 0) + items.length;
      } catch (e) {
        results[feed.source] = `error: ${(e as Error).message}`;
      }
    }),
  );

  // Outlets re-publish corrected stories under new URLs; skip titles we already have.
  const key = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 48);
  const { data: recent } = await supabase.from("news_items").select("title").gte("published_at", new Date(Date.now() - 14 * 86_400_000).toISOString());
  const seen = new Set((recent ?? []).map((r) => key(r.title as string)));
  const fresh = all.filter((item) => {
    const k = key(item.title);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (fresh.length) {
    const { error } = await supabase.from("news_items").upsert(fresh, { onConflict: "url", ignoreDuplicates: true });
    if (error) results.save = `error: ${error.message}`;
  }
  // Keep the feed focused on recent news.
  await supabase.from("news_items").delete().lt("published_at", new Date(Date.now() - 180 * 86_400_000).toISOString());

  return new Response(JSON.stringify({ saved: fresh.length, feeds: results }), { headers: { "content-type": "application/json" } });
});
