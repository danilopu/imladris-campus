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

// Tilt-shift — the miniature/diorama signature: a sharp horizontal focus band, blurred
// toward the top and bottom of the frame. One pass, ~9 taps weighted by focus distance.
const TiltShiftShader = {
  uniforms: { tDiffuse: { value: null }, resolution: { value: new Vector2() }, focus: { value: 0.5 }, range: { value: 0.085 }, strength: { value: 3.8 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 resolution; uniform float focus; uniform float range; uniform float strength; varying vec2 vUv;
    void main(){
      float d = max(abs(vUv.y - focus) - range, 0.0);
      vec2 o = (clamp(d / range, 0.0, 1.0) * strength) / resolution;
      vec3 c = texture2D(tDiffuse, vUv).rgb * 0.36;
      c += texture2D(tDiffuse, vUv + vec2(o.x, 0.0)).rgb * 0.08;
      c += texture2D(tDiffuse, vUv - vec2(o.x, 0.0)).rgb * 0.08;
      c += texture2D(tDiffuse, vUv + vec2(0.0, o.y)).rgb * 0.08;
      c += texture2D(tDiffuse, vUv - vec2(0.0, o.y)).rgb * 0.08;
      c += texture2D(tDiffuse, vUv + o * 0.75).rgb * 0.08;
      c += texture2D(tDiffuse, vUv - o * 0.75).rgb * 0.08;
      c += texture2D(tDiffuse, vUv + vec2(o.x, -o.y) * 0.75).rgb * 0.08;
      c += texture2D(tDiffuse, vUv - vec2(o.x, -o.y) * 0.75).rgb * 0.08;
      gl_FragColor = vec4(c, 1.0);
    }`
};

// Cinematic colour grade in display space: contrast S-curve + saturation + warm tint.
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, contrast: { value: 1.08 }, saturation: { value: 1.14 }, tint: { value: [1.035, 1.0, 0.955] } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float contrast; uniform float saturation; uniform vec3 tint; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      c = (c - 0.5) * contrast + 0.5;                       // contrast around mid-grey
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));       // luma
      c = mix(vec3(l), c, saturation);                      // saturation
      c *= tint;                                            // warm tint
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`
};

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

  const tilt = new ShaderPass(TiltShiftShader); // miniature focus — High quality only
  tilt.uniforms.resolution.value.set(innerWidth, innerHeight);
  tilt.enabled = false;
  composer.addPass(tilt);

  const grade = new ShaderPass(GradeShader); // graded in display space, last
  grade.uniforms.contrast.value = POSTFX.grade.contrast;
  grade.uniforms.saturation.value = POSTFX.grade.saturation;
  grade.uniforms.tint.value = POSTFX.grade.tint;
  composer.addPass(grade);

  function onResize() {
    composer.setSize(innerWidth, innerHeight);
    bloom.setSize(innerWidth, innerHeight);
    gtao.setSize(innerWidth, innerHeight);
    tilt.uniforms.resolution.value.set(innerWidth, innerHeight);
  }
  addEventListener('resize', onResize);

  // GTAO is valid only for the ortho cam (its shader bakes PERSPECTIVE_CAMERA) and can be
  // turned off by the quality setting — it's enabled only when both allow it.
  let gtaoWanted = true, orthoActive = true;
  const applyGtao = () => { gtao.enabled = gtaoWanted && orthoActive; };

  // Swap the render camera (diorama ortho ↔ explore perspective). Bloom/SMAA/vignette
  // stay on in both modes.
  function setCamera(cam) { renderPass.camera = cam; orthoActive = !!cam.isOrthographicCamera; applyGtao(); tilt.enabled = tilt.enabled && orthoActive; }
  function setGtao(on) { gtaoWanted = on; applyGtao(); }
  function setTiltShift(on) { tilt.enabled = on && orthoActive; } // miniature look, diorama view only

  return { composer, bloom, gtao, setCamera, setGtao, setTiltShift, render: () => composer.render() };
}
