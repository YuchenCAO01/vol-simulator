import { useEffect, useState } from "react";

export function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

export function Button({ children, className = "", variant = "default", size = "md", ...props }) {
  const variants = {
    default: "btn-default",
    primary: "btn-primary",
    ghost: "btn-ghost",
    success: "btn-success",
    warn: "btn-warn",
  };
  const sizes = { sm: "px-2.5 py-1.5 text-xs", md: "px-3.5 py-2 text-sm", lg: "px-5 py-3 text-base" };
  return (
    <button type="button" {...props} className={cx("btn", variants[variant], sizes[size], className)}>
      {children}
    </button>
  );
}

export function Card({ children, className = "" }) {
  return <div className={cx("card", className)}>{children}</div>;
}

export function Metric({ title, value, accent = false, className = "" }) {
  return (
    <div className={cx("metric", accent && "metric-accent", className)}>
      <div className="text-[11px] uppercase tracking-wide text-slate-300/80">{title}</div>
      <div className="mt-0.5 text-lg font-bold leading-tight">{value}</div>
    </div>
  );
}

export function UnitSup({ u, pow }) {
  return (
    <span className="whitespace-nowrap">
      {u}
      {pow > 1 ? <sup>{pow}</sup> : null}
    </span>
  );
}

/**
 * Integer field that lets you clear and retype (the old field snapped to 1 the
 * moment it was empty). Commits on blur / Enter, and clamps to [min, max].
 */
export function IntField({ label, value, onChange, min = 1, max = 24, id, className = "" }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = parseInt(draft, 10);
    if (Number.isNaN(n)) {
      setDraft(String(value));
      return;
    }
    const c = Math.max(min, Math.min(max, n));
    setDraft(String(c));
    if (c !== value) onChange(c);
  };
  return (
    <label className={cx("flex min-w-0 flex-col gap-1", className)} htmlFor={id}>
      <span className="text-xs text-slate-300/80">{label}</span>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="field w-full"
      />
    </label>
  );
}

/** − value + stepper, good on touch screens. */
export function Stepper({ label, value, onChange, min = 1, max = 12, unit, color }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-[#26336e] bg-[#0e1430] px-2 py-1.5">
      <span className="text-sm font-semibold" style={color ? { color } : undefined}>
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="step-btn"
          aria-label={`decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <span className="w-14 text-center text-base font-bold tabular-nums">
          {value}
          {unit ? <span className="ml-0.5 text-xs font-medium text-slate-400">{unit}</span> : null}
        </span>
        <button
          type="button"
          className="step-btn"
          aria-label={`increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function Segment({ items, value, onChange, className = "" }) {
  return (
    <div className={cx("inline-flex overflow-hidden rounded-xl border border-[#31407a] bg-[#0f1540]", className)} role="tablist">
      {items.map((it) => {
        const v = typeof it === "string" ? it : it.value;
        const l = typeof it === "string" ? it : it.label;
        return (
          <button
            type="button"
            role="tab"
            aria-selected={value === v}
            key={v}
            onClick={() => onChange(v)}
            className={cx(
              "px-3 py-2 text-sm font-semibold transition",
              value === v ? "bg-indigo-600/70 text-white" : "text-slate-200 hover:bg-white/5"
            )}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

export function Stars({ n = 0, of = 3, size = "text-lg" }) {
  return (
    <span className={cx("inline-flex gap-0.5 leading-none", size)} aria-label={`${n} of ${of} stars`}>
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className={i < n ? "text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.6)]" : "text-slate-600"}>
          ★
        </span>
      ))}
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx("card my-6 w-full p-5", wide ? "max-w-3xl" : "max-w-lg")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-slate-300 hover:bg-white/10" aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
