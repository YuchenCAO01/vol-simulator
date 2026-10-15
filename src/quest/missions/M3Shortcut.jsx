import { useMemo, useState } from "react";
import World from "../../three/World.jsx";
import { COLORS, blockCells, blockOutline, dimLabels } from "../../lib/cells.js";
import { ChoiceTask, MissionLayout, NextRow, NumberTask, STAGE_CLASS, Speech, useMission } from "../parts.jsx";

const MAIN = { L: 5, W: 3, H: 4 };
const SPEED = [
  { L: 6, W: 2, H: 4 },
  { L: 7, W: 3, H: 2 },
];

export default function M3Shortcut() {
  const { api } = useMission();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState({});
  const [speedIdx, setSpeedIdx] = useState(0);
  const mark = (k) => setDone((d) => ({ ...d, [k]: true }));

  const inSpeed = step === 5;
  const crate = inSpeed ? SPEED[speedIdx] : MAIN;
  const speedSolved = inSpeed && !!done[`speed${speedIdx}`];

  const cells = useMemo(() => {
    const { L, W, H } = crate;
    if (inSpeed) {
      return speedSolved
        ? blockCells({ id: `s${speedIdx}`, L, H, W, layerDelay: 0.12, colorFn: (i, j) => (j % 2 ? COLORS.baseAlt : COLORS.base) })
        : [];
    }
    const layersShown = done.volume ? H : 1;
    return blockCells({
      id: "main",
      L,
      H: layersShown,
      W,
      layerDelay: 0.15,
      colorFn: (i, j) => (j === 0 ? COLORS.layer : j % 2 ? COLORS.baseAlt : COLORS.base),
    });
  }, [crate, inSpeed, speedSolved, speedIdx, done.volume]);

  const outlines = useMemo(() => [blockOutline({ ...crate, color: "#9fb3ff", fill: "#6d8bff", fillOpacity: 0.07 })], [crate]);
  const labels = useMemo(() => dimLabels({ ...crate, unit: "cm" }), [crate]);
  const world = <World className={STAGE_CLASS} cells={cells} outlines={outlines} labels={labels} />;

  return (
    <MissionLayout step={step} total={6} world={world}>
      {step === 0 && (
        <>
          <Speech who="rae">
            Big shipment today, and no time to count cubes! This crate is <b>5 cm long</b>, <b>3 cm wide</b> and{" "}
            <b>4 cm high</b>. Cubby has packed just the bottom layer (orange).
          </Speech>
          <NumberTask
            prompt="How many cubes are in the bottom layer?"
            answer={15}
            unit="cubes"
            hints={["The bottom layer is a rectangle 5 long and 3 wide.", "3 rows of 5 cubes → 3 × 5."]}
            onWrong={api.miss}
            onDone={() => mark("base")}
            after={
              <>
                5 × 3 = 15. That’s the <b>area of the base</b>: 15 cm². One cube sits on every square centimetre of the floor.
              </>
            }
          />
          <NextRow onNext={() => setStep(1)} canNext={!!done.base} />
        </>
      )}

      {step === 1 && (
        <>
          <Speech who="cubby">Now look up the side of the crate. Each layer is 1 cm tall.</Speech>
          <NumberTask
            prompt="How many layers fit in this crate?"
            answer={4}
            unit="layers"
            hints={["Check the height label H.", "The crate is 4 cm high and each layer is 1 cm high."]}
            onWrong={api.miss}
            onDone={() => mark("layers")}
            after="H = 4 cm, so 4 layers fit. The height tells us the number of layers."
          />
          <NextRow onNext={() => setStep(2)} canNext={!!done.layers} />
        </>
      )}

      {step === 2 && (
        <>
          <Speech who="rae">Put it together with your Layer Logic rule.</Speech>
          <NumberTask
            prompt="What is the volume of the crate?"
            answer={60}
            unit="cm³"
            hints={["Cubes in one layer × number of layers.", "15 cubes per layer × 4 layers."]}
            onWrong={api.miss}
            onDone={() => mark("volume")}
            after="15 × 4 = 60 cm³. Watch the crate fill: 4 layers of 15."
          />
          <NextRow onNext={() => setStep(3)} canNext={!!done.volume} />
        </>
      )}

      {step === 3 && (
        <>
          <Speech who="rae">
            You worked out 5 × 3 first (the base), then × 4 (the layers). Which formula says exactly that?
          </Speech>
          <ChoiceTask
            correct="lwh"
            onWrong={api.miss}
            onDone={() => mark("formula")}
            options={[
              { id: "sum", label: "V = L + W + H", why: "5 + 3 + 4 = 12, but the crate holds 60 cubes. Adding edges measures length, not space." },
              { id: "lw", label: "V = L × W", why: "L × W = 15 is just one layer (the base area). We still need the layers." },
              { id: "lwh", label: "V = L × W × H", why: "(L × W) gives the base area and × H counts the layers: 5 × 3 × 4 = 60." },
              { id: "perim", label: "V = 2 × (L + W)", why: "That’s the perimeter of the base: the distance around it." },
            ]}
          />
          <NextRow onNext={() => setStep(4)} canNext={!!done.formula} />
        </>
      )}

      {step === 4 && (
        <>
          <Speech who="cubby">Units check! The edges are in cm. What do we get when we multiply three of them?</Speech>
          <ChoiceTask
            prompt="cm × cm × cm = ?"
            correct="cm3"
            onWrong={api.miss}
            onDone={() => mark("units")}
            options={[
              { id: "cm", label: "cm", why: "cm is a length: one direction only." },
              { id: "cm2", label: "cm²", why: "cm² is area: two directions (cm × cm). We have three." },
              { id: "cm3", label: "cm³", why: "Three directions → cubic centimetres. That’s why volume uses the little ³." },
            ]}
          />
          <NextRow onNext={() => setStep(5)} canNext={!!done.units} nextLabel="Speed round →" />
        </>
      )}

      {step === 5 && (
        <>
          <Speech who="rae">
            Speed round! No cubes this time, just the measurements. Crate {speedIdx + 1} of {SPEED.length}.
          </Speech>
          <NumberTask
            key={speedIdx}
            prompt={`L = ${crate.L} cm, W = ${crate.W} cm, H = ${crate.H} cm. Volume?`}
            answer={crate.L * crate.W * crate.H}
            unit="cm³"
            hints={["V = L × W × H", `${crate.L} × ${crate.W} = ${crate.L * crate.W}, then × ${crate.H}.`]}
            onWrong={api.miss}
            onDone={() => mark(`speed${speedIdx}`)}
            after={`${crate.L} × ${crate.W} × ${crate.H} = ${crate.L * crate.W * crate.H} cm³. Checked by filling it with cubes.`}
          />
          {speedIdx < SPEED.length - 1 ? (
            <NextRow onNext={() => setSpeedIdx((i) => i + 1)} canNext={speedSolved} nextLabel="Next crate →" />
          ) : (
            <NextRow onNext={() => api.finish()} canNext={speedSolved} nextLabel="Finish job ✓" />
          )}
        </>
      )}
    </MissionLayout>
  );
}
