// 场景装配：暗黑写实的绿色调（压抑的金融丛林）——冷绿雾、暗绿泥地、远处暗绿城市天际线剪影。
import * as THREE from 'three';

function addCitySilhouette(scene) {
  const city = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x0c1812, roughness: 1.0, metalness: 0.0 });
  const count = 26;
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2;
    const r = 120 + Math.random() * 40;
    const w = 6 + Math.random() * 10;
    const h = 14 + Math.random() * 46;
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
    box.position.set(Math.cos(ang) * r, h / 2 - 2, Math.sin(ang) * r);
    city.add(box);
  }
  scene.add(city);
}

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  // 兼容 r150（encoding API）与 r152+（colorSpace API）
  if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  else if ('outputEncoding' in renderer && THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a120d');
  scene.fog = new THREE.FogExp2('#0a120d', 0.016);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 600);

  const hemi = new THREE.HemisphereLight('#3a6b4a', '#070d0a', 0.55);
  scene.add(hemi);

  const key = new THREE.DirectionalLight('#e8f3e0', 1.05);
  key.position.set(24, 34, 16);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 160;
  key.shadow.camera.left = -50;
  key.shadow.camera.right = 50;
  key.shadow.camera.top = 50;
  key.shadow.camera.bottom = -50;
  key.shadow.bias = -0.0004;
  scene.add(key);

  const fill = new THREE.DirectionalLight('#1d3a28', 0.5);
  fill.position.set(-18, 12, -12);
  scene.add(fill);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ color: 0x16241a, roughness: 1.0, metalness: 0.0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  addCitySilhouette(scene);

  return { renderer, scene, camera, key };
}
