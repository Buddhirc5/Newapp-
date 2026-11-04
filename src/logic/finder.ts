import { OCCUPATION_BY_ID } from "@/data/occupations";
import { formatLkr } from "@/lib/format";
import type { PathId, Profile } from "@/types";
import { quickEstimateNzd } from "./money";

export type Fit = "strong" | "possible" | "stretch";

export interface Reason {
  good: boolean;
  text: string;
}

export interface PathFit {
  id: PathId;
  score: number;
  fit: Fit;
  reasons: Reason[];
}

const EXPERIENCE_YEARS = { "0-1": 0.5, "2-3": 2.5, "4-5": 4.5, "6+": 7 } as const;

function fitFor(score: number): Fit {
  if (score >= 60) return "strong";
  if (score >= 35) return "possible";
  return "stretch";
}

/**
 * Orders the pathways by how well they match someone's answers. This is a
 * transparent heuristic to help people explore, not an eligibility decision:
 * every reason shown to the user comes from the rules below.
 */
export function rankPaths(profile: Profile, lkrPerNzd: number): PathFit[] {
  const occupation = profile.occupationId ? OCCUPATION_BY_ID[profile.occupationId] : undefined;
  const regulated = Boolean(occupation?.regulator);
  const years = EXPERIENCE_YEARS[profile.experience];
  const englishReady = profile.english === "ready";
  const results: PathFit[] = [];

  // Study a Masters
  {
    const reasons: Reason[] = [];
    let score = 15;
    if (profile.goal === "study") {
      score += 40;
      reasons.push({ good: true, text: "You told us you want to study." });
    } else if (profile.goal === "explore") score += 12;
    else if (profile.goal === "work") score += 4;

    if (profile.qualification === "bachelor") {
      score += 20;
      reasons.push({ good: true, text: "A bachelor's degree meets the usual Masters entry level." });
    } else if (profile.qualification === "postgrad" || profile.qualification === "phd") {
      score += 10;
      reasons.push({ good: true, text: "You already hold a postgraduate qualification." });
    } else if (profile.qualification === "diploma") {
      score -= 10;
      reasons.push({ good: false, text: "Most Masters programmes need a bachelor's degree. A graduate diploma could be a first step." });
    } else {
      score -= 30;
      reasons.push({ good: false, text: "University postgraduate study needs a degree first." });
    }

    if (englishReady) {
      score += 8;
      reasons.push({ good: true, text: "Your English score is already at a typical entry level." });
    } else {
      reasons.push({ good: false, text: "You'll need an academic English test score (often IELTS 6.5 overall)." });
    }

    const needNzd = quickEstimateNzd("student", profile.household, lkrPerNzd);
    const needLkr = needNzd * lkrPerNzd;
    const ratio = profile.savingsLkr / needLkr;
    if (ratio >= 0.8) {
      score += 15;
      reasons.push({ good: true, text: "Your savings cover most of a typical first-year budget." });
    } else if (ratio >= 0.4) {
      reasons.push({ good: false, text: "You may need an education loan or a sponsor for part of the first year." });
    } else {
      score -= 12;
      reasons.push({
        good: false,
        text: `A typical first year costs about ${formatLkr(Math.round(needLkr / 100_000) * 100_000)}, so plan for a big funding gap.`,
      });
    }
    results.push({ id: "student", score, fit: fitFor(score), reasons });
  }

  // Skilled worker
  {
    const reasons: Reason[] = [];
    let score = 15;
    if (profile.goal === "work") {
      score += 38;
      reasons.push({ good: true, text: "You told us you want to work in your field." });
    } else if (profile.goal === "explore") score += 12;

    if (years < 1) {
      score -= 20;
      reasons.push({ good: false, text: "Most skilled work visas need relevant work experience." });
    } else if (years < 3) {
      score += 6;
      reasons.push({ good: true, text: "You have some relevant experience. More years make you more competitive." });
    } else {
      score += years >= 6 ? 20 : 15;
      reasons.push({ good: true, text: `${years >= 6 ? "Six or more" : "Four or more"} years of experience appeals to NZ employers.` });
    }

    if (profile.qualification === "school") {
      score -= 6;
      reasons.push({ good: false, text: "Many skilled roles ask for a diploma, trade or degree qualification." });
    } else {
      score += profile.qualification === "diploma" ? 5 : 10;
    }

    if (occupation && !regulated) {
      score += 5;
      reasons.push({ good: true, text: `${occupation.title} doesn't need NZ registration, so you can apply for jobs straight away.` });
    }
    if (englishReady) score += 5;
    results.push({ id: "worker", score, fit: fitFor(score), reasons });
  }

  // Registered professional
  {
    const reasons: Reason[] = [];
    let score = 0;
    if (occupation?.regulator) {
      score += 55;
      reasons.push({ good: true, text: `${occupation.title} is a regulated job in NZ (${occupation.regulator.name}).` });
      if (profile.goal === "work" || profile.goal === "explore") score += 15;
      if (years >= 2) {
        score += 10;
        reasons.push({ good: true, text: "Your experience will help with registration and job offers." });
      }
      if (!englishReady) reasons.push({ good: false, text: "Regulators often ask for higher English scores than visas do." });
    } else {
      score -= 30;
      reasons.push({ good: false, text: occupation ? "Your occupation isn't a regulated profession in NZ." : "This path is for regulated jobs like nursing, medicine and teaching." });
    }
    results.push({ id: "registered", score, fit: fitFor(score), reasons });
  }

  // Partner & family
  {
    const reasons: Reason[] = [];
    let score = 0;
    if (profile.goal === "family") {
      score += 70;
      reasons.push({ good: true, text: "You told us you want to join a partner or family member." });
    } else {
      score -= 20;
      reasons.push({ good: false, text: "This path is for joining a partner who lives in, or is moving to, NZ." });
    }
    if (profile.household !== "single") {
      score += 5;
      reasons.push({ good: true, text: "If your partner gets a work or student visa, you may be able to come as their partner." });
    }
    results.push({ id: "family", score, fit: fitFor(score), reasons });
  }

  // Business & investor
  {
    const reasons: Reason[] = [];
    let score = 0;
    if (profile.goal === "business") {
      score += 55;
      reasons.push({ good: true, text: "You told us you want to invest or run a business." });
    } else {
      score -= 20;
    }
    if (profile.savingsLkr >= 150_000_000) {
      score += 10;
      reasons.push({ good: true, text: "You have significant capital, which business visas require." });
    } else {
      reasons.push({ good: false, text: "Investor and business visas need very significant capital." });
    }
    results.push({ id: "business", score, fit: fitFor(score), reasons });
  }

  return results.sort((a, b) => b.score - a.score);
}

export const FIT_LABEL: Record<Fit, string> = {
  strong: "Strong match",
  possible: "Possible",
  stretch: "Stretch",
};
