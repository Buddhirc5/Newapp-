import type { Level, Pathway, SourceLink, Task } from "@/types";

/**
 * Pathway content is a plain-language summary of Immigration New Zealand's public
 * information, checked in November 2026. It is general information, not
 * immigration advice. Rules change often, so every screen links to the official
 * source and shows when the summary was last checked.
 */
export const CONTENT_CHECKED = "Nov 2026";

export const SOURCES = {
  inz: { label: "Immigration New Zealand", href: "https://www.immigration.govt.nz" },
  iaa: { label: "Immigration Advisers Authority (find a licensed adviser)", href: "https://www.iaa.govt.nz" },
  nzqa: { label: "NZQA: overseas qualification recognition", href: "https://www.nzqa.govt.nz" },
  study: { label: "Study with New Zealand", href: "https://www.studywithnewzealand.govt.nz" },
  careers: { label: "Careers New Zealand", href: "https://www.careers.govt.nz" },
  employment: { label: "Employment New Zealand (work rights)", href: "https://www.employment.govt.nz" },
  tenancy: { label: "Tenancy Services (renting)", href: "https://www.tenancy.govt.nz" },
  ird: { label: "Inland Revenue (IRD numbers, tax)", href: "https://www.ird.govt.nz" },
  slbfe: { label: "Sri Lanka Bureau of Foreign Employment", href: "https://www.slbfe.lk" },
  slPolice: { label: "Sri Lanka Police (police clearance)", href: "https://www.police.lk" },
  netsafe: { label: "Netsafe (report online scams)", href: "https://netsafe.org.nz" },
} satisfies Record<string, SourceLink>;

// Tasks shared between pathways keep their progress when someone switches path.
const common = {
  finder: {
    id: "common.finder",
    title: "Complete the Pathway Finder",
    detail: "Answer a few questions so KiwiPath can suggest the paths that suit you.",
    xp: 40,
    link: { to: "/welcome", label: "Open Pathway Finder" },
  },
  scamCheck: {
    id: "common.scam-check",
    title: "Check any agent or offer with Scam Shield",
    detail:
      "Paste a WhatsApp message, email or offer letter. Scam Shield flags upfront fees, visa guarantees and other warning signs.",
    xp: 30,
    link: { to: "/tools/scam-shield", label: "Open Scam Shield" },
  },
  adviser: {
    id: "common.adviser",
    title: "Confirm any adviser is licensed",
    detail:
      "In New Zealand law, anyone giving you immigration advice (in NZ or overseas) must be a licensed immigration adviser or a lawyer, unless exempt. Ask for their licence number and check it on the public register.",
    xp: 20,
    link: { href: SOURCES.iaa.href, label: "Search the register" },
  },
  budget: {
    id: "common.budget",
    title: "Build your moving budget",
    detail: "Add up visa, travel and set-up costs in NZD and rupees, and set a monthly savings goal.",
    xp: 30,
    link: { to: "/tools/money", label: "Open Money Planner" },
  },
  passport: {
    id: "common.passport",
    title: "Check your passport's expiry date",
    detail: "Your passport should stay valid for your whole planned stay. Renew early: it is the first document every application asks for.",
    xp: 10,
    link: { to: "/tools/documents", label: "Open Documents" },
  },
  police: {
    id: "common.police",
    title: "Request a police clearance certificate",
    detail:
      "Most visas lasting longer than a short visit need a police certificate from each country you have lived in for a set period. In Sri Lanka these come from Sri Lanka Police.",
    xp: 20,
    link: { href: SOURCES.slPolice.href, label: "Sri Lanka Police" },
  },
  medical: {
    id: "common.medical",
    title: "Book your medical and chest X-ray if asked",
    detail:
      "Longer stays usually need a medical certificate and/or chest X-ray from an Immigration NZ panel physician. Check which ones your visa needs before you book.",
    xp: 20,
  },
  translations: {
    id: "common.translations",
    title: "Get certified translations of Sinhala or Tamil documents",
    detail: "Documents not in English (birth and marriage certificates, for example) need certified English translations.",
    xp: 15,
    link: { to: "/tools/documents", label: "Track documents" },
  },
  quiz: {
    id: "common.quiz",
    title: "Score 80% on the Kiwi Life quiz",
    detail: "Slang, road rules, renting and work basics: the things nobody tells you before you land.",
    xp: 30,
    link: { to: "/tools/quiz", label: "Play Kiwi Life" },
  },
  food: {
    id: "common.biosecurity",
    title: "Pack for New Zealand's border rules",
    detail:
      "New Zealand has strict biosecurity rules. Declare all food, plants and animal products on your arrival card, or leave them at home. Undeclared items can mean an instant fine.",
    xp: 10,
  },
  ird: {
    id: "common.ird",
    title: "Apply for an IRD number",
    detail: "Your tax number from Inland Revenue. Apply as soon as you arrive; employers need it to pay you at the right tax rate.",
    xp: 20,
    link: { href: SOURCES.ird.href, label: "Inland Revenue" },
  },
  bank: {
    id: "common.bank",
    title: "Open a New Zealand bank account",
    detail: "Some banks let you start the process before you arrive. Bring your passport and proof of address.",
    xp: 15,
  },
  gp: {
    id: "common.gp",
    title: "Enrol with a GP (family doctor)",
    detail: "Enrolling with a local medical centre makes appointments easier and can make them cheaper if you are eligible for public health funding.",
    xp: 15,
  },
  sim: {
    id: "common.sim",
    title: "Get a local SIM or eSIM",
    detail: "You'll need an NZ mobile number for banks, employers and two-factor codes. Prepaid plans are easy to start with.",
    xp: 10,
  },
  rights: {
    id: "common.rights",
    title: "Learn your work rights",
    detail:
      "Every worker in NZ has the same minimum rights: a written employment agreement, at least minimum wage, holidays and sick leave. Your visa may add limits on hours or employer.",
    xp: 15,
    link: { href: SOURCES.employment.href, label: "Employment NZ" },
  },
  cv: {
    id: "common.cv",
    title: "Make an NZ-style CV",
    detail: "Two to three pages, achievements over duties, and no photo, date of birth, NIC number or religion.",
    xp: 30,
    link: { to: "/tools/cv", label: "Open CV Studio" },
  },
  speaking: {
    id: "common.speaking",
    title: "Do three speaking practice sessions",
    detail: "Record yourself answering test-style questions and track your pace, filler words and pauses.",
    xp: 30,
    link: { to: "/tools/english", label: "Open English Coach" },
  },
} satisfies Record<string, Task>;

