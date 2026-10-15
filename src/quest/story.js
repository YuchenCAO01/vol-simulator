/* Story + mission metadata for Volume Quest. */

export const STORY = {
  title: "Volume Quest: The Port Cubica Crates",
  intro: [
    "Welcome to Port Cubica, the busiest cargo harbour in the Cube Sea!",
    "Everything that ships from here is packed in unit cubes: little blocks exactly 1 cm long, 1 cm wide and 1 cm high. Ships charge by how much space your cargo takes up.",
    "I’m Dockmaster Rae. I need a new loader who can work out that space fast, without counting every single cube. Finish the jobs on the map to earn your Crate Captain badge.",
  ],
};

export const MISSIONS = [
  {
    id: "m1",
    kicker: "Job 1",
    title: "The Two Crates",
    question: "What does “volume” actually measure?",
    blurb: "Two customers both say their crate holds more. Predict, then test.",
    badge: { name: "Cube Counter", icon: "▣" },
    keyIdea:
      "Volume is the amount of 3D space something takes up. We measure it by counting how many unit cubes fill it. A 1 cm cube has a volume of 1 cubic centimetre (1 cm³).",
  },
  {
    id: "m2",
    kicker: "Job 2",
    title: "Layer Cake",
    question: "Is there a faster way than counting every cube?",
    blurb: "Stack layers with the crane and look for a pattern.",
    badge: { name: "Layer Logic", icon: "≡" },
    keyIdea:
      "A rectangular prism is a stack of identical layers. Volume = (cubes in one layer) × (number of layers).",
  },
  {
    id: "m3",
    kicker: "Job 3",
    title: "The Shortcut",
    question: "Can we find the volume from the edge lengths alone?",
    blurb: "Turn your layer rule into a formula.",
    badge: { name: "Formula Finder", icon: "×" },
    keyIdea:
      "V = L × W × H. The base L × W tells you how many cubes are in one layer (the base area), and H tells you how many layers there are. cm × cm × cm = cm³.",
  },
  {
    id: "m4",
    kicker: "Job 4",
    title: "Same Space, Different Shape",
    question: "Can crates with different shapes have the same volume?",
    blurb: "Design every crate that holds exactly 24 cubes.",
    badge: { name: "Shape Shifter", icon: "◇" },
    keyIdea:
      "Different-looking prisms can have the same volume. What matters is L × W × H, not how long or tall the crate looks. Turning a crate around does not change its volume.",
  },
  {
    id: "m5",
    kicker: "Job 5",
    title: "The Supersize Order",
    question: "If you double the edges, what happens to the volume?",
    blurb: "Predict how the volume grows when a crate is scaled up.",
    badge: { name: "Scale Master", icon: "⤢" },
    keyIdea:
      "Doubling one edge doubles the volume. Doubling all three edges multiplies the volume by 2 × 2 × 2 = 8. In general, scaling every edge by k multiplies the volume by k × k × k.",
  },
  {
    id: "boss",
    kicker: "Final",
    title: "The Dockmaster’s Exam",
    question: "Can you use everything you’ve learned on new problems?",
    blurb: "Six fresh orders. No cubes to count, just your brain.",
    badge: { name: "Crate Captain", icon: "★" },
    keyIdea:
      "Volume of a rectangular prism = area of base × height = L × W × H, measured in cubic units (mm³, cm³, m³). Use it forwards to find the volume, or backwards to find a missing edge.",
  },
];

export const missionIndex = (id) => MISSIONS.findIndex((m) => m.id === id);
