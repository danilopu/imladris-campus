import { Group, AnimationMixer } from 'three';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { terrain } from '../world/terrain.js';
import { loadGltf } from '../assets/loader.js';
import { MODELS } from '../assets/manifest.js';

const rand = Math.random;
const lerp = (a, b, t) => a + (b - a) * t;

// CC0 character NPCs that bring the campus alive: a few residents standing idle at the
// market / farm / dock, and a handful strolling the hamlet paths with a baked Walk clip.
// SkeletonUtils.clone() lets one downloaded rig spawn many independent, animatable copies.
export function buildVillagers() {
  const group = new Group();
  const updaters = [];

  function spawn(id, onReady) {
    const M = MODELS[id];
    if (!M || !M.url) return;
    loadGltf(M.url).then(g => {
      const model = skClone(g.scene);
      model.scale.setScalar(M.scale);
      model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      group.add(model);
      const mixer = new AnimationMixer(model);
      const clip = (n) => g.animations.find(c => c.name === n);
      onReady(model, mixer, clip);
    }).catch(() => { /* skip this villager if the rig fails to load */ });
  }

  // idle residents at points of interest (x, z, facing yaw)
  [
    { id: 'char_chef',     x: -45, z: -46, ry: 2.4 },   // market stall
    { id: 'char_casualF',  x: -42, z: -50, ry: 1.0 },   // market square
    { id: 'char_worker',   x: -54, z: -33, ry: 0.4 },   // chicken farm
    { id: 'char_casual2M', x: -29, z: -45, ry: -1.2 },  // dock / bank
    { id: 'char_elf',      x: -20, z: -51, ry: 0.2 },   // by the footbridge
    { id: 'char_doctor',   x: 9,   z: -23, ry: 1.5 }    // greenworks
  ].forEach(spec => spawn(spec.id, (model, mixer, clip) => {
    model.position.set(spec.x, terrain(spec.x, spec.z), spec.z);
    model.rotation.y = spec.ry;
    const idle = clip('Idle') || clip('Walk');
    if (idle) mixer.clipAction(idle).play();
    updaters.push(dt => mixer.update(dt));
  }));

  // strollers walking hamlet / campus paths
  const walkPaths = [
    [[-34, -40], [-30, -48], [-40, -52], [-44, -46]],
    [[-50, -46], [-44, -48], [-36, -44], [-24, -50]],
    [[8, -26], [-6, -40], [-20, -46], [-34, -46]]
  ];
  const walkerIds = ['char_casualM', 'char_suitF', 'char_worker'];
  walkPaths.forEach((path, k) => spawn(walkerIds[k % walkerIds.length], (model, mixer, clip) => {
    const walk = clip('Walk') || clip('Idle');
    if (walk) mixer.clipAction(walk).play();
    const st = { seg: Math.floor(rand() * path.length), t: rand(), sp: 0.07 + rand() * 0.05, ry: 0 };
    updaters.push(dt => {
      st.t += dt * st.sp;
      if (st.t >= 1) { st.t -= 1; st.seg = (st.seg + 1) % path.length; }
      const a = path[st.seg], b = path[(st.seg + 1) % path.length];
      const x = lerp(a[0], b[0], st.t), z = lerp(a[1], b[1], st.t);
      model.position.set(x, terrain(x, z), z);
      const th = Math.atan2(b[0] - a[0], b[1] - a[1]);
      let d = th - st.ry; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283;
      st.ry += d * (1 - Math.exp(-6 * dt)); model.rotation.y = st.ry;
      mixer.update(dt);
    });
  }));

  function update(dt) { for (const u of updaters) u(dt); }
  return { group, update };
}
