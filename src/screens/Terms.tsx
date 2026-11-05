import { Page } from "@/components/layout/Page";
import { Card, Notice } from "@/components/ui/Bits";

const SECTIONS: { title: string; points: string[] }[] = [
  {
    title: "What KiwiPath is",
    points: [
      "KiwiPath is a planning app for people moving from Sri Lanka to New Zealand. It shares general information, tools and a community.",
      "KiwiPath is not an immigration adviser and does not give immigration advice. Always confirm rules on immigration.govt.nz or with a licensed immigration adviser before you apply.",
      "AI features can make mistakes. Check every AI result before you rely on it.",
    ],
  },
  {
    title: "Your account",
    points: [
      "You must be at least 16 to use KiwiPath. Keep your sign-in details private; you're responsible for what happens in your account.",
      "Give honest details. Don't pretend to be someone else, an agency or a government body.",
    ],
  },
  {
    title: "Community rules",
    points: [
      "No scams, fake job or visa offers, requests for money up front, hate, harassment or illegal content.",
      "Listings, messages and posts are your responsibility. KiwiPath doesn't check every post and isn't part of deals between members.",
      "We can remove content and suspend or close accounts that break these rules. Report anything suspicious with the Report button.",
    ],
  },
  {
    title: "Packages and payments",
    points: [
      "New members get a free first month. After that, Main costs Rs 1,990 a month and Ultra costs Rs 5,990 a month.",
      "Payments are processed by PayHere. A package gives access for the period paid and you can stop renewing any time.",
      "Payments for a period already started aren't refunded, except where the law requires it or a charge was made in error. Email us within 14 days about a wrong charge.",
      "Expert session bookings are between you and the expert. KiwiPath keeps a platform fee shown before you book.",
    ],
  },
  {
    title: "Limits and changes",
    points: [
      "KiwiPath is provided as is. We aren't liable for visa decisions, lost money or losses from relying on information in the app, as far as the law allows.",
      "We may change these terms or the app. We'll show a notice in the app when the terms change in a way that matters.",
      "You can stop using KiwiPath and delete your account from Me → Account at any time.",
    ],
  },
];

export function Terms() {
  return (
    <Page title="Terms of Service" back={{ to: "/me", label: "Me" }} lead="The rules for using KiwiPath, in plain language.">
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
        <Notice>These terms are governed by the laws of Sri Lanka. Questions: kiwipathspace@gmail.com. Last updated November 2026.</Notice>
      </div>
    </Page>
  );
}
