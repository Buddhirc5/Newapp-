export interface SpeakingPrompt {
  id: string;
  kind: "Long turn" | "Interview" | "Discussion";
  title: string;
  cues: string[];
  prepSeconds: number;
  speakSeconds: number;
}

/** Original practice prompts in the style of speaking tests. Not official test material. */
export const SPEAKING_PROMPTS: SpeakingPrompt[] = [
  {
    id: "place-visit",
    kind: "Long turn",
    title: "Describe a place in Sri Lanka you would recommend to a visitor.",
    cues: ["Where it is", "How you know it", "What a visitor can do there", "Why you would recommend it"],
    prepSeconds: 60,
    speakSeconds: 120,
  },
  {
    id: "skill-career",
    kind: "Long turn",
    title: "Describe a skill you learned that helped your studies or career.",
    cues: ["What the skill is", "How you learned it", "How long it took", "How it has helped you"],
    prepSeconds: 60,
    speakSeconds: 120,
  },
  {
    id: "celebration",
    kind: "Long turn",
    title: "Describe a celebration that is important in your family.",
    cues: ["What it is called", "When it happens", "What people do", "Why it matters to you"],
    prepSeconds: 60,
    speakSeconds: 120,
  },
  {
    id: "helped-someone",
    kind: "Long turn",
    title: "Describe a time you helped someone solve a problem.",
    cues: ["Who the person was", "What the problem was", "What you did", "How you felt afterwards"],
    prepSeconds: 60,
    speakSeconds: 120,
  },
  {
    id: "why-nz",
    kind: "Interview",
    title: "Why do you want to study or work in New Zealand?",
    cues: ["Your goal", "Why New Zealand, not another country", "What you will bring", "Your plan after five years"],
    prepSeconds: 30,
    speakSeconds: 90,
  },
  {
    id: "teamwork",
    kind: "Interview",
    title: "Tell me about a time you worked in a team under pressure.",
    cues: ["Situation", "Your task", "The action you took", "The result (with a number if you can)"],
    prepSeconds: 30,
    speakSeconds: 90,
  },
  {
    id: "technology",
    kind: "Discussion",
    title: "Has technology made people's working lives better or worse?",
    cues: ["Give your view", "One example from your country", "One opposite argument", "Your conclusion"],
    prepSeconds: 30,
    speakSeconds: 90,
  },
  {
    id: "city-country",
    kind: "Discussion",
    title: "Is it better to grow up in a city or in the countryside?",
    cues: ["Your view", "Advantages", "Disadvantages", "What you would choose for your children"],
    prepSeconds: 30,
    speakSeconds: 90,
  },
];
