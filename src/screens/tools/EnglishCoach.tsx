import { useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Mic, Pause, Play, RotateCcw, Square, Timer, Trash2, Upload } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Mascot } from "@/components/Mascot";
import { Card, ProgressDashes, SectionHeader } from "@/components/ui/Bits";
import { Button, IconButton } from "@/components/ui/Button";
import { Switch, TextArea } from "@/components/ui/Controls";
import { toast } from "@/components/ui/Toast";
import { SPEAKING_PROMPTS, type SpeakingPrompt } from "@/data/english";
import { cn } from "@/lib/cn";
import { formatClock, relativeDay } from "@/lib/format";
import { analyzeTranscript, countLongPauses, feedback, toBars } from "@/logic/speech";
import { useApp } from "@/store/app";

const FRAME_MS = 100;

type Stage = "pick" | "prep" | "record" | "review";

interface Take {
  url: string | null;
  seconds: number;
  levels: number[];
  transcript: string;
  source: "mic" | "file";
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
}

function getRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function EnglishCoach() {
  const practice = useApp((s) => s.practice);
  const addPractice = useApp((s) => s.addPractice);
  const [prompt, setPrompt] = useState<SpeakingPrompt>(SPEAKING_PROMPTS[0]);
  const [stage, setStage] = useState<Stage>("pick");
  const [take, setTake] = useState<Take | null>(null);

  const reset = () => {
    if (take?.url) URL.revokeObjectURL(take.url);
    setTake(null);
  };

  return (
    <Page
      title="English Coach"
      back={{ to: "/tools", label: "Tools" }}
      hero={
        stage === "pick" ? (
          <div className="pb-6">
            <section className="relative overflow-hidden rounded-[2rem] bg-lavender p-5 text-ink sm:p-6">
              <div className="topo-fill pointer-events-none absolute inset-0 text-ink/[0.07]" aria-hidden />
              <Mascot mood="wow" pose="wave" tint="gold" className="pointer-events-none absolute -right-3 -bottom-5 w-28 sm:w-32" />
              <div className="relative max-w-[72%]">
                <h1 className="type-display text-title1 leading-tight">English Coach</h1>
                <p className="mt-2 text-callout opacity-85">
                  Practise speaking against the clock, then see your pace, filler words and pauses. Practice feedback, not an official score.
                </p>
              </div>
            </section>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-6">
        {stage === "pick" && (
          <>
            <section aria-labelledby="prompts" className="flex flex-col gap-3">
              <SectionHeader id="prompts" title="Choose a question" />
              <ul className="flex flex-col gap-2.5">
                {SPEAKING_PROMPTS.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPrompt(p);
                        setStage("prep");
                      }}
                      className="flex w-full items-start gap-3 rounded-tile bg-surface p-4 text-left shadow-card transition-transform hover:bg-surface-2 active:scale-[0.99]"
                    >
                      <span className="mt-0.5 rounded-full bg-lavender-soft px-2.5 py-0.5 text-caption font-semibold whitespace-nowrap">{p.kind}</span>
                      <span className="min-w-0 flex-1 text-callout font-semibold">{p.title}</span>
                      <span className="shrink-0 text-footnote text-label-2 tabular">{formatClock(p.speakSeconds)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {practice.length > 0 && (
              <section aria-labelledby="history" className="flex flex-col gap-3">
                <SectionHeader id="history" title="Recent practice" />
                <Card className="divide-y divide-sep">
                  {practice.slice(0, 5).map((s) => {
                    const p = SPEAKING_PROMPTS.find((x) => x.id === s.promptId);
                    return (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-callout font-semibold">{p?.title ?? "Practice"}</p>
                          <p className="text-footnote text-label-2 tabular">
                            {relativeDay(s.at)} · {formatClock(s.seconds)}
                            {s.wpm ? ` · ${s.wpm} wpm` : ""}
                            {` · ${s.fillers} fillers`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </Card>
              </section>
            )}
          </>
        )}

        {stage !== "pick" && (
          <Session
            prompt={prompt}
            stage={stage}
            setStage={setStage}
            take={take}
            setTake={(t) => {
              reset();
              setTake(t);
            }}
            onDiscard={() => {
              reset();
              setStage("prep");
            }}
            onExit={() => {
              reset();
              setStage("pick");
            }}
            onSave={(metrics) => {
              addPractice({ promptId: prompt.id, ...metrics });
              toast("Practice saved · +15 points");
              reset();
              setStage("pick");
            }}
          />
        )}
      </div>
    </Page>
  );
}

interface SessionProps {
  prompt: SpeakingPrompt;
  stage: Stage;
  setStage: (s: Stage) => void;
  take: Take | null;
  setTake: (t: Take) => void;
  onDiscard: () => void;
  onExit: () => void;
  onSave: (m: { seconds: number; words: number; wpm: number; fillers: number; longPauses: number }) => void;
}

function Session({ prompt, stage, setStage, take, setTake, onDiscard, onExit, onSave }: SessionProps) {
  const [prepLeft, setPrepLeft] = useState(prompt.prepSeconds);
  const [elapsed, setElapsed] = useState(0);
  const [live, setLive] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [transcribe, setTranscribe] = useState(() => Boolean(getRecognition()));
  const [interim, setInterim] = useState("");

  const rec = useRef<{
    stream: MediaStream;
    ctx: AudioContext;
    recorder: MediaRecorder | null;
    chunks: Blob[];
    levels: number[];
    raf: number;
    started: number;
    recognition: SpeechRecognitionLike | null;
    transcript: string;
  } | null>(null);

  // Preparation countdown.
  useEffect(() => {
    if (stage !== "prep") return;
    setPrepLeft(prompt.prepSeconds);
    const id = window.setInterval(() => setPrepLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [stage, prompt.prepSeconds]);

  // Always release the microphone when leaving the screen.
  useEffect(() => () => teardown(), []);

  function teardown() {
    const r = rec.current;
    if (!r) return;
    cancelAnimationFrame(r.raf);
    try {
      r.recognition?.stop();
    } catch {
      /* already stopped */
    }
    r.stream.getTracks().forEach((t) => t.stop());
    void r.ctx.close().catch(() => undefined);
    rec.current = null;
  }

  async function start() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't record audio here. Upload a recording from your voice memo app instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const data = new Float32Array(analyser.fftSize);
      const recorder = typeof MediaRecorder !== "undefined" ? new MediaRecorder(stream) : null;
      const state = {
        stream,
        ctx,
        recorder,
        chunks: [] as Blob[],
        levels: [] as number[],
        raf: 0,
        started: performance.now(),
        recognition: null as SpeechRecognitionLike | null,
        transcript: "",
      };
      rec.current = state;

      if (recorder) {
        recorder.ondataavailable = (e) => e.data.size && state.chunks.push(e.data);
        recorder.start(250);
      }

      const Recognition = transcribe ? getRecognition() : null;
      if (Recognition) {
        const r = new Recognition();
        r.continuous = true;
        r.interimResults = true;
        r.lang = "en-NZ";
        r.onresult = (e) => {
          let text = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const result = e.results[i];
            if (result.isFinal) state.transcript += `${result[0].transcript} `;
            else text += result[0].transcript;
          }
          setInterim(text);
        };
        r.onerror = () => undefined;
        try {
          r.start();
          state.recognition = r;
        } catch {
          /* recognition unavailable */
        }
      }

      let frameStart = performance.now();
      let peak = 0;
      const loop = () => {
        analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        peak = Math.max(peak, Math.sqrt(sum / data.length));
        const now = performance.now();
        if (now - frameStart >= FRAME_MS) {
          state.levels.push(peak);
          setLive(state.levels.slice(-56));
          peak = 0;
          frameStart = now;
        }
        const secs = (now - state.started) / 1000;
        setElapsed(secs);
        if (secs >= prompt.speakSeconds) {
          void stop();
          return;
        }
        state.raf = requestAnimationFrame(loop);
      };
      state.raf = requestAnimationFrame(loop);
      setElapsed(0);
      setInterim("");
      setStage("record");
    } catch (e) {
      const name = (e as DOMException)?.name;
      setError(
        name === "NotAllowedError"
          ? "Microphone access was blocked. Allow it in your browser settings, or upload a recording instead."
          : "We couldn't start the microphone. You can upload a recording instead.",
      );
    }
  }

  async function stop() {
    const r = rec.current;
    if (!r) return;
    cancelAnimationFrame(r.raf);
    const seconds = (performance.now() - r.started) / 1000;
    const blob: Blob | null = await new Promise((resolve) => {
      if (!r.recorder || r.recorder.state === "inactive") return resolve(null);
      r.recorder.onstop = () => resolve(new Blob(r.chunks, { type: r.recorder?.mimeType || "audio/webm" }));
      r.recorder.stop();
    });
    // Give speech recognition a moment to deliver its last result.
    try {
      r.recognition?.stop();
    } catch {
      /* ignore */
    }
    await new Promise((res) => setTimeout(res, r.recognition ? 600 : 0));
    const transcript = (r.transcript + " " + interimRef.current).trim();
    const levels = [...r.levels];
    teardown();
    setTake({ url: blob ? URL.createObjectURL(blob) : null, seconds, levels, transcript, source: "mic" });
    setStage("review");
  }

  const interimRef = useRef("");
  interimRef.current = interim;

  async function upload(file: File) {
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const ctx = new AudioContext();
      const audio = await ctx.decodeAudioData(buf.slice(0));
      const channel = audio.getChannelData(0);
      const per = Math.max(1, Math.floor((audio.sampleRate * FRAME_MS) / 1000));
      const levels: number[] = [];
      for (let i = 0; i < channel.length; i += per) {
        let sum = 0;
        const end = Math.min(channel.length, i + per);
        for (let j = i; j < end; j++) sum += channel[j] * channel[j];
        levels.push(Math.sqrt(sum / (end - i)));
      }
      void ctx.close();
      setTake({ url: URL.createObjectURL(file), seconds: audio.duration, levels, transcript: "", source: "file" });
      setStage("review");
    } catch {
      setError("That file couldn't be read. Try an MP3, M4A or WAV recording.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <ProgressDashes
          total={3}
          done={stage === "prep" ? 0 : stage === "record" ? 1 : 2}
          current={stage === "prep" ? 0 : stage === "record" ? 1 : 2}
          className="w-28"
          label="Practice progress"
        />
        <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 text-callout font-semibold shadow-card tabular" aria-live="off">
          {stage === "prep"
            ? formatClock(prepLeft)
            : stage === "record"
              ? formatClock(Math.max(0, prompt.speakSeconds - elapsed))
              : formatClock(take?.seconds ?? 0)}
          <Timer className="size-5" aria-hidden />
        </span>
      </div>

      <div>
        <p className="text-footnote font-semibold tracking-wide text-label-2 uppercase">{prompt.kind}</p>
        <h1 className="type-display mt-2 text-[clamp(1.8rem,7vw,2.5rem)] leading-[1.08]">{prompt.title}</h1>
      </div>

      <div className="rounded-[2rem] bg-gold p-3 sm:p-4">
        {stage === "prep" && (
          <div className="flex flex-col gap-3">
            <div className="rounded-[1.5rem] bg-white p-5 text-ink">
              <p className="text-subhead font-semibold">You should say:</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {prompt.cues.map((c) => (
                  <li key={c} className="flex gap-2 text-callout">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink" aria-hidden />
                    {c}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-footnote text-ink/60">
                {prepLeft > 0 ? `Plan your answer: ${prepLeft} seconds of thinking time left.` : "Time's up. Start speaking when you're ready."}
              </p>
            </div>
            {getRecognition() && (
              <div className="flex items-center gap-3 rounded-[1.5rem] bg-white/70 px-4 py-3 text-ink">
                <div className="min-w-0 flex-1">
                  <p className="text-subhead font-semibold">Transcribe while I speak</p>
                  <p className="text-footnote text-ink/60">Uses your browser's speech service, which may process audio online.</p>
                </div>
                <Switch checked={transcribe} onChange={setTranscribe} label="Transcribe while I speak" />
              </div>
            )}
            <Button onClick={start} icon={<Mic className="size-5" aria-hidden />} block>
              Start speaking
            </Button>
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-white/60 text-subhead font-semibold text-ink hover:bg-white/80">
              <Upload className="size-4" aria-hidden />
              Or upload a recording
              <input type="file" accept="audio/*" className="sr-only" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
            </label>
            {error && (
              <p className="flex gap-2 rounded-[1.2rem] bg-white px-4 py-3 text-subhead text-coral-ink" role="alert">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {error}
              </p>
            )}
          </div>
        )}

        {stage === "record" && (
          <div className="flex flex-col gap-3">
            <div className="rounded-[1.5rem] bg-white p-5 text-ink">
              <div className="flex items-center gap-2 text-subhead font-semibold">
                <span className="size-2.5 animate-pulse rounded-full bg-coral motion-reduce:animate-none" aria-hidden />
                Recording · {formatClock(elapsed)}
              </div>
              <Waveform bars={toBars(live, 40)} className="mt-4 h-24" live />
              {interim && <p className="mt-3 line-clamp-2 text-footnote text-ink/60">{interim}</p>}
            </div>
            <Button variant="dark" onClick={() => void stop()} icon={<Square className="size-4 fill-current" aria-hidden />} block>
              Stop and review
            </Button>
          </div>
        )}

        {stage === "review" && take && (
          <Review
            take={take}
            prompt={prompt}
            onRetake={() => {
              onDiscard();
            }}
            onDelete={onExit}
            onSave={onSave}
          />
        )}
      </div>

      {stage !== "review" && (
        <Button variant="plain" onClick={onExit}>
          Choose a different question
        </Button>
      )}
    </div>
  );
}

function Review({
  take,
  prompt,
  onRetake,
  onDelete,
  onSave,
}: {
  take: Take;
  prompt: SpeakingPrompt;
  onRetake: () => void;
  onDelete: () => void;
  onSave: SessionProps["onSave"];
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [typed, setTyped] = useState("");
  const transcript = take.transcript || typed;
  const bars = useMemo(() => toBars(take.levels, 48), [take.levels]);
  const pauses = useMemo(() => countLongPauses(take.levels, FRAME_MS), [take.levels]);
  const metrics = transcript ? analyzeTranscript(transcript, take.seconds) : null;
  const tips = feedback({
    seconds: take.seconds,
    targetSeconds: prompt.speakSeconds,
    wpm: metrics?.wpm ?? null,
    fillerCount: metrics?.fillerCount ?? null,
    longPauses: pauses,
    uniqueRatio: metrics?.uniqueRatio ?? null,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-[1.5rem] bg-white p-4 text-ink">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-subhead font-semibold ring-1 ring-ink ring-inset hover:bg-ink/5"
          >
            Re-record <Mic className="size-4" aria-hidden />
          </button>
          {take.url && (
            <IconButton
              label={playing ? "Pause recording" : "Play recording"}
              variant="plain"
              className="ring-1 ring-ink text-ink ring-inset"
              onClick={() => {
                const el = audio.current;
                if (!el) return;
                if (el.paused) void el.play();
                else el.pause();
              }}
            >
              {playing ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
            </IconButton>
          )}
          <IconButton label="Delete recording" variant="plain" className="text-[#b83234] ring-1 ring-[#e46a6a] ring-inset" onClick={onDelete}>
            <Trash2 className="size-5" aria-hidden />
          </IconButton>
        </div>
        <Waveform bars={bars} progress={take.seconds ? position / take.seconds : 0} className="mt-4 h-20" />
        <p className="mt-2 text-center text-footnote text-ink/60 tabular">
          {formatClock(position)} / {formatClock(take.seconds)}
        </p>
        {take.url && (
          <audio
            ref={audio}
            src={take.url}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
            className="hidden"
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Spoke for" value={formatClock(take.seconds)} />
        <Stat label="Pace" value={metrics ? `${metrics.wpm}` : "—"} unit={metrics ? "wpm" : undefined} />
        <Stat label="Long pauses" value={String(pauses)} />
      </div>

      {!take.transcript && (
        <div className="rounded-[1.5rem] bg-white/70 p-4 text-ink">
          <TextArea
            label="Add what you said (optional)"
            hint="Paste or type your answer to get pace, filler-word and vocabulary feedback."
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            rows={3}
            className="bg-white"
          />
        </div>
      )}
      {take.transcript && (
        <details className="rounded-[1.5rem] bg-white/70 p-4 text-ink">
          <summary className="min-h-11 cursor-pointer text-subhead font-semibold">Transcript</summary>
          <p className="mt-2 text-callout">{take.transcript}</p>
        </details>
      )}

      <ul className="flex flex-col gap-2" aria-label="Feedback">
        {tips.map((tip) => (
          <li key={tip.title} className="flex gap-3 rounded-[1.2rem] bg-white px-4 py-3 text-ink">
            {tip.good ? (
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-[#1d7a3a]" aria-hidden />
            ) : (
              <CircleAlert className="mt-0.5 size-5 shrink-0 text-[#b26b00]" aria-hidden />
            )}
            <div>
              <p className="text-subhead font-semibold">{tip.title}</p>
              <p className="text-footnote text-ink/65">{tip.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Button
          block
          onClick={() =>
            onSave({
              seconds: Math.round(take.seconds),
              words: metrics?.words ?? 0,
              wpm: metrics?.wpm ?? 0,
              fillers: metrics?.fillerCount ?? 0,
              longPauses: pauses,
            })
          }
        >
          Save practice
        </Button>
        <IconButton label="Practise this question again" variant="dark" size="lg" onClick={onRetake}>
          <RotateCcw className="size-5" aria-hidden />
        </IconButton>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-[1.2rem] bg-white px-3 py-3 text-center text-ink">
      <p className="text-caption font-semibold text-ink/60 uppercase">{label}</p>
      <p className="mt-0.5 text-title3 font-bold tabular">
        {value}
        {unit && <span className="ml-1 text-footnote font-semibold text-ink/60">{unit}</span>}
      </p>
    </div>
  );
}

function Waveform({ bars, progress = 0, className, live }: { bars: number[]; progress?: number; className?: string; live?: boolean }) {
  return (
    <div className={cn("flex items-center justify-center gap-[3px]", className)} aria-hidden>
      {bars.map((v, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-full transition-[height] duration-100",
            i / bars.length < progress ? "bg-[#00917A]" : live ? "bg-ink/70" : "bg-ink/20",
          )}
          style={{ height: `${Math.max(6, v * 100)}%` }}
        />
      ))}
    </div>
  );
}
