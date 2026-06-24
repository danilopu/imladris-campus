import {
  PerspectiveCamera, Group, Mesh, MeshStandardMaterial,
  CylinderGeometry, SphereGeometry, BoxGeometry, Vector3, AnimationMixer, MathUtils
} from 'three';
import { terrain } from '../world/terrain.js';
import { WORLD } from '../config.js';
import { loadGltf } from '../assets/loader.js';

const HALF = WORLD.half;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dampAngle = (cur, target, lambda, dt) => { let d = target - cur; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return cur + d * (1 - Math.exp(-lambda * dt)); };

const CHAR_URL = 'models/kaykit/Rogue_Hooded.glb'; // CC0 KayKit Adventurers
const CHAR_SCALE = 1.0;

// Third-person "Explore" mode: walk a stylized CC0 character around the campus at human
// scale (1 unit ≈ 1 m). Owns its own perspective camera + avatar. Movement is velocity-
// smoothed (eases in/out), collides with buildings, and crossfades idle/walk/run.
//  Desktop: WASD / arrows to move, Shift to jog, drag to orbit the camera, wheel to zoom.
//  resolve(pos): optional collision resolver (pushes the avatar out of buildings).
export function createExplore({ dom, start = [-22, -44], resolve = null }) {
  const camera = new PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2000);

  // avatar holder — starts with a simple procedural stand-in, swapped for the character
  const group = new Group();
  const proc = new Group(); group.add(proc);
  proc.add(new Mesh(new CylinderGeometry(0.26, 0.22, 0.9, 6), new MeshStandardMaterial({ color: 0x394049, roughness: 0.9 })).translateY(0.45));
  proc.add(new Mesh(new CylinderGeometry(0.34, 0.3, 1.0, 7), new MeshStandardMaterial({ color: 0x3f7d6b, roughness: 0.8, flatShading: true })).translateY(1.25));
  proc.add(new Mesh(new SphereGeometry(0.28, 10, 9), new MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.9 })).translateY(1.95));
  proc.traverse(o => { if (o.isMesh) o.castShadow = true; });
  group.visible = false;

  let mixer = null; const actions = {}; let charLoaded = false;
  function loadCharacter() {
    if (charLoaded) return; charLoaded = true;
    loadGltf(CHAR_URL).then(gltf => {
      const model = gltf.scene;
      model.scale.setScalar(CHAR_SCALE);
      model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      group.remove(proc); group.add(model);
      mixer = new AnimationMixer(model);
      const find = (re) => gltf.animations.find(a => re.test(a.name));
      const clips = { idle: find(/idle/i), walk: find(/walk|jog/i), run: find(/run|sprint/i) };
      for (const [k, clip] of Object.entries(clips)) {
        if (!clip) continue; const a = mixer.clipAction(clip); a.enabled = true; a.setEffectiveWeight(k === 'idle' ? 1 : 0); a.play(); actions[k] = a;
      }
    }).catch(() => { /* keep procedural stand-in */ });
  }

  const pos = new Vector3(start[0], terrain(start[0], start[1]), start[1]);
  const vel = { x: 0, z: 0 };
  let active = false, heading = 0, bob = 0;
  let camYaw = Math.PI, camPitch = 0.42, camDist = 9;

  // input
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
    active = true; group.visible = true; loadCharacter();
    pos.set(start[0], terrain(start[0], start[1]), start[1]); vel.x = vel.z = 0;
    resize(); placeCamera();
    // grab keyboard focus so WASD reaches us even when embedded in an iframe/preview
    try { window.focus(); dom.tabIndex = -1; dom.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
  function exit() { active = false; group.visible = false; keys.clear(); dragging = false; }

  function update(dt) {
    if (!active) { if (mixer) mixer.update(dt); return; }
    // desired direction relative to camera look (horizontal)
    const fwd = new Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw)), right = new Vector3(-fwd.z, 0, fwd.x);
    let mx = 0, mz = 0;
    if (keys.has('w') || keys.has('ArrowUp')) { mx += fwd.x; mz += fwd.z; }
    if (keys.has('s') || keys.has('ArrowDown')) { mx -= fwd.x; mz -= fwd.z; }
    if (keys.has('d') || keys.has('ArrowRight')) { mx += right.x; mz += right.z; }
    if (keys.has('a') || keys.has('ArrowLeft')) { mx -= right.x; mz -= right.z; }
    const len = Math.hypot(mx, mz), maxSp = keys.has('Shift') ? 12 : 6;
    const tx = len > 0 ? (mx / len) * maxSp : 0, tz = len > 0 ? (mz / len) * maxSp : 0;
    const k = 1 - Math.exp(-9 * dt); // velocity easing (smooth start/stop)
    vel.x += (tx - vel.x) * k; vel.z += (tz - vel.z) * k;

    pos.x = clamp(pos.x + vel.x * dt, -HALF + 4, HALF - 4);
    pos.z = clamp(pos.z + vel.z * dt, -HALF + 4, HALF - 4);
    if (resolve) resolve(pos);
    pos.y = terrain(pos.x, pos.z);

    const sp = Math.hypot(vel.x, vel.z);
    if (sp > 0.4) heading = dampAngle(heading, Math.atan2(vel.x, vel.z), 12, dt);
    bob += dt * sp * 1.4;
    group.position.set(pos.x, pos.y, pos.z); group.rotation.y = heading;

    // animation crossfade (idle ↔ walk ↔ run) — sandboxed so a bad clip never stops
    // movement or the camera from updating
    if (mixer) {
      try {
        mixer.update(dt);
        const target = sp < 0.6 ? 'idle' : (sp > 8.5 ? 'run' : 'walk');
        const wk = 1 - Math.exp(-12 * dt);
        for (const [name, a] of Object.entries(actions)) a.setEffectiveWeight(MathUtils.lerp(a.getEffectiveWeight(), name === target ? 1 : 0, wk));
        if (target === 'run' && !actions.run && actions.walk) actions.walk.setEffectiveWeight(MathUtils.lerp(actions.walk.getEffectiveWeight(), 1, wk));
      } catch (e) { if (!mixer._warned) { mixer._warned = true; console.error('Explore animation error (isolated):', e); } }
    }
    placeCamera();
  }

  return {
    camera, group, update, enter, exit,
    preload: loadCharacter, // warm the 3.6 MB character in the background before first use
    get active() { return active; },
    get position() { return pos.clone(); }
  };
}
