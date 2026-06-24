import { Points, BufferGeometry, Float32BufferAttribute, PointsMaterial, Color } from 'three';
import { onGlow } from './glowRegistry.js';

const rand = Math.random;
const lerp = (a, b, t) => a + (b - a) * t;

// Day/night cycle. Smoothly lerps lights, sky gradient, and every emissive material
// between a warm day and a glowing night. The bloom pipeline keys off emissive, so
// windows, lanterns, grow-lights, and network pulses light up the valley after dark.
// onPhase(star) lets fauna crossfade fireflies (night) against butterflies (day).
export function createDayNight({ lights, skyUniforms, scene, glow = [], onPhase }) {
  const { hemi, key, fill, rim } = lights;

  // starfield — invisible by day, fades in at night
  const sp = [];
  for (let i = 0; i < 500; i++) { const r = 1300, th = rand() * 6.28, ph = rand() * 0.6 * Math.PI; sp.push(r * Math.sin(ph) * Math.cos(th), Math.abs(r * Math.cos(ph)) * 0.7 + 120, r * Math.sin(ph) * Math.sin(th)); }
  const starGeo = new BufferGeometry(); starGeo.setAttribute('position', new Float32BufferAttribute(sp, 3));
  const stars = new Points(starGeo, new PointsMaterial({ color: 0xfff3df, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0 }));
  scene.add(stars);

  // capture each glow material's base emissive so day/night scales it relatively.
  // onGlow also folds in materials registered later (e.g. emissives on loaded .glb models).
  onGlow(m => { m.userData._base = m.emissiveIntensity || 0.5; if (!glow.includes(m)) glow.push(m); });
  glow.forEach(m => { m.userData._base = m.emissiveIntensity || 0.5; });

  const day = { key: 1.3, hemi: 0.62, fill: 0.4, star: 0, glow: 1, top: new Color(0x3c4158), hor: new Color(0x717693) };
  const ngt = { key: 0.18, hemi: 0.22, fill: 0.12, star: 1, glow: 2.0, top: new Color(0x070a14), hor: new Color(0x1c2440) };
  const st = { key: 1.3, hemi: 0.62, fill: 0.4, star: 0, glow: 1 };
  let night = false;

  function toggle() { night = !night; return night; }

  function update(dt) {
    const tgt = night ? ngt : day, k = 1 - Math.pow(0.0015, dt);
    st.key = lerp(st.key, tgt.key, k); st.hemi = lerp(st.hemi, tgt.hemi, k); st.fill = lerp(st.fill, tgt.fill, k);
    st.star = lerp(st.star, tgt.star, k); st.glow = lerp(st.glow, tgt.glow, k);
    key.intensity = st.key; hemi.intensity = st.hemi; fill.intensity = st.fill; rim.intensity = st.fill * 0.9;
    stars.material.opacity = st.star;
    glow.forEach(m => { m.emissiveIntensity = st.glow * (m.userData._base || 1); });
    skyUniforms.top.value.copy(day.top).lerp(ngt.top, st.star);
    skyUniforms.horizon.value.copy(day.hor).lerp(ngt.hor, st.star);
    if (onPhase) onPhase(st.star);
  }

  return { update, toggle, get night() { return night; } };
}
