// 入口：装配世界、韭菜田、镰刀、HUD、音频、后处理；处理相机轨道/触控与收割拾取；主循环。
import * as THREE from 'three';
import { createWorld } from './scene.js';
import { createPost } from './post.js';
import { LeekField } from './leek.js';
import { Scythe } from './scythe.js';
import { GameAudio } from './audio.js';
import { createUI } from './ui.js';
import { acquire, fatten, nextDay, regulation, computeTax } from './economy.js';
import { buy } from './upgrades.js';
import { state, save, load, reset, MAX_DAY } from './state.js';

const canvas = document.getElementById('scene');

let world;
try {
  world = createWorld(canvas);
} catch (e) {
  document.getElementById('overlay').style.display = 'flex';
  throw e;
}
const { renderer, scene, camera } = world;

const field = new LeekField(scene);
const scythe = new Scythe(scene);
const audio = new GameAudio();
const post = createPost(renderer, scene, camera);

const cam = { theta: Math.PI * 0.25, phi: 0.85, radius: 36, target: new THREE.Vector3(0, 1.5, 0) };

let mode = 'idle';
let lastPoint = new THREE.Vector3();

// ---- 存档恢复 / 初始播种 ----
const hadSave = load();
if (hadSave && state._leeks && state._leeks.length) {
  field.hydrate(state._leeks);
  delete state._leeks;
} else {
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 16;
    field.spawnAt(Math.cos(a) * r, Math.sin(a) * r, {
      wallet: 12 + Math.random() * 25, fomo: 10 + Math.random() * 25, alert: 0,
    });
  }
}

// ---- 交互拾取 ----
const ndc = new THREE.Vector2();
const ray = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();

function pickPoint(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  ray.setFromCamera(ndc, camera);
  const ok = ray.ray.intersectPlane(groundPlane, hit);
  return ok ? hit : null;
}

function doHarvest(point) {
  if (state.gameOver) return;
  const tax = computeTax(state.heat);
  const res = field.harvestWithin(point, state.upgrades.range, state.upgrades.rate, tax);
  if (res.count === 0) return;
  state.cash += res.gain;
  state.stats.totalHarvested += res.count;
  state.stats.peakCash = Math.max(state.stats.peakCash, state.cash);
  state.heat = Math.min(state.upgrades.heatMax, state.heat + res.gain * 0.015);

  scythe.swing();
  audio.harvest();

  const centroid = new THREE.Vector3();
  for (const h of res.hits) {
    scythe.spawnCoins(h.pos, 8);
    centroid.add(h.pos);
  }
  centroid.multiplyScalar(1 / res.hits.length);
  ui.floatText(centroid, '+¥' + res.gain.toLocaleString(), camera, renderer);

  checkHeat();
  maybeRegulate();
  ui.updateHUD();
  save(field);
}

// ---- 相机轨道控制 ----
function updateCamera() {
  const r = cam.radius;
  const sp = Math.sin(cam.phi);
  camera.position.set(
    cam.target.x + r * sp * Math.sin(cam.theta),
    cam.target.y + r * Math.cos(cam.phi),
    cam.target.z + r * sp * Math.cos(cam.theta)
  );
  camera.lookAt(cam.target);
}

// ---- 触控 / 指针 ----
const pointers = new Map();
let dragging = false, downX = 0, downY = 0, pinchDist = 0;

canvas.addEventListener('pointerdown', e => {
  audio.init();
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    downX = e.clientX; downY = e.clientY;
    if (e.button === 0 && mode === 'harvest') {
      const p = pickPoint(e.clientX, e.clientY);
      if (p) doHarvest(p);
    } else {
      dragging = true;
    }
  } else {
    dragging = false;
    pinchDist = 0;
  }
});
canvas.addEventListener('pointermove', e => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const pts = [...pointers.values()];
    const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    if (pinchDist > 0) cam.radius = THREE.MathUtils.clamp(cam.radius - (d - pinchDist) * 0.18, 12, 80);
    pinchDist = d;
  } else if (dragging) {
    const dx = e.clientX - downX;
    const dy = e.clientY - downY;
    cam.theta -= dx * 0.005;
    cam.phi = THREE.MathUtils.clamp(cam.phi - dy * 0.005, 0.18, 1.45);
    downX = e.clientX; downY = e.clientY;
  }
  if (mode === 'harvest' && pointers.size <= 1) {
    const p = pickPoint(e.clientX, e.clientY);
    if (p) { lastPoint.copy(p); scythe.showAt(p, state.upgrades.range); }
  }
});
window.addEventListener('pointerup', e => {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchDist = 0;
  dragging = false;
});
window.addEventListener('pointercancel', e => {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchDist = 0;
  dragging = false;
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  cam.radius = THREE.MathUtils.clamp(cam.radius + e.deltaY * 0.02, 12, 80);
}, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  post.resize();
});