const t = (id: string, title: string, detail: string, xp = 15, link?: Task["link"]): Task => ({ id, title, detail, xp, link });

const firstThirtyDays = (prefix: string): Level => ({
  id: `${prefix}.arrive`,
  title: "First 30 days",
  summary: "Set up the basics so work, study and everyday life run smoothly.",
  icon: "home",
  tasks: [
    common.ird,
    common.bank,
    common.sim,
    common.gp,
    common.rights,
    t(
      `${prefix}.arrive.rent`,
      "Know your renting rights before you sign",
      "A bond can be at most four weeks' rent, and your landlord must lodge it with Tenancy Services. Never pay a bond in cash without a receipt.",
      15,
      { href: SOURCES.tenancy.href, label: "Tenancy Services" },
    ),
  ],
});

export const PATHWAYS: Pathway[] = [
  {
    id: "student",
    name: "Study a Masters",
    short: "Student → Masters",
    tint: "malibu",
    icon: "graduation",
    summary:
      "Study a postgraduate qualification in New Zealand, gain local work experience on a post-study work visa, then aim for residence through a skilled job.",
    whoFor: [
      "You have a bachelor's degree, or will soon",
      "You can show money for tuition and living costs",
      "You want an NZ qualification and NZ work experience before deciding on residence",
    ],
    steps: [
      {
        title: "Choose a programme and university",
        detail:
          "Shortlist programmes that build on your degree and lead to jobs in demand. Check entry requirements, intakes and fees on each university's own website.",
      },
      {
        title: "Meet the English requirement",
        detail:
          "Universities set their own English entry levels. Many Masters programmes ask for an academic IELTS around 6.5 overall, or an equivalent PTE or TOEFL score.",
      },
      {
        title: "Get an offer of place",
        detail: "Apply directly or through a licensed agent. You'll receive an offer of place once you meet the entry requirements.",
      },
      {
        title: "Show your funds",
        detail:
          "You must show you can pay tuition and living costs. Immigration NZ asks for evidence of NZD 20,000 for each year of study for living costs, plus funds for an onward ticket.",
      },
      {
        title: "Apply for a student visa",
        detail: "Apply online with Immigration New Zealand. Longer courses usually need a medical certificate, chest X-ray and police certificate.",
      },
      {
        title: "Study and work part-time",
        detail:
          "Student visas granted since 3 November 2025 usually allow up to 25 hours of work a week in term and full-time work in scheduled breaks. Check the conditions printed on your own visa.",
      },
      {
        title: "Post-study work visa",
        detail:
          "After finishing an eligible qualification you may be able to get an open work visa for up to 3 years, depending on the qualification and where you studied.",
      },
      {
        title: "Move towards residence",
        detail: "A skilled job and NZ work experience can lead to residence through the Green List or the Skilled Migrant Category.",
      },
    ],
    requirements: [
      "Offer of place from an approved New Zealand education provider",
      "Tuition paid, or evidence you can pay it",
      "Funds for living costs (NZD 20,000 per year of study) and onward travel",
      "Medical, chest X-ray and police certificate if your course is long enough to need them",
      "International student insurance for your whole stay",
    ],
    timeline: "Start 9 to 12 months before your intake",
    residence: "No direct residence. Graduate, work in a skilled role, then apply through the Green List or the Skilled Migrant Category.",
    watchOuts: [
      "Not every course leads to a post-study work visa. Check eligibility before you pay a deposit.",
      "Partners of Masters and PhD students may qualify for a partner work visa. Check the current rules before you apply.",
      "An agent who promises a guaranteed visa is a red flag. No one can guarantee an Immigration NZ decision.",
    ],
    sources: [SOURCES.inz, SOURCES.study, SOURCES.nzqa, SOURCES.iaa],
    checked: CONTENT_CHECKED,
    documents: ["passport", "photo", "transcripts", "degree", "english", "offer", "funds", "sponsor", "police", "medical", "insurance", "cv"],
    levels: [
      {
        id: "student.start",
        title: "Find your path",
        summary: "Understand the study route and check it fits your goals.",
        icon: "compass",
        tasks: [
          common.finder,
          t("student.start.guide", "Read the Masters path guide", "See every stage from offer to residence in one place.", 10, {
            to: "/paths/student",
            label: "Open guide",
          }),
          t(
            "student.start.field",
            "Pick two job areas you'd like to work in",
            "Choose a programme for the career it leads to, not only the subject. Careers New Zealand lists job outlooks and pay ranges.",
            15,
            { href: SOURCES.careers.href, label: "Careers NZ" },
          ),
        ],
      },
      {
        id: "student.english",
        title: "English test",
        summary: "Prepare, book and pass the test your universities accept.",
        icon: "mic",
        tasks: [
          t(
            "student.english.choose",
            "Choose IELTS Academic, PTE Academic or TOEFL",
            "Check which tests and scores your shortlisted programmes accept. IELTS General is not usually accepted for university entry.",
          ),
          common.speaking,
          t("student.english.book", "Book your test date", "Leave time for a retake before application deadlines.", 20),
          t("student.english.score", "Get your score report", "Keep the test report form number; universities use it to verify your score.", 30),
        ],
      },
      {
        id: "student.courses",
        title: "Courses & offers",
        summary: "Shortlist programmes, apply and accept an offer of place.",
        icon: "school",
        tasks: [
          t("student.courses.shortlist", "Shortlist three programmes", "Compare fees, intakes, entry scores and deadlines side by side.", 20, {
            to: "/tools/courses",
            label: "Open Course Shortlist",
          }),
          t(
            "student.courses.sop",
            "Write your statement of purpose",
            "Explain why this programme, why New Zealand and what you will do afterwards. Keep it specific and honest.",
            20,
          ),
          t("student.courses.refs", "Ask two referees for letters", "Academic or work referees who know you well. Give them at least three weeks.", 15),
          t("student.courses.apply", "Submit your applications", "Upload certified transcripts, your degree, English results and CV.", 25),
          t("student.courses.offer", "Accept an offer of place", "Read the refund policy before you pay a tuition deposit.", 30),
        ],
      },
      {
        id: "student.money",
        title: "Funds & budget",
        summary: "Plan tuition, living costs and the proof Immigration NZ asks for.",
        icon: "wallet",
        tasks: [
          common.budget,
          t(
            "student.money.proof",
            "Gather proof of funds",
            "Bank statements showing funds held over time, education loan approval letters, or sponsor documents. Sudden large deposits raise questions.",
            25,
          ),
          t(
            "student.money.sponsor",
            "Prepare sponsor documents if family is supporting you",
            "Sponsors usually show their relationship to you, their income and their savings.",
            15,
          ),
          t("student.money.goal", "Set a monthly savings goal", "Turn the gap into a monthly amount you can track.", 10, {
            to: "/tools/money",
            label: "Set goal",
          }),
        ],
      },
      {
        id: "student.docs",
        title: "Documents",
        summary: "Collect certificates early: some take weeks.",
        icon: "files",
        tasks: [common.passport, common.police, common.medical, common.translations],
      },
      {
        id: "student.visa",
        title: "Visa application",
        summary: "Apply with Immigration New Zealand and stay safe from scams.",
        icon: "stamp",
        tasks: [
          common.scamCheck,
          common.adviser,
          t("student.visa.account", "Create your Immigration NZ online account", "Apply online. Keep your login details and application number safe.", 10, {
            href: SOURCES.inz.href,
            label: "Immigration NZ",
          }),
          t("student.visa.submit", "Submit your student visa application", "Upload every document in English and pay the fee online.", 40),
          t("student.visa.respond", "Reply quickly to any requests", "Immigration NZ may ask for more information. Missing a deadline can delay or end your application.", 15),
        ],
      },
      {
        id: "student.fly",
        title: "Get ready to fly",
        summary: "Flights, a place to stay and knowing what to expect.",
        icon: "plane",
        tasks: [
          t("student.fly.insurance", "Buy international student insurance", "Insurance is a condition of study for international students. Many universities offer a default policy.", 15),
          t("student.fly.stay", "Arrange your first weeks of accommodation", "University halls, homestays or a short-term rental while you look for a flat.", 20),
          t("student.fly.flights", "Book flights for orientation week", "Arrive before orientation so you can settle in and set up accounts.", 15),
          common.food,
          common.quiz,
        ],
      },
      firstThirtyDays("student"),
      {
        id: "student.after",
        title: "After graduation",
        summary: "Turn your qualification into work and, later, residence.",
        icon: "trend",
        tasks: [
          common.cv,
          t(
            "student.after.psw",
            "Check your post-study work visa eligibility",
            "Apply before your student visa expires. Eligibility depends on your qualification and how long you studied in NZ.",
            30,
          ),
          t(
            "student.after.residence",
            "Map your route to residence",
            "Compare the Green List and Skilled Migrant Category against the jobs you are targeting.",
            20,
            { to: "/paths/worker", label: "See skilled worker path" },
          ),
        ],
      },
    ],
  },
  {
    id: "worker",
    name: "Skilled worker",
    short: "Job offer → Work visa",
    tint: "gold",
    icon: "briefcase",
    summary:
      "Get a job offer from an accredited New Zealand employer, move on an Accredited Employer Work Visa (AEWV), then build towards residence.",
    whoFor: [
      "You have skills and experience that NZ employers need",
      "You can get a job offer from an accredited employer",
      "You meet any registration or English requirement for your role",
    ],
    steps: [
      {
        title: "Check demand for your occupation",
        detail:
          "Look up your occupation on the Green List and other occupation lists on immigration.govt.nz, and check whether NZ law requires registration for it.",
      },
      {
        title: "Get your skills recognised",
        detail:
          "Regulated jobs need NZ registration before you can work. NZQA can assess overseas qualifications when your visa or residence application needs it.",
      },
      {
        title: "Prepare an NZ-style CV",
        detail: "Kiwi employers expect a short, achievement-focused CV without a photo, age, religion or marital status.",
      },
      {
        title: "Find an accredited employer",
        detail:
          "Only employers accredited by Immigration NZ can hire you on an AEWV. Check accreditation on the official list before you accept anything.",
      },
      {
        title: "Employer completes a Job Check",
        detail:
          "The employer confirms the pay and conditions meet the rules and, for most roles, that they advertised for New Zealanders first. You then receive a job token.",
      },
      {
        title: "Apply for your AEWV",
        detail:
          "Apply online with your job token, passport, qualification and experience evidence, medical and police certificates. Some roles also need proof of English.",
      },
      {
        title: "Move and start work",
        detail: "Work for your employer within your visa conditions. Keep payslips, your employment agreement and records of your duties.",
      },
      {
        title: "Move towards residence",
        detail:
          "Depending on your role and pay: Green List Straight to Residence or Work to Residence, or one of the Skilled Migrant Category pathways.",
      },
    ],
    requirements: [
      "Job offer from an Immigration NZ accredited employer",
      "An approved Job Check (job token) for your role",
      "The qualifications or experience the role requires",
      "Proof of English for some roles (requirements were widened in 2026, so check yours)",
      "Health and character requirements (medical and police certificates)",
    ],
    timeline: "Often 6 to 18 months, mostly spent finding the right job",
    residence:
      "Green List (Straight to Residence, or Work to Residence after 2 years), or the Skilled Migrant Category: the points-based, skilled work experience, or trades and technician pathways.",
    watchOuts: [
      "Never pay for a job offer. NZ law does not allow employers to charge a premium for a job.",
      "Check the employer is accredited before you resign from your job in Sri Lanka or pay anyone.",
      "Your AEWV is tied to your employer and role. Changing jobs needs a new visa or a change of conditions.",
    ],
    sources: [SOURCES.inz, SOURCES.nzqa, SOURCES.employment, SOURCES.iaa],
    checked: CONTENT_CHECKED,
    documents: ["passport", "photo", "degree", "transcripts", "experience", "english", "contract", "police", "medical", "cv"],
    levels: [
      {
        id: "worker.start",
        title: "Find your path",
        summary: "Check your occupation and the routes open to you.",
        icon: "compass",
        tasks: [
          common.finder,
          t("worker.start.occupation", "Check your occupation", "See whether your job is regulated in NZ and who registers it.", 20, {
            to: "/tools/occupations",
            label: "Open Occupation Check",
          }),
          t("worker.start.guide", "Read the skilled worker guide", "Every stage from job search to residence.", 10, { to: "/paths/worker", label: "Open guide" }),
        ],
      },
      {
        id: "worker.recognised",
        title: "Get recognised",
        summary: "Registration, qualification assessment and reference letters.",
        icon: "badge",
        tasks: [
          t("worker.recognised.registration", "Start registration if your job needs it", "Registration can take months. Start before job hunting if your occupation is regulated.", 30),
          t(
            "worker.recognised.nzqa",
            "Check whether you need an NZQA assessment",
            "Some residence pathways and employers need your qualification assessed against the NZ framework.",
            20,
            { href: SOURCES.nzqa.href, label: "NZQA" },
          ),
          t(
            "worker.recognised.refs",
            "Collect detailed reference letters",
            "Letters on company letterhead with your title, dates, hours, salary and main duties. Immigration NZ uses them to check your experience.",
            25,
          ),
        ],
      },
      {
        id: "worker.english",
        title: "English",
        summary: "Find out whether your role needs a test, and practise either way.",
        icon: "mic",
        tasks: [
          t("worker.english.check", "Check if your role needs an English test", "Requirements depend on the role's skill level. Check before you apply.", 10),
          common.speaking,
          t("worker.english.book", "Book a test if you need one", "IELTS, PTE and other tests are accepted. Check which scores apply.", 20),
        ],
      },
      {
        id: "worker.jobs",
        title: "CV & job search",
        summary: "Market yourself the way Kiwi employers expect.",
        icon: "search",
        tasks: [
          common.cv,
          t(
            "worker.jobs.linkedin",
            "Update your LinkedIn profile",
            "Match your CV, add the NZ city you are targeting, and say whether you need visa sponsorship.",
            15,
          ),
          t("worker.jobs.shortlist", "Shortlist ten accredited employers", "Focus on employers that already hire overseas workers in your field.", 20),
          t("worker.jobs.apply", "Send ten tailored applications", "Tailor each CV summary and cover letter to the job ad's wording.", 30),
        ],
      },
      {
        id: "worker.offer",
        title: "Job offer",
        summary: "Make sure the offer is real before you rely on it.",
        icon: "handshake",
        tasks: [
          common.scamCheck,
          t("worker.offer.accredited", "Confirm the employer is accredited", "Check the official accredited employer list on immigration.govt.nz.", 20, {
            href: SOURCES.inz.href,
            label: "Immigration NZ",
          }),
          t(
            "worker.offer.agreement",
            "Read your employment agreement",
            "It must be in writing and list your pay, hours, duties and location. Ask questions before you sign.",
            20,
          ),
          t("worker.offer.jobcheck", "Get your job token", "Your employer's approved Job Check gives you the token you need to apply.", 25),
        ],
      },
      {
        id: "worker.visa",
        title: "Visa application",
        summary: "Certificates, application and safe handling of your documents.",
        icon: "stamp",
        tasks: [common.passport, common.police, common.medical, common.translations, common.adviser, t("worker.visa.submit", "Submit your AEWV application", "Apply online with your job token and documents.", 40)],
      },
      {
        id: "worker.move",
        title: "Money & move",
        summary: "Plan for the gap between landing and your first pay.",
        icon: "plane",
        tasks: [
          common.budget,
          t("worker.move.buffer", "Save for at least four weeks before first pay", "Rent in advance, bond, transport and food add up quickly in the first month.", 20),
          t("worker.move.stay", "Book temporary accommodation", "Two to four weeks gives you time to view flats in person.", 15),
          common.food,
          common.quiz,
        ],
      },
      firstThirtyDays("worker"),
      {
        id: "worker.residence",
        title: "Residence",
        summary: "Build the record you'll need for a residence application.",
        icon: "trend",
        tasks: [
          t("worker.residence.track", "Keep payslips and records", "Your NZ work experience and pay history are evidence for residence.", 15),
          t("worker.residence.route", "Check which residence pathway fits", "Green List, Skilled Migrant points, skilled work experience, or trades and technician.", 20),
          t(
            "worker.residence.advice",
            "Get licensed advice before you apply",
            "Residence applications are expensive and detailed. A licensed adviser can check your evidence first.",
            15,
            { href: SOURCES.iaa.href, label: "Find an adviser" },
          ),
        ],
      },
    ],
  },
  {
    id: "registered",
    name: "Registered professional",
    short: "Registration → Job → Visa",
    tint: "pink",
    icon: "badge",
    summary:
      "For regulated jobs such as nursing, medicine, teaching and electrical work. Get NZ registration first, then a job offer and visa. Many registered roles are on the Green List.",
    whoFor: [
      "You work in a job that NZ law regulates",
      "You can meet the regulator's qualification, experience and English standards",
      "You're ready for a registration process that can take several months",
    ],
    steps: [
      {
        title: "Find your regulator",
        detail: "Each regulated job has its own body, such as the Nursing Council of New Zealand or the Teaching Council. Use Occupation Check to find yours.",
      },
      {
        title: "Apply for registration",
        detail: "The regulator assesses your qualification, experience and English. Their English standard is often higher than the visa standard.",
      },
      {
        title: "Complete any bridging requirements",
        detail: "Some regulators ask for a competence programme, exam or supervised practice in New Zealand.",
      },
      {
        title: "Get a job offer",
        detail: "Most roles need an offer from an accredited employer. Registration makes you far more attractive to employers.",
      },
      {
        title: "Apply for your visa",
        detail: "Usually an Accredited Employer Work Visa. Some Green List Tier 1 roles can apply straight to residence.",
      },
      {
        title: "Settle and grow your career",
        detail: "Keep your practising certificate current and record your NZ experience for residence.",
      },
    ],
    requirements: [
      "Registration, or provisional registration, with the NZ regulator for your job",
      "The regulator's English standard",
      "A job offer, usually from an accredited employer",
      "Health and character requirements",
    ],
    timeline: "Often 9 to 24 months, depending on registration",
    residence: "Many registered roles are on the Green List. Others can use the Skilled Migrant Category, where NZ registration can earn points.",
    watchOuts: [
      "Only the regulator can register you. Be wary of anyone selling a guaranteed registration.",
      "Keep originals and certified copies of transcripts, registrations and certificates of good standing.",
    ],
    sources: [SOURCES.inz, SOURCES.careers, SOURCES.iaa],
    checked: CONTENT_CHECKED,
    documents: ["passport", "degree", "transcripts", "registration", "goodstanding", "experience", "english", "police", "medical", "cv"],
    levels: [
      {
        id: "registered.start",
        title: "Find your path",
        summary: "Identify your regulator and what it asks for.",
        icon: "compass",
        tasks: [
          common.finder,
          t("registered.start.regulator", "Find your regulator", "Look up your occupation to see who registers it.", 20, {
            to: "/tools/occupations",
            label: "Open Occupation Check",
          }),
        ],
      },
      {
        id: "registered.registration",
        title: "Registration",
        summary: "The longest step. Start it first.",
        icon: "badge",
        tasks: [
          t("registered.registration.standard", "Read your regulator's requirements", "Note the English score, documents and fees they need.", 15),
          t("registered.registration.goodstanding", "Request certificates of good standing", "From each body that has registered you, such as the Sri Lanka Medical Council or Sri Lanka Nursing Council.", 20),
          t("registered.registration.english", "Reach the regulator's English score", "Their standard can be higher than the visa standard.", 30, {
            to: "/tools/english",
            label: "Practise speaking",
          }),
          t("registered.registration.apply", "Submit your registration application", "Keep copies of everything you send.", 40),
        ],
      },
      {
        id: "registered.jobs",
        title: "Job search",
        summary: "Employers in regulated fields often recruit from overseas.",
        icon: "search",
        tasks: [common.cv, common.scamCheck, t("registered.jobs.offer", "Accept a written job offer", "Check the employer's accreditation and read the agreement.", 30)],
      },
      {
        id: "registered.visa",
        title: "Visa application",
        summary: "Certificates and your application.",
        icon: "stamp",
        tasks: [common.passport, common.police, common.medical, common.adviser, t("registered.visa.submit", "Submit your visa application", "AEWV, or Straight to Residence if your role qualifies.", 40)],
      },
      {
        id: "registered.move",
        title: "Get ready to fly",
        summary: "Budget, travel and settling in.",
        icon: "plane",
        tasks: [common.budget, common.food, common.quiz],
      },
      firstThirtyDays("registered"),
    ],
  },
  {
    id: "family",
    name: "Partner & family",
    short: "Join a partner",
    tint: "lavender",
    icon: "heart",
    summary:
      "Join a partner who is a New Zealand citizen or resident, or who holds an eligible work or student visa. Your visa type depends on your partner's.",
    whoFor: [
      "Your partner lives in, or is moving to, New Zealand",
      "You live together in a genuine and stable relationship",
      "You can show evidence of your relationship over time",
    ],
    steps: [
      {
        title: "Check your partner can support you",
        detail: "Citizens, residents and some work and student visa holders can support a partner. The rules depend on their visa type and occupation.",
      },
      {
        title: "Gather relationship evidence",
        detail:
          "Joint leases, shared bills and bank accounts, photos over time, travel together and messages. A marriage certificate alone is not enough.",
      },
      {
        title: "Apply for the right partner visa",
        detail:
          "Temporary partner visas let you live, and often work, in NZ. Partnership-based residence usually needs you to have lived together for at least 12 months.",
      },
      {
        title: "Include your children",
        detail: "Dependent children can usually be included in, or apply alongside, the family's applications.",
      },
    ],
    requirements: [
      "Evidence of a genuine and stable relationship, including living together",
      "Your partner's eligibility to support you",
      "Certified translations of Sinhala or Tamil certificates",
      "Health and character requirements",
    ],
    timeline: "Usually 3 to 12 months, depending on the visa",
    residence: "Partnership-based residence is possible if your partner is a citizen or resident and you meet the relationship requirements.",
    watchOuts: [
      "Start collecting relationship evidence early. Time apart needs explaining.",
      "Parents of NZ citizens and residents have separate visitor and resident options. Check them on immigration.govt.nz.",
    ],
    sources: [SOURCES.inz, SOURCES.iaa],
    checked: CONTENT_CHECKED,
    documents: ["passport", "photo", "marriage", "birth", "relationship", "police", "medical"],
    levels: [
      {
        id: "family.start",
        title: "Find your path",
        summary: "Work out which partner visa applies.",
        icon: "compass",
        tasks: [common.finder, t("family.start.guide", "Read the partner & family guide", "Understand evidence and timing.", 10, { to: "/paths/family", label: "Open guide" })],
      },
      {
        id: "family.evidence",
        title: "Relationship evidence",
        summary: "Build a clear record of your life together.",
        icon: "heart",
        tasks: [
          t("family.evidence.living", "Collect proof you live together", "Leases, utility bills and letters at the same address.", 30),
          t("family.evidence.money", "Show shared finances", "Joint accounts, transfers and shared expenses.", 20),
          t("family.evidence.timeline", "Write a short relationship timeline", "Key dates: when you met, moved in, married and any time apart.", 20),
          common.translations,
        ],
      },
      {
        id: "family.visa",
        title: "Visa application",
        summary: "Certificates and your application.",
        icon: "stamp",
        tasks: [common.passport, common.police, common.medical, common.adviser, t("family.visa.submit", "Submit your partner visa application", "Apply online and keep your application number.", 40)],
      },
      {
        id: "family.move",
        title: "Get ready to fly",
        summary: "Budget, travel and settling in.",
        icon: "plane",
        tasks: [common.budget, common.food, common.quiz],
      },
      firstThirtyDays("family"),
    ],
  },
  {
    id: "business",
    name: "Business & investor",
    short: "Invest or build a business",
    tint: "teal",
    icon: "trend",
    summary:
      "For experienced business owners and investors with significant capital. These visas are complex, so talk to a licensed immigration adviser early.",
    whoFor: [
      "You have a successful business track record",
      "You have significant funds to invest in New Zealand",
      "You're prepared for a detailed business plan or investment process",
    ],
    steps: [
      {
        title: "Compare business and investor visas",
        detail: "Options include visas for investors and for people who buy or set up a business. Each has its own capital and experience thresholds.",
      },
      {
        title: "Get professional advice",
        detail: "Use a licensed immigration adviser and an NZ accountant or lawyer for structure, tax and due diligence.",
      },
      {
        title: "Prepare evidence of funds and experience",
        detail: "Show where your funds came from (source of funds) and your business history.",
      },
      {
        title: "Apply and meet your conditions",
        detail: "Most business visas come with conditions you must meet before you can get residence.",
      },
    ],
    requirements: [
      "Significant investment or business capital",
      "Evidence of the lawful source of your funds",
      "Business experience or a credible business plan",
      "Health and character requirements",
    ],
    timeline: "Usually 6 to 18 months",
    residence: "Some investor and business visas lead to residence once their conditions are met.",
    watchOuts: ["Be cautious of business-for-sale schemes that promise a visa.", "Thresholds change. Confirm current figures on immigration.govt.nz."],
    sources: [SOURCES.inz, SOURCES.iaa],
    checked: CONTENT_CHECKED,
    documents: ["passport", "funds", "business", "police", "medical"],
    levels: [
      {
        id: "business.start",
        title: "Find your path",
        summary: "Understand the investor and business options.",
        icon: "compass",
        tasks: [common.finder, common.adviser, t("business.start.compare", "Compare business visa options", "Note each option's capital and experience thresholds.", 20, { href: SOURCES.inz.href, label: "Immigration NZ" })],
      },
      {
        id: "business.plan",
        title: "Plan & evidence",
        summary: "Prepare a credible plan and proof of funds.",
        icon: "files",
        tasks: [
          t("business.plan.funds", "Document the source of your funds", "Statements, sale agreements and tax records that show how you earned the money.", 30),
          t("business.plan.plan", "Draft your business plan", "Market research, budget and hiring plans for New Zealand.", 30),
          common.scamCheck,
        ],
      },
      {
        id: "business.visa",
        title: "Visa application",
        summary: "Certificates and your application.",
        icon: "stamp",
        tasks: [common.passport, common.police, common.medical, t("business.visa.submit", "Submit your application", "With your adviser's help.", 40)],
      },
      firstThirtyDays("business"),
    ],
  },
];

export const PATHWAY_BY_ID = Object.fromEntries(PATHWAYS.map((p) => [p.id, p])) as Record<Pathway["id"], Pathway>;

export function allTasks(pathway: Pathway): Task[] {
  return pathway.levels.flatMap((level) => level.tasks);
}
