import { useCallback, useEffect, useState } from "react";

const KEY = "volume-quest-progress-v1";
const EMPTY = { missions: {}, unlockAll: false, name: "" };

function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const data = JSON.parse(raw);
    return { ...EMPTY, ...data, missions: { ...(data.missions || {}) } };
  } catch {
    return EMPTY;
  }
}

function save(data) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* private mode / storage blocked — progress just won't persist */
  }
}

/** Mission progress, kept in this browser only. */
export function useProgress() {
  const [data, setData] = useState(load);

  useEffect(() => save(data), [data]);

  const complete = useCallback((id, stars) => {
    setData((d) => {
      const prev = d.missions[id]?.stars || 0;
      return { ...d, missions: { ...d.missions, [id]: { done: true, stars: Math.max(prev, stars) } } };
    });
  }, []);

  const setUnlockAll = useCallback((v) => setData((d) => ({ ...d, unlockAll: v })), []);
  const setName = useCallback((name) => setData((d) => ({ ...d, name })), []);
  const reset = useCallback(() => setData(EMPTY), []);

  return { data, complete, setUnlockAll, setName, reset };
}
