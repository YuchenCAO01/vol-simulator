import { useMemo, useState } from "react";
import World from "../three/World.jsx";
import { Button, Card, IntField, Metric, Segment, UnitSup } from "../ui/kit.jsx";
import {
  COLORS,
  CUBE,
  STEP,
  blockCells,
  blockOutline,
  dimLabels,
  tileCells,
} from "../lib/cells.js";

const UNITS = ["mm", "cm", "m"];
const MAX_LEN = 48;
const MAX = 24;

function UnitAlgebra({ unit, dims }) {
  const mult = Array.from({ length: dims }, () => unit).join(" × ");
  return (
    <div className="text-xs text-slate-300/80">
      Units: <span className="font-semibold">{mult}</span> ={" "}
      <span className="font-semibold">
        <UnitSup u={unit} pow={dims} />
      </span>
    </div>
  );
}

const STAGE = "h-[52vh] min-h-[340px] lg:h-[calc(100vh-10.5rem)] lg:min-h-[520px]";

/* -------------------- Length (1D) -------------------- */
function LengthSim({ unit }) {
  const [L, setL] = useState(6);

  const cells = useMemo(
    () =>
      Array.from({ length: L }, (_, i) => ({
        key: `len:${i}`,
        p: [(i + 0.5) * STEP, 0.08, 0.08],
        s: [CUBE, 0.16, 0.16],
        color: i % 2 ? COLORS.baseAlt : COLORS.base,
      })),
    [L]
  );

  const { solids, labels } = useMemo(() => {
    const every = L > 30 ? 5 : L > 16 ? 2 : 1;
    const s = [];
    const lb = [];
    for (let i = 0; i <= L; i++) {
      const major = i % 5 === 0;
      const h = major ? 0.55 : 0.36;
      s.push({ center: [i * STEP, 0.16 + h / 2, 0.08], size: [0.05, h, 0.05], color: major ? "#ffffff" : "#cbd5e1", basic: true });
      if (i % every === 0 || i === L) {
        lb.push({ text: String(i), p: [i * STEP, 0.16 + h + 0.3, 0.08], size: 0.36 });
      }
    }
    lb.push({ text: `L = ${L} ${unit}`, p: [(L * STEP) / 2, -0.25, 1.4], color: "#ffd48a", size: 0.48 });
    return { solids: s, labels: lb };
  }, [L, unit]);

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Card className="order-2 lg:order-1">
        <div className="grid gap-3">
          <IntField label={`Length (L), 1–${MAX_LEN}`} value={L} onChange={setL} max={MAX_LEN} id="len-L" />
          <div className="flex gap-2">
            <Button onClick={() => setL((v) => Math.max(1, v - 1))} disabled={L <= 1}>
              −1
            </Button>
            <Button onClick={() => setL((v) => Math.min(MAX_LEN, v + 1))} disabled={L >= MAX_LEN}>
              +1
            </Button>
          </div>
          <p className="text-sm text-slate-300">
            Length counts how many <b>unit lengths</b> fit end to end. Each coloured segment is 1 {unit}.
          </p>
          <UnitAlgebra unit={unit} dims={1} />
          <Metric title="Length" value={<>{L} {unit}</>} />
        </div>
      </Card>
      <World className={`order-1 lg:order-2 ${STAGE}`} cells={cells} solids={solids} labels={labels} viewDir={[0.12, 0.55, 1]} />
    </div>
  );
}

/* -------------------- Area (2D) -------------------- */
function AreaSim({ unit }) {
  const START = { L: 6, W: 4 };
  const [L, setL] = useState(START.L);
  const [W, setW] = useState(START.W);
  const [hi, setHi] = useState({}); // key -> highlight colour
  const [last, setLast] = useState(null);
  const area = L * W;

  const grow = (axis) => {
    if (axis === "L" && L >= MAX) return;
    if (axis === "W" && W >= MAX) return;
    const add = {};
    if (axis === "L") {
      for (let k = 0; k < W; k++) add[`a:${L},${k}`] = COLORS.layer;
      setLast({ d: W, text: `ΔA = W = ${W}` });
      setL(L + 1);
    } else {
      for (let i = 0; i < L; i++) add[`a:${i},${W}`] = COLORS.layer;
      setLast({ d: L, text: `ΔA = L = ${L}` });
      setW(W + 1);
    }
    setHi((h) => ({ ...h, ...add }));
  };

  // Typing new dimensions clears highlights so no orange tiles are left floating.
  const typed = (setter) => (v) => {
    setter(v);
    setHi({});
    setLast(null);
  };

  const cells = useMemo(
    () => tileCells({ id: "a", L, W, colorFn: (i, k) => hi[`a:${i},${k}`] || COLORS.base }),
    [L, W, hi]
  );
  const outlines = useMemo(() => [blockOutline({ L, H: 0.08 / STEP, W, color: "#8ea2ff" })], [L, W]);
  const labels = useMemo(() => dimLabels({ L, H: 0, W, unit, show: { L: true, W: true } }), [L, W, unit]);

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Card className="order-2 lg:order-1">
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <IntField label="Length (L)" value={L} onChange={typed(setL)} max={MAX} id="area-L" />
            <IntField label="Width (W)" value={W} onChange={typed(setW)} max={MAX} id="area-W" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => grow("L")} disabled={L >= MAX}>
              L +1
            </Button>
            <Button onClick={() => grow("W")} disabled={W >= MAX}>
              W +1
            </Button>
            <Button variant="ghost" onClick={() => setHi({})} disabled={!Object.keys(hi).length}>
              Merge colours
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setL(START.L);
                setW(START.W);
                setHi({});
                setLast(null);
              }}
            >
              Reset
            </Button>
          </div>
          <div className="text-xs text-slate-300/80">
            Area formula: <span className="font-semibold">A = L × W</span>
          </div>
          <UnitAlgebra unit={unit} dims={2} />
          <div className="grid grid-cols-3 gap-2">
            <Metric title="L" value={<>{L} {unit}</>} />
            <Metric title="W" value={<>{W} {unit}</>} />
            <Metric title="Area" value={<>{area} <UnitSup u={unit} pow={2} /></>} />
          </div>
          <Metric
            accent={!!last}
            title="Last strip added"
            value={last ? <span className="text-base">{last.text} → +{last.d} <UnitSup u={unit} pow={2} /></span> : "—"}
          />
        </div>
      </Card>
      <World className={`order-1 lg:order-2 ${STAGE}`} cells={cells} outlines={outlines} labels={labels} />
    </div>
  );
}

