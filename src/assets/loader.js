import { registerGlow } from '../core/glowRegistry.js';

// This is the bridge to diorama-grade richness: drop real .glb models into
// /public/models and reference them here. Until a model exists, callers fall
// back to procedural geometry, so the scene always renders.
//
// GLTFLoader + DRACOLoader (~90 kB) are dynamically imported on first model load, so
// they never weigh down the initial bundle — the scene boots without them.

let loaderPromise = null;
function getLoader() {
  if (!loaderPromise) loaderPromise = (async () => {
    const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/loaders/DRACOLoader.js')
    ]);
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/'); // or self-host
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    return loader;
  })();
  return loaderPromise;
}

const cache = new Map();

export function loadModel(url) {
  if (cache.has(url)) return cache.get(url);
  const p = getLoader().then(loader => new Promise((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
  }));
  cache.set(url, p);
  return p;
}

// loadGltf(url): the full glTF (scene + animations), for rigged/animated models.
export function loadGltf(url) {
  const k = url + '#full';
  if (cache.has(k)) return cache.get(k);
  const p = getLoader().then(loader => new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject)));
  cache.set(k, p);
  return p;
}

// place(url, fallbackFactory, transform) -> Object3D you can add immediately.
// Swaps in the GLB once it loads; shows fallback meanwhile. Pass onLoad(model) to
// react to a real model arriving (e.g. register its emissive materials with day/night).
export function place(url, fallbackFactory, { position = [0, 0, 0], rotationY = 0, scale = 1, onLoad } = {}) {
  const holder = fallbackFactory();
  holder.position.set(position[0], position[1], position[2]);
  holder.rotation.y = rotationY;
  holder.scale.setScalar(scale);
  if (url) {
    loadModel(url).then((model) => {
      model.traverse(o => {
        if (!o.isMesh) return;
        o.castShadow = true; o.receiveShadow = true;
        // auto-register emissive materials so the model blooms + tracks day/night
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => { if (m && m.emissive && (m.emissive.r || m.emissive.g || m.emissive.b)) registerGlow(m); });
      });
      holder.clear();
      holder.add(model);
      if (onLoad) onLoad(model);
    }).catch(() => { /* keep fallback */ });
  }
  return holder;
}
