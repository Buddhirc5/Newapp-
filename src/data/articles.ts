/**
 * Blog articles for search (published as static pages under /blog).
 * Written from the same checked facts as the pathways and guides (November 2026).
 * General information only; every article points readers to official sources.
 */
export interface ArticleSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  tip?: string;
}

export interface Article {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  published: string;
  updated: string;
  minutes: number;
  category: "Study" | "Work" | "Money" | "Family" | "Settling in" | "Safety";
  intro: string;
  sections: ArticleSection[];
  faq: { q: string; a: string }[];
  /** Internal links shown at the end (public pages or the app). */
  related: { href: string; label: string }[];
}

const D = "2026-11-07";

export const ARTICLES: Article[] = [
  {
    slug: "how-to-move-to-new-zealand-from-sri-lanka",
    title: "How to move to New Zealand from Sri Lanka: the complete 2026 guide",
    description: "Every main way Sri Lankans move to New Zealand in 2026: study, skilled work, registered jobs, partner visas and business, with timelines, costs and the first steps.",
    keywords: ["move to New Zealand from Sri Lanka", "New Zealand visa Sri Lanka", "migrate to NZ from Sri Lanka", "Sri Lankans in New Zealand"],
    published: D,
    updated: D,
    minutes: 8,
    category: "Study",
    intro:
      "Moving from Sri Lanka to New Zealand is very possible, but there's no single \"migration visa\" to apply for. You choose a path that matches your education, job, family and savings, then follow its steps. This guide explains the five main paths and how to pick yours.",
    sections: [
      {
        heading: "The five main paths",
        bullets: [
          "Study a Masters or postgraduate course, then work on a post-study work visa and aim for residence through a skilled job.",
          "Skilled work: get a job offer from an Immigration NZ accredited employer and apply for an Accredited Employer Work Visa (AEWV).",
          "Registered professions (nurses, doctors, teachers, engineers and others): get registered with the NZ regulator, then find a job.",
          "Partner and family: join a partner who is a New Zealand citizen, resident or eligible visa holder.",
          "Business and investor visas: for people with significant capital and business experience.",
        ],
      },
      {
        heading: "Which path suits you?",
        paragraphs: [
          "If you have a bachelor's degree and can show money for tuition and living costs, the study path is the most common route for Sri Lankans. It gives you an NZ qualification and local work experience before you decide on residence.",
          "If you already have at least two years of relevant work experience in a job New Zealand needs, the skilled work path can be faster, but most of the time goes into finding the right employer.",
          "Nurses, doctors, teachers and other regulated workers should start with registration, because employers usually want to see it before offering a job.",
        ],
        tip: "KiwiPath's free Pathway Finder asks a few questions and ranks the paths for you.",
      },
      {
        heading: "How long does it take?",
        bullets: [
          "Study: start 9 to 12 months before your intake.",
          "Skilled work: often 6 to 18 months, mostly spent finding a job.",
          "Registered professions: often 9 to 24 months, depending on registration.",
          "Partner visas: usually 3 to 12 months.",
        ],
      },
      {
        heading: "Money you'll need",
        paragraphs: [
          "Students must show NZD 20,000 for each year of study for living costs, plus tuition and an onward ticket. Workers need enough to live on until their first pay, plus flights, bond and set-up costs. Use the Money Planner to add it up in both NZD and rupees.",
        ],
      },
      {
        heading: "Avoid the most common mistakes",
        bullets: [
          "Never pay anyone for a job offer. NZ employers can't charge you for a job.",
          "Only licensed immigration advisers or lawyers can give immigration advice. Check the adviser register before you pay.",
          "Check an employer is accredited before you resign or pay anything.",
          "Rules change often. Always confirm on immigration.govt.nz.",
        ],
      },
    ],
    faq: [
      { q: "What is the easiest way to move to New Zealand from Sri Lanka?", a: "There's no single easiest way. Many Sri Lankans study a Masters first because it doesn't need a job offer, then work on a post-study work visa. Skilled workers with experience in in-demand jobs can go straight to an Accredited Employer Work Visa." },
      { q: "Do I need an agent to move to New Zealand?", a: "No. You can apply yourself on immigration.govt.nz. If you want help with your case, use a licensed immigration adviser or lawyer, and check their licence first." },
      { q: "Can I get permanent residence in New Zealand?", a: "Yes, usually after working in a skilled job in New Zealand, through the Green List or the Skilled Migrant Category. Partners of citizens and residents can apply for partnership-based residence." },
    ],
    related: [
      { href: "/visa", label: "Compare the 5 visa paths" },
      { href: "/cities", label: "Cost of living in NZ cities" },
      { href: "/blog/new-zealand-student-visa-from-sri-lanka", label: "NZ student visa from Sri Lanka" },
    ],
  },
  {
    slug: "new-zealand-student-visa-from-sri-lanka",
    title: "New Zealand student visa from Sri Lanka: requirements, funds and steps (2026)",
    description: "What you need for an NZ student visa from Sri Lanka in 2026: offer of place, NZD 20,000 a year in funds, English scores, medicals, work rights and the post-study work visa.",
    keywords: ["NZ student visa Sri Lanka", "New Zealand student visa requirements", "study in New Zealand from Sri Lanka", "NZ student visa funds"],
    published: D,
    updated: D,
    minutes: 7,
    category: "Study",
    intro: "The student visa is the most popular way for Sri Lankans to start a life in New Zealand. Here's exactly what Immigration New Zealand looks for, and the order to do things in.",
    sections: [
      {
        heading: "What you need",
        bullets: [
          "An offer of place from an approved New Zealand education provider.",
          "Tuition paid, or evidence you can pay it.",
          "Living costs: evidence of NZD 20,000 for each year of study, plus funds for an onward ticket.",
          "A medical, chest X-ray and police certificate if your course is long enough to need them.",
          "International student insurance for your whole stay.",
        ],
      },
      {
        heading: "Step by step",
        bullets: [
          "Shortlist programmes that build on your degree and lead to jobs in demand.",
          "Meet the English requirement. Many Masters programmes ask for an academic IELTS around 6.5 overall, or an equivalent PTE or TOEFL score.",
          "Apply to the university (directly or through a licensed agent) and get your offer of place.",
          "Prepare your funds evidence and Statement of Purpose.",
          "Apply online with Immigration New Zealand.",
        ],
      },
      {
        heading: "Working while you study",
        paragraphs: [
          "Student visas granted since 3 November 2025 usually allow up to 25 hours of work a week in term and full-time work in scheduled breaks. Check the conditions printed on your own visa. Older visas with a 20-hour condition need a variation of conditions to get 25 hours.",
        ],
      },
      {
        heading: "After you graduate",
        paragraphs: [
          "After an eligible NZ qualification you can get an open post-study work visa for up to 3 years, once only. Degrees at level 7 or higher need at least 30 weeks of full-time study in NZ. Apply within 3 months of your student visa ending and show at least NZD 5,000.",
        ],
        tip: "Not every course leads to a post-study work visa. Non-degree courses at level 7 or below must be on the eligible list, so check before paying a deposit.",
      },
    ],
    faq: [
      { q: "How much money do I need to show for an NZ student visa?", a: "Immigration NZ asks for evidence of NZD 20,000 for each year of study for living costs, plus your tuition (paid or ready to pay) and funds for an onward ticket." },
      { q: "Can I work on a New Zealand student visa?", a: "Visas granted since 3 November 2025 usually allow up to 25 hours a week during term and full-time in scheduled breaks. Your own visa conditions are what count." },
      { q: "Can my partner come with me?", a: "Partners of Masters and PhD students may qualify for a partner work visa. Check the current rules on immigration.govt.nz before applying." },
    ],
    related: [
      { href: "/learn/proof-of-funds", label: "Showing your funds the right way" },
      { href: "/learn/statement-of-purpose", label: "Writing your Statement of Purpose" },
      { href: "/visa/student", label: "The full student path" },
    ],
  },
  {
    slug: "ielts-pte-score-for-new-zealand",
    title: "What IELTS or PTE score do you need for New Zealand?",
    description: "IELTS and PTE scores for New Zealand universities, work visas and professional registration, and why your regulator's English standard may be higher than the visa's.",
    keywords: ["IELTS score for New Zealand", "PTE score New Zealand", "IELTS for NZ Masters", "English test New Zealand visa"],
    published: D,
    updated: D,
    minutes: 5,
    category: "Study",
    intro: "There isn't one English score for New Zealand. Universities, Immigration NZ and professional regulators each set their own standard, so the score you need depends on your path.",
    sections: [
      {
        heading: "For universities",
        paragraphs: [
          "Universities set their own entry levels. Many Masters programmes ask for an academic IELTS around 6.5 overall (often with no band below 6.0), or an equivalent PTE Academic or TOEFL iBT score. Check your programme's page, because some (like teaching or health) ask for more.",
        ],
      },
      {
        heading: "For work visas",
        paragraphs: [
          "Some Accredited Employer Work Visa roles need proof of English. The requirements were widened in 2026, so check whether your role is included on immigration.govt.nz.",
        ],
      },
      {
        heading: "For registered jobs",
        paragraphs: [
          "Regulators such as the Nursing Council or Teaching Council set their own English standard, and it's often higher than the visa standard. Plan your test around the regulator's requirement, not just the visa.",
        ],
      },
      {
        heading: "How to prepare",
        bullets: [
          "Take a practice test first to see your starting band.",
          "Speaking is where most Sri Lankan candidates lose marks. Practise speaking aloud with a timer.",
          "Book your test early: results usually take about two weeks, and many applications need them.",
          "IELTS, PTE and TOEFL results are usually accepted for 2 years from the test date.",
        ],
        tip: "KiwiPath's English Coach gives timed speaking practice with feedback.",
      },
    ],
    faq: [
      { q: "Is IELTS 6.0 enough for New Zealand?", a: "It depends on what you're applying for. Some programmes accept 6.0, but many Masters programmes ask for around 6.5 overall. Registered professions often need higher." },
      { q: "Is PTE accepted in New Zealand?", a: "Yes, PTE Academic is widely accepted by universities and Immigration NZ. Check the exact score each one asks for." },
      { q: "How long are English test results valid?", a: "Results are usually accepted for 2 years from the test date." },
    ],
    related: [
      { href: "/blog/new-zealand-student-visa-from-sri-lanka", label: "NZ student visa from Sri Lanka" },
      { href: "/visa/registered", label: "Registered professions path" },
    ],
  },
  {
    slug: "cost-of-living-in-new-zealand-in-rupees",
    title: "Cost of living in New Zealand in Sri Lankan rupees (2026)",
    description: "Monthly living costs in New Zealand cities converted to Sri Lankan rupees: rent, groceries, transport and power, from the cheapest city to the most expensive.",
    keywords: ["cost of living New Zealand rupees", "New Zealand living cost Sri Lanka", "Auckland cost of living", "how much to live in NZ"],
    published: D,
    updated: D,
    minutes: 5,
    category: "Money",
    intro: "Knowing what life costs in rupees helps you plan savings, choose a city and set a realistic budget. These are estimates for one adult renting a room in a shared flat.",
    sections: [
      {
        heading: "Monthly costs by city",
        bullets: [
          "Auckland: about NZD 2,340 a month (roughly Rs 437,000). Most jobs and the largest Sri Lankan community, but the highest rents.",
          "Wellington: about NZD 2,270 a month. Government, policy and tech jobs.",
          "Christchurch: about NZD 2,060 a month. Cheaper than Auckland with strong engineering and construction work.",
          "Hamilton: about NZD 1,970 a month. Fast-growing, close to Auckland.",
          "Dunedin and Palmerston North: around NZD 1,900 a month. Student cities with lower rents.",
          "Invercargill: about NZD 1,750 a month, among the lowest rents in NZ.",
        ],
      },
      {
        heading: "What goes into the cost",
        paragraphs: [
          "Rent is the biggest cost: a room in a shared flat ranges from about NZD 190 a week in Invercargill to NZD 350 in Queenstown. Add groceries (NZD 110 to 140 a week), transport, power and phone.",
        ],
        tip: "Exchange rates move. The KiwiPath Cost of Living tool uses the live NZD to LKR rate.",
      },
      {
        heading: "Ways to spend less",
        bullets: [
          "Share a flat for your first months instead of renting alone.",
          "Choose a city with lower rents if your work or study allows.",
          "Buy groceries at budget supermarkets and Asian grocers.",
          "Get a public transport card instead of buying a car straight away.",
        ],
      },
    ],
    faq: [
      { q: "How much does it cost to live in New Zealand per month?", a: "For one adult renting a room, roughly NZD 1,750 to 2,350 a month depending on the city, before any car or travel costs." },
      { q: "Which New Zealand city is cheapest?", a: "Among the main cities, Invercargill, Rotorua, Palmerston North and Whangārei have some of the lowest rents." },
    ],
    related: [
      { href: "/cities", label: "All 14 cities compared" },
      { href: "/cities/auckland", label: "Cost of living in Auckland" },
      { href: "/cities/christchurch", label: "Cost of living in Christchurch" },
    ],
  },
  {
    slug: "how-to-find-a-job-in-new-zealand-from-sri-lanka",
    title: "How to find a job in New Zealand from Sri Lanka",
    description: "A practical plan for Sri Lankans job hunting in New Zealand: check demand for your occupation, write an NZ-style CV, find accredited employers and avoid scams.",
    keywords: ["jobs in New Zealand for Sri Lankans", "find a job in NZ from Sri Lanka", "NZ work visa job offer", "accredited employer jobs"],
    published: D,
    updated: D,
    minutes: 7,
    category: "Work",
    intro: "Most of the time on the skilled work path goes into finding the right employer. A focused plan, a Kiwi-style CV and the right job boards make a big difference.",
    sections: [
      {
        heading: "1. Check demand and registration",
        paragraphs: [
          "Look up your occupation on the Green List and other occupation lists on immigration.govt.nz. If NZ law regulates your job (nursing, teaching, electrical work and others), you'll need registration before you can work.",
        ],
      },
      {
        heading: "2. Rewrite your CV the NZ way",
        bullets: [
          "Two to three pages, achievement-focused, with numbers where you can.",
          "No photo, date of birth, NIC number, religion or marital status.",
          "State your work rights clearly (for example, \"Eligible for an Accredited Employer Work Visa\").",
          "NZ English spelling (organise, colour, programme).",
        ],
      },
      {
        heading: "3. Search the right places",
        bullets: [
          "Seek and Trade Me Jobs: the two biggest NZ job boards.",
          "LinkedIn: for professional and corporate roles.",
          "Health and government job sites for public sector roles.",
          "Check that the employer is on the accredited employer list before you apply.",
        ],
      },
      {
        heading: "4. After an offer",
        paragraphs: [
          "Your employer completes a Job Check. You then receive a job token and apply for your Accredited Employer Work Visa online, with your passport, qualifications, experience evidence, medical and police certificates.",
        ],
      },
    ],
    faq: [
      { q: "Can I get a job in New Zealand without being there?", a: "Yes. Many employers hire from overseas, especially for roles that are hard to fill. A strong NZ-style CV and applying to accredited employers improves your chances." },
      { q: "Do I need to pay for a job offer?", a: "No. NZ law doesn't allow employers to charge you for a job. If someone asks for money for a job or a Job Check, it's a scam." },
    ],
    related: [
      { href: "/visa/worker", label: "The skilled worker path" },
      { href: "/blog/new-zealand-job-scams-sri-lanka", label: "How to spot NZ job scams" },
      { href: "/careers", label: "Your occupation in NZ" },
    ],
  },
  {
    slug: "accredited-employer-work-visa-explained",
    title: "Accredited Employer Work Visa (AEWV) explained for Sri Lankans",
    description: "How the AEWV works in 2026: accredited employers, the Job Check, experience and pay rules, bringing family, changing jobs and the paths to residence.",
    keywords: ["AEWV", "Accredited Employer Work Visa", "NZ work visa Sri Lanka", "job check New Zealand"],
    published: D,
    updated: D,
    minutes: 6,
    category: "Work",
    intro: "The Accredited Employer Work Visa (AEWV) is New Zealand's main work visa. It's tied to one employer and role, so it's worth understanding before you accept an offer.",
    sections: [
      {
        heading: "What you need",
        bullets: [
          "A job offer from an Immigration NZ accredited employer.",
          "An approved Job Check (your job token).",
          "At least 2 years of relevant work experience, or a relevant qualification at NZ level 4 or higher.",
          "Pay at least the market rate for the job and region, and never below the minimum wage (NZD 23.95 an hour from 1 April 2026).",
          "Proof of English for some roles, plus health and character requirements.",
        ],
      },
      {
        heading: "Bringing your family",
        paragraphs: ["To bring dependent children on your AEWV you need to earn at least NZD 55,844 a year. Partner rules depend on your job and pay, so check the current settings."],
      },
      {
        heading: "Changing jobs",
        paragraphs: ["Your AEWV is tied to your employer and role. Changing jobs needs a new visa or a change of conditions, so don't resign before your new visa is sorted."],
      },
      {
        heading: "From AEWV to residence",
        paragraphs: [
          "Depending on your role and pay, you may qualify for the Green List (Straight to Residence, or Work to Residence after 2 years) or the Skilled Migrant Category, which since August 2026 has three pathways based on points, long skilled experience, or trades and technician experience.",
        ],
      },
    ],
    faq: [
      { q: "How do I know if an employer is accredited?", a: "Immigration NZ publishes the list of accredited employers. Check it before you accept an offer or pay anyone." },
      { q: "Before leaving Sri Lanka, do I need to register with SLBFE?", a: "Yes, register with the Sri Lanka Bureau of Foreign Employment before you leave for a job. Only SLBFE-licensed agents may charge Sri Lankan job seekers." },
    ],
    related: [
      { href: "/visa/worker", label: "The skilled worker path" },
      { href: "/blog/how-to-find-a-job-in-new-zealand-from-sri-lanka", label: "How to find a job in NZ" },
    ],
  },
  {
    slug: "new-zealand-job-scams-sri-lanka",
    title: "New Zealand job and visa scams targeting Sri Lankans: how to spot them",
    description: "The warning signs of fake New Zealand job offers and visa agents, how to check an employer or adviser, and what to do if you've been targeted.",
    keywords: ["New Zealand job scam", "fake NZ job offer", "NZ visa agent scam Sri Lanka", "check immigration adviser"],
    published: D,
    updated: D,
    minutes: 5,
    category: "Safety",
    intro: "Fake job offers and visa \"guarantees\" cost Sri Lankan families millions of rupees every year. Most scams follow the same patterns, so you can learn to spot them.",
    sections: [
      {
        heading: "Red flags",
        bullets: [
          "Asking you to pay for a job, a job offer or a Job Check. NZ employers can't charge for a job.",
          "Promising a guaranteed visa. Nobody can guarantee an Immigration NZ decision.",
          "Pressure to pay quickly, or to pay into a personal account.",
          "Offers that arrive by WhatsApp from people you've never applied to.",
          "Gmail or Yahoo addresses instead of a company domain, and spelling mistakes in \"official\" letters.",
        ],
      },
      {
        heading: "How to check",
        bullets: [
          "Check the employer is on Immigration NZ's accredited employer list.",
          "Check any adviser on the Immigration Advisers Authority's public register. Only licensed advisers or lawyers can give immigration advice.",
          "In Sri Lanka, only SLBFE-licensed agents may charge job seekers.",
          "Search the company's NZ business number and website.",
        ],
        tip: "Paste any offer or WhatsApp message into KiwiPath's free Scam Shield to see the warning signs.",
      },
      {
        heading: "If you've been targeted",
        paragraphs: ["Stop paying, keep every message and receipt, and report it to the SLBFE and the police in Sri Lanka. In New Zealand you can report online scams to Netsafe."],
      },
    ],
    faq: [
      { q: "Is it normal to pay for a New Zealand job offer?", a: "No. Paying for a job offer is a sign of a scam. NZ law does not allow employers to charge a premium for a job." },
      { q: "How do I check if an immigration adviser is real?", a: "Search the public register of the Immigration Advisers Authority (iaa.govt.nz) for their name and licence number." },
    ],
    related: [
      { href: "/learn/working-with-agencies", label: "Working safely with agencies" },
      { href: "/blog/accredited-employer-work-visa-explained", label: "AEWV explained" },
    ],
  },
  {
    slug: "nursing-in-new-zealand-for-sri-lankan-nurses",
    title: "Nursing in New Zealand for Sri Lankan nurses: registration and jobs",
    description: "How Sri Lankan nurses become registered in New Zealand: the Nursing Council, competence assessment, English standard, job search and visas.",
    keywords: ["Sri Lankan nurse New Zealand", "Nursing Council of New Zealand registration", "nursing jobs NZ", "overseas nurse NZ"],
    published: D,
    updated: D,
    minutes: 6,
    category: "Work",
    intro: "New Zealand needs nurses, and many Sri Lankan nurses build careers there. The key step is registration with the Nursing Council of New Zealand, which usually comes before a job offer.",
    sections: [
      {
        heading: "Step 1: Registration",
        paragraphs: [
          "Apply to the Nursing Council of New Zealand. Overseas nurses usually complete a competence assessment as part of registration, and the Council assesses your qualification, experience and English.",
        ],
        tip: "The regulator's English standard is often higher than the visa standard, so check it before you book your test.",
      },
      {
        heading: "Step 2: Bridging",
        paragraphs: ["Some nurses need a competence assessment programme or supervised practice in New Zealand. Plan the time and cost for this."],
      },
      {
        heading: "Step 3: Job and visa",
        paragraphs: [
          "With registration, you're far more attractive to employers. Most roles need an offer from an accredited employer and an Accredited Employer Work Visa. Many registered health roles are on the Green List, which can lead to residence.",
        ],
      },
      {
        heading: "Documents to start early",
        bullets: ["Certified transcripts and registration certificates.", "Certificates of good standing from every body that has registered you.", "Experience letters with dates, hours and duties."],
      },
    ],
    faq: [
      { q: "Can Sri Lankan nurses work in New Zealand?", a: "Yes, after registering with the Nursing Council of New Zealand and getting a visa, usually an Accredited Employer Work Visa." },
      { q: "Is nursing on the New Zealand Green List?", a: "Many registered health roles are on the Green List. Check the current list on immigration.govt.nz." },
    ],
    related: [
      { href: "/visa/registered", label: "Registered professions path" },
      { href: "/careers/registered-nurse", label: "Registered nurse in NZ" },
    ],
  },
  {
    slug: "partner-visa-new-zealand-sri-lanka",
    title: "Partner visa for New Zealand from Sri Lanka: relationship evidence that works",
    description: "How to join your partner in New Zealand: who can support a partner visa, what relationship evidence Immigration NZ wants, and the path to residence.",
    keywords: ["partner visa New Zealand Sri Lanka", "NZ partner visa evidence", "join spouse in New Zealand", "partnership visa NZ"],
    published: D,
    updated: D,
    minutes: 5,
    category: "Family",
    intro: "If your partner lives in New Zealand, a partner visa may let you join them. Immigration NZ wants evidence of a genuine and stable relationship, and a marriage certificate alone isn't enough.",
    sections: [
      {
        heading: "Who can support you",
        paragraphs: ["Citizens, residents and some work and student visa holders can support a partner. The rules depend on their visa type and occupation."],
      },
      {
        heading: "Evidence that helps",
        bullets: [
          "Joint leases, shared bills and joint bank accounts.",
          "Photos together over time, travel together and messages.",
          "A marriage certificate with a certified English translation if it's in Sinhala or Tamil.",
          "An explanation for any time spent apart.",
        ],
      },
      {
        heading: "Residence",
        paragraphs: ["Partnership-based residence is possible if your partner is a citizen or resident. It usually needs you to have lived together for at least 12 months."],
      },
    ],
    faq: [
      { q: "Is a marriage certificate enough for an NZ partner visa?", a: "No. You need to show a genuine and stable relationship, usually including living together, with evidence like joint bills, accounts and photos over time." },
      { q: "Can my children come too?", a: "Dependent children can usually be included in, or apply alongside, the family's applications." },
    ],
    related: [
      { href: "/learn/relationship-evidence", label: "Relationship evidence guide" },
      { href: "/visa/family", label: "Partner and family path" },
    ],
  },
  {
    slug: "first-week-in-new-zealand-checklist",
    title: "Your first week in New Zealand: a checklist for Sri Lankans",
    description: "What to do in your first week in New Zealand: IRD number, bank account, phone SIM, flat hunting, doctor registration, transport and meeting the Sri Lankan community.",
    keywords: ["first week New Zealand", "arriving in New Zealand checklist", "IRD number", "new migrant NZ checklist"],
    published: D,
    updated: D,
    minutes: 5,
    category: "Settling in",
    intro: "Your first week sets you up for everything else. Do these in roughly this order and you'll be working, banking and settled faster.",
    sections: [
      {
        heading: "Days 1 to 2",
        bullets: ["Get a local SIM card.", "Open a bank account (bring your passport and visa).", "Apply for your IRD (tax) number online.", "Buy a public transport card."],
      },
      {
        heading: "Days 3 to 5",
        bullets: ["Start flat hunting: check Trade Me and community groups, and never pay a bond before viewing.", "Register with a local doctor (GP).", "Learn your tenant rights on tenancy.govt.nz."],
      },
      {
        heading: "Days 6 to 7",
        bullets: ["Join your city's Sri Lankan community group.", "Update your CV with your NZ address and phone number.", "Set up a budget for your first month."],
      },
    ],
    faq: [
      { q: "How do I get an IRD number?", a: "Apply online with Inland Revenue (ird.govt.nz). You need it to be paid correctly and to avoid the higher no-notification tax rate." },
      { q: "Where can I find a room to rent?", a: "Trade Me Property, flatmate groups and community boards. KiwiPath's Board has rooms and airport pickups posted by Sri Lankans in NZ." },
    ],
    related: [
      { href: "/learn/first-30-days", label: "Your first 30 days guide" },
      { href: "/cities", label: "Cost of living by city" },
    ],
  },
];

export const ARTICLE_BY_SLUG = Object.fromEntries(ARTICLES.map((a) => [a.slug, a]));
