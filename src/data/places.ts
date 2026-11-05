import type { CityId } from "@/types";

export interface University {
  id: string;
  name: string;
  city: string;
  href: string;
}

/** New Zealand's eight universities. Programme details live on each university's own site. */
export const UNIVERSITIES: University[] = [
  { id: "uoa", name: "University of Auckland", city: "Auckland", href: "https://www.auckland.ac.nz" },
  { id: "aut", name: "Auckland University of Technology", city: "Auckland", href: "https://www.aut.ac.nz" },
  { id: "waikato", name: "University of Waikato", city: "Hamilton", href: "https://www.waikato.ac.nz" },
  { id: "massey", name: "Massey University", city: "Palmerston North, Auckland, Wellington", href: "https://www.massey.ac.nz" },
  { id: "vuw", name: "Te Herenga Waka—Victoria University of Wellington", city: "Wellington", href: "https://www.wgtn.ac.nz" },
  { id: "canterbury", name: "University of Canterbury", city: "Christchurch", href: "https://www.canterbury.ac.nz" },
  { id: "lincoln", name: "Lincoln University", city: "Lincoln, near Christchurch", href: "https://www.lincoln.ac.nz" },
  { id: "otago", name: "University of Otago", city: "Dunedin", href: "https://www.otago.ac.nz" },
];

export interface City {
  id: CityId;
  name: string;
  maori: string;
  region: string;
  /** Weekly rent estimates in NZD. Editable in the Money Planner. */
  rent: { room: number; "one-bed": number; "two-bed": number };
  /** Rough weekly living costs for one adult, NZD. */
  weekly: { groceries: number; transport: number; power: number; phone: number };
  /** One line on why people choose it. */
  known: string;
  /** Main industries hiring, to guide job searches. */
  jobs: string[];
  /** Universities or polytechnic campuses in or near the city. */
  study: string[];
  /** Sri Lankan community size, for newcomers looking for support. */
  community: "large" | "growing" | "small";
  climate: string;
}

/**
 * Rough weekly estimates for budgeting, not quotes. Rents follow MBIE market
 * rent medians (2025-26); living costs follow Stats NZ household spending.
 * Refresh before relying on them. "undecided" uses national averages.
 */
