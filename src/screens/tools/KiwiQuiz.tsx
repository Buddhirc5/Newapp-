import { useState } from "react";
import { ArrowRight, RotateCcw, Trophy, X } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Mascot, Sparkle } from "@/components/Mascot";
import { ProgressDashes, Tag } from "@/components/ui/Bits";
import { Button, ButtonLink } from "@/components/ui/Button";
import { pickRound, QUIZ, QUIZ_ROUND_SIZE } from "@/data/quiz";
import { cn } from "@/lib/cn";
import { tick } from "@/lib/haptics";
import { useApp } from "@/store/app";
import type { QuizQuestion } from "@/types";

export function KiwiQuiz() {
  const quiz = useApp((s) => s.quiz);
  const recordQuiz = useApp((s) => s.recordQuiz);
  const [round, setRound] = useState<QuizQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const start = () => {
    setRound(pickRound(Date.now() % 100000));
    setIndex(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
  };

  const q = round?.[index];
  const letters = "ABCD";

  const choose = (i: number) => {
    if (picked !== null || !q) return;
    setPicked(i);
    const right = i === q.answer;
    tick(right ? [10, 40, 10] : 30);
    if (right) setScore((s) => s + 1);
  };

  const next = () => {
    if (!round) return;
    if (index + 1 >= round.length) {
      recordQuiz(score, round.length);
      setFinished(true);
    } else {
      setIndex(index + 1);
      setPicked(null);
    }
  };

  return (
    <Page title="Kiwi Life" back={{ to: "/tools", label: "Tools" }}>
      {!round && (
        <div className="flex flex-col gap-6">
          <section className="relative overflow-hidden rounded-[2rem] bg-malibu p-6 text-ink">
            <div className="topo-fill pointer-events-none absolute inset-0 text-ink/[0.07]" aria-hidden />
            <div className="relative flex flex-col items-center text-center">
              <div className="relative w-44">
                <Mascot pose="cheer" mood="happy" tint="lavender" label="Kiri ready to play" />
                <Sparkle className="absolute top-2 -left-4 size-5 text-white" />
                <Sparkle className="absolute top-12 -right-5 size-4 text-white" delay={0.7} />
              </div>
              <h1 className="type-display mt-3 text-title1">Kiwi Life quiz</h1>
              <p className="mt-2 max-w-sm text-callout opacity-85">
                {QUIZ_ROUND_SIZE} quick questions on slang, te reo Māori, road rules, renting and work. Learn the things nobody tells you before you land.
              </p>
              {quiz.plays > 0 && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-subhead font-semibold tabular">
                  <Trophy className="size-4" aria-hidden /> Best score {quiz.best}% · {quiz.plays} game{quiz.plays === 1 ? "" : "s"}
                </p>
              )}
              <Button variant="dark" className="mt-5" onClick={start} iconAfter={<ArrowRight className="size-5" aria-hidden />}>
                Play {QUIZ_ROUND_SIZE} questions
              </Button>
            </div>
          </section>
          <p className="px-1 text-footnote text-label-2">Score 80% or more to complete the “Kiwi Life” task on your journey. {QUIZ.length} questions in the pool.</p>
        </div>
      )}

      {round && q && !finished && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <ProgressDashes total={round.length} done={index + (picked !== null ? 1 : 0)} current={index} className="flex-1" label={`Question ${index + 1} of ${round.length}`} />
            <button type="button" onClick={() => setRound(null)} aria-label="Quit quiz" className="grid size-11 place-items-center rounded-full bg-surface shadow-card">
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <p className="text-footnote font-semibold tracking-wide text-label-2 uppercase">
            {q.topic} · {index + 1} of {round.length}
          </p>
          <h1 className="type-display -mt-3 text-[clamp(1.75rem,7vw,2.4rem)] leading-[1.08]">{q.question}</h1>

          <div className="relative rounded-[2rem] bg-gold p-3 sm:p-4">
            {picked !== null && (
              <div className="absolute -top-4 right-5 z-10">
                <Tag tint={picked === q.answer ? "green" : "coral"} tilt={picked === q.answer ? -8 : 8} className="px-4 py-1.5 text-callout">
                  {picked === q.answer ? "Correct" : "Wrong"}
                </Tag>
              </div>
            )}
            <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Answers">
              {q.options.map((option, i) => {
                const isAnswer = i === q.answer;
                const isPicked = i === picked;
                const state = picked === null ? "idle" : isAnswer ? "right" : isPicked ? "wrong" : "dim";
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={isPicked}
                    disabled={picked !== null}
                    onClick={() => choose(i)}
                    className={cn(
                      "flex min-h-14 items-center gap-3 rounded-full py-2 pr-4 pl-2 text-left text-ink transition-colors",
                      state === "idle" && "bg-white hover:bg-white/85",
                      state === "right" && "bg-[#cdeecf]",
                      state === "wrong" && "bg-[#ffc4c4]",
                      state === "dim" && "bg-white/70",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-full text-subhead font-bold",
                        state === "right" ? "bg-[#1d7a3a] text-white" : state === "wrong" ? "bg-[#b83234] text-white" : "bg-[#dcf5de] text-[#00765f]",
                      )}
                      aria-hidden
                    >
                      {letters[i]}
                    </span>
                    <span className="text-callout font-semibold">{option}</span>
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <div className="mt-3 flex flex-col gap-3" aria-live="polite">
                <p className="rounded-[1.4rem] bg-white/70 px-4 py-3 text-subhead text-ink">{q.explain}</p>
                <Button onClick={next} iconAfter={<ArrowRight className="size-5" aria-hidden />} block>
                  {index + 1 >= round.length ? "See my score" : "Continue"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {round && finished && (
        <section className="relative overflow-hidden rounded-[2rem] bg-night px-6 py-8 text-center text-paper" aria-live="polite">
          <span className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-subhead font-bold text-ink tabular">
            +{score * 10} <span className="text-teal-ink">PTS</span>
          </span>
          <div className="relative mx-auto mt-4 w-48">
            <Mascot pose={score / round.length >= 0.5 ? "cheer" : "stand"} mood={score / round.length >= 0.5 ? "happy" : "worried"} label="Kiri reacting to your score" />
            <Sparkle className="absolute top-0 -left-6 size-6 text-paper" />
            <Sparkle className="absolute top-20 -right-6 size-4 text-paper" delay={0.5} />
          </div>
          <h2 className="type-display mt-4 text-[clamp(2rem,8vw,2.75rem)] leading-tight">
            {score === round.length ? "Sweet as! Perfect score!" : score / round.length >= 0.8 ? "Choice! You're a local." : score / round.length >= 0.5 ? "Good effort!" : "Keep practising!"}
          </h2>
          <p className="mt-2 text-callout text-paper/75 tabular">
            You got {score} of {round.length} right ({Math.round((score / round.length) * 100)}%).
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Button onClick={start} icon={<RotateCcw className="size-5" aria-hidden />}>
              Play again
            </Button>
            <ButtonLink to="/" variant="light">
              Back to my journey
            </ButtonLink>
          </div>
        </section>
      )}
    </Page>
  );
}
