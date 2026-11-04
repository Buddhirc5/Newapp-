import type { Tint } from "@/types";

export interface GuideSection {
  heading: string;
  body?: string;
  bullets?: string[];
  warn?: string;
}

export interface Guide {
  slug: string;
  title: string;
  summary: string;
  stage: "prepare" | "apply" | "arrive" | "thrive";
  tint: Tint;
  minutes: number;
  sections: GuideSection[];
  tool?: { to: string; label: string };
}

/**
 * Practical guides written from public information (checked November 2026).
 * General information only; every guide ends by pointing to official sources.
 */
export const GUIDES: Guide[] = [
  {
    slug: "proof-of-funds",
    title: "Showing your funds the right way",
    summary: "How much money to show, what counts as evidence, and how to show where it came from.",
    stage: "prepare",
    tint: "gold",
    minutes: 6,
    tool: { to: "/tools/money", label: "Work out your total in the Money Planner" },
    sections: [
      {
        heading: "How much you need",
        bullets: [
          "Students: your first year's tuition (paid or ready to pay) plus living costs. Immigration NZ asks for evidence of NZD 20,000 for each year of study.",
          "Funds for a ticket home, or the ticket itself.",
          "Workers and partners: enough to support yourself until your first pay. There's no single fixed figure, so plan at least 1–2 months of costs.",
          "Check the current amounts on immigration.govt.nz before you apply. They change.",
        ],
      },
      {
        heading: "Evidence officers usually accept",
        bullets: [
          "Bank statements in your name or your sponsor's, covering several months.",
          "Fixed deposit certificates and savings account confirmations.",
          "An education loan approval letter from a bank, showing the amount and that it's for your studies.",
          "Sponsor documents: proof of relationship, the sponsor's income (salary slips, tax returns, business records) and their savings.",
        ],
      },
      {
        heading: "Show where the money came from",
        body: "Officers look at how funds built up, not just today's balance. A history that makes sense is the strongest evidence.",
        bullets: [
          "Keep savings in the same accounts for months, so statements show steady growth.",
          "Explain every large deposit with a document: a property or vehicle sale deed, a gift letter with the giver's own bank statements, a maturing fixed deposit, an EPF/ETF withdrawal.",
          "Translate Sinhala or Tamil documents with certified English translations.",
          "Make sure names match across your passport, statements and sponsor documents.",
        ],
      },
      {
        heading: "Never use 'fund showing' services",
        warn: "Some agents offer to put money in your account temporarily and take it back after the visa. This is fraud. Immigration NZ checks funds and can decline your visa and refuse future applications for providing false or misleading information.",
      },
    ],
  },
  {
    slug: "relationship-evidence",
    title: "Proving your relationship",
    summary: "What partner visa officers look for, and how to present evidence clearly.",
    stage: "prepare",
    tint: "lavender",
    minutes: 6,
    sections: [
      {
        heading: "What officers want to see",
        body: "A genuine and stable relationship, usually including living together. Partnership-based residence generally requires at least 12 months of living together.",
      },
      {
        heading: "Strong evidence",
        bullets: [
          "Living together: a joint lease, utility bills, bank letters or official mail at the same address over time.",
          "Shared finances: joint accounts, transfers to each other, shared bills and big purchases.",
          "Time together: photos across months and years with family and friends, travel records, boarding passes.",
          "Communication when apart: call logs and message history with dates (a sample, not everything).",
          "Family and community: wedding invitations, ceremony photos, statements from people who know you as a couple.",
          "Marriage certificate with a certified English translation, if you're married.",
        ],
      },
      {
        heading: "Present it well",
        bullets: [
          "Write a short relationship timeline: when you met, got engaged, married, moved in, and any time apart.",
          "Explain time apart honestly (work, study, visa processing) with evidence that you stayed in touch.",
          "Arranged marriages are recognised. Show how the families met, the ceremony and your life together since.",
          "Label and date every file. Officers read many applications; make yours easy to follow.",
        ],
      },
    ],
  },
  {
    slug: "work-experience",
    title: "Showing your work experience",
    summary: "Reference letters and records that prove your experience to employers and Immigration NZ.",
    stage: "prepare",
    tint: "malibu",
    minutes: 5,
    tool: { to: "/tools/cv", label: "Make an NZ-style CV" },
    sections: [
      {
        heading: "A strong reference letter includes",
        bullets: [
          "Company letterhead, address, phone number and the signer's name and title.",
          "Your exact job title(s) with start and end dates for each.",
          "Hours per week (full-time or part-time) and your salary.",
          "Your main duties, written specifically, plus key achievements.",
          "A date and signature. Officers may phone to verify, so use real contact details.",
        ],
      },
      {
        heading: "Back it up with records",
        bullets: [
          "Appointment letter and employment contract.",
          "Payslips and bank statements showing salary payments.",
          "EPF and ETF statements, which independently confirm your employment history.",
          "Tax records where you have them.",
          "Self-employed: business registration, tax returns, invoices, client letters and bank statements.",
        ],
      },
      {
        heading: "Watch out",
        warn: "Never submit a letter that overstates your role or dates. Immigration NZ verifies experience, and false documents can lead to a decline and future bans.",
      },
    ],
  },
  {
    slug: "statement-of-purpose",
    title: "Writing a statement of purpose",
    summary: "Structure, what to include and common mistakes, with a builder to draft yours.",
    stage: "apply",
    tint: "pink",
    minutes: 7,
    tool: { to: "/tools/sop", label: "Open the SOP Builder" },
    sections: [
      {
        heading: "A clear structure",
        bullets: [
          "Opening: who you are and what you want to study, in two or three sentences.",
          "Academic background: your degree, relevant subjects and results.",
          "Work experience: what you did, what you achieved and what it taught you.",
          "Why this programme: specific courses, research areas or features, named.",
          "Why this university and why New Zealand, compared with studying in Sri Lanka or elsewhere.",
          "Your plan: the job you'll aim for and how the qualification gets you there.",
          "Finances: briefly, who is paying and how.",
        ],
      },
      {
        heading: "What makes it convincing",
        bullets: [
          "Specific details: course names, job titles, numbers, dates.",
          "A career plan that matches your background, so the study is a logical next step.",
          "Your own words. Universities and Immigration NZ notice copied templates.",
          "One to two pages, clearly organised, carefully proofread.",
        ],
      },
      {
        heading: "Avoid",
        bullets: [
          "General praise ('world-class education', 'beautiful country') without reasons.",
          "Gaps you don't explain. Briefly say what you did during any long break.",
          "Saying your main goal is to settle permanently in a student statement. Focus on study and career.",
        ],
      },
    ],
  },
  {
    slug: "university-applications",
    title: "Applying to New Zealand universities",
    summary: "From shortlist to offer: documents, intakes, deposits and refunds.",
    stage: "apply",
    tint: "teal",
    minutes: 6,
    tool: { to: "/tools/courses", label: "Compare programmes" },
    sections: [
      {
        heading: "Step by step",
        bullets: [
          "Shortlist 3–5 programmes and read each one's entry requirements on the university's site.",
          "Check intakes. Most programmes start in February or July; some offer other dates.",
          "Prepare documents: transcripts, degree certificates, English test results, CV, statement of purpose, referee details and your passport.",
          "Apply directly on the university's portal, or through one of its authorised agents.",
          "You'll get a conditional offer (something still needed) or an unconditional offer.",
          "Accept the offer and pay the deposit or fees the university asks for. You'll need this for your visa.",
        ],
      },
      {
        heading: "Before you pay",
        bullets: [
          "Read the refund policy, including what happens if your visa is declined.",
          "Pay the university directly where you can, and keep every receipt.",
          "Check the qualification leads to a post-study work visa if you'll want one.",
        ],
      },
    ],
  },
  {
    slug: "working-with-agencies",
    title: "Choosing an education agency",
    summary: "How to tell a good agent from a risky one, and what to ask before you sign.",
    stage: "apply",
    tint: "green",
    minutes: 5,
    tool: { to: "/agencies", label: "See checked agencies" },
    sections: [
      {
        heading: "Good signs",
        bullets: [
          "The university lists them as an authorised agent. Most universities publish their agent list.",
          "They explain fees in writing before you start, including what the university pays them.",
          "They give you copies of everything submitted in your name.",
          "For visa advice, they hold a licence you can check on the Immigration Advisers Authority register, or they're a lawyer.",
        ],
      },
      {
        heading: "Red flags",
        bullets: [
          "Guaranteed visas or admissions.",
          "Asking you to pay them instead of the university for tuition.",
          "Offering to 'arrange' funds, documents or experience letters.",
          "Keeping your passport or refusing to share your application login.",
        ],
      },
      {
        heading: "Questions to ask",
        bullets: [
          "Which New Zealand institutions do you represent, and can I see your authorisation?",
          "What do I pay you, and when? Is any of it refundable?",
          "Who will lodge my visa application, and are they licensed?",
        ],
      },
    ],
  },
  {
    slug: "send-money",
    title: "Moving money to New Zealand",
    summary: "Paying tuition, sending living funds and getting a fair exchange rate.",
    stage: "prepare",
    tint: "gold",
    minutes: 5,
    sections: [
      {
        heading: "Paying tuition from Sri Lanka",
        bullets: [
          "Sri Lankan banks can send education payments abroad with your offer letter and invoice. Ask your bank which documents it needs.",
          "Foreign exchange rules for outward payments are set by the Central Bank of Sri Lanka. Confirm current limits with your bank.",
          "Pay the university's official account only, and keep the bank's transfer confirmation for your visa file.",
        ],
      },
      {
        heading: "Getting a fair rate",
        bullets: [
          "Compare the total cost: the fee plus the exchange-rate margin. A 'free' transfer can still cost more through a worse rate.",
          "Check the mid-market rate in KiwiPath, then compare each provider's rate against it.",
          "Large amounts: ask your bank for a better rate before you commit.",
        ],
      },
      {
        heading: "Once you're in New Zealand",
        bullets: ["Open an NZ bank account early.", "Keep records of all money you bring in; you may need them later for visas."],
      },
    ],
  },
  {
    slug: "loans-and-savings",
    title: "Repaying a loan at home while living in NZ",
    summary: "A simple system to cover installments, build savings and handle exchange rates.",
    stage: "thrive",
    tint: "teal",
    minutes: 5,
    tool: { to: "/tools/savings", label: "Open the Loan & Savings Planner" },
    sections: [
      {
        heading: "Set up the basics",
        bullets: [
          "Know your installment in rupees and its due date each month.",
          "Send the installment as soon as you're paid, before other spending.",
          "Keep an emergency fund in NZ: aim for one month of expenses first, then three.",
        ],
      },
      {
        heading: "Pay it off faster",
        bullets: [
          "Put extra payments toward the loan with the highest interest rate first.",
          "When the rupee weakens against the dollar, each NZ dollar covers more rupees. A good time for an extra payment.",
          "Ask your Sri Lankan bank whether early repayment has a fee.",
        ],
      },
      {
        heading: "Spend less without feeling it",
        bullets: ["Buy groceries from weekly specials and cook in batches.", "Share a flat instead of renting alone.", "Use second-hand furniture from the Board."],
      },
    ],
  },
  {
    slug: "first-30-days",
    title: "Your first 30 days in New Zealand",
    summary: "The setup checklist: tax number, bank, doctor, phone, transport and renting.",
    stage: "arrive",
    tint: "malibu",
    minutes: 5,
    sections: [
      {
        heading: "Week one",
        bullets: [
          "Get a local SIM or eSIM.",
          "Apply for an IRD number (your tax number) so you're taxed at the right rate.",
          "Open a bank account. Bring your passport and proof of address.",
          "Get a public transport card for your city.",
        ],
      },
      {
        heading: "Weeks two to four",
        bullets: [
          "Enrol with a GP (family doctor).",
          "Find a longer-term room or flat. Bonds are capped at four weeks' rent and must be lodged with Tenancy Services.",
          "You can drive on a valid overseas licence for up to 12 months, then you'll need an NZ licence.",
          "Join your city group on KiwiPath and say hello.",
        ],
      },
    ],
  },
  {
    slug: "post-study-work-visa",
    title: "Moving to a post-study work visa",
    summary: "Planning the switch from student to worker before your student visa ends.",
    stage: "thrive",
    tint: "lavender",
    minutes: 4,
    sections: [
      {
        heading: "Plan ahead",
        bullets: [
          "Check your qualification is eligible and how long a visa it can give (up to three years for many Masters qualifications).",
          "Apply before your student visa expires. Note the date in your calendar now.",
          "Have your completion letter or results, passport and any medical or police certificates ready.",
        ],
      },
      {
        heading: "Use the time well",
        bullets: ["Start job hunting in your final semester.", "Build NZ work experience that fits residence pathways later.", "Keep payslips and your employment agreements."],
      },
    ],
  },
  {
    slug: "food-and-shopping",
    title: "Food, groceries and good deals",
    summary: "Where to shop, how to save, and finding the taste of home.",
    stage: "arrive",
    tint: "coral",
    minutes: 3,
    sections: [
      {
        heading: "Groceries",
        bullets: [
          "Supermarkets run weekly specials. Plan meals around them.",
          "Indian and Asian grocers in every major city stock rice, spices, dhal and coconut milk at better prices.",
          "Buy rice and spices in bulk and share with flatmates.",
        ],
      },
      {
        heading: "Ask the community",
        body: "Members post deals and favourite shops on the Board and in city groups. Ask where to find maldive fish, kithul treacle or a good curry powder.",
      },
    ],
  },
];

export const GUIDE_BY_SLUG = Object.fromEntries(GUIDES.map((g) => [g.slug, g])) as Record<string, Guide>;

export const STAGE_LABEL: Record<Guide["stage"], string> = {
  prepare: "Prepare",
  apply: "Apply",
  arrive: "Arrive",
  thrive: "Thrive",
};
