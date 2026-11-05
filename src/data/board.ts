import type { Tint } from "@/types";

export type ListingCategory = "room" | "flat" | "homestay" | "pickup" | "item" | "job" | "deal" | "service";
export type PriceUnit = "week" | "month" | "once" | "free" | "hour";

export interface Listing {
  id: string;
  owner_id: string;
  category: ListingCategory;
  title: string;
  description: string;
  price_nzd: number | null;
  price_unit: PriceUnit;
  city: string;
  suburb: string;
  available_from: string | null;
  photos: string[];
  status: "active" | "hidden" | "sold" | "removed";
  created_at: string;
  owner?: { display_name: string; verified: boolean; role: string } | null;
  sample?: boolean;
}

export const CATEGORIES: { id: ListingCategory; label: string; plural: string; tint: Tint; emoji: string; units: PriceUnit[] }[] = [
  { id: "room", label: "Room", plural: "Rooms", tint: "malibu", emoji: "🛏️", units: ["week", "month"] },
  { id: "flat", label: "Flat or house", plural: "Flats", tint: "teal", emoji: "🏠", units: ["week", "month"] },
  { id: "homestay", label: "Homestay", plural: "Homestays", tint: "lavender", emoji: "🍛", units: ["week", "month"] },
  { id: "pickup", label: "Airport pickup", plural: "Pickups", tint: "gold", emoji: "✈️", units: ["once", "free"] },
  { id: "item", label: "For sale", plural: "For sale", tint: "pink", emoji: "🛍️", units: ["once", "free"] },
  { id: "job", label: "Job", plural: "Jobs", tint: "green", emoji: "💼", units: ["hour", "week", "once"] },
  { id: "deal", label: "Deal", plural: "Deals", tint: "coral", emoji: "🏷️", units: ["once", "free"] },
  { id: "service", label: "Help & services", plural: "Help", tint: "gold", emoji: "🤝", units: ["hour", "once", "free"] },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<ListingCategory, (typeof CATEGORIES)[number]>;

export const UNIT_LABEL: Record<PriceUnit, string> = { week: "/week", month: "/month", once: "", free: "Free", hour: "/hour" };

export const NZ_CITIES = ["Auckland", "Wellington", "Christchurch", "Hamilton", "Tauranga", "Dunedin", "Palmerston North", "Nelson", "Napier & Hastings", "New Plymouth", "Rotorua", "Queenstown", "Whangārei", "Invercargill", "Other"];

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

/** Shown only when the app runs without a backend (local mode and the preview). Always labelled as samples. */
export const SAMPLE_LISTINGS: Listing[] = [
  {
    id: "sample-1",
    owner_id: "sample",
    category: "room",
    title: "Furnished room near Mt Albert train station",
    description:
      "Quiet room in a Sri Lankan family home. Power, wifi and laundry included. 10 minutes' walk to the station, 20 minutes to the University of Auckland. Viewing in person or by video call before you pay anything.",
    price_nzd: 260,
    price_unit: "week",
    city: "Auckland",
    suburb: "Mt Albert",
    available_from: daysAgo(-14).slice(0, 10),
    photos: [],
    status: "active",
    created_at: daysAgo(1),
    owner: { display_name: "Sample host", verified: true, role: "helper" },
    sample: true,
  },
  {
    id: "sample-2",
    owner_id: "sample",
    category: "pickup",
    title: "Airport pickup for new arrivals, Christchurch",
    description: "I pick up students and workers arriving at Christchurch Airport and help with a SIM card on the way. Fuel cost only. Message me your flight number.",
    price_nzd: 30,
    price_unit: "once",
    city: "Christchurch",
    suburb: "Riccarton",
    available_from: null,
    photos: [],
    status: "active",
    created_at: daysAgo(2),
    owner: { display_name: "Sample helper", verified: false, role: "helper" },
    sample: true,
  },
  {
    id: "sample-3",
    owner_id: "sample",
    category: "homestay",
    title: "Homestay with Sri Lankan meals in Hamilton",
    description: "Room plus breakfast and dinner, close to the University of Waikato. Good for your first months while you find a flat. Rice and curry most nights!",
    price_nzd: 330,
    price_unit: "week",
    city: "Hamilton",
    suburb: "Hillcrest",
    available_from: null,
    photos: [],
    status: "active",
    created_at: daysAgo(3),
    owner: { display_name: "Sample host", verified: true, role: "helper" },
    sample: true,
  },
  {
    id: "sample-4",
    owner_id: "sample",
    category: "item",
    title: "Winter starter pack: heater, duvet and jacket",
    description: "Leaving NZ and selling my winter things together. Oil heater, queen duvet and a warm jacket (size M). Pick up in Wellington CBD.",
    price_nzd: 90,
    price_unit: "once",
    city: "Wellington",
    suburb: "Te Aro",
    available_from: null,
    photos: [],
    status: "active",
    created_at: daysAgo(4),
    owner: { display_name: "Sample member", verified: false, role: "newcomer" },
    sample: true,
  },
  {
    id: "sample-5",
    owner_id: "sample",
    category: "deal",
    title: "Prepaid SIM with free first month of data",
    description: "Some mobile networks offer a free first month for new prepaid customers. Check the current offer in store and bring your passport.",
    price_nzd: null,
    price_unit: "free",
    city: "Auckland",
    suburb: "",
    available_from: null,
    photos: [],
    status: "active",
    created_at: daysAgo(5),
    owner: { display_name: "Sample member", verified: false, role: "newcomer" },
    sample: true,
  },
  {
    id: "sample-6",
    owner_id: "sample",
    category: "service",
    title: "Help setting up your IRD number and bank account",
    description: "I arrived two years ago and help newcomers with the first-week admin: IRD number, bank account, GP enrolment and a transport card. Happy to meet in the city.",
    price_nzd: null,
    price_unit: "free",
    city: "Auckland",
    suburb: "CBD",
    available_from: null,
    photos: [],
    status: "active",
    created_at: daysAgo(6),
    owner: { display_name: "Sample helper", verified: false, role: "helper" },
    sample: true,
  },
];

export const ROLE_LABEL: Record<string, string> = {
  planner: "Planning in Sri Lanka",
  newcomer: "New in NZ",
  helper: "Helper in NZ",
  provider: "Verified provider",
};

/** Safety rules shown on every listing and before posting. */
export const BOARD_RULES = [
  "Never pay a bond or rent before you've viewed the place, in person or by live video.",
  "A landlord must lodge your bond with Tenancy Services and give you a receipt.",
  "Keep chats inside KiwiPath until you trust the person.",
  "Report anything that asks for money upfront, a deposit to “hold” a room, or your passport.",
];
