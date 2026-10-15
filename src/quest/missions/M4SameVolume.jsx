import { useMemo, useState } from "react";
import World from "../../three/World.jsx";
import { Button, Stepper, cx } from "../../ui/kit.jsx";
import { COLORS, CUBE, STEP, blockCells, blockOutline, dimLabels, shapeKey } from "../../lib/cells.js";
import { ChoiceTask, MissionLayout, NextRow, STAGE_CLASS, Speech, useMission } from "../parts.jsx";

const TARGET = 24;
const ALL = ["1×1×24", "1×2×12", "1×3×8", "1×4×6", "2×2×6", "2×3×4"];

export default function M4SameVolume() {
  const { api } = useMission();
  const [step, setStep] = useState(0);
  const [L, setL] = useState(3);
  const [W, setW] = useState(2);
  const [H, setH] = useState(2);
  const [found, setFound] = useState([]);
  const [msg, setMsg] = useState(null);
  const [reflectDone, setReflectDone] = useState(false);

  const V = L * W * H;
  const key = shapeKey(L, W, H);
  const fits = V === TARGET;

  const cells = useMemo(() => {
    const inside = blockCells({
      id: "crate",
      L,
      H,
      W,
      limit: TARGET,
      colorFn: (i, j) => (j % 2 ? COLORS.baseAlt : COLORS.base),
    });
    // Left-over cubes wait on the dock beside the crate.
    const spare = [];
    const left = TARGET - inside.length;
    const x0 = L * STEP + 1.4;
    for (let n = 0; n < left; n++) {
      const col = n % 4;
      const row = Math.floor(n / 4);
      spare.push({
        key: `spare:${n}`,
        p: [x0 + col * STEP + 0.5, 0.5, row * STEP + 0.5],
        s: [CUBE, CUBE, CUBE],
        color: COLORS.layer,
      });
    }
    return [...inside, ...spare];
  }, [L, W, H]);

  const outlines = useMemo(
    () => [
      blockOutline({
        L,
        H,
        W,
        color: fits ? "#4ade80" : V > TARGET ? "#f87171" : "#ffd48a",
        fill: fits ? "#22c55e" : "#6d8bff",
        fillOpacity: 0.07,
      }),
    ],
    [L, W, H, fits, V]
  );
  const labels = useMemo(() => {
    const out = dimLabels({ L, H, W, unit: "cm" });
    if (V < TARGET) out.push({ text: `${TARGET - V} spare cubes`, p: [L * STEP + 1.4 + 2.1, 1.6, 0.5], size: 0.42, bg: "#5a3a06", color: "#ffe6b3" });
    if (V > TARGET) out.push({ text: `${V - TARGET} empty spaces`, p: [(L * STEP) / 2, H * STEP + 0.9, (W * STEP) / 2], size: 0.45, bg: "#5a1414", color: "#ffd0d0" });
    if (fits) out.push({ text: "Perfect fit!", p: [(L * STEP) / 2, H * STEP + 0.9, (W * STEP) / 2], size: 0.5, bg: "#0f4a2a", color: "#c9ffd9" });
    return out;
  }, [L, W, H, V, fits]);

  const world = <World className={STAGE_CLASS} cells={cells} outlines={outlines} labels={labels} />;

  const edit = (setter) => (v) => {
    setter(v);
    setMsg(null);
  };

  const ship = () => {
    if (!fits) return;
    if (found.includes(key)) {
      setMsg({ tone: "info", text: `That’s the same crate as ${key}, just turned around. Same shape, same volume. Try a new one!` });
      return;
    }
    const next = [...found, key];
    setFound(next);
    setMsg({
      tone: "good",
      text: next.length === ALL.length ? "All 6 crates found. Legendary!" : `Shipped! ${next.length} of ${ALL.length} different crates found.`,
    });
  };

  const stars = found.length >= 6 ? 3 : found.length >= 4 ? 2 : 1;

  return (
    <MissionLayout step={step} total={2} world={world}>
      {step === 0 && (
        <>
          <Speech who="rae">
            A customer has exactly <b>{TARGET} cubes</b> and wants them in a rectangular crate with <b>no gaps and no spare
            cubes</b>. They don’t mind what shape it is. How many different crates could we build?
          </Speech>
          <div className="grid gap-2">
            <Stepper label="Length L" value={L} min={1} max={24} onChange={edit(setL)} unit="cm" color="#ffd48a" />
            <Stepper label="Width W" value={W} min={1} max={24} onChange={edit(setW)} unit="cm" color="#9ff0c0" />
            <Stepper label="Height H" value={H} min={1} max={24} onChange={edit(setH)} unit="cm" color="#f6b0ff" />
          </div>
          <div
            className={cx(
              "rounded-xl border px-3 py-2 text-center text-lg font-bold tabular-nums",
              fits ? "border-green-400/50 bg-green-500/10 text-green-200" : V > TARGET ? "border-red-400/40 bg-red-500/10 text-red-100" : "border-amber-400/40 bg-amber-500/10 text-amber-100"
            )}
          >
            {L} × {W} × {H} = {V} cm³
            <div className="text-xs font-medium">
              {fits ? "Perfect fit: ship it!" : V > TARGET ? `Too big: ${V - TARGET} empty spaces` : `Too small: ${TARGET - V} cubes left over`}
            </div>
          </div>
          <Button variant="success" size="lg" onClick={ship} disabled={!fits}>
            Ship this crate
          </Button>
          {msg && (
            <div
              className={cx(
                "pop-in rounded-lg border px-3 py-2 text-sm",
                msg.tone === "good" ? "border-green-400/30 bg-green-500/10 text-green-100" : "border-indigo-400/30 bg-indigo-500/10 text-indigo-100"
              )}
            >
              {msg.text}
            </div>
          )}
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Shipping log · {found.length}/{ALL.length}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {ALL.map((_, i) => (
                <div
                  key={i}
                  className={cx(
                    "rounded-lg border px-2 py-1.5 text-center text-sm font-bold tabular-nums",
                    found[i] ? "border-green-400/40 bg-green-500/10 text-green-100" : "border-dashed border-white/10 text-slate-500"
                  )}
                >
                  {found[i] ? found[i].replaceAll("×", " × ") : "?"}
                </div>
              ))}
            </div>
          </div>
          {found.length >= 2 && found.length < ALL.length && (
            <Speech who="cubby">Tip: think of numbers that multiply to make 24. What if one edge is 1? What if one edge is 2?</Speech>
          )}
          <NextRow onNext={() => setStep(1)} canNext={found.length >= 3} nextLabel={found.length >= 3 ? "Report back →" : `Find ${3 - found.length} more`} />
        </>
      )}

      {step === 1 && (
        <>
          <Speech who="rae">
            Great work! You found {found.length} different crate{found.length === 1 ? "" : "s"}. They all look different. What do they
            have in common?
          </Speech>
          <ChoiceTask
            correct="prod"
            onWrong={api.miss}
            onDone={() => setReflectDone(true)}
            options={[
              { id: "len", label: "They all have the same length", why: "Check your log: the lengths are different." },
              { id: "prod", label: "L × W × H = 24 for every one of them", why: "Same volume, different shapes. Volume depends on L × W × H, not on looks." },
              { id: "look", label: "They all look like cubes", why: "A 1 × 1 × 24 crate is a long stick, not a cube!" },
            ]}
          />
          <NextRow
            onNext={() => api.finish(stars, `${found.length} of ${ALL.length} crates found`)}
            canNext={reflectDone}
            nextLabel="Finish job ✓"
          />
        </>
      )}
    </MissionLayout>
  );
}
