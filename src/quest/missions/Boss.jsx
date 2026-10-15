import { useMemo, useState } from "react";
import World from "../../three/World.jsx";
import { Button, cx } from "../../ui/kit.jsx";
import { COLORS, STEP, blockCells, blockOutline, dimLabels } from "../../lib/cells.js";
import { MissionLayout, STAGE_CLASS, Speech, useMission } from "../parts.jsx";

const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function makeExam() {
  const q = [];

  // 1. Forward: volume from three edges
  {
    const L = rint(3, 8);
    const W = rint(2, 5);
    const H = rint(2, 6);
    q.push({
      kind: "num",
      order: "A crate of fishing floats",
      text: `This crate is ${L} cm long, ${W} cm wide and ${H} cm high. What is its volume?`,
      answer: L * W * H,
      unit: "cm³",
      dims: { L, W, H },
      work: `V = L × W × H = ${L} × ${W} × ${H} = ${L * W * H} cm³`,
    });
  }

  // 2. Backwards: missing height
  {
    const L = rint(3, 6);
    const W = rint(2, 4);
    const H = rint(2, 6);
    q.push({
      kind: "num",
      order: "A crate of tennis balls",
      text: `This crate has a volume of ${L * W * H} cm³. It is ${L} cm long and ${W} cm wide. How high is it?`,
      answer: H,
      unit: "cm",
      dims: { L, W, H },
      labelText: { H: "H = ?" },
      work: `Base = ${L} × ${W} = ${L * W} cubes per layer. ${L * W * H} ÷ ${L * W} = ${H} layers, so H = ${H} cm.`,
    });
  }

  // 3. Base area × height
  {
    const [L, W] = pick([
      [6, 3],
      [4, 4],
      [5, 4],
      [7, 2],
    ]);
    const H = rint(3, 6);
    q.push({
      kind: "num",
      order: "A crate of bananas",
      text: `The base of this crate has an area of ${L * W} cm². It is ${H} cm high. What is its volume?`,
      answer: L * W * H,
      unit: "cm³",
      dims: { L, W, H },
      baseOnly: true,
      labelText: { L: " ", W: " " },
      work: `Area of base × height = ${L * W} × ${H} = ${L * W * H} cm³`,
    });
  }

  // 4. Choosing units
  q.push(
    pick([
      {
        kind: "mc",
        order: "The paperwork",
        text: "Which unit is best for the volume of a shipping container?",
        options: ["m", "m²", "cm³", "m³"],
        answer: "m³",
        work: "A container is huge, so cubic metres (m³) make sense. m is length and m² is area.",
      },
      {
        kind: "mc",
        order: "The paperwork",
        text: "Which unit is best for the volume of a juice box?",
        options: ["cm", "cm³", "m³", "cm²"],
        answer: "cm³",
        work: "A juice box is hand-sized, so cubic centimetres (cm³) fit well.",
      },
      {
        kind: "mc",
        order: "The paperwork",
        text: "Which unit is best for the volume of a grain of rice?",
        options: ["mm³", "m³", "mm²", "cm"],
        answer: "mm³",
        work: "A grain of rice is tiny, so cubic millimetres (mm³) are best.",
      },
    ])
  );

  // 5. A cube
  {
    const e = pick([3, 4, 5]);
    q.push({
      kind: "num",
      order: "A gift box",
      text: `A gift box is a cube with every edge ${e} cm long. What is its volume?`,
      answer: e * e * e,
      unit: "cm³",
      dims: { L: e, W: e, H: e },
      work: `${e} × ${e} × ${e} = ${e * e * e} cm³`,
    });
  }

  // 6. Real-world object
  q.push(
    pick([
      { order: "A school lunchbox", L: 20, W: 15, H: 6 },
      { order: "A pencil case", L: 20, W: 5, H: 4 },
      { order: "A tissue box", L: 24, W: 12, H: 10 },
    ])
  );
  const last = q[5];
  q[5] = {
    kind: "num",
    order: last.order,
    text: `${last.order} measures ${last.L} cm × ${last.W} cm × ${last.H} cm. What is its volume?`,
    answer: last.L * last.W * last.H,
    unit: "cm³",
    dims: { L: last.L, W: last.W, H: last.H },
    noCubes: true,
    work: `${last.L} × ${last.W} × ${last.H} = ${(last.L * last.W * last.H).toLocaleString()} cm³. Too many cubes to count, which is why the formula matters!`,
  };
  return q;
}

