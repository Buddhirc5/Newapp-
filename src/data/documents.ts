export interface DocumentInfo {
  id: string;
  title: string;
  tip: string;
  /** Typical lead time, shown so people start slow documents first. */
  leadTime: string;
}

export const DOCUMENTS: DocumentInfo[] = [
  {
    id: "passport",
    title: "Passport",
    tip: "Valid for your whole planned stay, with blank pages. Renewals at the Department of Immigration and Emigration can take time in busy months.",
    leadTime: "2–6 weeks if renewing",
  },
  { id: "photo", title: "Visa photo", tip: "A recent digital photo that meets Immigration NZ's photo rules: plain background, no glasses glare.", leadTime: "1 day" },
  {
    id: "birth",
    title: "Birth certificate",
    tip: "Get a recent certified copy. Sinhala or Tamil certificates need a certified English translation.",
    leadTime: "1–3 weeks",
  },
  {
    id: "marriage",
    title: "Marriage certificate",
    tip: "Needed for partner applications. Include a certified English translation if it isn't in English.",
    leadTime: "1–3 weeks",
  },
  {
    id: "degree",
    title: "Degree certificates",
    tip: "Certified copies of every qualification you list. Keep the originals safe.",
    leadTime: "1–2 weeks",
  },
  {
    id: "transcripts",
    title: "Academic transcripts",
    tip: "Request official transcripts from your university's examinations branch. Some universities send them directly to NZ institutions.",
    leadTime: "2–4 weeks",
  },
  { id: "english", title: "English test results", tip: "IELTS, PTE or TOEFL results. Note your test report number and expiry date.", leadTime: "Test date + ~2 weeks" },
  { id: "offer", title: "Offer of place", tip: "The formal offer from your university, showing the course, dates and tuition fee.", leadTime: "4–8 weeks after applying" },
  {
    id: "funds",
    title: "Proof of funds",
    tip: "Bank statements over several months, fixed deposit certificates or loan approval letters. Explain any large recent deposits.",
    leadTime: "1–2 weeks",
  },
  { id: "sponsor", title: "Sponsor documents", tip: "If family is paying: proof of relationship, the sponsor's income, tax records and savings.", leadTime: "2 weeks" },
  {
    id: "experience",
    title: "Employment reference letters",
    tip: "On letterhead, signed, with your title, dates, hours, salary and duties. Add payslips or EPF/ETF statements as backup.",
    leadTime: "1–3 weeks",
  },
  { id: "contract", title: "Job offer and employment agreement", tip: "Signed by you and the employer. Check pay, hours, duties and location match the Job Check.", leadTime: "Depends on employer" },
  {
    id: "registration",
    title: "Professional registration",
    tip: "Your NZ registration letter or proof that your application is under way.",
    leadTime: "Months: start early",
  },
  { id: "goodstanding", title: "Certificates of good standing", tip: "From every professional body that has registered you, issued recently.", leadTime: "2–6 weeks" },
  {
    id: "police",
    title: "Police clearance certificate",
    tip: "From Sri Lanka Police, plus any other country where you've lived for a long period. Certificates are only valid for a limited time, so time them with your application.",
    leadTime: "2–6 weeks",
  },
  {
    id: "medical",
    title: "Medical and chest X-ray",
    tip: "Only from an Immigration NZ approved panel physician. Results are sent electronically.",
    leadTime: "1–2 weeks",
  },
  { id: "insurance", title: "Health and travel insurance", tip: "Compulsory for international students for the full length of study.", leadTime: "1 day" },
  {
    id: "relationship",
    title: "Relationship evidence",
    tip: "Joint lease or utility bills, shared bank accounts, photos together over time, travel records and messages.",
    leadTime: "Collect over months",
  },
  { id: "business", title: "Business and source-of-funds records", tip: "Company accounts, tax returns, sale agreements and bank records showing how you earned your funds.", leadTime: "4–8 weeks" },
  { id: "cv", title: "NZ-style CV", tip: "Two to three pages, achievement-focused, without a photo or personal details like NIC number or religion.", leadTime: "1 evening with CV Studio" },
];

export const DOCUMENT_BY_ID = Object.fromEntries(DOCUMENTS.map((d) => [d.id, d])) as Record<string, DocumentInfo>;
