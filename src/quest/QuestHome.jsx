import { Button, Stars, cx } from "../ui/kit.jsx";
import { MISSIONS, STORY } from "./story.js";
import { Badge, Speech } from "./parts.jsx";

const CYCLE = [
  { k: "Predict", d: "Commit to a guess before you build." },
  { k: "Test", d: "Build it with unit cubes in 3D." },
  { k: "Explain", d: "Say why it happened." },
  { k: "Apply", d: "Use the idea on a new crate." },
];

export function isUnlocked(progress, i) {
  if (progress.unlockAll || i === 0) return true;
  return !!progress.missions[MISSIONS[i - 1].id]?.done;
}

function Certificate({ progress, setName, totalStars }) {
  const date = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="card relative overflow-hidden border-amber-400/40 p-0">
      <div className="bg-[linear-gradient(135deg,#3a2606,#1a1440_60%)] p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-5">
          <Badge badge={MISSIONS[MISSIONS.length - 1].badge} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">Port Cubica certifies that</div>
            <input
              className="mt-1 w-full max-w-md border-b border-amber-300/50 bg-transparent text-2xl font-black text-white outline-none placeholder:text-slate-500 sm:text-3xl"
              placeholder="Type your name"
              aria-label="Your name for the certificate"
              value={progress.name}
              onChange={(e) => setName(e.target.value.slice(0, 40))}
            />
            <div className="mt-2 text-slate-200">
              is a fully qualified <b className="text-amber-200">Crate Captain</b>, able to find the volume of any rectangular prism
              with V = L × W × H.
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <Stars n={1} of={1} /> {totalStars} / {MISSIONS.length * 3} stars · {date}
            </div>
          </div>
          <Button className="no-print" onClick={() => window.print()}>
            Print certificate
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function QuestHome({ progress, go, setName }) {
  const totalStars = MISSIONS.reduce((s, m) => s + (progress.missions[m.id]?.stars || 0), 0);
  const doneCount = MISSIONS.filter((m) => progress.missions[m.id]?.done).length;
  const nextIdx = MISSIONS.findIndex((m, i) => !progress.missions[m.id]?.done && isUnlocked(progress, i));
  const next = nextIdx >= 0 ? MISSIONS[nextIdx] : null;
  const allDone = doneCount === MISSIONS.length;

  return (
    <div className="grid gap-5">
      <section className="card grid gap-5 p-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Year 7 Measurement · Volume</div>
            <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">{STORY.title}</h1>
          </div>
          <Speech who="rae">
            {STORY.intro.map((p, i) => (
              <p key={i} className={i ? "mt-2" : ""}>
                {p}
              </p>
            ))}
          </Speech>
          <div className="flex flex-wrap gap-2">
            {next ? (
              <Button variant="primary" size="lg" onClick={() => go(`/mission/${next.id}`)}>
                {doneCount ? `Continue: ${next.kicker}` : "Start your first job"} →
              </Button>
            ) : (
              <Button variant="primary" size="lg" onClick={() => go("/mission/boss")}>
                Retake the final exam →
              </Button>
            )}
            <Button size="lg" onClick={() => go("/sandbox")}>
              Open the sandbox
            </Button>
          </div>
        </div>
        <div className="grid content-start gap-3">
          <div className="rounded-xl border border-white/10 bg-[#0e1430] p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-300">Loader progress</span>
              <span className="font-bold text-amber-200">
                ★ {totalStars} / {MISSIONS.length * 3}
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#f59e0b,#fde68a)] transition-all duration-700"
                style={{ width: `${(totalStars / (MISSIONS.length * 3)) * 100}%` }}
              />
            </div>
            <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Badges</div>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {MISSIONS.map((m) => (
                <Badge key={m.id} badge={m.badge} size="sm" locked={!progress.missions[m.id]?.done} />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0e1430] p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Every job follows the inquiry cycle</div>
            <ol className="mt-2 grid grid-cols-2 gap-2">
              {CYCLE.map((c, i) => (
                <li key={c.k} className="rounded-lg bg-white/5 px-2.5 py-2">
                  <div className="text-sm font-bold">
                    <span className="mr-1 text-amber-300">{i + 1}</span>
                    {c.k}
                  </div>
                  <div className="text-xs text-slate-300">{c.d}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {allDone && <Certificate progress={progress} setName={setName} totalStars={totalStars} />}

      <section>
        <h2 className="mb-3 text-lg font-bold">Harbour map</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MISSIONS.map((m, i) => {
            const unlocked = isUnlocked(progress, i);
            const rec = progress.missions[m.id];
            return (
              <button
                type="button"
                key={m.id}
                aria-disabled={!unlocked}
                onClick={() => unlocked && go(`/mission/${m.id}`)}
                className={cx("mission-card p-4 text-left", !unlocked && "cursor-not-allowed opacity-55", m.id === "boss" && "sm:col-span-2 lg:col-span-1")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-wide text-amber-300">{m.kicker}</div>
                    <div className="mt-0.5 text-lg font-black leading-tight">{m.title}</div>
                  </div>
                  <Badge badge={m.badge} size="sm" locked={!rec?.done} />
                </div>
                <div className="mt-2 text-sm text-indigo-100">
                  <span className="text-slate-400">Big question: </span>
                  {m.question}
                </div>
                <div className="mt-1 text-sm text-slate-300">{m.blurb}</div>
                <div className="mt-3 flex items-center justify-between">
                  <Stars n={rec?.stars || 0} />
                  <span
                    className={cx(
                      "rounded-full px-2 py-0.5 text-xs font-bold",
                      !unlocked ? "bg-white/5 text-slate-400" : rec?.done ? "bg-green-500/15 text-green-300" : "bg-indigo-500/20 text-indigo-200"
                    )}
                  >
                    {!unlocked ? "Locked" : rec?.done ? "Done · replay" : "Ready"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
