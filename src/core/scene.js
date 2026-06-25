import {
  Scene, WebGLRenderer, OrthographicCamera, PCFSoftShadowMap,
  ACESFilmicToneMapping, Fog, Color, PMREMGenerator
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CAMERA, POSTFX } from '../config.js';

export function createScene() {
  const app = document.getElementById('app');

  const scene = new Scene();
  // A very light cloud-toned haze that only bites far past the island's rim — the campus
  // itself reads crisp, with just a hint of atmosphere on the distant sky/clouds. (Pushed
  // back from the old 600/1280 to de-emphasise the "fogged-in" feel.)
  scene.fog = new Fog(new Color(0xb3c0d2), 1100, 2900);

  let aspect = innerWidth / innerHeight;
  const F = CAMERA.frustum;
  const camera = new OrthographicCamera(-F * aspect, F * aspect, F, -F, 0.1, 3000);
  camera.zoom = CAMERA.zoom;
  camera.updateProjectionMatrix();

  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = POSTFX.exposure;
  app.appendChild(renderer.domElement);

  // Soft image-based ambient (no asset file): a neutral room env gives every standard
  // material gentle reflectance + spec, which kills the flat-plastic look — kept subtle so
  // the scene stays stylized rather than glossy/photoreal. Materials dial it via
  // envMapIntensity (set after the world builds in main.js).
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  function onResize() {
    aspect = innerWidth / innerHeight;
    camera.left = -F * aspect; camera.right = F * aspect;
    camera.top = F; camera.bottom = -F;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }
  addEventListener('resize', onResize);

  return { app, scene, camera, renderer, onResize };
}
