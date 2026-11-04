import { useCallback } from "react";
import { useApp } from "@/store/app";
import type { Lang } from "@/types";

/**
 * Interface labels in English, Sinhala and Tamil. Navigation, greetings and main
 * headings are translated; detailed guidance stays in English for now (marked
 * "beta" in Settings) so legal and visa wording isn't lost in translation.
 */
const EN = {
  "tab.journey": "Journey",
  "tab.paths": "Paths",
  "tab.board": "Board",
  "tab.tools": "Tools",
  "tab.community": "Community",
  "tab.me": "Me",
  greet: "Kia ora",
  "journey.title": "Your path to Aotearoa",
  "journey.next": "Your next step",
  "journey.map": "Journey map",
  continue: "Continue",
  "paths.title": "Paths",
  "tools.title": "Tools",
  "community.title": "Community",
  "me.title": "Me",
  language: "Language",
};

type Key = keyof typeof EN;

const DICT: Record<Lang, Record<Key, string>> = {
  en: EN,
  si: {
    "tab.journey": "ගමන",
    "tab.paths": "මාර්ග",
    "tab.board": "දැන්වීම්",
    "tab.tools": "මෙවලම්",
    "tab.community": "ප්‍රජාව",
    "tab.me": "මම",
    greet: "ආයුබෝවන්",
    "journey.title": "ඔබේ නවසීලන්ත ගමන",
    "journey.next": "ඔබේ ඊළඟ පියවර",
    "journey.map": "ගමන් සිතියම",
    continue: "ඉදිරියට",
    "paths.title": "මාර්ග",
    "tools.title": "මෙවලම්",
    "community.title": "ප්‍රජාව",
    "me.title": "මම",
    language: "භාෂාව",
  },
  ta: {
    "tab.journey": "பயணம்",
    "tab.paths": "வழிகள்",
    "tab.board": "விளம்பரம்",
    "tab.tools": "கருவிகள்",
    "tab.community": "சமூகம்",
    "tab.me": "நான்",
    greet: "வணக்கம்",
    "journey.title": "உங்கள் நியூசிலாந்து பயணம்",
    "journey.next": "உங்கள் அடுத்த படி",
    "journey.map": "பயண வரைபடம்",
    continue: "தொடரவும்",
    "paths.title": "வழிகள்",
    "tools.title": "கருவிகள்",
    "community.title": "சமூகம்",
    "me.title": "நான்",
    language: "மொழி",
  },
};

export const LANG_LABEL: Record<Lang, string> = { en: "English", si: "සිංහල", ta: "தமிழ்" };

export function useT() {
  const lang = useApp((s) => s.settings.lang);
  return useCallback((key: Key) => DICT[lang]?.[key] ?? EN[key], [lang]);
}

export function useLang(): Lang {
  return useApp((s) => s.settings.lang);
}
