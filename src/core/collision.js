import { Box3 } from 'three';

// Cheap XZ-circle colliders derived from each building's bounding box, so the avatar
// can't walk through structures. Circles (not boxes) keep resolution trivial and look
// fine for low-poly props. Tiny props (posts) and huge bounds (terrain) are skipped.
export function buildColliders(objects) {
  const cols = [];
  const box = new Box3();
  objects.forEach(obj => obj.children.forEach(child => {
    box.setFromObject(child);
    if (!isFinite(box.min.x) || !isFinite(box.max.x)) return;
    const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
    const r = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
    if (r >= 1 && r <= 12) cols.push({ x: cx, z: cz, r });
  }));
  return cols;
}

// resolver(pos, selfR): push pos out of any overlapping collider (mutates pos.x/z).
export function makeResolver(cols) {
  return (pos, selfR = 0.55) => {
    for (const c of cols) {
      const dx = pos.x - c.x, dz = pos.z - c.z, d = Math.hypot(dx, dz), min = c.r + selfR;
      if (d < min && d > 1e-4) { const push = (min - d) / d; pos.x += dx * push; pos.z += dz * push; }
    }
  };
}