// ---- HUD 行为 ----
const upgradePanel = document.getElementById('upgradePanel');
let warnLevel = 0;

function checkHeat() {
  const hp = Math.round((state.heat / state.upgrades.heatMax) * 100);
  let level = hp >= 85 ? 3 : hp >= 60 ? 2 : hp >= 30 ? 1 : 0;
  if (level > warnLevel) {
    warnLevel = level;
    const msg = level === 3 ? '⚠ 监管高度关注，随时「请喝茶」！'
      : level === 2 ? '⚠ 监管开始盯上你了'
      : '⚠ 监管热度升温';
    ui.toast(msg, 'danger');
  } else if (hp < 30) {
    warnLevel = 0;
  }
  return hp;
}

function maybeRegulate() {
  if (state.gameOver) return;
  if (state.heat >= state.upgrades.heatMax) {
    const ev = regulation(state);
    state.reputation = Math.max(0, state.reputation - 5);
    audio.crash();
    ui.toast(ev.msg, 'danger');
    ui.updateHUD();
    save(field);
    ui.showSettlement('监管「请喝茶」：你玩脱了，本轮被强制终结');
  }
}

const ui = createUI({
  state,
  onAcquire() {
    if (state.gameOver) return;
    audio.init();
    const r = acquire(field, state);
    if (r.ok) { audio.acquire(); ui.toast(r.msg, 'good'); }
    else ui.toast(r.msg, 'danger');
    ui.updateHUD(); save(field);
  },
  onFatten() {
    if (state.gameOver) return;
    audio.init();
    const r = fatten(field, state);
    if (r.ok) { audio.fatten(); ui.toast(r.msg, 'good'); }
    else ui.toast(r.msg, 'danger');
    ui.updateHUD(); save(field);
  },
  onToggleHarvest() {
    if (state.gameOver) return;
    audio.init();
    mode = mode === 'harvest' ? 'idle' : 'harvest';
    ui.setMode(mode);
    if (mode !== 'harvest') scythe.hide();
  },
  onToggleUpgrade() {
    upgradePanel.style.display = upgradePanel.style.display === 'block' ? 'none' : 'block';
  },
  onNextDay() {
    if (state.gameOver) return;
    audio.init();
    const r = nextDay(field, state);
    audio.event();
    if (r.audit) ui.toast(r.audit, 'danger');
    if (r.event) ui.toast(r.event.name + '：' + r.event.desc, r.event.bad ? 'danger' : 'good');
    checkHeat();
    maybeRegulate();
    if (!state.gameOver && !state.sandbox && state.day > MAX_DAY) {
      state.gameOver = true;
      ui.toast('30 个交易日结束，进入结算', 'good');
      ui.showSettlement('你完成了 30 个交易日的操盘');
    }
    ui.updateHUD(); save(field);
  },
  onBuy(u) {
    if (state.gameOver) return;
    audio.init();
    const r = buy(u, state);
    ui.toast(r.msg, r.ok ? 'good' : 'danger');
    if (r.ok) audio.acquire();
    ui.updateHUD(); save(field);
  },
  onToggleMute() {
    audio.init();
    audio.setMuted(!audio.muted);
    return audio.muted;
  },
  onRestart() {
    reset();
    location.reload();
  },
  onSandbox() {
    state.gameOver = false;
    state.sandbox = true;
    document.getElementById('gameover').style.display = 'none';
    ui.updateHUD();
    save(field);
  },
});

field.onAwaken = () => {
  state.reputation = Math.max(0, state.reputation - 2);
  ui.toast('有韭菜觉醒跑路！口碑-2', 'danger');
};

// 顶栏「重开」
document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('确定重开？当前进度将清空。')) { reset(); location.reload(); }
});

ui.updateHUD();

// 若载入即已结束（上次对局遗留），直接展示结算
if (state.gameOver) {
  ui.showSettlement(state.sandbox ? '沙盒模式 · 继续你的操盘' : '上次对局已结束');
}

// ---- 主循环 ----
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  field.update(dt, t);
  scythe.update(dt);
  updateCamera();
  ui.updateHUD();
  post.render();
}
animate();