export const CITIES: City[] = [
  { id: "undecided", name: "Not decided yet", maori: "NZ average", region: "New Zealand", rent: { room: 260, "one-bed": 450, "two-bed": 560 }, weekly: { groceries: 120, transport: 45, power: 40, phone: 20 }, known: "Compare cities first, then pick.", jobs: [], study: [], community: "growing", climate: "" },
  { id: "auckland", name: "Auckland", maori: "Tāmaki Makaurau", region: "Auckland", rent: { room: 300, "one-bed": 520, "two-bed": 640 }, weekly: { groceries: 130, transport: 50, power: 40, phone: 20 }, known: "Most jobs, biggest Sri Lankan community, highest costs.", jobs: ["IT", "Finance", "Construction", "Healthcare", "Hospitality"], study: ["University of Auckland", "AUT", "Massey (Albany)"], community: "large", climate: "Mild, humid, rainy winters" },
  { id: "wellington", name: "Wellington", maori: "Te Whanganui-a-Tara", region: "Wellington", rent: { room: 290, "one-bed": 500, "two-bed": 620 }, weekly: { groceries: 125, transport: 45, power: 45, phone: 20 }, known: "Capital city: government, policy and tech jobs, very walkable.", jobs: ["Government", "IT", "Professional services", "Film"], study: ["Victoria University of Wellington", "Massey (Wellington)"], community: "growing", climate: "Windy, cool, changeable" },
  { id: "christchurch", name: "Christchurch", maori: "Ōtautahi", region: "Canterbury", rent: { room: 250, "one-bed": 430, "two-bed": 540 }, weekly: { groceries: 120, transport: 40, power: 45, phone: 20 }, known: "Rebuilt, flat and bike-friendly, cheaper than Auckland.", jobs: ["Engineering", "Construction", "Agritech", "Healthcare"], study: ["University of Canterbury", "Lincoln University", "Ara"], community: "large", climate: "Dry, warm summers, frosty winters" },
  { id: "hamilton", name: "Hamilton", maori: "Kirikiriroa", region: "Waikato", rent: { room: 240, "one-bed": 420, "two-bed": 530 }, weekly: { groceries: 115, transport: 40, power: 40, phone: 20 }, known: "Fast-growing, near Auckland, strong dairy and agri jobs.", jobs: ["Agriculture", "Healthcare", "Manufacturing", "Education"], study: ["University of Waikato", "Wintec"], community: "growing", climate: "Mild, foggy winters" },
  { id: "tauranga", name: "Tauranga", maori: "Tauranga Moana", region: "Bay of Plenty", rent: { room: 260, "one-bed": 470, "two-bed": 580 }, weekly: { groceries: 120, transport: 45, power: 38, phone: 20 }, known: "Beaches, sunshine and New Zealand's busiest port.", jobs: ["Logistics", "Horticulture", "Construction", "Healthcare"], study: ["University of Waikato (Tauranga)", "Toi Ohomai"], community: "growing", climate: "Sunny and warm" },
  { id: "dunedin", name: "Dunedin", maori: "Ōtepoti", region: "Otago", rent: { room: 230, "one-bed": 400, "two-bed": 500 }, weekly: { groceries: 115, transport: 35, power: 50, phone: 20 }, known: "Student city with low rents and a top medical school.", jobs: ["Healthcare", "Education", "Research", "Hospitality"], study: ["University of Otago", "Otago Polytechnic"], community: "small", climate: "Cool, cold winters" },
  { id: "palmerston-north", name: "Palmerston North", maori: "Te Papaioea", region: "Manawatū", rent: { room: 220, "one-bed": 380, "two-bed": 480 }, weekly: { groceries: 110, transport: 35, power: 42, phone: 20 }, known: "Affordable, central, Massey University's main campus.", jobs: ["Logistics", "Agri-science", "Defence", "Education"], study: ["Massey University", "UCOL"], community: "small", climate: "Mild, windy" },
  { id: "nelson", name: "Nelson", maori: "Whakatū", region: "Nelson Tasman", rent: { room: 240, "one-bed": 420, "two-bed": 530 }, weekly: { groceries: 120, transport: 40, power: 40, phone: 20 }, known: "Sunniest region, relaxed lifestyle, seasonal work.", jobs: ["Horticulture", "Seafood", "Tourism", "Healthcare"], study: ["NMIT"], community: "small", climate: "Very sunny, mild" },
  { id: "napier-hastings", name: "Napier & Hastings", maori: "Ahuriri & Heretaunga", region: "Hawke's Bay", rent: { room: 230, "one-bed": 400, "two-bed": 510 }, weekly: { groceries: 115, transport: 40, power: 38, phone: 20 }, known: "Wine and fruit country with lower living costs.", jobs: ["Horticulture", "Food processing", "Healthcare", "Construction"], study: ["EIT"], community: "small", climate: "Warm and dry" },
  { id: "new-plymouth", name: "New Plymouth", maori: "Ngāmotu", region: "Taranaki", rent: { room: 230, "one-bed": 400, "two-bed": 510 }, weekly: { groceries: 115, transport: 40, power: 40, phone: 20 }, known: "Energy and engineering hub on the coast.", jobs: ["Energy", "Engineering", "Dairy", "Healthcare"], study: ["WITT"], community: "small", climate: "Mild, wet" },
  { id: "rotorua", name: "Rotorua", maori: "Rotorua-nui-a-Kahumatamomoe", region: "Bay of Plenty", rent: { room: 210, "one-bed": 360, "two-bed": 460 }, weekly: { groceries: 110, transport: 40, power: 40, phone: 20 }, known: "Tourism and forestry, among the cheapest rents.", jobs: ["Tourism", "Forestry", "Healthcare"], study: ["Toi Ohomai"], community: "small", climate: "Mild, cooler winters" },
  { id: "queenstown", name: "Queenstown", maori: "Tāhuna", region: "Otago", rent: { room: 350, "one-bed": 600, "two-bed": 750 }, weekly: { groceries: 140, transport: 45, power: 50, phone: 20 }, known: "Tourism jobs and mountains, but the highest rents.", jobs: ["Tourism", "Hospitality", "Construction"], study: [], community: "small", climate: "Hot summers, snowy winters" },
  { id: "whangarei", name: "Whangārei", maori: "Whangārei-terenga-paraoa", region: "Northland", rent: { room: 220, "one-bed": 380, "two-bed": 480 }, weekly: { groceries: 115, transport: 45, power: 40, phone: 20 }, known: "Subtropical north, close to Auckland, quieter pace.", jobs: ["Healthcare", "Construction", "Marine", "Agriculture"], study: ["NorthTec"], community: "small", climate: "Subtropical, warm" },
  { id: "invercargill", name: "Invercargill", maori: "Waihōpai", region: "Southland", rent: { room: 190, "one-bed": 320, "two-bed": 400 }, weekly: { groceries: 110, transport: 35, power: 50, phone: 20 }, known: "Lowest rents, strong farming and healthcare demand.", jobs: ["Agriculture", "Healthcare", "Manufacturing"], study: ["SIT"], community: "small", climate: "Cool, cold winters" },
];

export const CITY_BY_ID = Object.fromEntries(CITIES.map((c) => [c.id, c])) as Record<CityId, City>;

/** Real cities only, for comparisons. */
export const NZ_CITY_LIST = CITIES.filter((c) => c.id !== "undecided");

/** Weekly cost of living in NZD for one adult in a room, or a 1-bed. */
export function weeklyCost(c: City, housing: keyof City["rent"] = "room"): number {
  return c.rent[housing] + c.weekly.groceries + c.weekly.transport + c.weekly.power + c.weekly.phone;
}
