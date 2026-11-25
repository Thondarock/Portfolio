// ============================================================
//  The 3D world: one continuous scene the camera flies through
//  as the visitor scrolls. Each page section has a "stop":
//   0 Hero ........ Aegis core (noise-displaced shield orb)
//   1 About ....... Threat graph (nodes, edges, travelling pulses)
//   2 Experience .. Hex tunnel (fly-through)
//   3 Work ........ Data terrain (animated point field)
//   4 Lab ......... Floating polyhedra shards
//   5 Skills ...... Particle sphere
//   6 Credentials . Gyroscope rings
//   7 Contact ..... Portal vortex
// ============================================================
import * as THREE from 'three';

const C = {
  bg: new THREE.Color('#05070d'),
  cyan: new THREE.Color('#3cf0d2'),
  blue: new THREE.Color('#7aa8ff'),
  violet: new THREE.Color('#8b5cff'),
  amber: new THREE.Color('#ffb547'),
  red: new THREE.Color('#ff4d6d'),
};

// Ashima / Stefan Gustavson 3D simplex noise (MIT)
const SNOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

function glowTexture() {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.18, 'rgba(255,255,255,.85)');
  grd.addColorStop(0.45, 'rgba(255,255,255,.18)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const rand = (a, b) => a + Math.random() * (b - a);

export function createWorld(canvas, { reduceMotion = false } = {}) {
  const isMobile = window.matchMedia('(max-width: 900px)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(C.bg, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(C.bg, 0.032);
  const camera = new THREE.PerspectiveCamera(isMobile ? 62 : 50, window.innerWidth / window.innerHeight, 0.1, 220);

  const GLOW = glowTexture();
  const uTime = { value: 0 };
  const updaters = [];
  const Q = isMobile ? 0.5 : 1; // quality multiplier

  const additive = (opts) => ({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, ...opts });

  // -------------------------------------------------- shared core material
  const coreMat = new THREE.ShaderMaterial({
    uniforms: { uTime, uAmp: { value: 0.28 }, uC1: { value: C.cyan }, uC2: { value: C.violet } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uAmp;
      varying vec3 vN; varying vec3 vV; varying float vNoise;
      ${SNOISE}
      void main(){
        float n = snoise(position * 0.9 + vec3(uTime * 0.25));
        float n2 = snoise(position * 2.4 - vec3(uTime * 0.4)) * 0.35;
        vNoise = n + n2;
        vec3 p = position + normal * (n + n2) * uAmp;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uC1; uniform vec3 uC2;
      varying vec3 vN; varying vec3 vV; varying float vNoise;
      void main(){
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
        vec3 base = mix(vec3(0.02,0.03,0.07), uC2 * 0.55, smoothstep(-0.6, 0.9, vNoise));
        vec3 col = base + mix(uC2, uC1, f) * f * 1.6;
        col += uC1 * smoothstep(0.55, 0.9, vNoise) * 0.35;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });

  function makeCore(radius, detail) {
    const g = new THREE.Group();
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, detail), coreMat);
    g.add(orb);
    const shell = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(radius * 1.45, 1)),
      new THREE.LineBasicMaterial(additive({ color: C.cyan, opacity: 0.22 }))
    );
    g.add(shell);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial(additive({ map: GLOW, color: C.violet, opacity: 0.55 })));
    halo.scale.setScalar(radius * 6.5);
    g.add(halo);
    const rings = [];
    [[radius * 1.9, 1.1, 0.3, C.cyan], [radius * 2.3, -0.5, 0.9, C.violet], [radius * 2.7, 0.2, -0.6, C.blue]].forEach(([r, rx, ry, col], i) => {
      const ringG = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006 + i * 0.002, 6, 220), new THREE.MeshBasicMaterial(additive({ color: col, opacity: 0.55 })));
      ringG.add(ring);
      // satellites riding the ring
      for (let k = 0; k < 2; k++) {
        const sat = new THREE.Sprite(new THREE.SpriteMaterial(additive({ map: GLOW, color: col })));
        sat.scale.setScalar(0.32);
        sat.userData = { r, a: Math.random() * Math.PI * 2, s: rand(0.25, 0.6) * (k ? -1 : 1) };
        ringG.add(sat);
      }
      ringG.rotation.set(rx, ry, 0);
      g.add(ringG);
      rings.push(ringG);
    });
    updaters.push((t, dt) => {
      orb.rotation.y += dt * 0.08;
      shell.rotation.y -= dt * 0.12;
      shell.rotation.x += dt * 0.05;
      rings.forEach((rg, i) => {
        rg.rotation.z += dt * (0.1 + i * 0.05) * (i % 2 ? -1 : 1);
        rg.children.forEach((c) => {
          if (c.isSprite) {
            c.userData.a += dt * c.userData.s;
            c.position.set(Math.cos(c.userData.a) * c.userData.r, Math.sin(c.userData.a) * c.userData.r, 0);
          }
        });
      });
      halo.material.opacity = 0.45 + Math.sin(t * 1.3) * 0.1;
    });
    return g;
  }

  // -------------------------------------------------- 0 · HERO core
  const heroCore = makeCore(1.55, isMobile ? 24 : 48);
  scene.add(heroCore);
  const placeHero = () => {
    const narrow = window.innerWidth <= 900;
    heroCore.position.set(narrow ? 0 : 3.1, narrow ? 1.9 : 0.1, -1.5);
    heroCore.scale.setScalar(narrow ? 0.85 : 1);
  };
  placeHero();

  // -------------------------------------------------- global data dust
  {
    const N = Math.floor(5000 * Q);
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = rand(-28, 28);
      pos[i * 3 + 1] = rand(-16, 16);
      pos[i * 3 + 2] = rand(-225, 12);
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      ...additive({}),
      uniforms: { uTime, uPR: { value: renderer.getPixelRatio() }, uMap: { value: GLOW } },
      vertexShader: /* glsl */ `
        uniform float uTime; uniform float uPR; attribute float aSeed; varying float vA; varying float vS;
        void main(){
          vec3 p = position;
          p.y += sin(uTime * 0.2 + aSeed * 40.0) * 0.4;
          p.x += cos(uTime * 0.15 + aSeed * 30.0) * 0.3;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float tw = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed * 2.0) + aSeed * 100.0);
          vA = tw * smoothstep(60.0, 4.0, -mv.z) * smoothstep(0.3, 2.5, -mv.z);
          vS = aSeed;
          gl_PointSize = (aSeed > 0.97 ? 9.0 : 4.0) * uPR * (10.0 / -mv.z);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; varying float vA; varying float vS;
        void main(){
          vec4 t = texture2D(uMap, gl_PointCoord);
          vec3 c = vS < 0.5 ? vec3(0.24,0.94,0.82) : (vS < 0.8 ? vec3(0.48,0.66,1.0) : vec3(0.55,0.36,1.0));
          gl_FragColor = vec4(c, t.a * vA * 0.9);
        }`,
    });
    scene.add(new THREE.Points(g, m));
  }

  // -------------------------------------------------- 1 · ABOUT threat graph
  {
    const group = new THREE.Group();
    group.position.set(isMobile ? 0 : 2.5, 0, -36);
    scene.add(group);
    const N = Math.floor(90 * (isMobile ? 0.7 : 1));
    const nodes = [];
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(Math.cbrt(Math.random()) * 7);
      v.y *= 0.65;
      nodes.push(v);
    }
    const edges = [];
    nodes.forEach((a, i) => {
      const near = nodes.map((b, j) => [a.distanceToSquared(b), j]).filter(([, j]) => j !== i).sort((x, y) => x[0] - y[0]).slice(0, 3);
      near.forEach(([, j]) => { if (i < j || !edges.some(([p, q]) => p === j && q === i)) edges.push([i, j]); });
    });
    const lp = new Float32Array(edges.length * 6);
    edges.forEach(([a, b], k) => { nodes[a].toArray(lp, k * 6); nodes[b].toArray(lp, k * 6 + 3); });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    group.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial(additive({ color: C.blue, opacity: 0.22 }))));

    const np = new Float32Array(N * 3);
    nodes.forEach((v, i) => v.toArray(np, i * 3));
    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.BufferAttribute(np, 3));
    group.add(new THREE.Points(ng, new THREE.PointsMaterial(additive({ map: GLOW, color: C.cyan, size: 0.42, sizeAttenuation: true }))));

    // threat nodes (blinking red)
    const threats = [];
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial(additive({ map: GLOW, color: C.red })));
      s.position.copy(nodes[Math.floor(Math.random() * N)]);
      s.scale.setScalar(1.1);
      s.userData.o = Math.random() * 6;
      group.add(s);
      threats.push(s);
    }
    // pulses travelling along edges
    const P = Math.floor(70 * Q) + 10;
    const pp = new Float32Array(P * 3);
    const pulses = Array.from({ length: P }, () => ({ e: Math.floor(Math.random() * edges.length), t: Math.random(), s: rand(0.3, 0.9) }));
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    group.add(new THREE.Points(pg, new THREE.PointsMaterial(additive({ map: GLOW, color: C.amber, size: 0.3 }))));
    const tmp = new THREE.Vector3();
    updaters.push((t, dt) => {
      group.rotation.y += dt * 0.05;
      pulses.forEach((p, i) => {
        p.t += dt * p.s;
        if (p.t > 1) { p.t = 0; p.e = Math.floor(Math.random() * edges.length); }
        const [a, b] = edges[p.e];
        tmp.lerpVectors(nodes[a], nodes[b], p.t).toArray(pp, i * 3);
      });
      pg.attributes.position.needsUpdate = true;
      threats.forEach((s) => { s.material.opacity = 0.35 + 0.65 * Math.max(0, Math.sin(t * 2.2 + s.userData.o)); });
    });
  }

  // -------------------------------------------------- 2 · EXPERIENCE hex tunnel
  {
    const group = new THREE.Group();
    scene.add(group);
    const R = 5.2, COUNT = 34, Z0 = -46, GAP = 1.15;
    const hex = [];
    for (let k = 0; k <= 6; k++) { const a = (k / 6) * Math.PI * 2 + Math.PI / 6; hex.push(new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0)); }
    const hexGeo = new THREE.BufferGeometry().setFromPoints(hex);
    const rings = [];
    for (let i = 0; i < COUNT; i++) {
      const m = new THREE.LineBasicMaterial(additive({ color: i % 4 === 0 ? C.violet : C.cyan, opacity: 0.0 }));
      const l = new THREE.Line(hexGeo, m);
      l.position.z = Z0 - i * GAP;
      l.rotation.z = i * 0.045;
      l.userData.i = i;
      group.add(l);
      rings.push(l);
    }
    // longitudinal rails
    const rails = new Float32Array(6 * 6);
    for (let k = 0; k < 6; k++) {
      hex[k].toArray(rails, k * 6); rails[k * 6 + 2] = Z0;
      hex[k].toArray(rails, k * 6 + 3); rails[k * 6 + 5] = Z0 - COUNT * GAP;
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(rails, 3));
    group.add(new THREE.LineSegments(rg, new THREE.LineBasicMaterial(additive({ color: C.blue, opacity: 0.12 }))));
    updaters.push((t) => {
      rings.forEach((l) => {
        const i = l.userData.i;
        const wave = 0.5 + 0.5 * Math.sin(t * 2.0 - i * 0.35);
        l.material.opacity = 0.1 + wave * 0.5;
        l.scale.setScalar(1 + wave * 0.04);
      });
      group.rotation.z = Math.sin(t * 0.2) * 0.1;
    });
  }

  // -------------------------------------------------- 3 · WORK data terrain
  {
    const W = 90, D = 70;
    const geo = new THREE.PlaneGeometry(W, D, Math.floor(150 * Q), Math.floor(115 * Q));
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      ...additive({}),
      uniforms: { uTime, uPR: { value: renderer.getPixelRatio() }, uMap: { value: GLOW }, uC1: { value: C.cyan }, uC2: { value: C.violet } },
      vertexShader: /* glsl */ `
        uniform float uTime; uniform float uPR; varying float vH; varying float vF;
        ${SNOISE}
        void main(){
          vec3 p = position;
          float h = snoise(vec3(p.x * 0.07, p.z * 0.07, uTime * 0.08)) * 2.6 + snoise(vec3(p.x * 0.2, p.z * 0.2, uTime * 0.15)) * 0.6;
          p.y += h;
          vH = h;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vF = smoothstep(55.0, 6.0, -mv.z);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = 3.2 * uPR * (12.0 / -mv.z);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; uniform vec3 uC1; uniform vec3 uC2; varying float vH; varying float vF;
        void main(){
          float a = texture2D(uMap, gl_PointCoord).a;
          vec3 c = mix(uC2, uC1, smoothstep(-1.5, 2.2, vH));
          gl_FragColor = vec4(c, a * vF * (0.35 + smoothstep(-2.0, 2.5, vH) * 0.65));
        }`,
    });
    const terrain = new THREE.Points(geo, mat);
    terrain.position.set(0, -6.5, -104);
    scene.add(terrain);
  }

  // -------------------------------------------------- 4 · LAB floating shards
  {
    const group = new THREE.Group();
    scene.add(group);
    const geos = [new THREE.OctahedronGeometry(1, 0), new THREE.IcosahedronGeometry(1, 0), new THREE.TetrahedronGeometry(1, 0), new THREE.BoxGeometry(1.3, 1.3, 1.3)];
    const edgesG = geos.map((g) => new THREE.EdgesGeometry(g));
    const shards = [];
    const count = isMobile ? 18 : 30;
    for (let i = 0; i < count; i++) {
      const k = i % geos.length;
      const col = [C.cyan, C.violet, C.blue, C.amber][i % 4];
      const s = new THREE.Group();
      s.add(new THREE.LineSegments(edgesG[k], new THREE.LineBasicMaterial(additive({ color: col, opacity: 0.7 }))));
      s.add(new THREE.Mesh(geos[k], new THREE.MeshBasicMaterial(additive({ color: col, opacity: 0.06 }))));
      const side = i % 2 ? 1 : -1;
      s.position.set(side * rand(3.5, 11), rand(-5, 5), rand(-112, -140));
      s.scale.setScalar(rand(0.35, 1.3));
      s.userData = { rx: rand(-0.6, 0.6), ry: rand(-0.6, 0.6), y: s.position.y, o: Math.random() * 6 };
      group.add(s);
      shards.push(s);
    }
    updaters.push((t, dt) => {
      shards.forEach((s) => {
        s.rotation.x += dt * s.userData.rx;
        s.rotation.y += dt * s.userData.ry;
        s.position.y = s.userData.y + Math.sin(t * 0.6 + s.userData.o) * 0.5;
      });
    });
  }

  // -------------------------------------------------- 5 · SKILLS particle sphere
  {
    const group = new THREE.Group();
    group.position.set(0, 0, -152);
    scene.add(group);
    const N = Math.floor(2200 * Q);
    const pos = new Float32Array(N * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      pos.set([Math.cos(th) * r * 6.5, y * 6.5, Math.sin(th) * r * 6.5], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial(additive({ map: GLOW, color: C.cyan, size: 0.16, opacity: 0.85 })));
    group.add(pts);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(7.6 + i * 0.7, 0.008, 6, 200), new THREE.MeshBasicMaterial(additive({ color: i === 1 ? C.violet : C.blue, opacity: 0.4 })));
      ring.rotation.set(Math.PI / 2 + i * 0.35, i * 0.5, 0);
      group.add(ring);
    }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial(additive({ map: GLOW, color: C.violet, opacity: 0.35 })));
    halo.scale.setScalar(16);
    group.add(halo);
    updaters.push((t, dt) => { pts.rotation.y += dt * 0.12; pts.rotation.x = Math.sin(t * 0.2) * 0.2; group.children.forEach((c, i) => { if (c.isMesh) c.rotation.z += dt * 0.1 * (i % 2 ? 1 : -1); }); });
  }

  // -------------------------------------------------- 6 · CREDENTIALS gyroscope
  {
    const group = new THREE.Group();
    group.position.set(isMobile ? 0 : -4, 0, -176);
    scene.add(group);
    const rings = [];
    [4.2, 3.4, 2.6, 1.8].forEach((r, i) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.03 + i * 0.01, 8, 160), new THREE.MeshBasicMaterial(additive({ color: [C.cyan, C.violet, C.blue, C.amber][i], opacity: 0.65 })));
      group.add(m);
      rings.push(m);
    });
    const center = new THREE.Sprite(new THREE.SpriteMaterial(additive({ map: GLOW, color: C.cyan, opacity: 0.9 })));
    center.scale.setScalar(2.4);
    group.add(center);
    updaters.push((t, dt) => {
      rings.forEach((m, i) => { m.rotation.x += dt * (0.3 + i * 0.12); m.rotation.y += dt * (0.2 + i * 0.1) * (i % 2 ? -1 : 1); });
      center.scale.setScalar(2.2 + Math.sin(t * 2) * 0.3);
    });
  }

  // -------------------------------------------------- 7 · CONTACT portal
  {
    const group = new THREE.Group();
    group.position.set(0, 0, -202);
    scene.add(group);
    const core = makeCore(1.1, isMobile ? 16 : 32);
    group.add(core);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.05, 12, 240), new THREE.MeshBasicMaterial(additive({ color: C.cyan, opacity: 0.85 })));
    group.add(torus);
    const N = Math.floor(3500 * Q);
    const pos = new Float32Array(N * 3);
    const rad = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const r = 1.8 + Math.pow(Math.random(), 0.7) * 9;
      const a = Math.random() * Math.PI * 2;
      pos.set([Math.cos(a) * r, Math.sin(a) * r, rand(-0.6, 0.6) * (r * 0.15)], i * 3);
      rad[i] = r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aR', new THREE.BufferAttribute(rad, 1));
    const m = new THREE.ShaderMaterial({
      ...additive({}),
      uniforms: { uTime, uPR: { value: renderer.getPixelRatio() }, uMap: { value: GLOW } },
      vertexShader: /* glsl */ `
        uniform float uTime; uniform float uPR; attribute float aR; varying float vR;
        void main(){
          float ang = uTime * (1.6 / aR);
          float c = cos(ang), s = sin(ang);
          vec3 p = vec3(position.x * c - position.y * s, position.x * s + position.y * c, position.z);
          vR = aR;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = 3.5 * uPR * (12.0 / -mv.z);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; varying float vR;
        void main(){
          float a = texture2D(uMap, gl_PointCoord).a;
          vec3 c = mix(vec3(0.24,0.94,0.82), vec3(0.55,0.36,1.0), smoothstep(2.0, 9.0, vR));
          gl_FragColor = vec4(c, a * smoothstep(11.0, 3.0, vR) * 0.85);
        }`,
    });
    group.add(new THREE.Points(g, m));
    updaters.push((t) => { torus.rotation.x = Math.sin(t * 0.3) * 0.25; torus.rotation.y = Math.cos(t * 0.25) * 0.25; });
  }

  // -------------------------------------------------- camera rail
  const narrow = () => window.innerWidth <= 900;
  const camKeys = () => [
    { p: [0, 0, 8], l: [0, 0, -2] },
    { p: [0, 0.8, -24], l: [narrow() ? 0 : 2.5, 0, -36] },
    { p: [0, 0, -50], l: [0, 0, -70] },
    { p: [0, 2.2, -86], l: [0, -3, -104] },
    { p: [0, 0.6, -110], l: [0, 0, -130] },
    { p: [0, 0, -137], l: [0, 0, -152] },
    { p: [narrow() ? 0 : -1, 0.4, -162], l: [narrow() ? 0 : -4, 0, -176] },
    { p: [0, 0, -188], l: [0, -2.4, -202] },
  ];
  let posCurve, lookCurve;
  const buildCurves = () => {
    const k = camKeys();
    posCurve = new THREE.CatmullRomCurve3(k.map((x) => new THREE.Vector3(...x.p)), false, 'catmullrom', 0.3);
    lookCurve = new THREE.CatmullRomCurve3(k.map((x) => new THREE.Vector3(...x.l)), false, 'catmullrom', 0.3);
  };
  buildCurves();
  const STOPS = camKeys().length - 1;

  const state = { target: 0, current: 0, mx: 0, my: 0, cmx: 0, cmy: 0, intro: 0 };
  const vPos = new THREE.Vector3();
  const vLook = new THREE.Vector3();

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w <= 900 ? 62 : 50;
    camera.updateProjectionMatrix();
    placeHero();
    buildCurves();
  }
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) clock.getDelta(); });

  function frame() {
    requestAnimationFrame(frame);
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const speed = reduceMotion ? 0.15 : 1;
    uTime.value += dt * speed;
    const t = uTime.value;

    state.current += (state.target - state.current) * Math.min(1, dt * 3.2);
    state.cmx += (state.mx - state.cmx) * Math.min(1, dt * 2.5);
    state.cmy += (state.my - state.cmy) * Math.min(1, dt * 2.5);

    const u = THREE.MathUtils.clamp(state.current / STOPS, 0, 1);
    posCurve.getPoint(u, vPos);
    lookCurve.getPoint(u, vLook);
    const introOff = (1 - state.intro) * 16;
    camera.position.set(vPos.x + state.cmx * 0.7, vPos.y - state.cmy * 0.45 + (1 - state.intro) * 2, vPos.z + introOff);
    vLook.x += state.cmx * 0.25;
    vLook.y -= state.cmy * 0.15;
    camera.lookAt(vLook);
    camera.rotateZ((1 - state.intro) * 0.25 + state.cmx * -0.02);

    if (!reduceMotion || t < 0.1) updaters.forEach((fn) => fn(t, dt * speed));
    renderer.render(scene, camera);
  }
  frame();

  return {
    stops: STOPS,
    setProgress(p) { state.target = p; },
    jump(p) { state.target = state.current = p; },
    setMouse(x, y) { state.mx = x; state.my = y; },
    intro: state,
  };
}
