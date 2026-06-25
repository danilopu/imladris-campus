import {
  Group, Mesh, Points, BufferGeometry, BufferAttribute, PointsMaterial, AdditiveBlending,
  CanvasTexture, SphereGeometry, BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry,
  MeshStandardMaterial
} from 'three';
import { terrain, riverX, cloudTexture, makeCloud } from '../world/terrain.js';

const rand = Math.random;
const lerp = (a, b, t) => a + (b - a) * t;

function tex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#fff'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new CanvasTexture(c);
}

// Ambient life ported from the prototype: fireflies, jumping fish, butterflies,
// drifting clouds, grazing sheep, paddling ducks, a still heron. pondC comes from
// buildIsland(); fish/ducks read it so they sit on real water.
export function buildFauna(pondC) {
  const group = new Group();
  const TEX = tex();

  // -- fireflies -- gentle bioluminescent twinkle drifting over the ground
  const flyN = 70, flyPos = new Float32Array(flyN * 3), flyData = [];
  for (let i = 0; i < flyN; i++) {
    const x = (rand() * 2 - 1) * 80, z = (rand() * 2 - 1) * 80, y = terrain(x, z) + 2 + rand() * 6;
    flyPos[i * 3] = x; flyPos[i * 3 + 1] = y; flyPos[i * 3 + 2] = z;
    flyData.push({ x, y, z, ph: rand() * 6.28, sp: 0.3 + rand() });
  }
  const flyGeo = new BufferGeometry(); flyGeo.setAttribute('position', new BufferAttribute(flyPos, 3));
  const flyMat = new PointsMaterial({ color: 0xffe6a0, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.2, map: TEX, blending: AdditiveBlending, depthWrite: false });
  group.add(new Points(flyGeo, flyMat));

  // -- jumping fish -- arc out of the river or pond, then vanish until next time
  const fish = [];
  for (let i = 0; i < 3; i++) {
    const m = new Mesh(new ConeGeometry(0.32, 1.2, 6), new MeshStandardMaterial({ color: 0xa6c0cf, roughness: 0.4, metalness: 0.3, flatShading: true }));
    m.visible = false; group.add(m);
    fish.push({ m, timer: 2 + rand() * 5, active: false, t: 0, x: 0, z: 0, by: 0, dur: 1.0 });
  }
  function startFish(f) {
    const useP = rand() < 0.4;
    if (useP) { f.x = pondC.x + (rand() - 0.5) * 8; f.z = pondC.z + (rand() - 0.5) * 8; f.by = pondC.y + 0.6; }
    else { const z = (rand() * 2 - 1) * 70; f.x = riverX(z); f.z = z; f.by = terrain(f.x, z) + 0.8; }
    f.active = true; f.t = 0; f.m.visible = true;
  }

  // -- butterflies -- colourful day fliers looping over meadow homes
  const bfN = 18, bfPos = new Float32Array(bfN * 3), bfCol = new Float32Array(bfN * 3), bfData = [];
  const bfCols = [[1, 0.7, 0.2], [0.95, 0.4, 0.6], [0.6, 0.55, 0.95], [1, 0.95, 0.5]];
  const bfHome = [[44, 12], [-14, 36], [8, -30], [-30, -12]];
  for (let i = 0; i < bfN; i++) {
    const h = bfHome[i % bfHome.length], x = h[0] + (rand() - 0.5) * 16, z = h[1] + (rand() - 0.5) * 16, y = terrain(x, z) + 2 + rand() * 3;
    bfPos[i * 3] = x; bfPos[i * 3 + 1] = y; bfPos[i * 3 + 2] = z;
    const c = bfCols[i % bfCols.length]; bfCol[i * 3] = c[0]; bfCol[i * 3 + 1] = c[1]; bfCol[i * 3 + 2] = c[2];
    bfData.push({ x, y, z, ph: rand() * 6.28, sp: 1 + rand() * 1.5, rad: 1.5 + rand() * 2 });
  }
  const bfGeo = new BufferGeometry(); bfGeo.setAttribute('position', new BufferAttribute(bfPos, 3)); bfGeo.setAttribute('color', new BufferAttribute(bfCol, 3));
  const bfMat = new PointsMaterial({ size: 4.5, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, map: TEX, depthWrite: false });
  group.add(new Points(bfGeo, bfMat));

  // -- drifting clouds -- soft cloud billboards at several heights, wrapping the island so
  // orbit mode feels like a refuge cradled in the clouds
  const cTex = cloudTexture();
  const clouds = [];
  for (let i = 0; i < 11; i++) {
    const cl = makeCloud(cTex, 38 + rand() * 40);
    cl.material.opacity = 0.72;
    cl.position.set(-185 + rand() * 370, 64 + rand() * 56, -160 + rand() * 320);
    cl.userData = { sp: 1.1 + rand() * 2.8 }; group.add(cl); clouds.push(cl);
  }

  // -- sheep -- woolly grazers wandering the eastern pasture
  const sheep = [];
  function makeSheep() {
    const g = new Group();
    const wool = new Mesh(new IcosahedronGeometry(0.9, 0), new MeshStandardMaterial({ color: 0xf2efe6, roughness: 1, flatShading: true }));
    wool.scale.set(1.2, 1, 1.4); wool.position.y = 1; wool.castShadow = true; g.add(wool);
    const head = new Mesh(new BoxGeometry(0.5, 0.5, 0.45), new MeshStandardMaterial({ color: 0x3a3530, roughness: 0.9, flatShading: true })); head.position.set(1.05, 1.05, 0); g.add(head);
    [[-0.5, 0.4], [0.5, 0.4], [-0.5, -0.4], [0.5, -0.4]].forEach(p => { const leg = new Mesh(new CylinderGeometry(0.1, 0.1, 0.9, 5), new MeshStandardMaterial({ color: 0x3a3530 })); leg.position.set(p[0], 0.45, p[1]); g.add(leg); });
    return g;
  }
  const pasturePaths = [[[54, -22], [60, -14], [52, -8], [46, -18]], [[50, -20], [58, -24], [50, -26]]];
  for (let i = 0; i < 7; i++) {
    const g = makeSheep(), path = pasturePaths[i % pasturePaths.length];
    sheep.push({ g, path, seg: Math.floor(rand() * path.length), t: rand(), sp: 0.03 + rand() * 0.03, off: (rand() - 0.5) * 5 }); group.add(g);
  }

  // -- ducks -- paddling circles on the pond and a river bend
  const ducks = [];
  function makeDuck() {
    const g = new Group();
    const b = new Mesh(new SphereGeometry(0.4, 8, 6), new MeshStandardMaterial({ color: 0x6b6f76, roughness: 0.85, flatShading: true })); b.scale.set(1.3, 0.8, 1); b.position.y = 0.2; g.add(b);
    const h = new Mesh(new SphereGeometry(0.22, 7, 6), new MeshStandardMaterial({ color: 0x2f6a4a, roughness: 0.7 })); h.position.set(0.45, 0.45, 0); g.add(h);
    const beak = new Mesh(new ConeGeometry(0.08, 0.25, 5), new MeshStandardMaterial({ color: 0xe0a020 })); beak.rotation.z = -Math.PI / 2; beak.position.set(0.68, 0.42, 0); g.add(beak);
    return g;
  }
  for (let i = 0; i < 5; i++) {
    const g = makeDuck(), onPond = i < 3, cx = onPond ? pondC.x : riverX(-30), cz = onPond ? pondC.z : -30, by = (onPond ? pondC.y : terrain(cx, cz)) + 0.7;
    ducks.push({ g, cx, cz, by, ph: rand() * 6.28, rad: onPond ? 3 : 1.6, sp: 0.2 + rand() * 0.3 }); g.position.set(cx, by, cz); group.add(g);
  }

  // -- heron -- a single still wader at the pond edge
  (function () {
    const x = pondC.x - 7.5, z = pondC.z + 2, by = terrain(x, z), g = new Group();
    const leg1 = new Mesh(new CylinderGeometry(0.05, 0.05, 2, 4), new MeshStandardMaterial({ color: 0x2a2f33 })); leg1.position.set(0, 1, 0.2); g.add(leg1);
    const leg2 = leg1.clone(); leg2.position.z = -0.2; g.add(leg2);
    const body = new Mesh(new SphereGeometry(0.4, 8, 6), new MeshStandardMaterial({ color: 0xbfc4cc, roughness: 0.9, flatShading: true })); body.scale.set(1.4, 0.9, 0.8); body.position.y = 2.1; g.add(body);
    const neck = new Mesh(new CylinderGeometry(0.08, 0.08, 1.3, 5), new MeshStandardMaterial({ color: 0xbfc4cc })); neck.position.set(0.3, 2.85, 0); neck.rotation.z = -0.4; g.add(neck);
    g.position.set(x, by, z); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); group.add(g);
  })();

  // (campus residents are now real CC0 character NPCs — see systems/villagers.js)

  // day/night crossfade: fireflies emerge at night, butterflies fade with the sun
  let night = 0;
  function setNight(star) { night = star; }

  function update(dt, elapsed) {
    const now = elapsed * 1000; // prototype math is in milliseconds

    // fireflies
    for (let i = 0; i < flyN; i++) {
      const d = flyData[i]; d.ph += dt * d.sp;
      flyPos[i * 3] = d.x + Math.cos(d.ph) * 1.5; flyPos[i * 3 + 1] = d.y + Math.sin(d.ph * 1.3); flyPos[i * 3 + 2] = d.z + Math.sin(d.ph * 0.7) * 1.5;
    }
    flyGeo.attributes.position.needsUpdate = true;
    flyMat.opacity = night * 0.9 * (0.7 + 0.3 * Math.sin(elapsed * 2));
    bfMat.opacity = (1 - night) * 0.9;

    // fish
    fish.forEach(f => {
      if (!f.active) { f.timer -= dt; if (f.timer <= 0) startFish(f); }
      else {
        f.t += dt / f.dur; const h = Math.sin(f.t * Math.PI) * 2.6;
        f.m.position.set(f.x, f.by + h, f.z); f.m.rotation.z = Math.PI / 2 - (f.t - 0.5) * 2.2;
        if (f.t >= 1) { f.active = false; f.m.visible = false; f.timer = 3 + rand() * 6; }
      }
    });

    // butterflies
    for (let i = 0; i < bfN; i++) {
      const d = bfData[i]; d.ph += dt * d.sp;
      bfPos[i * 3] = d.x + Math.cos(d.ph) * d.rad; bfPos[i * 3 + 1] = d.y + Math.sin(d.ph * 1.7) * 0.8; bfPos[i * 3 + 2] = d.z + Math.sin(d.ph) * d.rad;
    }
    bfGeo.attributes.position.needsUpdate = true;

    // clouds
    clouds.forEach(c => { c.position.x += c.userData.sp * dt; if (c.position.x > 185) c.position.x = -185; });

    // sheep
    sheep.forEach(s => {
      s.t += dt * s.sp; if (s.t >= 1) { s.t -= 1; s.seg = (s.seg + 1) % s.path.length; }
      const a = s.path[s.seg], b = s.path[(s.seg + 1) % s.path.length], x = lerp(a[0], b[0], s.t) + s.off, z = lerp(a[1], b[1], s.t);
      s.g.position.set(x, terrain(x, z), z); s.g.position.y += Math.abs(Math.sin(now * 0.006 + s.seg)) * 0.05; s.g.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
    });

    // ducks
    ducks.forEach(d => {
      d.ph += dt * d.sp; const x = d.cx + Math.cos(d.ph) * d.rad, z = d.cz + Math.sin(d.ph) * d.rad;
      d.g.position.set(x, d.by + Math.sin(now * 0.003 + d.ph) * 0.06, z); d.g.rotation.y = -d.ph;
    });
  }

  return { group, update, setNight };
}
