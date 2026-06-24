import {
  HemisphereLight, DirectionalLight, Mesh, SphereGeometry, ShaderMaterial,
  BackSide, Color
} from 'three';

export function createLights(scene) {
  const hemiLight = new HemisphereLight(0xcfe2ff, 0x6e5f47, 0.62); // cool sky, warm earth bounce
  scene.add(hemiLight);

  // soft underglow so the floating island's underside catches light instead of going black
  const under = new DirectionalLight(0x9a8868, 0.32);
  under.position.set(12, -90, 28);
  scene.add(under, under.target);

  const key = new DirectionalLight(0xffe6bc, 1.3); // warm golden-hour key
  key.position.set(-70, 95, 55);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 4;
  key.shadow.bias = -0.0006;
  const k = key.shadow.camera;
  k.left = -130; k.right = 130; k.top = 130; k.bottom = -130; k.near = 20; k.far = 420;
  scene.add(key, key.target);

  const fill = new DirectionalLight(0x88a0c8, 0.4);
  fill.position.set(80, 40, 40);
  scene.add(fill);

  const rim = new DirectionalLight(0xffd9a0, 0.35);
  rim.position.set(30, 30, -90);
  scene.add(rim);

  return { hemi: hemiLight, key, fill, rim };
}

export function createSky(scene) {
  const uniforms = {
    top: { value: new Color(0x3c4158) },
    horizon: { value: new Color(0x717693) }
  };
  const sky = new Mesh(
    new SphereGeometry(1400, 24, 14),
    new ShaderMaterial({
      side: BackSide, depthWrite: false, uniforms,
      vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 horizon;
        void main(){ float h=normalize(vP).y; float t=smoothstep(-0.35,0.65,h); gl_FragColor=vec4(mix(horizon,top,t),1.0); }`
    })
  );
  scene.add(sky);
  return { sky, uniforms };
}
