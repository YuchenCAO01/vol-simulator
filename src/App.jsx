import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Edges, Text } from "@react-three/drei";

/**
 * Measurement Simulator — Length (1D), Area (2D), Volume (3D)
 * React + Tailwind v4 + @react-three/fiber
 *
 * One page, three modes that render inside the same 3D style:
 * - Length (1D): thin bar + ruler ticks and numeric labels
 * - Area (2D): thin tile slab (height = TILE_H) with animating strips for +1
 * - Volume (3D): unit cubes with animating layers for +1
 *
 * Units (mm / cm / m) are displayed with unit algebra: cm × cm = cm², etc.
 * Left panel is compact; right canvas is large (near full-height).
 */

/* -------------------- Small helpers & UI -------------------- */
function clsx(...arr) {
  return arr.filter(Boolean).join(" ");
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const UNITS = ["mm", "cm", "m"];

function UnitSup({ u, pow }) {
  return (
    <span>
      {u}
      {pow > 1 ? <sup>{pow}</sup> : null}
    </span>
  );
}

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

function Segment({ items, value, onChange }) {
  return (
    <div className="inline-flex rounded-xl border border-[#31407a] overflow-hidden bg-[#0f1540]">
      {items.map((it) => (
        <button
          key={it}
          onClick={() => onChange(it)}
          className={clsx(
            "px-3 py-2 text-sm font-semibold",
            value === it ? "bg-indigo-600/60 text-white" : "text-slate-200 hover:bg-white/5"
          )}
        >
          {it}
        </button>
      ))}
    </div>
  );
}

function NumberField({ label, value, onChange, min = 1, max = 24 }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-300/80">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(parseInt(e.target.value || "0"), min, max))}
        className="bg-[#0e1430] text-slate-100 border border-[#23306c] rounded-xl px-3 py-2 outline-none focus:border-indigo-400 text-sm"
      />
    </div>
  );
}

function Button({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={clsx(
        "px-3 py-2 rounded-xl border text-sm font-semibold text-slate-50 shadow-sm transition active:translate-y-[1px] bg-gradient-to-b from-[#1a2360] to-[#151c4d] border-[#34408a] hover:shadow-lg",
        className
      )}
    >
      {children}
    </button>
  );
}

