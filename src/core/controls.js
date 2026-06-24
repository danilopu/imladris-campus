import { Vector3 } from 'three';
import { CAMERA } from '../config.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Framerate-independent damping: matches the old per-frame lerp at 60fps but stays
// consistent (and smooth) at any frame rate. lambda ≈ -60*ln(1 - oldFactor).
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

// Custom orthographic orbit (OrbitControls assumes perspective zoom-by-distance;
// for an ortho diorama we zoom via camera.zoom and keep a fixed radius).
export function createControls(camera, dom) {
  const RAD = CAMERA.radius;
  const target = new Vector3(0, 4, 2);
  const goal = { theta: CAMERA.theta, phi: CAMERA.phi, zoom: CAMERA.zoom, target: target.clone() };
  const cur = { theta: goal.theta, phi: goal.phi, zoom: goal.zoom };

  let autoRotate = true, dragging = false, lastX = 0, lastY = 0, pinchD = 0;
  const onAuto = (cb) => (autoCb = cb);
  let autoCb = null;

  function setAuto(v) { autoRotate = v; if (autoCb) autoCb(v); }

  function down(x, y) { dragging = true; lastX = x; lastY = y; setAuto(false); }
  function move(x, y) {
    if (!dragging) return;
    goal.theta -= (x - lastX) * 0.006;
    goal.phi = clamp(goal.phi - (y - lastY) * 0.005, 0.25, 1.45);
    lastX = x; lastY = y;
  }
  function up() { dragging = false; }
  const tDist = (e) => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);

  dom.addEventListener('mousedown', (e) => down(e.clientX, e.clientY));
  addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
  addEventListener('mouseup', up);
  dom.addEventListener('wheel', (e) => { e.preventDefault(); goal.zoom = clamp(goal.zoom * (1 - Math.sign(e.deltaY) * 0.1), 0.55, 4); setAuto(false); }, { passive: false });
  dom.addEventListener('touchstart', (e) => { if (e.touches.length === 1) down(e.touches[0].clientX, e.touches[0].clientY); else if (e.touches.length === 2) { dragging = false; pinchD = tDist(e); } }, { passive: false });
  dom.addEventListener('touchmove', (e) => { e.preventDefault(); if (e.touches.length === 1) move(e.touches[0].clientX, e.touches[0].clientY); else if (e.touches.length === 2) { const d = tDist(e); if (pinchD) goal.zoom = clamp(goal.zoom * d / pinchD, 0.55, 4); pinchD = d; setAuto(false); } }, { passive: false });
  dom.addEventListener('touchend', () => { up(); pinchD = 0; });

  function frame(tx, ty, tz, zoom, theta, phi) {
    goal.target.set(tx, ty, tz); goal.zoom = zoom; goal.theta = theta; goal.phi = phi; setAuto(false);
  }
  function reset() { goal.target.set(0, 4, 2); goal.theta = CAMERA.theta; goal.phi = CAMERA.phi; goal.zoom = CAMERA.zoom; setAuto(true); }

  function update(dt) {
    if (autoRotate) goal.theta += dt * 0.06;
    cur.theta = damp(cur.theta, goal.theta, 5, dt);
    cur.phi = damp(cur.phi, goal.phi, 5, dt);
    cur.zoom = damp(cur.zoom, goal.zoom, 6.3, dt);
    target.lerp(goal.target, 1 - Math.exp(-5 * dt));
    camera.zoom = cur.zoom; camera.updateProjectionMatrix();
    camera.position.set(
      target.x + RAD * Math.sin(cur.phi) * Math.cos(cur.theta),
      target.y + RAD * Math.cos(cur.phi),
      target.z + RAD * Math.sin(cur.phi) * Math.sin(cur.theta)
    );
    camera.lookAt(target);
  }

  return { update, frame, reset, setAuto, onAuto, get autoRotate() { return autoRotate; } };
}
