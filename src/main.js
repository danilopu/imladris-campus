import { Vector3 } from 'three';
import { createScene } from './core/scene.js';
import { createLights, createSky } from './core/lights.js';
import { createPostFX } from './core/postfx.js';
import { createControls } from './core/controls.js';
import { createLoop } from './core/loop.js';
import { createDayNight } from './core/daynight.js';
import { createExplore } from './core/explore.js';
import { createQuality } from './core/quality.js';
import { buildColliders, makeResolver } from './core/collision.js';
import { buildIsland } from './world/terrain.js';
import { buildWater } from './world/water.js';
import { buildVegetation } from './world/vegetation.js';
import { buildBuildings, livePos } from './world/buildings.js';
import { buildFarms } from './world/farms.js';
import { buildTransport } from './world/transport.js';
import { buildSectors } from './world/sectors.js';
import { buildZoneOverlay } from './world/zones.js';
import { buildNetwork } from './systems/network.js';
import { buildAgents } from './systems/agents.js';
import { buildFauna } from './systems/fauna.js';
import { createDirector } from './systems/director.js';
import { buildLogistics } from './systems/logistics.js';
import { buildDispatcher } from './systems/dispatcher.js';
import { buildAnnotations } from './systems/annotations.js';
import { buildFire } from './systems/fire.js';
import { buildEvents } from './systems/events.js';
import { buildUI } from './ui/ui.js';
import { buildHotspots } from './ui/hotspots.js';
import { buildPaper } from './ui/paper.js';

function boot() {
  const { scene, camera, renderer } = createScene();
  const lights = createLights(scene);
  const sky = createSky(scene);
  const postfx = createPostFX(renderer, scene, camera);
  const controls = createControls(camera, renderer.domElement);
  const loop = createLoop(() => postfx.render());

  // --- world ---
  const island = buildIsland();
  scene.add(island.group);
  const { terrain, riverCurves, pondC } = island;

  const water = buildWater(riverCurves, pondC);
  scene.add(water.group); loop.add(water);

  scene.add(buildVegetation().group);

  const buildings = buildBuildings();
  scene.add(buildings.group); loop.add(buildings);

  const farms = buildFarms();
  scene.add(farms.group); loop.add(farms);

  const transport = buildTransport();
  scene.add(transport.group); loop.add(transport);

  const { group: sectorGroup, sectors } = buildSectors(controls);
  scene.add(sectorGroup);

  // spatial addressing: a toggleable planning grid over the terrain (named zones + cells)
  const zoneOverlay = buildZoneOverlay();
  scene.add(zoneOverlay.group);
  const planCtl = { toggle() { zoneOverlay.setVisible(!zoneOverlay.visible); return zoneOverlay.visible; } };

  // --- systems ---
  const agents = buildAgents();
  scene.add(agents.group); loop.add(agents);

  const fauna = buildFauna(pondC);
  scene.add(fauna.group); loop.add(fauna);

  // Director: the job bus / master-loop spine. Logistics is the first content on it.
  let pushTicker = () => {};                                   // wired to the UI ticker once it exists
  const director = createDirector({ onLog: (t, c) => pushTicker(t, c) });
  const logistics = buildLogistics(director);
  scene.add(logistics.group); loop.add(logistics);

  const ground = (x, z) => terrain(x, z);
  const network = buildNetwork({
    brain: new Vector3(23, ground(23, -23) + 4, -23),
    sensors: [[-56, -16], [-40, -30], [10, -38], [-30, 30], [40, -2]].map(([x, z]) => new Vector3(x, ground(x, z) + 2.5, z)),
    sources: [new Vector3(-50, ground(-50, 4) + 3, 4), new Vector3(20, ground(20, 68) + 16, 68)],
    reservoir: new Vector3(-8, ground(-8, 60) + 2, 60)
  });
  scene.add(network.group); loop.add(network);

  // Dispatcher: every job posted to the Director → a sense-pulse to the brain + its
  // muscle effect. This is what makes the whole campus read as one master loop.
  buildDispatcher({
    director, network,
    effects: {
      irrigate: () => farms.irrigate(),
      recon: (j) => agents.recon(j.to || j.from),
      energy: () => network.surge('source', 8),
      compute: () => network.surge('cmd', 5),
      hive: () => farms.alertHive()
    }
  });

  // day/night drives every emissive (windows, lanterns, grow-lights) + firefly/butterfly fade
  const glow = [...buildings.glow, ...farms.glow, ...transport.glow, ...logistics.glow];
  const daynight = createDayNight({
    lights, skyUniforms: sky.uniforms, scene, glow,
    onPhase: (star) => { fauna.setNight(star); buildings.setDayPhase(1 - star); } // 1-star = day fraction
  });
  loop.add(daynight);

  // narrative hotspots: glowing markers → info cards + camera fly-to
  const hotspots = buildHotspots({ camera, dom: renderer.domElement, controls });
  scene.add(hotspots.group); loop.add(hotspots);

  // third-person walk-around mode (CC0 character + collision against buildings)
  const colliders = buildColliders([buildings.group, farms.group, logistics.group]);
  const explore = createExplore({ dom: renderer.domElement, start: [livePos.x, livePos.z], resolve: makeResolver(colliders) });
  scene.add(explore.group); loop.add(explore);
  postfx.setCamera(camera); // start in diorama (ortho)
  const exploreCtl = {
    toggle() {
      if (explore.active) { explore.exit(); postfx.setCamera(camera); controls.setAuto(true); hotspots.setEnabled(true); }
      else { explore.enter(); postfx.setCamera(explore.camera); controls.setAuto(false); hotspots.setEnabled(false); }
      return explore.active;
    }
  };

  // annotations: in Explore, press M to drop a pin where the avatar stands + comment.
  const annotations = buildAnnotations({ getMarkPose: () => (explore.active ? explore.position : null) });
  scene.add(annotations.group);

  // fire needs the ticker, which the UI owns — build UI first with a fire placeholder
  let fireRef = { trigger() {}, get active() { return false; } };
  const quality = createQuality({ renderer, postfx, key: lights.key });
  const paper = buildPaper();
  const ui = buildUI({ controls, sectors, fire: { trigger: () => fireRef.trigger() }, night: daynight, systems: hotspots, explore: exploreCtl, quality, plan: planCtl, notes: annotations, paper });
  pushTicker = ui.setTicker; // Director job labels now flow to the ticker

  const fire = buildFire(agents, ui.setTicker, network);
  fireRef = fire;
  scene.add(fire.group); loop.add(fire);

  // the whole campus on one bus: routine ops post jobs the Dispatcher turns into
  // sense → act, and the Director drives the ticker. (Fire stays its own tight loop,
  // already sense→act: heat → network alert → drone dispatch → contain.)
  const events = buildEvents(director.post, () => fire.active);
  loop.add(events);

  loop.add(controls);
  loop.start();

  setTimeout(() => document.getElementById('loader')?.classList.add('gone'), 500);
  setTimeout(() => fire.trigger(), 16000); // auto-demo the wildfire once
  // warm the Explore character in the background so it's ready (no visible swap) on entry
  const warm = () => explore.preload();
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 4000 }); else setTimeout(warm, 2500);
}

try { boot(); }
catch (e) {
  console.error('Boot error:', e);
  const l = document.getElementById('loader');
  if (l) l.querySelector('p').textContent = 'Boot error (see console)';
}
