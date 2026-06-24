import { Sprite, SpriteMaterial, CanvasTexture, Group } from 'three';
import { terrain } from './terrain.js';
import { SECTORS } from '../config.js';

function label(text, color) {
  const c = document.createElement('canvas'); c.width = 300; c.height = 72; const x = c.getContext('2d');
  x.font = '600 30px -apple-system,system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 7; x.strokeStyle = 'rgba(8,12,20,0.7)'; x.strokeText(text, 150, 38);
  x.fillStyle = color; x.fillText(text, 150, 38);
  const tex = new CanvasTexture(c); tex.anisotropy = 2;
  const spr = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, opacity: 0.92 }));
  spr.scale.set(24, 5.8, 1); spr.renderOrder = 6; return spr;
}

// Returns { group, sectors } — sectors carry a frame() helper bound to controls.
export function buildSectors(controls) {
  const group = new Group();
  const sectors = SECTORS.map(s => {
    const lbl = label(s.name, s.col);
    lbl.position.set(s.pos[0], terrain(s.pos[0], s.pos[1]) + s.y, s.pos[1]);
    group.add(lbl);
    const frame = () => {
      const cx = s.pos[0], cz = s.pos[1], y = terrain(cx, cz) + 5;
      const ang = Math.atan2(cz, cx);
      controls.frame(cx, y, cz, 1.8, ang + Math.PI * 0.6, 0.92);
    };
    return { ...s, frame };
  });
  return { group, sectors };
}
