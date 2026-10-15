import { useMemo, useState } from "react";
import World from "../../three/World.jsx";
import { Stepper, cx } from "../../ui/kit.jsx";
import { COLORS, STEP, blockCells, blockOutline, floorGrid } from "../../lib/cells.js";
import { ChoiceTask, MissionLayout, NextRow, NumberTask, STAGE_CLASS, Speech, useMission } from "../parts.jsx";

const L = 4;
const W = 3;
const PER_LAYER = L * W; // 12
const CRANE_MAX = 6;
const BIG = 10;

export default function M2LayerCake() {
  const { api } = useMission();
  const [step, setStep] = useState(0);
  const [layers, setLayers] = useState(0);
  const [log, setLog] = useState({}); // layers -> total
  const [floorDone, setFloorDone] = useState(false);
  const [bigDone, setBigDone] = useState(false);
  const [ruleDone, setRuleDone] = useState(false);

  const crateH = bigDone ? BIG : CRANE_MAX;

  const setLayersLogged = (n) => {
    setLayers(n);
    setLog((l) => ({ ...l, [n]: n * PER_LAYER }));
  };

  const cells = useMemo(
    () =>
      blockCells({
        id: "c",
        L,
        H: layers,
        W,
        colorFn: (i, j) => (j % 2 ? COLORS.baseAlt : COLORS.base),
        layerDelay: 0.08,
      }),
    [layers]
  );
  const outlines = useMemo(() => [blockOutline({ L, H: crateH, W, color: "#9fb3ff", fill: "#6d8bff", fillOpacity: 0.06 })], [crateH]);
  const lines = useMemo(() => [floorGrid({ L, W })], []);
  const labels = useMemo(() => {
    const out = [
      { text: "4 long", p: [(L * STEP) / 2, -0.05, W * STEP + 0.75], color: "#ffd48a", size: 0.42 },
      { text: "3 wide", p: [L * STEP + 0.95, -0.05, (W * STEP) / 2], color: "#9ff0c0", size: 0.42 },
    ];
    if (layers > 0) {
      out.push({ text: `${layers} layer${layers > 1 ? "s" : ""} · ${layers * PER_LAYER} cubes`, p: [(L * STEP) / 2, crateH * STEP + 0.8, (W * STEP) / 2], size: 0.5, bg: "#1d2a6b" });
    }
    return out;
  }, [layers, crateH]);

  const world = <World className={STAGE_CLASS} cells={cells} outlines={outlines} lines={lines} labels={labels} />;
  const logged = Object.keys(log)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <MissionLayout step={step} total={4} world={world}>
      {step === 0 && (
        <>
          <Speech who="rae">
            Counting cubes one by one is slow, and the big ships are coming. Let’s pack this crate <b>layer by layer</b>. First,
            the floor.
          </Speech>
          <NumberTask
            prompt="How many cubes cover the floor of this crate (one layer)?"
            answer={PER_LAYER}
            unit="cubes"
            hints={["Count the squares along the long side, then count the rows.", "There are 3 rows with 4 cubes in each row."]}
            onWrong={api.miss}
            onDone={() => {
              setFloorDone(true);
              setLayersLogged(1);
            }}
            after="3 rows of 4 → 12 cubes in one layer. That’s the area of the floor: 4 × 3 = 12."
          />
          <NextRow onNext={() => setStep(1)} canNext={floorDone} />
        </>
      )}

      {step === 1 && (
        <>
          <Speech who="cubby">
            Crane online! Stack more layers and watch the table fill up. Try at least <b>4 different heights</b>.
          </Speech>
          <Stepper label="Layers" value={layers} min={1} max={CRANE_MAX} onChange={setLayersLogged} />
          <table className="w-full overflow-hidden rounded-xl text-sm">
            <thead>
              <tr className="bg-[#0e1430] text-slate-300">
                <th className="px-2 py-1.5 text-left font-semibold">Layers</th>
                <th className="px-2 py-1.5 text-left font-semibold">Cubes per layer</th>
                <th className="px-2 py-1.5 text-left font-semibold">Total cubes</th>
              </tr>
            </thead>
            <tbody>
              {logged.map((n) => (
                <tr key={n} className={cx("border-t border-white/5", n === layers && "bg-indigo-500/15")}>
                  <td className="px-2 py-1 tabular-nums">{n}</td>
                  <td className="px-2 py-1 tabular-nums">{PER_LAYER}</td>
                  <td className="px-2 py-1 font-bold tabular-nums">{log[n]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logged.length >= 4 && (
            <Speech who="cubby">
              Look down the <b>Total</b> column. How does it change each time you add one layer? Why?
            </Speech>
          )}
          <NextRow onNext={() => setStep(2)} canNext={logged.length >= 4} nextLabel={logged.length >= 4 ? "Next →" : `${logged.length}/4 heights tried`} />
        </>
      )}

      {step === 2 && (
        <>
          <Speech who="rae">
            A customer wants a crate with the <b>same floor</b> but <b>{BIG} layers</b>. Our crane only reaches {CRANE_MAX}, so
            you’ll have to think it out instead of building it.
          </Speech>
          <NumberTask
            prompt={`How many cubes will ${BIG} layers hold?`}
            answer={BIG * PER_LAYER}
            unit="cubes"
            hints={["Each layer always has 12 cubes.", `${BIG} layers of 12 cubes → ${BIG} × 12.`]}
            onWrong={api.miss}
            onDone={() => {
              setBigDone(true);
              setLayers(BIG);
            }}
            after={`${BIG} × 12 = 120. Crane upgrade installed so you can check it: 10 layers of 12.`}
          />
          <NextRow onNext={() => setStep(3)} canNext={bigDone} />
        </>
      )}

      {step === 3 && (
        <>
          <Speech who="rae">You just found a shortcut! Which rule always works for a crate like this?</Speech>
          <ChoiceTask
            correct="mult"
            onWrong={api.miss}
            onDone={() => setRuleDone(true)}
            options={[
              { id: "add", label: "Total = cubes in one layer + number of layers", why: "Try it: 12 + 10 = 22, but we found 120." },
              {
                id: "mult",
                label: "Total = cubes in one layer × number of layers",
                why: "Every layer is identical, so we multiply: 12 × 10 = 120.",
              },
              { id: "four", label: "Total = number of layers × 4", why: "4 is only one row. Each layer has 3 rows of 4." },
            ]}
          />
          <NextRow onNext={() => api.finish()} canNext={ruleDone} nextLabel="Finish job ✓" />
        </>
      )}
    </MissionLayout>
  );
}