/* -------------------- Volume (3D) -------------------- */
function VolumeSim({ unit }) {
  const START = { L: 3, H: 2, W: 2 };
  const [L, setL] = useState(START.L);
  const [H, setH] = useState(START.H);
  const [W, setW] = useState(START.W);
  const [hi, setHi] = useState({});
  const [last, setLast] = useState(null);
  const vol = L * H * W;

  const grow = (axis) => {
    const add = {};
    if (axis === "L") {
      if (L >= MAX) return;
      for (let j = 0; j < H; j++) for (let k = 0; k < W; k++) add[`v:${L},${j},${k}`] = COLORS.layer;
      setLast({ d: H * W, text: `ΔV = H × W = ${H} × ${W}` });
      setL(L + 1);
    } else if (axis === "H") {
      if (H >= MAX) return;
      for (let i = 0; i < L; i++) for (let k = 0; k < W; k++) add[`v:${i},${H},${k}`] = COLORS.layer;
      setLast({ d: L * W, text: `ΔV = L × W = ${L} × ${W}` });
      setH(H + 1);
    } else {
      if (W >= MAX) return;
      for (let i = 0; i < L; i++) for (let j = 0; j < H; j++) add[`v:${i},${j},${W}`] = COLORS.layer;
      setLast({ d: L * H, text: `ΔV = L × H = ${L} × ${H}` });
      setW(W + 1);
    }
    setHi((h) => ({ ...h, ...add }));
  };

  const typed = (setter) => (v) => {
    setter(v);
    setHi({});
    setLast(null);
  };

  const cells = useMemo(
    () => blockCells({ id: "v", L, H, W, colorFn: (i, j, k) => hi[`v:${i},${j},${k}`] || COLORS.base }),
    [L, H, W, hi]
  );
  const outlines = useMemo(() => [blockOutline({ L, H, W, color: "#8ea2ff" })], [L, H, W]);
  const labels = useMemo(() => dimLabels({ L, H, W, unit }), [L, H, W, unit]);

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Card className="order-2 lg:order-1">
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-2">
            <IntField label="Length (L)" value={L} onChange={typed(setL)} max={MAX} id="vol-L" />
            <IntField label="Height (H)" value={H} onChange={typed(setH)} max={MAX} id="vol-H" />
            <IntField label="Width (W)" value={W} onChange={typed(setW)} max={MAX} id="vol-W" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => grow("L")} disabled={L >= MAX}>
              L +1
            </Button>
            <Button onClick={() => grow("H")} disabled={H >= MAX}>
              H +1
            </Button>
            <Button onClick={() => grow("W")} disabled={W >= MAX}>
              W +1
            </Button>
            <Button variant="ghost" onClick={() => setHi({})} disabled={!Object.keys(hi).length}>
              Merge colours
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setL(START.L);
                setH(START.H);
                setW(START.W);
                setHi({});
                setLast(null);
              }}
            >
              Reset
            </Button>
          </div>
          <div className="text-xs text-slate-300/80">
            Volume formula: <span className="font-semibold">V = L × W × H</span>
          </div>
          <UnitAlgebra unit={unit} dims={3} />
          <div className="grid grid-cols-3 gap-2">
            <Metric title="L" value={<>{L} {unit}</>} />
            <Metric title="H" value={<>{H} {unit}</>} />
            <Metric title="W" value={<>{W} {unit}</>} />
          </div>
          <Metric title="Volume" value={<>{vol} <UnitSup u={unit} pow={3} /></>} />
          <Metric
            accent={!!last}
            title="Last layer added"
            value={last ? <span className="text-base">{last.text} → +{last.d} <UnitSup u={unit} pow={3} /></span> : "—"}
          />
        </div>
      </Card>
      <World className={`order-1 lg:order-2 ${STAGE}`} cells={cells} outlines={outlines} labels={labels} />
    </div>
  );
}

export default function Sandbox() {
  const [tab, setTab] = useState("Volume");
  const [unit, setUnit] = useState("cm");
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Sandbox</h1>
          <p className="text-sm text-slate-300/80">Free explore: 1D length, 2D area and 3D volume in one 3D style.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segment items={["Length", "Area", "Volume"]} value={tab} onChange={setTab} />
          <select
            aria-label="Unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="field py-2 text-sm"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>
      {tab === "Length" && <LengthSim unit={unit} />}
      {tab === "Area" && <AreaSim unit={unit} />}
      {tab === "Volume" && <VolumeSim unit={unit} />}
      <div className="text-center text-xs text-slate-300/70">
        Unit algebra: {tab === "Length" ? unit : tab === "Area" ? `${unit} × ${unit}` : `${unit} × ${unit} × ${unit}`} ={" "}
        <UnitSup u={unit} pow={tab === "Length" ? 1 : tab === "Area" ? 2 : 3} />
      </div>
    </div>
  );
}
