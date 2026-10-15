# Measurement Simulator: Volume Quest

A 3D, browser-based simulator for **Year 7 Measurement**. Students discover what volume means and why
**V = L × W × H** works by packing, stacking and scaling unit cubes.

**Live:** https://yuchencao01.github.io/vol-simulator/

## Volume Quest (story mode)

Students are the new loader at **Port Cubica**, a cargo harbour where everything ships in 1 cm unit cubes.
Dockmaster Rae hands out jobs and Cubby the loader-bot gives hints. Every job follows an inquiry cycle:
**Predict → Test → Explain → Apply**.

| Job | Big question | What students do |
| --- | --- | --- |
| 1 · The Two Crates | What does “volume” actually measure? | Predict which crate holds more (long 6×2×2 vs chunky 3×3×3), then pack both with cubes |
| 2 · Layer Cake | Is there a faster way than counting every cube? | Count one layer, stack layers with a crane, spot the pattern in a table, predict 10 layers |
| 3 · The Shortcut | Can we find the volume from the edge lengths alone? | Base area × layers → V = L × W × H, unit algebra cm × cm × cm = cm³, speed round |
| 4 · Same Space, Different Shape | Can different crates have the same volume? | Design every crate that holds exactly 24 cubes (spare cubes and empty spaces are shown) |
| 5 · The Supersize Order | What happens to the volume if you double the edges? | Predict, then see ×2, ×4, ×8 with colour-coded copies; then tripling |
| Final · The Dockmaster’s Exam | Can you use it on new problems? | Six randomised questions: forwards, backwards (missing edge), base area, units, cubes, real objects |

Gamification: stars per job (predictions are never marked wrong), badges, a progress bar, confetti and a
printable *Crate Captain* certificate. Progress is saved in the browser only (`localStorage`).

**Teacher notes** (top right) include the learning intention, success criteria, the curriculum link
(Victorian Curriculum Mathematics 2.0, VC2M7M02), discussion prompts for each job, an *unlock every job*
switch for demos and a progress reset.

Direct links: `#/mission/m1` … `#/mission/m5`, `#/mission/boss`, `#/sandbox`.

## Sandbox

The original free-explore simulator: Length (1D), Area (2D) and Volume (3D) in one 3D style, with
mm / cm / m unit algebra and +1 buttons that highlight how much one new strip or layer adds.

## Bug fixes in this version

- **Merge Highlight** sent the merged cubes to the origin corner (the instanced mesh was rebuilt with
  empty matrices). Colours now fade in place.
- Orange +1 layers **flickered** (z-fighting) because they were drawn twice at the same spot as the blue cubes.
- Highlights were left **floating in mid-air** after typing a smaller dimension; typing now clears them.
- The +1 buttons could go **past the maximum** (off-by-one in Volume, no cap at all in Area); they now
  disable at the limit.
- The camera **never re-framed**: long rulers (up to 48) and big prisms went off-screen. The camera now
  glides to fit the content, and there is a **Reset view** button.
- Number fields **snapped to 1** the moment they were cleared, so you couldn’t retype a value; they now
  commit on Enter or blur and clamp to the allowed range.
- The **Relationship** metric overflowed its tile, and the header did not wrap on phones.
- **Reset** in Volume only cleared highlights; it now restores the starting crate.
- Geometry and materials were re-created on every +1 without being freed (GPU memory leak).
- The tab title was still *Vite + React* with the Vite logo.

## Develop

```bash
npm ci
npm run dev      # local dev server
npm run build    # production build in dist/
```

Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`
(Settings → Pages → Source: **GitHub Actions**).

Built with React 19, three.js (a small instanced-mesh engine in `src/three/CubeWorld.js`), Tailwind CSS 4 and Vite.
