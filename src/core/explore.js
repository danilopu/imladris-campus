import {
  PerspectiveCamera, Group, Mesh, MeshStandardMaterial,
  CylinderGeometry, SphereGeometry, BoxGeometry, IcosahedronGeometry, Vector3, MathUtils
} from 'three';
import { terrain } from '../world/terrain.js';
import { WORLD } from '../config.js';

const HALF = WORLD.half;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dampAngle = (cur, target, lambda, dt) => { let d = target - cur; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return cur + d * (1 - Math.exp(-lambda * dt)); };

// Stylized low-poly scientist: black tee, jeans, white Air-Force sneakers, messy hair,
// glasses, backpack. Built procedurally (no model download → instant, no INP hitch), with
// hip/shoulder pivots so the walk cycle is a smooth procedural limb-swing.
function makeScientist() {
  const root = new Group();
  const skin = new MeshStandardMaterial({ color: 0xe7b48a, roughness: 0.85 });
  const tee = new MeshStandardMaterial({ color: 0x1b1b1f, roughness: 0.85, flatShading: true });
  const jeans = new MeshStandardMaterial({ color: 0x3a536e, roughness: 0.9, flatShading: true });
  const shoe = new MeshStandardMaterial({ color: 0xf3f3f0, roughness: 0.6 });
  const hair = new MeshStandardMaterial({ color: 0x241f1b, roughness: 1, flatShading: true });
  const pack = new MeshStandardMaterial({ color: 0x2b6f6a, roughness: 0.8, flatShading: true });
  const dark = new MeshStandardMaterial({ color: 0x14161b, roughness: 0.4, metalness: 0.3 });

  const torso = new Mesh(new CylinderGeometry(0.27, 0.24, 0.78, 8), tee); torso.position.y = 1.28; root.add(torso);
  const hips = new Mesh(new CylinderGeometry(0.24, 0.22, 0.22, 8), jeans); hips.position.y = 0.86; root.add(hips);

  // legs — pivot at the hip so they swing
  function leg(side) {
    const g = new Group(); g.position.set(0.11 * side, 0.86, 0);
    const thigh = new Mesh(new CylinderGeometry(0.11, 0.1, 0.82, 6), jeans); thigh.position.y = -0.41; g.add(thigh);
    const foot = new Mesh(new BoxGeometry(0.17, 0.13, 0.34), shoe); foot.position.set(0, -0.86, 0.06); g.add(foot);
    root.add(g); return g;
  }
  const legL = leg(-1), legR = leg(1);

  // arms — pivot at the shoulder
  function arm(side) {
    const g = new Group(); g.position.set(0.3 * side, 1.62, 0);
    const upper = new Mesh(new CylinderGeometry(0.08, 0.07, 0.62, 6), tee); upper.position.y = -0.31; g.add(upper);
    const hand = new Mesh(new SphereGeometry(0.075, 7, 6), skin); hand.position.y = -0.64; g.add(hand);
    root.add(g); return g;
  }
  const armL = arm(-1), armR = arm(1);

  // head + messy hair + glasses
  const head = new Group(); head.position.y = 1.82; root.add(head);
  const face = new Mesh(new SphereGeometry(0.2, 12, 10), skin); face.position.y = 0.16; head.add(face);
  const neck = new Mesh(new CylinderGeometry(0.08, 0.09, 0.14, 6), skin); neck.position.y = 0; head.add(neck);
  // messy hair: a few jittered chunks
  for (let i = 0; i < 7; i++) {
    const h = new Mesh(new IcosahedronGeometry(0.12 + Math.random() * 0.05, 0), hair);
    const a = Math.random() * 6.28, r = 0.08 + Math.random() * 0.06;
    h.position.set(Math.cos(a) * r, 0.27 + Math.random() * 0.08, Math.sin(a) * r * 0.8 - 0.02);
    h.rotation.set(Math.random(), Math.random(), Math.random()); head.add(h);
  }
  const glasses = new Mesh(new BoxGeometry(0.32, 0.07, 0.04), dark); glasses.position.set(0, 0.17, 0.18); head.add(glasses);
  [-1, 1].forEach(s => { const lens = new Mesh(new BoxGeometry(0.12, 0.1, 0.02), dark); lens.position.set(0.09 * s, 0.17, 0.18); head.add(lens); });

  // backpack
  const bag = new Mesh(new BoxGeometry(0.34, 0.46, 0.2), pack); bag.position.set(0, 1.28, -0.26); root.add(bag);
  const strap = new Mesh(new BoxGeometry(0.5, 0.5, 0.1), dark); strap.position.set(0, 1.32, 0.24); strap.scale.set(0.3, 1, 1); root.add(strap);

  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { root, legL, legR, armL, armR, head };
}

