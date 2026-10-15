import { useMemo, useState } from "react";
import World from "../../three/World.jsx";
import { Button, cx } from "../../ui/kit.jsx";
import { COLORS, COPY_COLORS, CUBE, STEP, blockOutline, cellCenter, dimLabels } from "../../lib/cells.js";
import { ChoiceTask, MissionLayout, NextRow, NumberTask, STAGE_CLASS, Speech, useMission } from "../parts.jsx";

// Edge lengths are always written L × W × H, the same order as V = L × W × H.
const STAGES = [
  { L: 2, W: 2, H: 2 },
  { L: 4, W: 2, H: 2, btn: "Double the length" },
  { L: 4, W: 4, H: 2, btn: "Double the width too" },
  { L: 4, W: 4, H: 4, btn: "Double the height too" },
];
const V0 = 8;
const ONE = { L: 1, W: 1, H: 1 };
const TRIPLE = { L: 3, W: 3, H: 3 };

const PREDICT = [
  { options: [8, 16, 32, 64] },
  { options: [24, 32, 48, 64] },
  { options: [16, 48, 64, 96] },
];

const dimsText = (d) => `${d.L} × ${d.W} × ${d.H}`;

/**
 * Copies of a b × b × b crate. The original stays at the front-bottom-right
 * corner (the corner the camera faces) and new copies are added behind it,
 * to its left and on top, so the original is never hidden. Keys are relative
 * to the original, so its cubes never re-grow when the crate is scaled.
 */
function scaledCrate({ base, L, W, H, colorFn }) {
  const origin = [-(L - base) * STEP, 0, -(W - base) * STEP];
  const cells = [];
  for (let j = 0; j < H; j++) {
    for (let k = 0; k < W; k++) {
      for (let i = 0; i < L; i++) {
        const ii = i - (L - base); // ≥ 0 inside the original
        const kk = k - (W - base);
        const copy = { x: ii >= 0 ? 0 : Math.ceil(-ii / base), z: kk >= 0 ? 0 : Math.ceil(-kk / base), y: Math.floor(j / base) };
        cells.push({
          key: `c:${ii},${j},${kk}`,
          p: cellCenter([0, 0, 0], ii, j, kk),
          s: [CUBE, CUBE, CUBE],
          color: colorFn(copy, ii, j, kk),
        });
      }
    }
  }
  return { cells, origin };
}

