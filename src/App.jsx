import { useCallback, useEffect, useState } from "react";
import { Segment, Stars } from "./ui/kit.jsx";
import { useProgress } from "./lib/progress.js";
import Sandbox from "./sandbox/Sandbox.jsx";
import QuestHome from "./quest/QuestHome.jsx";
import TeacherNotes from "./TeacherNotes.jsx";
import { MissionFrame } from "./quest/parts.jsx";
import { MISSIONS, missionIndex } from "./quest/story.js";
import M1TwoCrates from "./quest/missions/M1TwoCrates.jsx";
import M2LayerCake from "./quest/missions/M2LayerCake.jsx";
import M3Shortcut from "./quest/missions/M3Shortcut.jsx";
import M4SameVolume from "./quest/missions/M4SameVolume.jsx";
import M5Supersize from "./quest/missions/M5Supersize.jsx";
import Boss from "./quest/missions/Boss.jsx";

/**
 * Measurement Simulator: Volume Quest
 *   #/                 harbour map (story mode)
 *   #/mission/<id>     one job (m1–m5, boss)
 *   #/sandbox          free-explore Length / Area / Volume
 */

const COMPONENTS = { m1: M1TwoCrates, m2: M2LayerCake, m3: M3Shortcut, m4: M4SameVolume, m5: M5Supersize, boss: Boss };

function readRoute() {
  const h = window.location.hash.replace(/^#/, "") || "/";
  return h.startsWith("/") ? h : `/${h}`;
}

function useHashRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const on = () => setRoute(readRoute());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = useCallback((to) => {
    if (readRoute() === to) setRoute(to);
    else window.location.hash = to;
    window.scrollTo({ top: 0 });
  }, []);
  return [route, go];
}

function Logo() {
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
      <path d="M20 4 35 12v16l-15 8-15-8V12z" fill="#3f5ee8" />
      <path d="M20 4 35 12 20 20 5 12z" fill="#7d97ff" />
      <path d="M20 20v16l15-8V12z" fill="#f59e0b" />
      <path d="M12.5 8 27.5 16M27.5 8 12.5 16M20 20v16" stroke="#0b1020" strokeOpacity=".35" strokeWidth="1" />
    </svg>
  );
}

export default function App() {
  const [route, go] = useHashRoute();
  const { data: progress, complete, setUnlockAll, setName, reset } = useProgress();
  const [notesOpen, setNotesOpen] = useState(false);

  const missionMatch = route.match(/^\/mission\/(\w+)/);
  const missionId = missionMatch && COMPONENTS[missionMatch[1]] ? missionMatch[1] : null;
  const mode = route.startsWith("/sandbox") ? "sandbox" : "quest";
  const totalStars = MISSIONS.reduce((s, m) => s + (progress.missions[m.id]?.stars || 0), 0);

  useEffect(() => {
    const m = missionId ? MISSIONS[missionIndex(missionId)] : null;
    document.title = m
      ? `${m.kicker}: ${m.title} · Volume Quest`
      : mode === "sandbox"
        ? "Sandbox · Measurement Simulator"
        : "Volume Quest · Measurement Simulator";
  }, [missionId, mode]);

  let page;
  if (mode === "sandbox") {
    page = <Sandbox />;
  } else if (missionId) {
    const i = missionIndex(missionId);
    const mission = MISSIONS[i];
    const Comp = COMPONENTS[missionId];
    const nextMission = MISSIONS[i + 1];
    page = (
      <MissionFrame
        key={missionId}
        mission={mission}
        onComplete={complete}
        onHome={() => go("/")}
        onNext={() => nextMission && go(`/mission/${nextMission.id}`)}
        hasNext={!!nextMission}
      >
        <Comp />
      </MissionFrame>
    );
  } else {
    page = <QuestHome progress={progress} go={go} setName={setName} />;
  }

  return (
    <div className="app-bg min-h-screen w-full px-3 py-3 text-slate-100 sm:px-4 sm:py-4">
      <div className="mx-auto grid max-w-7xl gap-4">
        <header className="topbar no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={() => go("/")}>
            <Logo />
            <div className="min-w-0">
              <div className="truncate text-lg font-bold leading-tight">Measurement Simulator</div>
              <div className="truncate text-xs text-slate-300/80">Volume Quest · Length · Area · Volume</div>
            </div>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <Segment
              items={[
                { value: "quest", label: "Volume Quest" },
                { value: "sandbox", label: "Sandbox" },
              ]}
              value={mode}
              onChange={(v) => go(v === "quest" ? "/" : "/sandbox")}
            />
            <span className="hidden items-center gap-1 rounded-xl border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5 text-sm font-bold text-amber-200 sm:inline-flex">
              <Stars n={1} of={1} size="text-sm" /> {totalStars}
            </span>
            <button
              type="button"
              onClick={() => setNotesOpen(true)}
              className="rounded-xl border border-[#31407a] px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              Teacher notes
            </button>
          </div>
        </header>

        <main>{page}</main>

        <footer className="no-print pb-2 text-center text-xs text-slate-400/80">
          Built for Year 7 Measurement (Victorian Curriculum 2.0 · VC2M7M02). Progress is stored only in this browser.
        </footer>
      </div>
      <TeacherNotes
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        progress={progress}
        setUnlockAll={setUnlockAll}
        reset={reset}
      />
    </div>
  );
}
