import { useEffect, useRef } from "react";
import { CubeWorld } from "./CubeWorld.js";

const EMPTY = [];

/**
 * React wrapper around CubeWorld. Pass memoised arrays; each list is pushed to
 * the engine only when its identity changes.
 */
export default function World({
  cells = EMPTY,
  outlines = EMPTY,
  solids = EMPTY,
  labels = EMPTY,
  lines = EMPTY,
  className = "",
  hint = true,
  viewDir,
  children,
}) {
  const hostRef = useRef(null);
  const worldRef = useRef(null);
  const latest = useRef({ cells, outlines, solids, labels, lines });
  latest.current = { cells, outlines, solids, labels, lines };
  const viewDirRef = useRef(viewDir);

  useEffect(() => {
    let world;
    try {
      world = new CubeWorld(hostRef.current);
    } catch (err) {
      console.error("WebGL unavailable", err);
      hostRef.current.innerHTML =
        '<div style="padding:24px;color:#cbd5ff;font-size:14px">This device could not start 3D graphics (WebGL). Try another browser.</div>';
      return undefined;
    }
    worldRef.current = world;
    world.setDefaultDir(viewDirRef.current);
    const l = latest.current;
    world.setOutlines(l.outlines);
    world.setSolids(l.solids);
    world.setLines(l.lines);
    world.setLabels(l.labels);
    world.setCells(l.cells);
    return () => {
      worldRef.current = null;
      world.dispose();
    };
  }, []);

  useEffect(() => worldRef.current?.setCells(cells), [cells]);
  useEffect(() => worldRef.current?.setOutlines(outlines), [outlines]);
  useEffect(() => worldRef.current?.setSolids(solids), [solids]);
  useEffect(() => worldRef.current?.setLabels(labels), [labels]);
  useEffect(() => worldRef.current?.setLines(lines), [lines]);

  return (
    <div className={`stage relative overflow-hidden rounded-2xl ${className}`}>
      <div ref={hostRef} className="absolute inset-0" data-testid="world" />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto flex flex-col gap-2">{children}</div>
        <button
          type="button"
          onClick={() => worldRef.current?.resetView()}
          className="pointer-events-auto shrink-0 rounded-lg border border-white/10 bg-[#0b1230]/80 px-2.5 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur hover:bg-[#16205a]"
          title="Reset the camera"
        >
          ⟲ Reset view
        </button>
      </div>
      {hint && (
        <div className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-slate-400/80">
          Drag to rotate · scroll or pinch to zoom
        </div>
      )}
    </div>
  );
}