export default function M5Supersize() {
  const { api } = useMission();
  const [step, setStep] = useState(0);
  const [stage, setStage] = useState(0);
  const [preds, setPreds] = useState([null, null, null]);
  const [explainDone, setExplainDone] = useState(false);
  const [applyDone, setApplyDone] = useState(false);

  // Step 4 is about a 1 × 1 × 1 crate, so show that (not the 4 × 4 × 4 one).
  const tripling = step === 4;
  const dims = tripling ? (applyDone ? TRIPLE : ONE) : STAGES[stage];
  const base = tripling ? 1 : 2;

  const { cells, origin } = useMemo(
    () =>
      scaledCrate({
        base,
        ...dims,
        colorFn: tripling
          ? (c, ii, j, kk) => (ii === 0 && j === 0 && kk === 0 ? COLORS.base : (c.x + c.y + c.z) % 2 ? COLORS.layer : "#fbbf24")
          : (c) => COPY_COLORS[c.x + 2 * c.z + 4 * c.y],
      }),
    [base, dims, tripling]
  );
  const outlines = useMemo(() => [blockOutline({ origin, ...dims, color: "#9fb3ff" })], [origin, dims]);
  const labels = useMemo(() => {
    const v = dims.L * dims.H * dims.W;
    return [
      ...dimLabels({ origin, ...dims, unit: "cm" }),
      {
        text: `V = ${v} cm³`,
        p: [origin[0] + (dims.L * STEP) / 2, dims.H * STEP + 0.9, origin[2] + (dims.W * STEP) / 2],
        size: 0.55,
        bg: "#1d2a6b",
      },
    ];
  }, [origin, dims]);
  const world = <World className={STAGE_CLASS} cells={cells} outlines={outlines} labels={labels} />;

  const predictStep = (n) => {
    const target = STAGES[n + 1];
    const actual = target.L * target.H * target.W;
    const grown = stage >= n + 1;
    const prev = STAGES[n];
    return (
      <>
        <Speech who="rae">
          {n === 0 && (
            <>
              Rush order! A customer loves this <b>2 × 2 × 2</b> crate (<b>{V0} cm³</b>, in blue) but wants it supersized.
              First we’ll <b>double just the length</b>: 2 × 2 × 2 becomes <b>4 × 2 × 2</b>.
            </>
          )}
          {n === 1 && (
            <>
              Now we’ll also <b>double the width</b>: {dimsText(prev)} becomes <b>{dimsText(target)}</b>.
            </>
          )}
          {n === 2 && (
            <>
              Last one: <b>double the height</b> too. Now <b>every edge</b> is double the original: {dimsText(prev)} becomes{" "}
              <b>{dimsText(target)}</b>.
            </>
          )}
        </Speech>
        <ChoiceTask
          key={`p${n}`}
          prompt="Predict: what will the new volume be?"
          done={preds[n]}
          tested={grown}
          options={PREDICT[n].options.map((o) => ({ id: o, label: `${o} cm³` }))}
          onDone={(id) => setPreds((p) => p.map((x, i) => (i === n ? id : x)))}
        />
        {!grown ? (
          <Button variant="warn" size="lg" disabled={preds[n] == null} onClick={() => setStage(n + 1)}>
            {target.btn}
          </Button>
        ) : (
          <>
            <Speech who="cubby">
              New volume: <b>{actual} cm³</b>. That’s <b>{actual / V0} copies</b> of the blue crate: count the colours!{" "}
              {preds[n] === actual ? "Your prediction was spot on." : `You predicted ${preds[n]} cm³. What surprised you?`}
            </Speech>
            <NextRow onNext={() => setStep(n + 1)} />
          </>
        )}
      </>
    );
  };

  return (
    <MissionLayout step={step} total={5} world={world}>
      {step <= 2 && predictStep(step)}

      {step === 3 && (
        <>
          <table className="w-full overflow-hidden rounded-xl text-sm">
            <thead>
              <tr className="bg-[#0e1430] text-slate-300">
                <th className="px-2 py-1.5 text-left font-semibold">L × W × H</th>
                <th className="px-2 py-1.5 text-left font-semibold">You predicted</th>
                <th className="px-2 py-1.5 text-left font-semibold">Actual</th>
                <th className="px-2 py-1.5 text-left font-semibold">× original</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-white/5">
                <td className="px-2 py-1">2 × 2 × 2</td>
                <td className="px-2 py-1 text-slate-500">—</td>
                <td className="px-2 py-1 font-bold">8</td>
                <td className="px-2 py-1">× 1</td>
              </tr>
              {[1, 2, 3].map((s) => {
                const t = STAGES[s];
                const v = t.L * t.H * t.W;
                return (
                  <tr key={s} className="border-t border-white/5">
                    <td className="px-2 py-1">{dimsText(t)}</td>
                    <td className={cx("px-2 py-1", preds[s - 1] === v ? "text-green-300" : "text-amber-200")}>{preds[s - 1]}</td>
                    <td className="px-2 py-1 font-bold">{v}</td>
                    <td className="px-2 py-1">× {v / V0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Speech who="rae">Doubling every edge made the volume <b>8 times</b> bigger, not 2 times. Why 8?</Speech>
          <ChoiceTask
            correct="ddd"
            onWrong={api.miss}
            onDone={() => setExplainDone(true)}
            options={[
              { id: "corners", label: "Because a cube has 8 corners", why: "Sneaky coincidence! Tripling every edge makes the volume 27 times bigger, and a cube still has 8 corners." },
              { id: "add", label: "Because 2 + 2 + 2 + 2 = 8", why: "We never added 2s. Look at the table: the volume doubled, then doubled, then doubled." },
              {
                id: "ddd",
                label: "Each doubled edge doubles the volume again: 2 × 2 × 2 = 8",
                why: "Length ×2 → volume ×2. Width ×2 → ×2 again. Height ×2 → ×2 again. 2 × 2 × 2 = 8.",
              },
            ]}
          />
          <NextRow onNext={() => setStep(4)} canNext={explainDone} />
        </>
      )}

      {step === 4 && (
        <>
          <Speech who="rae">
            Last challenge. This tiny <b>1 × 1 × 1</b> crate (blue) gets every edge <b>tripled</b>, so it becomes{" "}
            <b>3 × 3 × 3</b>.
          </Speech>
          <NumberTask
            prompt="How many times bigger is the new volume?"
            answer={27}
            unit="times"
            hints={["Each tripled edge multiplies the volume by 3.", "3 × 3 × 3 = ?"]}
            onWrong={api.miss}
            onDone={() => setApplyDone(true)}
            after="3 × 3 × 3 = 27. The blue cube is the original crate; the new crate holds 27 copies of it."
          />
          <NextRow onNext={() => api.finish()} canNext={applyDone} nextLabel="Finish job ✓" />
        </>
      )}
    </MissionLayout>
  );
}