function ExamQuestion({ q, onAnswered }) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState(null); // {ok, given}

  const submit = (given) => {
    if (result) return;
    const ok = q.kind === "mc" ? given === q.answer : Math.abs(Number(String(given).replace(/,/g, "")) - q.answer) < 1e-9;
    setResult({ ok, given });
    onAnswered(ok);
  };

  return (
    <div className="grid gap-2">
      <div className="text-xs font-bold uppercase tracking-wide text-amber-300">{q.order}</div>
      <div className="font-semibold">{q.text}</div>
      {q.kind === "mc" ? (
        <div className="grid grid-cols-2 gap-2">
          {q.options.map((o) => (
            <button
              type="button"
              key={o}
              className={cx(
                "choice text-center text-lg font-bold",
                result && o === q.answer && "choice-right",
                result && !result.ok && o === result.given && "choice-wrong"
              )}
              disabled={!!result}
              onClick={() => submit(o)}
            >
              {o}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            className="field w-32 text-lg font-bold tabular-nums"
            inputMode="decimal"
            aria-label="Your answer"
            placeholder="?"
            value={value}
            disabled={!!result}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && value.trim() && submit(value)}
          />
          <span className="font-semibold">{q.unit}</span>
          {!result && (
            <Button variant="primary" onClick={() => submit(value)} disabled={!value.trim()}>
              Submit
            </Button>
          )}
        </div>
      )}
      {result && (
        <div
          className={cx(
            "pop-in rounded-lg border px-3 py-2 text-sm",
            result.ok ? "border-green-400/30 bg-green-500/10 text-green-100" : "border-amber-400/30 bg-amber-500/10 text-amber-100"
          )}
        >
          <b>{result.ok ? "Correct!" : `Answer: ${q.answer.toLocaleString()} ${q.kind === "mc" ? "" : q.unit}`}</b> {q.work}
        </div>
      )}
    </div>
  );
}

export default function Boss() {
  const { api } = useMission();
  const [exam] = useState(makeExam);
  const [idx, setIdx] = useState(-1); // -1 = intro
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);

  const q = idx >= 0 ? exam[idx] : null;
  const showCubes = q && answered && q.dims && !q.noCubes;

  const cells = useMemo(() => {
    if (!q?.dims) return [];
    const { L, W, H } = q.dims;
    if (q.baseOnly && !answered) return blockCells({ id: `q${idx}`, L, H: 1, W, color: COLORS.layer });
    if (!showCubes) return [];
    return blockCells({
      id: `q${idx}`,
      L,
      H,
      W,
      layerDelay: 0.1,
      colorFn: (i, j) => (q.baseOnly && j === 0 ? COLORS.layer : j % 2 ? COLORS.baseAlt : COLORS.base),
    });
  }, [q, idx, answered, showCubes]);

  const outlines = useMemo(() => {
    if (!q?.dims) return [];
    return [blockOutline({ ...q.dims, color: "#9fb3ff", fill: "#6d8bff", fillOpacity: 0.07 })];
  }, [q]);

  const labels = useMemo(() => {
    if (!q?.dims) {
      return [{ text: q ? "Paperwork time" : "6 orders waiting", p: [0, 1.5, 0], size: 0.7, bg: "#1d2a6b" }];
    }
    const t = { ...(q.labelText || {}) };
    if (answered && t.H) delete t.H;
    const out = dimLabels({ ...q.dims, unit: q.kind === "num" ? "cm" : "", text: t }).filter((l) => l.text.trim());
    if (q.baseOnly) {
      out.push({
        text: `Base area = ${q.dims.L * q.dims.W} cm²`,
        p: [(q.dims.L * STEP) / 2, -0.05, q.dims.W * STEP + 0.75],
        size: 0.42,
        color: "#ffd48a",
      });
    }
    return out;
  }, [q, answered]);

  const world = <World className={STAGE_CLASS} cells={cells} outlines={outlines} labels={labels} />;

  const next = () => {
    if (idx === exam.length - 1) {
      const stars = score === 6 ? 3 : score >= 4 ? 2 : 1;
      api.finish(stars, `${score} of 6 orders correct`);
      return;
    }
    setIdx((i) => i + 1);
    setAnswered(false);
  };

  return (
    <MissionLayout step={Math.max(0, idx)} total={exam.length} world={world}>
      {idx === -1 ? (
        <>
          <Speech who="rae">
            Six fresh orders just arrived, and the cubes are all out on other ships. You’ll have to use what you’ve learned. Get
            4 right to earn your stripes, or all 6 for a perfect score.
          </Speech>
          <Speech who="cubby">Remember: V = L × W × H, and volume is always in cubic units. Good luck, loader!</Speech>
          <Button variant="primary" size="lg" onClick={() => setIdx(0)}>
            Start the exam
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-300">
              Order {idx + 1} of {exam.length}
            </span>
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 font-bold text-amber-200">Score {score}</span>
          </div>
          <ExamQuestion
            key={idx}
            q={q}
            onAnswered={(ok) => {
              setAnswered(true);
              if (ok) setScore((s) => s + 1);
            }}
          />
          {answered && (
            <div className="flex justify-end">
              <Button variant="primary" onClick={next}>
                {idx === exam.length - 1 ? "See my result ✓" : "Next order →"}
              </Button>
            </div>
          )}
        </>
      )}
    </MissionLayout>
  );
}
