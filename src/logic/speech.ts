/**
 * English Coach metrics. They describe delivery (pace, filler words, pauses,
 * vocabulary range), which people can practise on. They are not a band score.
 */

export interface TranscriptMetrics {
  words: number;
  wpm: number;
  fillers: { word: string; count: number }[];
  fillerCount: number;
  uniqueRatio: number;
}

const FILLERS: { word: string; re: RegExp }[] = [
  { word: "um", re: /\b(u+m+|e+r+m+)\b/gi },
  { word: "uh", re: /\b(u+h+|e+r+|a+h+)\b/gi },
  { word: "you know", re: /\byou know\b/gi },
  { word: "I mean", re: /\bi mean\b/gi },
  { word: "like", re: /(^|[,.]\s*|\s)like,/gi },
  { word: "actually", re: /\bactually\b/gi },
  { word: "basically", re: /\bbasically\b/gi },
  { word: "kind of", re: /\bkind of\b/gi },
];

export function analyzeTranscript(transcript: string, seconds: number): TranscriptMetrics {
  const tokens = transcript.toLowerCase().match(/[a-zāēīōū']+/g) ?? [];
  const fillers = FILLERS.map(({ word, re }) => ({ word, count: (transcript.match(re) ?? []).length })).filter((f) => f.count > 0);
  const fillerCount = fillers.reduce((sum, f) => sum + f.count, 0);
  const minutes = seconds / 60;
  const words = tokens.length;
  const unique = new Set(tokens.filter((t) => t.length > 2)).size;
  const longish = tokens.filter((t) => t.length > 2).length;
  return {
    words,
    wpm: minutes > 0 ? Math.round(words / minutes) : 0,
    fillers,
    fillerCount,
    uniqueRatio: longish ? unique / longish : 0,
  };
}

/**
 * Counts pauses in a level trace (one RMS value per frame, 0–1). A pause is a run of
 * quiet frames at least `minPauseMs` long that sits between two stretches of speech,
 * so silence before you start or after you finish doesn't count.
 */
export function countLongPauses(levels: number[], frameMs: number, minPauseMs = 2000, threshold?: number): number {
  if (!levels.length) return 0;
  const peak = Math.max(...levels);
  if (peak <= 0) return 0;
  const quiet = threshold ?? Math.max(0.02, peak * 0.12);
  const first = levels.findIndex((v) => v > quiet);
  let last = -1;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (levels[i] > quiet) {
      last = i;
      break;
    }
  }
  if (first < 0 || last <= first) return 0;
  const minFrames = Math.ceil(minPauseMs / frameMs);
  let pauses = 0;
  let run = 0;
  for (let i = first; i <= last; i++) {
    if (levels[i] <= quiet) {
      run += 1;
    } else {
      if (run >= minFrames) pauses += 1;
      run = 0;
    }
  }
  return pauses;
}

/** Downsamples a level trace into `bars` peaks for drawing a waveform. */
export function toBars(levels: number[], bars: number): number[] {
  if (!levels.length) return Array.from({ length: bars }, () => 0);
  const out: number[] = [];
  const size = levels.length / bars;
  for (let i = 0; i < bars; i++) {
    const slice = levels.slice(Math.floor(i * size), Math.max(Math.floor((i + 1) * size), Math.floor(i * size) + 1));
    out.push(slice.length ? Math.max(...slice) : 0);
  }
  const peak = Math.max(...out, 0.0001);
  return out.map((v) => Math.min(1, v / peak));
}

export interface Tip {
  good: boolean;
  title: string;
  detail: string;
}

export function feedback(m: { seconds: number; targetSeconds: number; wpm: number | null; fillerCount: number | null; longPauses: number; uniqueRatio: number | null }): Tip[] {
  const tips: Tip[] = [];
  const share = m.seconds / m.targetSeconds;
  if (share >= 0.85) {
    tips.push({ good: true, title: "You used your time well", detail: "Speaking for most of the time shows you can develop your answer." });
  } else {
    tips.push({
      good: false,
      title: "Try to keep talking a little longer",
      detail: "Use the cue points as a checklist, and add an example or a reason to each one.",
    });
  }

  if (m.wpm !== null && m.wpm > 0) {
    if (m.wpm < 100) tips.push({ good: false, title: "Your pace is slow", detail: `About ${m.wpm} words a minute. Aim for 110–160 so you sound fluent but clear.` });
    else if (m.wpm > 170) tips.push({ good: false, title: "Slow down slightly", detail: `About ${m.wpm} words a minute. Pausing at full stops helps the listener follow.` });
    else tips.push({ good: true, title: "Comfortable pace", detail: `About ${m.wpm} words a minute is easy to follow.` });
  }

  if (m.fillerCount !== null) {
    if (m.fillerCount >= 5) tips.push({ good: false, title: "Cut down filler words", detail: "Replace 'um' and 'you know' with a short silent pause. It sounds more confident." });
    else tips.push({ good: true, title: "Few filler words", detail: "You kept fillers under control." });
  }

  if (m.longPauses >= 3) {
    tips.push({ good: false, title: "Several long pauses", detail: "Learn linking phrases to buy thinking time: 'Another reason is…', 'What I mean is…'." });
  } else if (m.seconds > 20) {
    tips.push({ good: true, title: "Smooth flow", detail: "Few long silences. Your ideas connected well." });
  }

  if (m.uniqueRatio !== null && m.uniqueRatio > 0) {
    if (m.uniqueRatio < 0.45) tips.push({ good: false, title: "Vary your vocabulary", detail: "You repeated some words often. Try synonyms and more precise adjectives." });
    else tips.push({ good: true, title: "Good range of words", detail: "You used a varied vocabulary." });
  }
  return tips;
}