// Third-person "Explore" mode at human scale (1 unit ≈ 1 m). Velocity-smoothed movement,
// building collision, smooth heading, and a procedural walk cycle.
//  WASD / arrows to move, Shift to jog, drag to orbit, wheel to zoom.
export function createExplore({ dom, start = [-22, -44], resolve = null }) {
  const camera = new PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2000);

  const group = new Group();
  const avatar = makeScientist(); group.add(avatar.root);
  group.visible = false;

  const pos = new Vector3(start[0], terrain(start[0], start[1]), start[1]);
  const vel = { x: 0, z: 0 };
  let active = false, heading = 0, walk = 0, swing = 0;
  let camYaw = Math.PI, camPitch = 0.42, camDist = 9;

  const keys = new Set();
  function key(e, down) {
    if (!active) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift'].includes(k)) return;
    e.preventDefault(); if (down) keys.add(k); else keys.delete(k);
  }
  addEventListener('keydown', e => key(e, true));
  addEventListener('keyup', e => key(e, false));

  let dragging = false, lastX = 0, lastY = 0;
  dom.addEventListener('pointerdown', e => { if (!active) return; dragging = true; lastX = e.clientX; lastY = e.clientY; });
  addEventListener('pointermove', e => { if (!active || !dragging) return; camYaw -= (e.clientX - lastX) * 0.005; camPitch = clamp(camPitch - (e.clientY - lastY) * 0.005, 0.08, 1.3); lastX = e.clientX; lastY = e.clientY; });
  addEventListener('pointerup', () => { dragging = false; });
  dom.addEventListener('wheel', e => { if (!active) return; e.preventDefault(); camDist = clamp(camDist * (1 + Math.sign(e.deltaY) * 0.1), 4, 26); }, { passive: false });

  function resize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize);

  function placeCamera() {
    const ty = pos.y + 1.5, cp = Math.cos(camPitch);
    camera.position.set(pos.x + Math.sin(camYaw) * cp * camDist, ty + Math.sin(camPitch) * camDist, pos.z + Math.cos(camYaw) * cp * camDist);
    camera.lookAt(pos.x, ty, pos.z);
  }

  function enter() {
    active = true; group.visible = true;
    pos.set(start[0], terrain(start[0], start[1]), start[1]); vel.x = vel.z = 0;
    resize(); placeCamera();
    try { window.focus(); dom.tabIndex = -1; dom.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
  function exit() { active = false; group.visible = false; keys.clear(); dragging = false; }

  function update(dt) {
    if (!active) return;
    const fwd = new Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw)), right = new Vector3(-fwd.z, 0, fwd.x);
    let mx = 0, mz = 0;
    if (keys.has('w') || keys.has('ArrowUp')) { mx += fwd.x; mz += fwd.z; }
    if (keys.has('s') || keys.has('ArrowDown')) { mx -= fwd.x; mz -= fwd.z; }
    if (keys.has('d') || keys.has('ArrowRight')) { mx += right.x; mz += right.z; }
    if (keys.has('a') || keys.has('ArrowLeft')) { mx -= right.x; mz -= right.z; }
    const len = Math.hypot(mx, mz), maxSp = keys.has('Shift') ? 12 : 6;
    const tx = len > 0 ? (mx / len) * maxSp : 0, tz = len > 0 ? (mz / len) * maxSp : 0;
    const k = 1 - Math.exp(-9 * dt);
    vel.x += (tx - vel.x) * k; vel.z += (tz - vel.z) * k;

    pos.x = clamp(pos.x + vel.x * dt, -HALF + 4, HALF - 4);
    pos.z = clamp(pos.z + vel.z * dt, -HALF + 4, HALF - 4);
    if (resolve) resolve(pos);
    pos.y = terrain(pos.x, pos.z);

    const sp = Math.hypot(vel.x, vel.z);
    if (sp > 0.4) heading = dampAngle(heading, Math.atan2(vel.x, vel.z), 12, dt);
    group.position.set(pos.x, pos.y, pos.z); group.rotation.y = heading;

    // procedural walk cycle: legs/arms swing with speed, eased toward neutral at rest
    walk += dt * sp * 1.7;
    const targetSwing = Math.min(sp / 6, 1);
    swing = MathUtils.lerp(swing, targetSwing, 1 - Math.exp(-10 * dt));
    const a = Math.sin(walk) * 0.6 * swing;
    avatar.legL.rotation.x = a; avatar.legR.rotation.x = -a;
    avatar.armL.rotation.x = -a * 0.8; avatar.armR.rotation.x = a * 0.8;
    avatar.root.position.y = Math.abs(Math.sin(walk)) * 0.05 * swing; // gentle body bob
    avatar.head.rotation.z = Math.sin(walk * 0.5) * 0.03 * swing;

    placeCamera();
  }

  return {
    camera, group, update, enter, exit,
    get active() { return active; },
    get position() { return pos.clone(); }
  };
}
