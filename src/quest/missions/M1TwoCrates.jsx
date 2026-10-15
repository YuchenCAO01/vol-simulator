import { useEffect, useMemo, useRef, useState } from "react";
import World from "../../three/World.jsx";
import { Button } from "../../ui/kit.jsx";
import { COLORS, STEP, blockCells, blockOutline, floorGrid } from "../../lib/cells.js";
import { ChoiceTask, MissionLayout, NextRow, NumberTask, STAGE_CLASS, Speech, useMission } from "../parts.jsx";

const A = { L: 6, H: 2, W: 2, origin: [0, 0, 0.5] };
const B = { L: 3, H: 3, W: 3, origin: [6 * STEP + 2.4, 0, 0] };
const VA = A.L * A.H * A.W; // 24
const VB = B.L * B.H * B.W; // 27
const ROWS_A = A.H * A.W;
const ROWS_B = B.H * B.W;

export default function M1TwoCrates() {
  const { api } = useMission();
  const [step, setStep] = useState(0);
  const [prediction, setPrediction] = useState(null);
  const [rows, setRows] = useState(0); // rows of cubes packed so far (per crate)
  const [filling, setFilling] = useState(false);
  const [explained, setExplained] = useState(false);
  const [unitDone, setUnitDone] = useState(false);
  const timer = useRef(null);

  const nA = Math.min(rows, ROWS_A) * A.L;
  const nB = Math.min(rows, ROWS_B) * B.L;
  const full = rows >= Math.max(ROWS_A, ROWS_B);

  useEffect(() => () => clearInterval(timer.current), []);

  const fill = () => {
    if (filling || full) return;
    setFilling(true);
    timer.current = setInterval(() => {
      setRows((r) => {
        const n = r + 1;
        if (n >= Math.max(ROWS_A, ROWS_B)) {
          clearInterval(timer.current);
          setFilling(false);
        }
        return n;
      });
    }, 380);
  };

  const cells = useMemo(
    () => [
      ...blockCells({ id: "A", origin: A.origin, L: A.L, H: A.H, W: A.W, limit: nA, color: COLORS.base }),
      ...blockCells({ id: "B", origin: B.origin, L: B.L, H: B.H, W: B.W, limit: nB, color: COLORS.layer }),
    ],
    [nA, nB]
  );
  const outlines = useMemo(
    () => [
      blockOutline({ ...A, color: "#9fb3ff", fill: "#6d8bff", fillOpacity: rows ? 0.04 : 0.12 }),
      blockOutline({ ...B, color: "#ffd48a", fill: "#f59e0b", fillOpacity: rows ? 0.04 : 0.12 }),
    ],
    [rows]
  );
  const lines = useMemo(
    () => [floorGrid({ origin: A.origin, L: A.L, W: A.W }), floorGrid({ origin: B.origin, L: B.L, W: B.W, color: "#ffd48a" })],
    []
  );
  const labels = useMemo(
    () => [
      { text: rows ? `Crate A · ${nA} cubes` : "Crate A", p: [A.origin[0] + (A.L * STEP) / 2, A.H * STEP + 0.9, A.origin[2] + (A.W * STEP) / 2], size: 0.55, bg: "#1d2a6b", color: "#dbe3ff" },
      { text: rows ? `Crate B · ${nB} cubes` : "Crate B", p: [B.origin[0] + (B.L * STEP) / 2, B.H * STEP + 0.9, B.origin[2] + (B.W * STEP) / 2], size: 0.55, bg: "#5a3a06", color: "#ffe6b3" },
    ],
    [rows, nA, nB]
  );

  const world = <World className={STAGE_CLASS} cells={cells} outlines={outlines} labels={labels} lines={lines} />;

  const predLabel = { A: "Crate A holds more", B: "Crate B holds more", same: "They hold the same" };

  return (
    <MissionLayout step={step} total={4} world={world}>
      {step === 0 && (
        <>
          <Speech who="rae">
            Welcome aboard, loader! Two customers are arguing. <b>Crate A</b> is long and skinny. <b>Crate B</b> is short and
            chunky. Each says their crate holds more.
          </Speech>
          <Speech who="cubby">Before we pack anything: what’s your prediction? Spin the crates around to get a better look.</Speech>
          <ChoiceTask
            prompt="Which crate holds more cubes?"
            options={[
              { id: "A", label: predLabel.A },
              { id: "B", label: predLabel.B },
              { id: "same", label: predLabel.same },
            ]}
            onDone={(id) => setPrediction(id)}
          />
          <NextRow onNext={() => setStep(1)} canNext={!!prediction} nextLabel="Test it →" />
        </>
      )}

      {step === 1 && (
        <>
          <Speech who="rae">
            Let’s test it fairly. Cubby will pack both crates with <b>identical unit cubes</b>: no gaps, no overlaps. Watch the
            counters.
          </Speech>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl border border-indigo-400/40 bg-indigo-500/10 p-2">
              <div className="text-xs text-indigo-200">Crate A</div>
              <div className="text-3xl font-black tabular-nums">{nA}</div>
            </div>
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-2">
              <div className="text-xs text-amber-200">Crate B</div>
              <div className="text-3xl font-black tabular-nums">{nB}</div>
            </div>
          </div>
          {!full ? (
            <Button variant="warn" size="lg" onClick={fill} disabled={filling}>
              {filling ? "Packing…" : "Pack the crates"}
            </Button>
          ) : (
            <>
              <Speech who="cubby">
                Crate A holds <b>{VA}</b> cubes. Crate B holds <b>{VB}</b> cubes. So <b>Crate B holds more</b>, even though
                Crate A looks longer!{" "}
                {prediction === "B" ? "Your prediction was right. Nice reasoning!" : "Surprised? Lots of people pick the longer crate."}
              </Speech>
              <NextRow onNext={() => setStep(2)} />
            </>
          )}
        </>
      )}

      {step === 2 && (
        <>
          <Speech who="rae">So the longest crate isn’t always the biggest. What were we really comparing?</Speech>
          <ChoiceTask
            prompt="Volume measures…"
            correct="cubes"
            onWrong={api.miss}
            onDone={() => setExplained(true)}
            options={[
              { id: "long", label: "how long the longest edge is", why: "Crate A has the longest edge (6) but holds fewer cubes." },
              { id: "tall", label: "how tall the object is", why: "Height alone doesn’t tell you how much fits inside." },
              {
                id: "cubes",
                label: "how much space it takes up: the number of unit cubes that fill it",
                why: "Volume is the amount of 3D space. Counting equal unit cubes is a fair way to measure it.",
              },
              { id: "face", label: "the area of the front face", why: "A face is flat (2D). Volume is about the whole 3D space." },
            ]}
          />
          <NextRow onNext={() => setStep(3)} canNext={explained} />
        </>
      )}

      {step === 3 && (
        <>
          <Speech who="rae">
            Every unit cube here is 1 cm long, 1 cm wide and 1 cm high. The space one cube takes up is called{" "}
            <b>1 cubic centimetre</b>, written <b>1 cm³</b>.
          </Speech>
          <NumberTask
            prompt="What is the volume of Crate A?"
            answer={VA}
            unit="cm³"
            hints={["Count the blue cubes, or read the counter from the test.", "Crate A was packed with 24 cubes."]}
            onWrong={api.miss}
            onDone={() => setUnitDone(true)}
            after="24 cubes of 1 cm³ each → 24 cm³. The little ³ means we counted in three directions: length, width and height."
          />
          <NextRow onNext={() => api.finish()} canNext={unitDone} nextLabel="Finish job ✓" />
        </>
      )}
    </MissionLayout>
  );
}
