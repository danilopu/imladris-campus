// A tiny pub/sub for emissive materials that should bloom and scale with day/night.
// Procedural builders pass their glow mats to createDayNight() directly, but models
// loaded *later* via place() can't — they register here, and day/night picks them up
// live. This is what lets a dropped-in .glb integrate with the lighting automatically.
const mats = new Set();
const subs = new Set();

export function registerGlow(mat) {
  if (!mat || mats.has(mat)) return;
  mats.add(mat);
  subs.forEach(fn => fn(mat));
}

// onGlow(fn): fn is called for every already-registered material and each future one.
export function onGlow(fn) {
  mats.forEach(fn);
  subs.add(fn);
  return () => subs.delete(fn);
}
