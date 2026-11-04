# KiwiPath

**From Colombo to Aotearoa, one step at a time.**

Live app: https://kiwipath-nz.vercel.app

KiwiPath is a web app for Sri Lankans planning to move to New Zealand to study, work or join family. It turns a confusing process into a game-like journey map, with practical tools for each step:

| Area | What it does |
| --- | --- |
| **Pathway Finder** | Ten questions (goal, qualification, occupation, experience, English, savings in rupees, family, timeline, city) rank five pathways with transparent reasons. |
| **Journey map** | A level-by-level route from Colombo to Aotearoa for the chosen path, with checklists, points, streaks and the mascot Kiri marking where you are. |
| **Paths** | Plain-language guides to studying a Masters, skilled work (AEWV), registered professions, partner & family, and business visas, each with official sources and a "last checked" date. |
| **Scam Shield** | Paste a job offer or agent message. On-device rules flag upfront fees, visa guarantees, untraceable payments, visitor-visa work, passport requests and more, with highlighted phrases and a risk gauge. |
| **Money Planner** | Editable cost estimates in NZD and rupees (with a live exchange rate), a cost breakdown chart and a savings jar with a target date. |
| **English Coach** | Timed speaking practice with live waveform, optional transcription, and feedback on pace, filler words and long pauses. Works with uploaded recordings too. |
| **CV Studio** | Finds Sri Lankan CV conventions NZ employers don't use (photo, NIC, religion, declaration…) and builds a clean NZ-style CV to copy, save or print. |
| **Kiwi Life quiz** | Slang, te reo Māori, road rules, renting and work rights. |
| **Course Shortlist, Documents, Occupation Check** | Compare Masters programmes, track certificates, and see if a job is regulated in NZ. |
| **Community** | Mentor booking with Sri Lanka and NZ times side by side, scam reporting, and a mentor waitlist. |
| **Me** | Badges, appearance, language (English, සිංහල, தமிழ் for navigation and headings), sync, data export and reset. |

KiwiPath shares general information, not immigration advice. Pathway summaries were checked against Immigration New Zealand's public information in November 2026 and **must be reviewed by a licensed immigration adviser before launch**.

## Design

- Palette, contour texture, wide display type and blob mascots follow the reference board (Fantasy, Light Gold, Smoky Black, Malibu, Bright Lavender, Teal, Blossom Pink, Light Coral).
- Apple Human Interface Guidelines: floating tab bar (sidebar on iPad/desktop), large titles that collapse into a translucent navigation bar, bottom sheets with a drag grabber, iOS segmented controls, switches and inset grouped lists, 44pt minimum touch targets, safe-area insets, system font for body text, Dynamic Type friendly `rem` sizing, light and dark mode, and Reduce Motion support.
- Accessibility: labelled controls, focus rings, focus-trapped dialogs, live regions for results, and colour never used alone (chart palette validated for colour-vision deficiency).

## Tech

- React 19, TypeScript, Vite 7, Tailwind CSS 4, React Router 7, Zustand, Motion, Lucide icons.
- Installable PWA with offline support (vite-plugin-pwa).
- Local-first: everything works without an account and is saved in the browser.
- Optional Supabase backend: email one-time-code sign-in, cloud sync, pathway content updates without a release, community reports, mentor bookings, waitlists and a private document bucket, all protected by row level security.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

| Command | Purpose |
| --- | --- |
| `npm run build` | Type-check and build the PWA into `dist/` |
| `npm test` | Unit tests (scam rules, finder, money maths, CV checks, speech metrics, progress, sync, time zones) |
| `npm run lint` | ESLint |
| `npm run validate:sql` | Applies the migration and seed to an in-memory Postgres and checks every RLS policy |
| `npm run gen:seed` | Regenerates `supabase/seed.sql` from `src/data/pathways.ts` |
| `npm run screens` | Screenshots of every screen (Playwright) |
| `npm run build:preview` | Self-contained preview bundle in `dist-preview/` |

## Connecting Supabase (optional)

1. Create a Supabase project (the Pro plan suits production).
2. Apply `supabase/migrations/*.sql`, then `supabase/seed.sql` (Supabase CLI: `supabase db push`, or paste into the SQL editor).
3. In **Authentication → Email templates → Magic link**, include `{{ .Token }}` so emails carry the 6-digit code the app asks for.
4. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
5. Make yourself an admin to moderate reports and edit pathway content: `insert into public.admins (user_id) values ('<your auth user id>');`

### Data sources

| Data | Source | How it gets in |
| --- | --- | --- |
| NZD → LKR rate | open.er-api.com (free, no key, daily) | Fetched in the browser, cached 12 hours, with an offline fallback |
| Visa pathways, steps, requirements | Immigration New Zealand (no public API) | Written in `src/data/pathways.ts`, editable in the `pathways` table |
| Accredited employers | Immigration NZ's published list | Import the list into `accredited_employers` |
| Rents | MBIE / Tenancy Services market rent data | City estimates in `src/data/places.ts`; refresh from the market rent API |
| Universities | The eight NZ universities | `src/data/places.ts`; programme details stay on university sites |

## Monetisation built in

- **KiwiPath Pro** waitlist (planned Rs 1,490/month): coaching, recruiter CV reviews, document vault, reminders.
- **Mentor marketplace**: paid 30-minute sessions with a 20% platform fee (`mentors`, `mentor_bookings`).
- Room for verified partner listings (licensed advisers, test centres, money transfer) and an accredited-employer job board.

Payments are not wired up yet. PayHere suits LKR card payments in Sri Lanka.

## Project layout

```
src/
  components/   UI kit (Apple-style controls), layout shell, mascot
  data/         Pathways, occupations, quiz, documents, cities, prompts
  logic/        Pure, tested logic: scam rules, finder, money, CV, speech, progress
  lib/          Storage, rates, Supabase client, sync, i18n, formatting
  screens/      Journey, Paths, Tools and each tool, Community, Me, Welcome
  store/        Zustand store persisted to localStorage
supabase/       Migration, generated seed
scripts/        Topo pattern, icons, seed, SQL validation, screenshots, preview build
```
