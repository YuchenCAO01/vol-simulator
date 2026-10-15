import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Button, Stars, cx } from "../ui/kit.jsx";

/* ------------------------------------------------------------------ */
/* Characters                                                          */
/* ------------------------------------------------------------------ */

function RaeAvatar() {
  return (
    <svg viewBox="0 0 48 48" className="h-11 w-11 shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id="raeBg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#6d8bff" />
          <stop offset="1" stopColor="#3f5ee8" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="23" fill="url(#raeBg)" />
      <circle cx="24" cy="27" r="11" fill="#f2c9a5" />
      <path d="M11 20c2-8 24-8 26 0v2H11z" fill="#1d2763" />
      <rect x="10" y="20" width="28" height="3.5" rx="1.5" fill="#f59e0b" />
      <circle cx="20" cy="27" r="1.5" fill="#1d2763" />
      <circle cx="28" cy="27" r="1.5" fill="#1d2763" />
      <path d="M20 32c2 2 6 2 8 0" stroke="#1d2763" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function CubbyAvatar() {
  return (
    <svg viewBox="0 0 48 48" className="h-11 w-11 shrink-0" aria-hidden="true">
      <circle cx="24" cy="24" r="23" fill="#2a1e0a" stroke="#f59e0b" strokeWidth="1.5" />
      <path d="M24 9 37 16v15l-13 7-13-7V16z" fill="#f59e0b" />
      <path d="M24 9 37 16 24 23 11 16z" fill="#fbbf24" />
      <path d="M24 23v15l13-7V16z" fill="#d97f06" />
      <circle cx="17" cy="25" r="2" fill="#1a1203" />
      <circle cx="21.5" cy="27" r="2" fill="#1a1203" />
      <line x1="24" y1="9" x2="24" y2="4" stroke="#fbbf24" strokeWidth="1.5" />
      <circle cx="24" cy="3.5" r="1.8" fill="#22c55e" />
    </svg>
  );
}

const PEOPLE = {
  rae: { name: "Dockmaster Rae", Avatar: RaeAvatar, color: "text-indigo-200" },
  cubby: { name: "Cubby the loader-bot", Avatar: CubbyAvatar, color: "text-amber-200" },
};

export function Speech({ who = "rae", children, className = "" }) {
  const p = PEOPLE[who];
  return (
    <div className={cx("flex items-start gap-2.5", className)}>
      <p.Avatar />
      <div className="speech min-w-0 flex-1 pop-in">
        <div className={cx("mb-0.5 text-[11px] font-bold uppercase tracking-wide", p.color)}>{p.name}</div>
        <div className="text-[0.95rem] leading-relaxed text-slate-100">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tasks                                                               */
/* ------------------------------------------------------------------ */

/**
 * Multiple choice. With `correct` it is marked (wrong picks show a reason and
 * cost a star-point). Without `correct` it is a prediction: any pick is fine.
 */
export function ChoiceTask({ prompt, options, correct = null, onDone, onWrong, done: doneProp }) {
  const [wrong, setWrong] = useState([]);
  const [picked, setPicked] = useState(doneProp ?? null);
  const [shakeId, setShakeId] = useState(null);
  const isPredict = correct == null;
  const finished = picked != null && (isPredict || picked === correct);
  const lastWrong = wrong.length ? options.find((o) => o.id === wrong[wrong.length - 1]) : null;

  const choose = (o) => {
    if (finished) return;
    if (isPredict || o.id === correct) {
      setPicked(o.id);
      onDone?.(o.id, wrong.length === 0);
    } else {
      if (!wrong.includes(o.id)) {
        setWrong((w) => [...w, o.id]);
        onWrong?.();
      }
      setShakeId(o.id);
      setTimeout(() => setShakeId(null), 400);
    }
  };

  const right = finished && !isPredict ? options.find((o) => o.id === correct) : null;

  return (
    <div className="grid gap-2">
      {prompt && <div className="text-sm font-semibold text-slate-200">{prompt}</div>}
      <div className="grid gap-2">
        {options.map((o) => (
          <button
            type="button"
            key={o.id}
            disabled={finished}
            onClick={() => choose(o)}
            className={cx(
              "choice",
              shakeId === o.id && "shake",
              wrong.includes(o.id) && "choice-wrong",
              finished && picked === o.id && (isPredict ? "choice-picked" : "choice-right"),
              finished && picked !== o.id && "opacity-60"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      {!finished && lastWrong?.why && (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          <b>Not quite.</b> {lastWrong.why}
        </div>
      )}
      {right?.why && (
        <div className="pop-in rounded-lg border border-green-400/30 bg-green-500/10 px-3 py-2 text-sm text-green-100">
          <b>Yes!</b> {right.why}
        </div>
      )}
      {finished && isPredict && (
        <div className="pop-in text-sm text-indigo-200">Prediction locked in. Now let’s test it.</div>
      )}
    </div>
  );
}

/** Numeric answer with progressive hints. */
export function NumberTask({ prompt, answer, unit, hints = [], onDone, onWrong, after }) {
  const [value, setValue] = useState("");
  const [tries, setTries] = useState(0);
  const [state, setState] = useState("idle"); // idle | wrong | right | shown
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);

  const check = () => {
    if (state === "right" || state === "shown") return;
    const v = Number(String(value).replace(/,/g, "").trim());
    if (value.trim() === "" || Number.isNaN(v)) return;
    if (Math.abs(v - answer) < 1e-9) {
      setState("right");
      onDone?.(tries === 0);
    } else {
      setTries((t) => t + 1);
      setState("wrong");
      setShake(true);
      setTimeout(() => setShake(false), 400);
      onWrong?.();
    }
  };

  const reveal = () => {
    setValue(String(answer));
    setState("shown");
    onDone?.(false);
  };

  const hint = tries > 0 && hints.length ? hints[Math.min(tries - 1, hints.length - 1)] : null;
  const solved = state === "right" || state === "shown";

  return (
    <div className="grid gap-2">
      {prompt && <div className="text-sm font-semibold text-slate-200">{prompt}</div>}
      <div className={cx("flex items-center gap-2", shake && "shake")}>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          aria-label={typeof prompt === "string" ? prompt : "Your answer"}
          className={cx(
            "field w-28 text-lg font-bold tabular-nums",
            state === "wrong" && "border-red-400",
            solved && "border-green-400"
          )}
          value={value}
          disabled={solved}
          onChange={(e) => {
            setValue(e.target.value);
            if (state === "wrong") setState("idle");
          }}
          onKeyDown={(e) => e.key === "Enter" && check()}
          placeholder="?"
        />
        {unit && <span className="text-base font-semibold text-slate-200">{unit}</span>}
        {!solved && (
          <Button variant="primary" onClick={check} disabled={!value.trim()}>
            Check
          </Button>
        )}
        {solved && <span className="pop-in text-lg font-bold text-green-400">✓</span>}
      </div>
      {state === "wrong" && (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          <b>Not quite.</b> {hint || "Have another go."}
          {tries >= 3 && (
            <button type="button" className="ml-2 underline underline-offset-2 hover:text-white" onClick={reveal}>
              Show me the answer
            </button>
          )}
        </div>
      )}
      {solved && after && <div className="pop-in rounded-lg border border-green-400/30 bg-green-500/10 px-3 py-2 text-sm text-green-100">{after}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mission frame                                                       */
/* ------------------------------------------------------------------ */

const MissionCtx = createContext(null);
export const useMission = () => useContext(MissionCtx);

export function starsFromMistakes(m) {
  if (m === 0) return 3;
  if (m <= 2) return 2;
  return 1;
}

export function Badge({ badge, size = "md", locked = false }) {
  const s = size === "lg" ? "h-20 w-20 text-3xl" : size === "sm" ? "h-9 w-9 text-base" : "h-12 w-12 text-xl";
  return (
    <div
      className={cx(
        "grid shrink-0 place-items-center font-black",
        s,
        locked ? "text-slate-500" : "text-[#1a1203] drop-shadow-[0_0_10px_rgba(245,158,11,0.45)]"
      )}
      style={{
        clipPath: "polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0% 50%)",
        background: locked ? "#232a52" : "linear-gradient(160deg, #fde68a, #f59e0b 55%, #b45309)",
      }}
      title={badge.name}
      aria-label={`${badge.name} badge${locked ? " (locked)" : ""}`}
    >
      {badge.icon}
    </div>
  );
}

export function Confetti({ count = 70 }) {
  const pieces = useMemo(() => {
    const colors = ["#f59e0b", "#4f80ff", "#22c55e", "#ec4899", "#a855f7", "#fde68a"];
    let seed = 7;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return Array.from({ length: count }, (_, i) => ({
      left: rnd() * 100,
      delay: rnd() * 0.8,
      dur: 2.2 + rnd() * 1.6,
      color: colors[i % colors.length],
      rot: rnd() * 360,
    }));
  }, [count]);
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function MissionComplete({ mission, stars, extra, onNext, onHome, onReplay, hasNext }) {
  return (
    <div className="grid gap-4 pop-in">
      <div className="text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-amber-300">Job complete</div>
        <div className="mt-1 text-2xl font-black">{mission.title}</div>
        <div className="mt-2">
          <Stars n={stars} size="text-4xl" />
        </div>
        {extra && <div className="mt-1 text-sm text-slate-300">{extra}</div>}
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
        <Badge badge={mission.badge} />
        <div>
          <div className="text-xs uppercase tracking-wide text-amber-200">Badge earned</div>
          <div className="text-lg font-bold">{mission.badge.name}</div>
        </div>
      </div>
      <div className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-3">
        <div className="text-xs font-bold uppercase tracking-wide text-indigo-200">Key idea to remember</div>
        <div className="mt-1 leading-relaxed">{mission.keyIdea}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {hasNext && (
          <Button variant="primary" size="lg" onClick={onNext}>
            Next job →
          </Button>
        )}
        <Button onClick={onHome} size="lg">
          Back to the harbour map
        </Button>
        <Button variant="ghost" onClick={onReplay} size="lg">
          Replay
        </Button>
      </div>
    </div>
  );
}

/**
 * Wraps a mission: counts mistakes, shows the completion screen and saves
 * progress. Missions call api.miss() on a wrong answer and api.finish().
 */
export function MissionFrame({ mission, onComplete, onNext, onHome, hasNext, children }) {
  const [mistakes, setMistakes] = useState(0);
  const [result, setResult] = useState(null);
  const [run, setRun] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [result]);

  const api = {
    mistakes,
    miss: () => setMistakes((m) => m + 1),
    finish: (stars, extra) => {
      const s = stars ?? starsFromMistakes(mistakes);
      setResult({ stars: s, extra });
      onComplete(mission.id, s);
    },
  };

  const replay = () => {
    setMistakes(0);
    setResult(null);
    setRun((r) => r + 1);
  };

  return (
    <MissionCtx.Provider value={{ api, result, mission, onNext, onHome, replay, hasNext }}>
      <div key={run} className="contents">
        {children}
      </div>
      {result && <Confetti />}
    </MissionCtx.Provider>
  );
}

/**
 * Two-column mission screen: story & tasks on the left, 3D world on the right.
 */
export function MissionLayout({ step, total, world, children, footer }) {
  const { result, mission, onNext, onHome, replay, hasNext } = useMission();
  // DOM order = phone order (header → 3D → tasks). On large screens the 3D
  // stage moves to the right-hand column and spans both rows.
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(340px,420px)_1fr] lg:grid-rows-[auto_1fr]">
      <div className="card lg:col-start-1 lg:row-start-1">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={onHome} className="text-xs font-semibold text-slate-300 hover:text-white">
            ← Harbour map
          </button>
          <span className="text-xs font-semibold text-slate-400">
            {mission.kicker} · {Math.min(step + 1, total)}/{total}
          </span>
        </div>
        <h1 className="mt-1 text-xl font-black leading-tight">{mission.title}</h1>
        <div className="mt-1 rounded-lg border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-sm text-amber-100">
          <b>Big question:</b> {mission.question}
        </div>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              className={cx(
                "h-1.5 flex-1 rounded-full",
                result || i < step ? "bg-amber-400" : i === step ? "bg-indigo-400" : "bg-white/10"
              )}
            />
          ))}
        </div>
      </div>
      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">{world}</div>
      <div className="grid content-start gap-3 self-start lg:col-start-1 lg:row-start-2">
        <div className="card grid gap-3">
          {result ? (
            <MissionComplete
              mission={mission}
              stars={result.stars}
              extra={result.extra}
              onNext={onNext}
              onHome={onHome}
              onReplay={replay}
              hasNext={hasNext}
            />
          ) : (
            children
          )}
        </div>
        {!result && footer}
      </div>
    </div>
  );
}

export function NextRow({ onBack, onNext, nextLabel = "Next →", canNext = true, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
      <div>
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            ← Back
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {onNext && (
          <Button variant="primary" onClick={onNext} disabled={!canNext}>
            {nextLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export const STAGE_CLASS = "h-[46vh] min-h-[320px] lg:h-[calc(100vh-10.5rem)] lg:min-h-[560px]";
