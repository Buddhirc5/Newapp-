import { Page } from "@/components/layout/Page";
import { Card, Notice } from "@/components/ui/Bits";

const SECTIONS: { title: string; points: string[] }[] = [
  {
    title: "What we keep",
    points: [
      "Your account: email, display name, city, situation and the onboarding answers you choose to give.",
      "Your journey: progress, CV drafts, plans and settings, saved in your account so they follow you to other devices.",
      "What you post: listings, messages, group chats, reports and bookings.",
      "AI results: document checklists, CV suggestions and journey reviews. The documents themselves are deleted as soon as they've been checked.",
      "Payments: receipts from PayHere (amount, date, package). We never see or store card numbers.",
    ],
  },
  {
    title: "Who can see it",
    points: [
      "Other members see only what you post publicly: your display name, city and listings. Your email and phone number are never shown.",
      "Chats are visible only to the people in them. Group chats are visible to group members.",
      "A small number of KiwiPath admins can see accounts to handle reports and support. Admin access needs an authenticator app, and every admin change is logged.",
      "AI features send the text or document you choose to Anthropic (Claude) to produce the result. It isn't used to train their models.",
      "We don't sell your data or show you third-party ads.",
    ],
  },
  {
    title: "Where it's stored",
    points: [
      "Data is stored with Supabase (a managed database) and the website is hosted on Vercel. Both encrypt data in transit and at rest.",
      "Some progress is also saved in your browser so the app works offline. Use \"Sign out and clear this device\" on shared phones.",
    ],
  },
  {
    title: "Your choices",
    points: [
      "Export a copy of your data any time from Me → Your data.",
      "Delete your account from Me → Account. Everything you've posted and saved is removed. Payment receipts are kept without your name because the law requires businesses to keep financial records.",
      "Ask a question or make a privacy request by emailing the KiwiPath team. We aim to reply within 7 days.",
    ],
  },
];

export function Privacy() {
  return (
    <Page title="Privacy" back={{ to: "/me", label: "Me" }} lead="Plain-language summary of what KiwiPath keeps, who can see it, and how to remove it.">
      <div className="flex flex-col gap-4">
        {SECTIONS.map((s) => (
          <Card key={s.title} className="p-5">
            <h2 className="text-headline font-semibold">{s.title}</h2>
            <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-subhead text-label-2">
              {s.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Card>
        ))}
        <Notice>
          KiwiPath follows Sri Lanka's Personal Data Protection Act and New Zealand's Privacy Act 2020 principles. Last updated November 2026.
        </Notice>
      </div>
    </Page>
  );
}
