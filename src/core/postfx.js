import { Vector2 } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { POSTFX } from '../config.js';

// GTAOPass only excludes Points/Lines from its depth/normal G-buffer — Sprites slip
// through and get treated as solid occluders, so billboard labels/markers pick up a
// rectangular AO halo that shifts as you orbit (they look "non-transparent" from some
// angles). Exclude sprites too, matching the pass's own "meshes only" intent.
class DioramaGTAO extends GTAOPass {
  overrideVisibility() {
    const cache = this._visibilityCache;
    this.scene.traverse((o) => {
      cache.set(o, o.visible);
      if (o.isPoints || o.isLine || o.isSprite) o.visible = false;
    });
  }
}

// Subtle diorama vignette — multiplies the frame edge darker, no colour wash.
const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, radius: { value: 0.82 }, darkness: { value: 0.38 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float radius; uniform float darkness; varying vec2 vUv;
    void main(){
      vec4 texel = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5));
      float vig = smoothstep(radius, radius * 0.45, d);
      texel.rgb *= mix(1.0 - darkness, 1.0, vig);
      gl_FragColor = texel;
    }`
};

// The cinematic upgrade the single-file artifact could not do:
// contact-shadow AO (depth) + soft anti-aliasing + selective bloom + vignette + filmic output.
export function createPostFX(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // GTAO contact shadows — the big depth payoff for a diorama. Renders depth/normals
  // internally; handles the orthographic camera (sets PERSPECTIVE_CAMERA = 0).
  const A = POSTFX.ao;
  const gtao = new DioramaGTAO(scene, camera, innerWidth, innerHeight);
  gtao.blendIntensity = A.intensity;
  gtao.updateGtaoMaterial({ radius: A.radius, distanceExponent: A.distanceExponent, thickness: A.thickness, scale: A.scale, samples: A.samples, screenSpaceRadius: false });
  composer.addPass(gtao);

  const bloom = new UnrealBloomPass(
    new Vector2(innerWidth, innerHeight),
    POSTFX.bloom.strength, POSTFX.bloom.radius, POSTFX.bloom.threshold
  );
  composer.addPass(bloom);

  composer.addPass(new SMAAPass(innerWidth, innerHeight));

  const vignette = new ShaderPass(VignetteShader);
  vignette.uniforms.radius.value = POSTFX.vignette.radius;
  vignette.uniforms.darkness.value = POSTFX.vignette.darkness;
  composer.addPass(vignette);

  composer.addPass(new OutputPass()); // tone mapping + sRGB

  function onResize() {
    composer.setSize(innerWidth, innerHeight);
    bloom.setSize(innerWidth, innerHeight);
    gtao.setSize(innerWidth, innerHeight);
  }
  addEventListener('resize', onResize);

  // GTAO is valid only for the ortho cam (its shader bakes PERSPECTIVE_CAMERA) and can be
  // turned off by the quality setting — it's enabled only when both allow it.
  let gtaoWanted = true, orthoActive = true;
  const applyGtao = () => { gtao.enabled = gtaoWanted && orthoActive; };

  // Swap the render camera (diorama ortho ↔ explore perspective). Bloom/SMAA/vignette
  // stay on in both modes.
  function setCamera(cam) { renderPass.camera = cam; orthoActive = !!cam.isOrthographicCamera; applyGtao(); }
  function setGtao(on) { gtaoWanted = on; applyGtao(); }

  return { composer, bloom, gtao, setCamera, setGtao, render: () => composer.render() };
}
