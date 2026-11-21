import * as THREE from "https://unpkg.com/three@0.187.0/build/three.module.js";

const MAX_COLORS = 8;
const frag = `
#define MAX_COLORS ${MAX_COLORS}
uniform vec2 uCanvas;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uRot;
uniform int uColorCount;
uniform vec3 uColors[MAX_COLORS];
uniform int uTransparent;
uniform float uScale;
uniform float uFrequency;
uniform float uWarpStrength;
uniform vec2 uPointer;
uniform float uMouseInfluence;
uniform float uParallax;
uniform float uNoise;
uniform int uIterations;
uniform float uIntensity;
uniform float uBandWidth;
varying vec2 vUv;
void main() {
  float t = uTime * uSpeed;
  vec2 p = vUv * 2.0 - 1.0;
  p += uPointer * uParallax * 0.1;
  vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
  vec2 q = vec2(rp.x * (uCanvas.x / uCanvas.y), rp.y);
  q /= max(uScale, 0.0001);
  q /= 0.5 + 0.2 * dot(q, q);
  q += 0.2 * cos(t) - 7.56;
  vec2 shift = vec2(0.2 * cos(t) - 7.56);
  q += (uPointer - rp) * uMouseInfluence * 0.2;
  vec3 col = vec3(0.0);
  float a = 1.0;
  vec2 s = q;
  vec3 sumCol = vec3(0.0);
  float cover = 0.0;
  for (int i = 0; i < MAX_COLORS; ++i) {
    if (i >= uColorCount) break;
    s -= 0.01;
    vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
    float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);
    float kBelow = clamp(uWarpStrength, 0.0, 1.0);
    float kMix = pow(kBelow, 0.3);
    float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
    vec2 warped = s + (r - s) * kBelow * gain;
    float spare = 1.0 - kBelow * gain;
    if (spare != 0.0) warped -= shift * spare;
    float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);
    float m = mix(m0, m1, kMix);
    float w = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));
    sumCol += uColors[i] * w;
    cover = max(cover, w);
  }
  col = clamp(sumCol, 0.0, 1.0) * uIntensity;
  a = cover;
  gl_FragColor = vec4(col * a, a);
}
`;
const vert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }`;

const container = document.querySelector("#hero-bg");
if (container && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new THREE.PlaneGeometry(2, 2);
  const colors = [new THREE.Vector3(0, 0.467, 1)];
  const uColors = Array.from({ length: MAX_COLORS }, () => new THREE.Vector3());
  uColors[0].copy(colors[0]);
  const material = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: {
      uCanvas: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uSpeed: { value: 0.6 },
      uRot: { value: new THREE.Vector2(0, 1) },
      uColorCount: { value: 1 },
      uColors: { value: uColors },
      uTransparent: { value: 1 },
      uScale: { value: 1 },
      uFrequency: { value: 1 },
      uWarpStrength: { value: 1 },
      uPointer: { value: new THREE.Vector2() },
      uMouseInfluence: { value: 1 },
      uParallax: { value: 0.5 },
      uNoise: { value: 0 },
      uIterations: { value: 1 },
      uIntensity: { value: 1.5 },
      uBandWidth: { value: 6 },
    },
    transparent: true,
    premultipliedAlpha: true,
  });
  scene.add(new THREE.Mesh(geometry, material));
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  container.appendChild(renderer.domElement);
  const pointer = new THREE.Vector2();
  const target = new THREE.Vector2();
  const clock = new THREE.Clock();
  let elapsed = 0;
  const resize = () => {
    renderer.setSize(container.clientWidth || 1, container.clientHeight || 1, false);
    material.uniforms.uCanvas.value.set(container.clientWidth || 1, container.clientHeight || 1);
  };
  resize();
  new ResizeObserver(resize).observe(container);
  window.addEventListener("pointermove", (event) => {
    const rect = container.getBoundingClientRect();
    target.set(
      ((event.clientX - rect.left) / (rect.width || 1)) * 2 - 1,
      -(((event.clientY - rect.top) / (rect.height || 1)) * 2 - 1),
    );
  });
  const loop = () => {
    elapsed += clock.getDelta();
    material.uniforms.uTime.value = elapsed;
    pointer.lerp(target, 0.08);
    material.uniforms.uPointer.value.copy(pointer);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

const cookieKey = "sinematarget-cookies";
const cookie = document.querySelector("#cookie");
if (cookie && localStorage.getItem(cookieKey) !== "1") cookie.hidden = false;
document.querySelector("#cookie-ok")?.addEventListener("click", () => {
  localStorage.setItem(cookieKey, "1");
  if (cookie) cookie.hidden = true;
});
