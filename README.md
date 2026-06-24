# Project Imladris — The Living Campus

A real-time, interactive 3D diorama of a self-sustaining R&D sanctuary — a "modern Rivendell"
on a floating island. Built with [three.js](https://threejs.org) + [Vite](https://vitejs.dev).

It renders the campus as a single living organism: a sentinel-AI **brain**, a sensing **nervous
system** of glowing data pulses, **micro-hydro** water wheels and energy flows, drones that patrol
and fight fire, deer and birds, six navigable **sectors**, and a triggerable **wildfire** that the
drone squadron puts out.

## Quick start
```bash
npm install
npm run dev      # open http://localhost:5173
```
Build for production:
```bash
npm run build && npm run preview
```
Requires Node 18+.

## Controls
- **Drag** to orbit · **scroll / pinch** to zoom
- **Sector chips** (top-left) jump the camera to a zone
- **Wildfire** button ignites a fire; drones respond. (It also auto-runs once ~16s after load.)
- **Auto-orbit** / **Reset** in the toolbar

## Project layout
See `CLAUDE.md` for the full architecture. In short: `src/core` (engine), `src/world` (terrain,
water, plants, sectors), `src/systems` (network, agents, fire, events), `src/ui`, `src/assets`.
All tunables are in `src/config.js`.

## Making it richer
This scaffold uses procedural geometry as placeholders. To reach diorama fidelity, drop real
`.glb` models into `public/models/` and wire them via `src/assets/loader.js` → `place()`.
The model wishlist and style targets are in `ASSETS.md`; the build plan is in `ROADMAP.md`.

## Reference
`reference/campus-world.html` is the original single-file prototype — the complete behavioral
spec this project is refactored from. Open it directly in a browser to see every feature.
