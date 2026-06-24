import { LOD } from 'three';

// makeLOD([{ dist, object }, ...]) -> THREE.LOD that swaps detail by camera distance.
// Foundation helper for when prop/model counts grow: give a high-detail mesh at dist 0
// and cheaper stand-ins (or an empty Group) at larger distances. Levels are sorted, so
// order doesn't matter. The active camera drives it — works in both diorama and explore.
//
//   group.add(makeLOD([
//     { dist: 0,  object: place('models/observatory.glb', makeProcedural, t) },
//     { dist: 90, object: makeBillboard() },
//     { dist: 200, object: new Group() },   // culled far away
//   ]));
export function makeLOD(levels) {
  const lod = new LOD();
  [...levels].sort((a, b) => a.dist - b.dist).forEach(l => lod.addLevel(l.object, l.dist));
  return lod;
}