function Metric({ title, value }) {
  return (
    <div className="bg-[#0e1430] border border-dashed border-[#2a386f] rounded-xl px-3 py-2 text-center">
      <div className="text-[11px] text-slate-300/80">{title}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function Card({ children }) {
  return <div className="bg-[#161e3d] border border-[#202a55] rounded-xl p-3">{children}</div>;
}

/* -------------------- 3D constants -------------------- */
const UNIT = 1; // edge length of each unit cube
const GAP = 0.06; // tiny gap between cubes
const STEP = UNIT + GAP; // center-to-center spacing
const MAX = 24; // safety cap for dimensions
const TILE_H = 0.05; // thin height for the area (2D) slab

const COLORS = {
  base: new THREE.Color("#4f80ff"),
  baseDark: new THREE.Color("#3b5ed3"),
  layer: new THREE.Color("#f59e0b"),
  grid1: new THREE.Color("#223066"),
  grid2: new THREE.Color("#182757"),
};

/* -------------------- Position generators -------------------- */
function positionsForBlock(x0, x1, y0, y1, z0, z1) {
  const arr = [];
  for (let i = x0; i < x1; i++) {
    for (let j = y0; j < y1; j++) {
      for (let k = z0; k < z1; k++) {
        arr.push([i * STEP + STEP * 0.5, j * STEP + STEP * 0.5, k * STEP + STEP * 0.5]);
      }
    }
  }
  return arr;
}

// 2D thin tiles: L × W × TILE_H
function positionsForPlate(L, W, tileH = TILE_H) {
  const arr = [];
  for (let i = 0; i < L; i++) {
    for (let k = 0; k < W; k++) {
      arr.push([i * STEP + STEP * 0.5, tileH / 2, k * STEP + STEP * 0.5]);
    }
  }
  return arr;
}
// Strip at x = L (adding +1 length)
function positionsForStripL(L, W, tileH = TILE_H) {
  const arr = [];
  const x = L * STEP + STEP * 0.5;
  for (let k = 0; k < W; k++) arr.push([x, tileH / 2, k * STEP + STEP * 0.5]);
  return arr;
}
// Strip at z = W (adding +1 width)
function positionsForStripW(L, W, tileH = TILE_H) {
  const arr = [];
  const z = W * STEP + STEP * 0.5;
  for (let i = 0; i < L; i++) arr.push([i * STEP + STEP * 0.5, tileH / 2, z]);
  return arr;
}

/* -------------------- Instanced meshes -------------------- */
// Cubes for 3D volume base
function InstancedBase({ positions, color = COLORS.base }) {
  const ref = useRef();
  const geo = useMemo(() => new THREE.BoxGeometry(UNIT - GAP * 0.72, UNIT - GAP * 0.72, UNIT - GAP * 0.72), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 }), [color]);

  useEffect(() => {
    if (!ref.current) return;
    const dummy = new THREE.Object3D();
    positions.forEach((p, i) => {
      dummy.position.set(p[0], p[1], p[2]);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [positions]);

  return <instancedMesh ref={ref} args={[geo, mat, positions.length]} />;
}

// Animating instanced cubes for +1 layers
function InstancedLayer({ positions, color = COLORS.layer, duration = 0.7 }) {
  const ref = useRef();
  const tRef = useRef(0);
  const doneRef = useRef(false);

  const geo = useMemo(() => new THREE.BoxGeometry(UNIT - GAP * 0.72, UNIT - GAP * 0.72, UNIT - GAP * 0.72), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 }), [color]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    if (doneRef.current || !ref.current) return;
    tRef.current = Math.min(1, tRef.current + delta / duration);
    const s = (1 - Math.pow(1 - tRef.current, 3)) * 0.99 + 0.01;
    positions.forEach((p, i) => {
      dummy.position.set(p[0], p[1], p[2]);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (tRef.current >= 1) doneRef.current = true;
  });

  useEffect(() => {
    if (!ref.current) return;
    positions.forEach((p, i) => {
      dummy.position.set(p[0], p[1], p[2]);
      dummy.scale.set(0.01, 0.01, 0.01);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [positions, dummy]);

  return <instancedMesh ref={ref} args={[geo, mat, positions.length]} />;
}

// Thin tile versions for 2D area
function InstancedBaseThin({ positions, color = COLORS.base }) {
  const ref = useRef();
  const geo = useMemo(() => new THREE.BoxGeometry(UNIT - GAP * 0.72, TILE_H, UNIT - GAP * 0.72), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 }), [color]);

  useEffect(() => {
    if (!ref.current) return;
    const dummy = new THREE.Object3D();
    positions.forEach((p, i) => {
      dummy.position.set(p[0], p[1], p[2]);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [positions]);

  return <instancedMesh ref={ref} args={[geo, mat, positions.length]} />;
}

function InstancedLayerThin({ positions, color = COLORS.layer, duration = 0.7 }) {
  const ref = useRef();
  const tRef = useRef(0);
  const doneRef = useRef(false);

  const geo = useMemo(() => new THREE.BoxGeometry(UNIT - GAP * 0.72, TILE_H, UNIT - GAP * 0.72), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 }), [color]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    if (doneRef.current || !ref.current) return;
    tRef.current = Math.min(1, tRef.current + delta / duration);
    const s = (1 - Math.pow(1 - tRef.current, 3)) * 0.99 + 0.01;
    positions.forEach((p, i) => {
      dummy.position.set(p[0], p[1], p[2]);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (tRef.current >= 1) doneRef.current = true;
  });

  useEffect(() => {
    if (!ref.current) return;
    positions.forEach((p, i) => {
      dummy.position.set(p[0], p[1], p[2]);
      dummy.scale.set(0.01, 0.01, 0.01);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [positions, dummy]);

  return <instancedMesh ref={ref} args={[geo, mat, positions.length]} />;
}

/* -------------------- Scenes -------------------- */
/** 1D: bar + ruler ticks & numeric labels */
function RulerTicks({ L, barY = 0.05, barZ = 0.05 }) {
  const tickW = 0.04; // thickness along X
  const tickZ = 0.10; // thickness along Z (appears as a small vertical line)
  const tickH = 0.35; // normal tick height
  const tickH5 = 0.50; // every 5th tick height
  const labelGap = 0.18; // gap above the tick for the label

  return (
    <group>
      {Array.from({ length: L + 1 }).map((_, i) => {
        const isFive = i % 5 === 0;
        const h = isFive ? tickH5 : tickH;
        const y = barY + h / 2; // sit on top of the bar
        const x = i * STEP;
        return (
          <group key={i} position={[x, 0, 0]}>
            {/* tick line */}
            <mesh position={[0, y, barZ / 2]}>
              <boxGeometry args={[tickW, h, tickZ]} />
              <meshBasicMaterial color={isFive ? "#ffffff" : "#cbd5e1"} />
            </mesh>
            {/* numeric label */}
            <Text
              position={[0, y + h / 2 + labelGap, barZ / 2]}
              fontSize={0.32}
              color="#e5e7eb"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.005}
              outlineColor="#0b1020"
              billboard
            >
              {String(i)}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

function LengthScene({ L }) {
  const sizeX = L * STEP,
    sizeY = 0.1,
    sizeZ = 0.1;
  const center = useMemo(() => new THREE.Vector3(sizeX / 2, sizeY / 2, sizeZ / 2), [sizeX, sizeY, sizeZ]);

  return (
    <group>
      <hemisphereLight args={[0xc7d2ff, 0x0b1020, 0.9]} />
      <directionalLight intensity={0.8} position={[8, 14, 10]} />
      <gridHelper args={[Math.max(60, sizeX + 10), 60, COLORS.grid1, COLORS.grid2]} position={[0, -0.01, 0]} />

      {/* thin bar */}
      <mesh position={[sizeX / 2, sizeY / 2, sizeZ / 2]}>
        <boxGeometry args={[sizeX, sizeY, sizeZ]} />
        <meshStandardMaterial color={COLORS.base} roughness={0.5} metalness={0.2} />
        <Edges color={"#5d6eb4"} threshold={15} />
      </mesh>

      {/* ticks + labels */}
      <RulerTicks L={L} barY={sizeY} barZ={sizeZ} />

      <OrbitControls enableDamping target={[center.x, center.y, center.z]} />
    </group>
  );
}

/** 2D: thin-tile slab (height = TILE_H) */
function AreaScene({ L, W, layers }) {
  const center = useMemo(() => new THREE.Vector3((L * STEP) / 2, TILE_H / 2, (W * STEP) / 2), [L, W]);
  const base = useMemo(() => positionsForPlate(L, W, TILE_H), [L, W]);

  return (
    <group>
      <hemisphereLight args={[0xc7d2ff, 0x0b1020, 0.9]} />
      <directionalLight intensity={0.8} position={[8, 14, 10]} />
      <gridHelper args={[Math.max(60, L * STEP + 10), 60, COLORS.grid1, COLORS.grid2]} position={[0, -0.01, 0]} />

      <InstancedBaseThin positions={base} color={COLORS.base} />
      {layers.map((ly) => (
        <InstancedLayerThin key={ly.id} positions={ly.positions} color={ly.color} />
      ))}

      {/* thin outline */}
      <mesh position={[(L * STEP) / 2, TILE_H / 2, (W * STEP) / 2]}>
        <boxGeometry args={[L * STEP, TILE_H, W * STEP]} />
        <meshBasicMaterial color={0x000000} transparent opacity={0} />
        <Edges color={"#5d6eb4"} threshold={15} />
      </mesh>

      <OrbitControls enableDamping target={[center.x, center.y, center.z]} />
    </group>
  );
}

/** 3D: unit cubes slab with animated growth layers */
function VolumeScene({ L, H, W, layers }) {
  const center = useMemo(() => new THREE.Vector3((L * STEP) / 2, (H * STEP) / 2, (W * STEP) / 2), [L, H, W]);
  const base = useMemo(() => positionsForBlock(0, L, 0, H, 0, W), [L, H, W]);

  return (
    <group>
      <hemisphereLight args={[0xc7d2ff, 0x0b1020, 0.9]} />
      <directionalLight intensity={0.8} position={[8, 14, 10]} />
      <gridHelper
        args={[Math.max(60, L * STEP + 10, W * STEP + 10), 60, COLORS.grid1, COLORS.grid2]}
        position={[0, -0.01, 0]}
      />

      <InstancedBase positions={base} color={COLORS.base} />
      {layers.map((ly) => (
        <InstancedLayer key={ly.id} positions={ly.positions} color={ly.color} />
      ))}

      {/* outline box */}
      <mesh position={[(L * STEP) / 2, (H * STEP) / 2, (W * STEP) / 2]}>
        <boxGeometry args={[L * STEP, H * STEP, W * STEP]} />
        <meshBasicMaterial color={0x000000} transparent opacity={0} />
        <Edges color={"#5d6eb4"} threshold={15} />
      </mesh>

      <OrbitControls enableDamping target={[center.x, center.y, center.z]} />
    </group>
  );
}

/* -------------------- Simulators (UI + big viewer) -------------------- */
function LengthSim({ unit }) {
  const [L, setL] = useState(6);
  const max = 48;

  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-4">
      <Card>
        <div className="grid gap-2">
          <NumberField label="Length (L)" value={L} onChange={setL} max={max} />
          <div className="flex gap-2">
            <Button onClick={() => setL((v) => clamp(v - 1, 1, max))}>-1</Button>
            <Button onClick={() => setL((v) => clamp(v + 1, 1, max))}>+1</Button>
          </div>
          <UnitAlgebra unit={unit} dims={1} />
          <div className="grid grid-cols-1 gap-2 mt-1">
            <Metric title="Length" value={<>{L} {unit}</>} />
          </div>
        </div>
      </Card>

      <div className="relative rounded-2xl overflow-hidden border border-[#1b2347] bg-[radial-gradient(900px_600px_at_80%_0%,#142052,#0b1020)] h-[calc(100vh-11rem)] min-h-[520px]">
        <Canvas camera={{ position: [Math.max(10, L * 1.4), 10, 12], fov: 50 }} dpr={[1, 2]}>
          <LengthScene L={L} />
        </Canvas>
      </div>
    </div>
  );
}

function AreaSim({ unit }) {
  const [L, setL] = useState(6);
  const [W, setW] = useState(4);
  const [layers, setLayers] = useState([]);
  const [nextId, setNextId] = useState(1);
  const area = L * W;

  const addStrip = (axis) => {
    let positions = [];
    if (axis === "L") {
      positions = positionsForStripL(L, W, TILE_H);
      setL((v) => v + 1);
    } else {
      positions = positionsForStripW(L, W, TILE_H);
      setW((v) => v + 1);
    }
    setLayers((prev) => [...prev, { id: nextId, positions, color: COLORS.layer }]);
    setNextId((id) => id + 1);
  };

  const reset = () => setLayers([]);

  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-4">
      <Card>
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Length (L)" value={L} onChange={setL} />
            <NumberField label="Width (W)" value={W} onChange={setW} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => addStrip("L")}>L +1</Button>
            <Button onClick={() => addStrip("W")}>W +1</Button>
            <Button className="bg-transparent border-[#263272]" onClick={reset}>
              Reset Highlights
            </Button>
          </div>
          <div className="mt-2 text-xs text-slate-300/80">
            Area formula: <span className="font-semibold">A = L × W</span>
          </div>
          <UnitAlgebra unit={unit} dims={2} />
          <div className="grid grid-cols-3 gap-2 mt-2">
            <Metric title="L" value={<>{L} {unit}</>} />
            <Metric title="W" value={<>{W} {unit}</>} />
            <Metric title="Area" value={<>{area} <UnitSup u={unit} pow={2} /></>} />
          </div>
        </div>
      </Card>

      <div className="relative rounded-2xl overflow-hidden border border-[#1b2347] bg-[radial-gradient(900px_600px_at_80%_0%,#142052,#0b1020)] h-[calc(100vh-11rem)] min-h-[520px]">
        <Canvas camera={{ position: [10, 10, 12], fov: 50 }} dpr={[1, 2]}>
          <AreaScene L={L} W={W} layers={layers} />
        </Canvas>
      </div>
    </div>
  );
}

function VolumeSim({ unit }) {
  const [L, setL] = useState(3);
  const [H, setH] = useState(2);
  const [W, setW] = useState(2);
  const [layers, setLayers] = useState([]);
  const [deltaV, setDeltaV] = useState("—");
  const [relation, setRelation] = useState("—");
  const [nextId, setNextId] = useState(1);
  const vol = L * H * W;

  const addLayer = (axis) => {
    if (L > MAX || H > MAX || W > MAX) return;
    let positions = [],
      dV = 0,
      rel = "—";
    if (axis === "L") {
      positions = positionsForBlock(L, L + 1, 0, H, 0, W);
      dV = H * W;
      rel = `ΔV = H × W = ${H} × ${W} = ${dV}`;
      setL((v) => v + 1);
    }
    if (axis === "H") {
      positions = positionsForBlock(0, L, H, H + 1, 0, W);
      dV = L * W;
      rel = `ΔV = L × W = ${L} × ${W} = ${dV}`;
      setH((v) => v + 1);
    }
    if (axis === "W") {
      positions = positionsForBlock(0, L, 0, H, W, W + 1);
      dV = L * H;
      rel = `ΔV = L × H = ${L} × ${H} = ${dV}`;
      setW((v) => v + 1);
    }
    setLayers((prev) => [...prev, { id: nextId, positions, color: COLORS.layer }]);
    setNextId((id) => id + 1);
    setDeltaV(String(dV));
    setRelation(rel);
  };

  const mergeHighlight = () => setLayers((p) => p.map((m) => ({ ...m, color: COLORS.baseDark })));
  const resetBuild = () => {
    setLayers([]);
    setDeltaV("—");
    setRelation("—");
  };

  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-4">
      <Card>
        <div className="grid gap-2">
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="Length (L)" value={L} onChange={setL} />
            <NumberField label="Height (H)" value={H} onChange={setH} />
            <NumberField label="Width (W)" value={W} onChange={setW} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => addLayer("L")}>L +1</Button>
            <Button onClick={() => addLayer("H")}>H +1</Button>
            <Button onClick={() => addLayer("W")}>W +1</Button>
            <Button className="bg-transparent border-[#263272]" onClick={mergeHighlight}>
              Merge Highlight
            </Button>
            <Button className="bg-transparent border-[#263272]" onClick={resetBuild}>
              Reset
            </Button>
          </div>
          <div className="mt-2 text-xs text-slate-300/80">
            Volume formula: <span className="font-semibold">V = L × H × W</span>
          </div>
          <UnitAlgebra unit={unit} dims={3} />
          <div className="grid grid-cols-4 gap-2 mt-2">
            <Metric title="L" value={<>{L} {unit}</>} />
            <Metric title="H" value={<>{H} {unit}</>} />
            <Metric title="W" value={<>{W} {unit}</>} />
            <Metric title="Volume" value={<>{vol} <UnitSup u={unit} pow={3} /></>} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Metric title="Last ΔV" value={deltaV} />
            <Metric title="Relationship" value={relation} />
          </div>
        </div>
      </Card>

      <div className="relative rounded-2xl overflow-hidden border border-[#1b2347] bg-[radial-gradient(900px_600px_at_80%_0%,#142052,#0b1020)] h-[calc(100vh-11rem)] min-h-[520px]">
        <Canvas camera={{ position: [10, 10, 12], fov: 50 }} dpr={[1, 2]}>
          <VolumeScene L={L} H={H} W={W} layers={layers} />
        </Canvas>
      </div>
    </div>
  );
}

/* -------------------- App -------------------- */
export default function App() {
  const [tab, setTab] = useState("Length"); // 'Length' | 'Area' | 'Volume'
  const [unit, setUnit] = useState("cm");

  return (
    <div className="min-h-screen w-full p-4 bg-[radial-gradient(1200px_800px_at_20%_10%,#121735,#0b1020)] text-slate-100">
      <div className="max-w-7xl mx-auto grid gap-4">
        {/* top bar */}
        <div className="flex items-center justify-between bg-[linear-gradient(180deg,#121736,#0d1227_80%)] border border-[#1d2446] rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-3">
            <div className="text-xl font-semibold">Measurement Simulator</div>
            <div className="text-xs text-slate-300/80">1D / 2D / 3D within one 3D style</div>
          </div>
          <div className="flex items-center gap-3">
            <Segment items={["Length", "Area", "Volume"]} value={tab} onChange={(v) => setTab(v)} />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="bg-[#0e1430] border border-[#23306c] rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* content */}
        {tab === "Length" && <LengthSim unit={unit} />}
        {tab === "Area" && <AreaSim unit={unit} />}
        {tab === "Volume" && <VolumeSim unit={unit} />}

        {/* footer hint */}
        <div className="text-xs text-slate-300/70 text-center mt-2">
          Tip: unit algebra → <UnitSup u={unit} pow={tab === "Length" ? 1 : tab === "Area" ? 2 : 3} />.
        </div>
      </div>
    </div>
  );
}
