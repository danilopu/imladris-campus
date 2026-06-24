import {
  Group, Mesh, MeshStandardMaterial, BoxGeometry, CylinderGeometry, SphereGeometry, Vector3
} from 'three';
import { terrain } from '../world/terrain.js';

const lerp = (a, b, t) => a + (b - a) * t;
function dampAngle(cur, target, lambda, dt) {
  let d = target - cur; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  return cur + d * (1 - Math.exp(-lambda * dt));
}

// Logistics — the first content built on the Director substrate. Fields ripen on their
// own clocks; when ripe a field posts a 'harvest' job (field → granary). Rovers claim
// jobs, drive out, load a crate, haul it to the silo, and the silo fills — then the
// campus slowly consumes the store (metabolism). Pure data declarations up top, so
// adding fields/silos/rovers later is a one-line change. glow[] = rover + silo emissives.
//
// DATA — edit these to fill in content.
const FIELDS = [           // harvest sources (match the farm field centers)
  { x: -32, z: -28, period: 14 },
  { x: -8, z: -44, period: 18 },
  { x: 22, z: -18, period: 16 },
  { x: -44, z: -6, period: 20 }
];
const SILO = { x: 2, z: -12, id: 'granary', capacity: 100 };
const ROVERS = 3;

export function buildLogistics(director) {
  const group = new Group();
  const glow = [];
  director.defineStore(SILO.id, SILO.capacity, SILO.capacity * 0.35);

  const siloPos = new Vector3(SILO.x, terrain(SILO.x, SILO.z), SILO.z);
  const depot = new Vector3(SILO.x + 6, terrain(SILO.x + 6, SILO.z + 4), SILO.z + 4); // rover home

  // --- storage silo with an animated fill column ---
  let siloFill = null;
  {
    const by = siloPos.y;
    const shell = new Mesh(new CylinderGeometry(3, 3, 8, 16, 1, true), new MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.6, metalness: 0.3, side: 2 }));
    shell.position.set(SILO.x, by + 4, SILO.z); shell.castShadow = true; group.add(shell);
    const cap = new Mesh(new CylinderGeometry(3.1, 3.1, 0.6, 16), new MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.7 })); cap.position.set(SILO.x, by + 8.1, SILO.z); group.add(cap);
    siloFill = new Mesh(new CylinderGeometry(2.8, 2.8, 1, 16), new MeshStandardMaterial({ color: 0xd8b25a, emissive: 0x6a4f18, emissiveIntensity: 0.35, roughness: 0.8 }));
    siloFill.position.set(SILO.x, by, SILO.z); group.add(siloFill);
  }

  // --- ripeness markers over each field ---
  const fields = FIELDS.map(f => {
    const by = terrain(f.x, f.z);
    const mat = new MeshStandardMaterial({ color: 0xbfe87a, emissive: 0x3a5f10, emissiveIntensity: 0.2 });
    const m = new Mesh(new SphereGeometry(0.5, 10, 8), mat); m.position.set(f.x, by + 3, f.z); group.add(m);
    return { ...f, by, mat, marker: m, ripe: Math.random() * 0.6, active: false };
  });

  // --- rovers (six-wheeled field robots) ---
  function makeRover() {
    const g = new Group();
    const body = new Mesh(new BoxGeometry(1.8, 0.8, 2.8), new MeshStandardMaterial({ color: 0xd9d2c4, roughness: 0.6, metalness: 0.1, flatShading: true })); body.position.y = 0.85; body.castShadow = true; g.add(body);
    const bed = new Mesh(new BoxGeometry(1.6, 0.3, 1.3), new MeshStandardMaterial({ color: 0x6f6a5e, roughness: 0.9 })); bed.position.set(0, 1.3, -0.7); g.add(bed);
    const lite = new Mesh(new BoxGeometry(1.4, 0.16, 0.1), new MeshStandardMaterial({ color: 0x7ad6a8, emissive: 0x7ad6a8, emissiveIntensity: 1.0 })); lite.position.set(0, 0.95, 1.42); g.add(lite); glow.push(lite.material);
    [[-0.95, 1], [0.95, 1], [-0.95, 0], [0.95, 0], [-0.95, -1], [0.95, -1]].forEach(p => { const w = new Mesh(new CylinderGeometry(0.42, 0.42, 0.3, 8), new MeshStandardMaterial({ color: 0x2a2f33, roughness: 0.9 })); w.rotation.z = Math.PI / 2; w.position.set(p[0], 0.42, p[1] * 1.0); g.add(w); });
    const crate = new Mesh(new BoxGeometry(1.2, 1.0, 1.0), new MeshStandardMaterial({ color: 0xd8b25a, roughness: 0.85, flatShading: true })); crate.position.set(0, 1.85, -0.7); crate.visible = false; g.add(crate);
    g.userData.crate = crate;
    return g;
  }
  const rovers = [];
  for (let i = 0; i < ROVERS; i++) {
    const g = makeRover(); g.position.copy(depot); group.add(g);
    rovers.push({ g, state: 'idle', job: null, heading: 0, wait: 0, target: depot.clone() });
  }

  // move a rover toward an xz target; returns true on arrival
  function driveTo(r, tx, tz, dt) {
    const dx = tx - r.g.position.x, dz = tz - r.g.position.z, dist = Math.hypot(dx, dz);
    if (dist < 1.4) return true;
    const sp = 8 * dt, k = Math.min(1, sp / dist);
    const nx = r.g.position.x + dx * k, nz = r.g.position.z + dz * k;
    r.g.position.set(nx, terrain(nx, nz) + 0.1, nz);
    r.heading = dampAngle(r.heading, Math.atan2(dx, dz), 6, dt); r.g.rotation.y = r.heading;
    return false;
  }

  function update(dt) {
    // fields ripen; ripe fields post a harvest job once
    fields.forEach((f, i) => {
      if (!f.active) {
        f.ripe += dt / f.period;
        f.mat.emissiveIntensity = 0.2 + f.ripe * 0.9;
        f.mat.color.setHSL(lerp(0.28, 0.13, Math.min(1, f.ripe)), 0.7, 0.55); // green → gold
        if (f.ripe >= 1) {
          f.active = true;
          director.post({
            type: 'harvest', from: new Vector3(f.x, f.by, f.z), to: siloPos.clone(),
            storeId: SILO.id, amount: 14, field: i, priority: 1, col: '#bfe87a' // no label: stays quiet on the ticker
          });
        }
      }
    });

    // rover behaviour
    rovers.forEach(r => {
      switch (r.state) {
        case 'idle': {
          const job = director.claim(j => j.type === 'harvest');
          if (job) { r.job = job; r.state = 'toField'; }
          else { driveTo(r, depot.x, depot.z, dt); }
          break;
        }
        case 'toField':
          if (driveTo(r, r.job.from.x, r.job.from.z, dt)) { r.state = 'loading'; r.wait = 1.4; }
          break;
        case 'loading':
          r.wait -= dt; if (r.wait <= 0) { r.g.userData.crate.visible = true; r.state = 'toSilo'; }
          break;
        case 'toSilo':
          if (driveTo(r, r.job.to.x, r.job.to.z, dt)) { r.state = 'unloading'; r.wait = 1.2; }
          break;
        case 'unloading':
          r.wait -= dt;
          if (r.wait <= 0) {
            director.deposit(r.job.storeId, r.job.amount);
            if (fields[r.job.field]) { fields[r.job.field].ripe = 0; fields[r.job.field].active = false; }
            director.complete(r.job); r.job = null;
            r.g.userData.crate.visible = false; r.state = 'returning';
          }
          break;
        case 'returning':
          if (driveTo(r, depot.x, depot.z, dt)) r.state = 'idle';
          break;
      }
    });

    // the campus eats: slow steady consumption draws the silo down
    director.deposit(SILO.id, -dt * 1.6);
    if (siloFill) {
      const lvl = Math.max(0.02, director.storeLevel(SILO.id));
      siloFill.scale.y = lvl * 7.4; siloFill.position.y = siloPos.y + lvl * 3.7;
    }
  }

  return { group, update, glow };
}
