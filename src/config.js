// All scene tunables in one place — palette, sizes, sector defs, counts, timings.
// Edit here first; modules read from this.

import { Color } from 'three';

export const PALETTE = {
  grass:   0x6cae58,
  grassDk: 0x549846,
  rock:    0x8d8678,
  snow:    0xc4cbcf,
  soilLip: 0x5d8a4c,
  soil:    0x6f5740,
  soilRk:  0x564a3f,
  soilDk:  0x39322c,
  water:   0x4fa8c4,
  amber:   0xf0a93f,
  moss:    0x7ad6a8,
  glacial: 0x5fb3c9,
  timber:  0xc59a64,
  roof:    0x5f8a59
};

export const WORLD = {
  half: 88,                 // island half-extent
  topSegments: 120,         // terrain grid resolution
  // main river: a sinusoidal channel running N→S, overflowing the southern horizon.
  river: { amp: 24, freq: 0.02 },
  // mountain river: a deeper tributary from the high NE ridge, meeting the main river at a
  // sharp angle around the junction (~z 18) — the two unite and flow on as one.
  tributary: { a: { x: 38, z: 62 }, b: { x: 8, z: 18 } },
  // a small western creek (kept clear of the two main rivers)
  stream: { a: { x: -52, z: 46 }, b: { x: -28, z: 8 } }
};

export const COUNTS = {
  conifers: 170,
  deciduous: 250,
  bushes: 180,
  rocks: 60,
  flowers: 300,
  grass: 560
};

// Sectors drive both the floating labels and the jump-to-sector camera framing.
export const SECTORS = [
  { id: 'research', name: 'Research Ridge', col: '#cfe0ff', pos: [26, 52], y: 24 },
  { id: 'green',    name: 'Greenworks',     col: '#7ad6a8', pos: [14, -28], y: 16 },
  { id: 'agri',     name: 'Agriculture',    col: '#bfe87a', pos: [-34, -22], y: 12 },
  { id: 'living',   name: 'Living Quarter', col: '#ffce7a', pos: [-24, -46], y: 12 },
  { id: 'energy',   name: 'Energy Field',   col: '#ffb24d', pos: [-46, 14], y: 16 },
  { id: 'wild',     name: 'Wildwood',       col: '#6fae5a', pos: [-54, -16], y: 18 }
];

export const CAMERA = { frustum: 118, radius: 600, theta: Math.PI * 0.25, phi: 0.95, zoom: 1 };

export const POSTFX = {
  // threshold sits just above lit (non-emissive) surfaces so only emissive/bloom
  // materials glow; strength/radius give a soft halo without washing the scene.
  bloom: { strength: 0.62, radius: 0.6, threshold: 0.84 },
  exposure: 1.1,
  // GTAO contact shadows. radius is WORLD units (island ~180 across), so props a few
  // units tall seat into the ground. intensity scales the whole AO blend.
  ao: { radius: 4.5, distanceExponent: 1.0, thickness: 1.0, scale: 1.0, samples: 8, intensity: 0.92 },
  // subtle diorama vignette (multiplicative darkening toward the frame edge).
  vignette: { radius: 0.85, darkness: 0.34 },
  // cinematic color grade applied in display space: gentle contrast S-curve, a touch of
  // saturation, and a warm tint — the "professional" finish over the whole frame.
  grade: { contrast: 1.08, saturation: 1.14, tint: [1.035, 1.0, 0.955] }
};

export const c = (hex) => new Color(hex);
