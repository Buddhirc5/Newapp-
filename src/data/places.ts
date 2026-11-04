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
  /** Weekly rent estimates in NZD. Editable in the Money Planner. */
  rent: { room: number; "one-bed": number; "two-bed": number };
}

/**
 * Rough weekly rent estimates for budgeting, not quotes. They should be refreshed
 * from MBIE's Market Rent data before relying on them (see supabase/README).
 */
export const CITIES: City[] = [
  { id: "auckland", name: "Auckland", maori: "Tāmaki Makaurau", rent: { room: 300, "one-bed": 520, "two-bed": 640 } },
  { id: "wellington", name: "Wellington", maori: "Te Whanganui-a-Tara", rent: { room: 290, "one-bed": 500, "two-bed": 620 } },
  { id: "christchurch", name: "Christchurch", maori: "Ōtautahi", rent: { room: 250, "one-bed": 430, "two-bed": 540 } },
  { id: "hamilton", name: "Hamilton", maori: "Kirikiriroa", rent: { room: 240, "one-bed": 420, "two-bed": 530 } },
  { id: "dunedin", name: "Dunedin", maori: "Ōtepoti", rent: { room: 230, "one-bed": 400, "two-bed": 500 } },
];

export const CITY_BY_ID = Object.fromEntries(CITIES.map((c) => [c.id, c])) as Record<CityId, City>;
