import {
  Scene, WebGLRenderer, OrthographicCamera, PCFSoftShadowMap,
  ACESFilmicToneMapping, Fog, Color
} from 'three';
import { CAMERA, POSTFX } from '../config.js';

export function createScene() {
  const app = document.getElementById('app');

  const scene = new Scene();
  // The ortho camera sits ~600 units back, so the whole island falls inside a near fog
  // and washes out. Push fog well past the island so it reads crisp, with only a faint
  // atmospheric falloff at the far rim. (Diorama look comes from postfx, not haze.)
  scene.fog = new Fog(new Color(0x6f7693), 720, 1400);

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
