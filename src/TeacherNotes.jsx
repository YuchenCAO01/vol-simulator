import { Button, Modal } from "./ui/kit.jsx";
import { MISSIONS } from "./quest/story.js";

const PROMPTS = {
  m1: "Before packing: “Why did you pick that crate? What were you looking at?” After: “Why can a longer crate hold less?”",
  m2: "“What stays the same in every row of the table? What changes?” Ask students to predict 20 layers without the table.",
  m3: "“Where can you see L × W in the crate? Where is H?” Link cm × cm × cm to cm³ with gestures for the three directions.",
  m4: "Run as a pair or group race. Discuss why 2 × 3 × 4 and 4 × 3 × 2 are the same crate. Extension: which crate needs the least cardboard?",
  m5: "Collect predictions on mini-whiteboards before each “double” button. Many students predict ×2 or ×6, so draw out the misconception.",
  boss: "Use as an exit ticket. The missing-height question checks whether students can use the formula backwards (division).",
};

export default function TeacherNotes({ open, onClose, progress, setUnlockAll, reset }) {
  return (
    <Modal open={open} onClose={onClose} title="Teacher notes" wide>
      <div className="grid gap-4 text-sm leading-relaxed text-slate-200">
        <section className="grid gap-1">
          <h3 className="text-base font-bold text-white">Learning intention</h3>
          <p>We are learning to explain what volume measures and to calculate the volume of rectangular prisms.</p>
        </section>
        <section className="grid gap-1">
          <h3 className="text-base font-bold text-white">Success criteria</h3>
          <ul className="list-disc space-y-0.5 pl-5">
            <li>I can explain volume as the number of unit cubes that fill a space, measured in cubic units.</li>
            <li>I can find the volume of a prism by counting layers: cubes in one layer × number of layers.</li>
            <li>I can use V = L × W × H (area of base × height) with the correct cubic units.</li>
            <li>I can show that prisms with different shapes can have the same volume, and explain how scaling the edges changes the volume.</li>
          </ul>
        </section>
        <section className="grid gap-1">
          <h3 className="text-base font-bold text-white">Curriculum link</h3>
          <p>
            Victorian Curriculum Mathematics 2.0, Level 7 Measurement, <b>VC2M7M02</b>: solving problems involving the volume of
            right prisms using established formulas and appropriate units. The elaborations include building a rectangular prism
            from unit cubes and showing that the volume is the area of the base multiplied by the height, which is the path these
            jobs follow.
          </p>
        </section>
        <section className="grid gap-1">
          <h3 className="text-base font-bold text-white">How the jobs are built</h3>
          <p>
            Each job follows <b>Predict → Test → Explain → Apply</b>. Predictions are never marked wrong; stars only come from
            the explain and apply questions (3 stars for no slips, 2 for one or two). Wrong answers get a targeted hint, and a
            worked answer appears after three tries so no one gets stuck.
          </p>
          <ul className="list-disc space-y-0.5 pl-5">
            <li>
              <b>Whole class:</b> project a job and pause at each prediction for think–pair–share or mini-whiteboards.
            </li>
            <li>
              <b>Independent / pairs:</b> students work through the harbour map at their own pace. Progress is saved in this
              browser only, and nothing is sent anywhere.
            </li>
            <li>
              <b>Sandbox:</b> free exploration of length (1D), area (2D) and volume (3D) with unit algebra. The +1 buttons show
              how much area or volume one new strip or layer adds.
            </li>
            <li>
              <b>Direct links:</b> add <code>#/mission/m3</code> (or m1–m5, boss) or <code>#/sandbox</code> to the page address.
            </li>
          </ul>
        </section>
        <section className="grid gap-1">
          <h3 className="text-base font-bold text-white">Discussion prompts</h3>
          <ul className="space-y-1.5">
            {MISSIONS.map((m) => (
              <li key={m.id}>
                <b className="text-amber-200">
                  {m.kicker} · {m.title}:
                </b>{" "}
                {PROMPTS[m.id]}
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#0e1430] p-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={progress.unlockAll}
              onChange={(e) => setUnlockAll(e.target.checked)}
              className="h-4 w-4 accent-indigo-500"
            />
            Unlock every job (for demos)
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.confirm("Reset all stars and badges on this device?")) reset();
            }}
          >
            Reset progress on this device
          </Button>
        </section>
      </div>
    </Modal>
  );
}
