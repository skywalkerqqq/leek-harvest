// 韭菜实体（暗黑写实 + 绿色调）：下半截球茎 + 上半截绿茎与拱叶 + 表情；
// 收割时上半截从中部被斩断、向前倒伏。每段独立材质，便于按 wallet 缩放、按 alert 泛红。
import * as THREE from 'three';

const EXPRS = ['neutral', 'happy', 'worried', 'panic', 'dead'];

// 状态对收割收益的加成：越上头的韭菜越肥、越值钱
const STATE_MULT = { fat: 1.25, fomo: 1.1, curious: 1.0, dormant: 0.85 };

function makeFaceTexture(expr) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const x = c.getContext('2d');
  x.strokeStyle = '#16241a';
  x.fillStyle = '#16241a';
  x.lineWidth = 7;
  x.lineCap = 'round';
  x.lineJoin = 'round';

  if (expr === 'dead') {
    x.beginPath();
    x.moveTo(36, 40); x.lineTo(60, 64);
    x.moveTo(60, 40); x.lineTo(36, 64);
    x.moveTo(68, 40); x.lineTo(92, 64);
    x.moveTo(92, 40); x.lineTo(68, 64);
    x.stroke();
  } else {
    const ey = 52;
    x.beginPath();
    x.arc(46, ey, 7, 0, Math.PI * 2);
    x.arc(82, ey, 7, 0, Math.PI * 2);
    x.fill();
    if (expr === 'panic') {
      x.beginPath();
      x.arc(46, ey, 13, 0, Math.PI * 2);
      x.arc(82, ey, 13, 0, Math.PI * 2);
      x.stroke();
    }
  }

  x.beginPath();
  if (expr === 'happy') x.arc(64, 76, 20, 0.12 * Math.PI, 0.88 * Math.PI);
  else if (expr === 'worried') { x.moveTo(50, 92); x.lineTo(78, 92); }
  else if (expr === 'panic') x.arc(64, 84, 13, 0, Math.PI * 2);
  else if (expr === 'dead') { x.moveTo(50, 96); x.lineTo(78, 96); }
  else x.arc(64, 80, 16, 0.1 * Math.PI, 0.9 * Math.PI);
  x.stroke();

  const tex = new THREE.CanvasTexture(c);
  if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  else if ('encoding' in tex && THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
  tex.anisotropy = 4;
  return tex;
}

// 一根拱形叶片（朝 +Y 并向前 +Z 微弓），全局复用，按角度旋转成丛。
function makeLeafGeometry() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.0, 0),
    new THREE.Vector3(0.05, 0.28, 0.06),
    new THREE.Vector3(0.13, 0.56, 0.16),
    new THREE.Vector3(0.22, 0.82, 0.24),
    new THREE.Vector3(0.30, 1.02, 0.30),
  ]);
  return new THREE.TubeGeometry(curve, 10, 0.05, 6, false);
}

export class LeekField {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.leeks = [];
    this.nextId = 1;
    this.onAwaken = null;
    this.cutY = 0.5; // 中部斩断高度（局部坐标，会随整体缩放）

    this._lowerGeo = new THREE.CylinderGeometry(0.10, 0.15, 0.5, 14);
    this._shaftGeo = new THREE.CylinderGeometry(0.06, 0.105, 0.78, 14);
    this._leafGeo = makeLeafGeometry();
    this._lowerMat = new THREE.MeshStandardMaterial({ color: 0xd7e3c4, roughness: 0.8, metalness: 0.0 });
    this._shaftMat = new THREE.MeshStandardMaterial({ color: 0x4f8f3a, roughness: 0.75, metalness: 0.0 });
    this._leafMat = new THREE.MeshStandardMaterial({ color: 0x57a83c, roughness: 0.7, metalness: 0.0 });
    this._faces = {};
    for (const e of EXPRS) this._faces[e] = makeFaceTexture(e);
  }

  spawnAt(x, z, opts = {}) {
    const g = new THREE.Group();

    const lowerMat = this._lowerMat.clone();
    lowerMat.transparent = true;
    const lower = new THREE.Mesh(this._lowerGeo, lowerMat);
    lower.position.y = 0.25;
    lower.castShadow = true;
    g.add(lower);

    const topPivot = new THREE.Group();
    topPivot.position.y = this.cutY;
    g.add(topPivot);

    const shaftMat = this._shaftMat.clone();
    shaftMat.transparent = true;
    const shaft = new THREE.Mesh(this._shaftGeo, shaftMat);
    shaft.position.y = 0.39;
    shaft.castShadow = true;
    topPivot.add(shaft);

    const leafMat = this._leafMat.clone();
    leafMat.transparent = true;
    const leafCount = 4;
    for (let i = 0; i < leafCount; i++) {
      const leaf = new THREE.Mesh(this._leafGeo, leafMat);
      leaf.position.y = 0.5;
      leaf.rotation.y = (i / leafCount) * Math.PI * 2;
      leaf.rotation.x = 0.18;
      leaf.castShadow = true;
      topPivot.add(leaf);
    }

    const face = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this._faces['neutral'], transparent: true, depthTest: true, depthWrite: false,
    }));
    face.scale.set(0.5, 0.5, 0.5);
    face.position.set(0, 0.52, 0.1);
    topPivot.add(face);

    g.position.set(x, 0, z);
    g.rotation.y = Math.random() * Math.PI * 2;

    const leek = {
      id: this.nextId++,
      x, z,
      wallet: opts.wallet != null ? opts.wallet : 20,
      fomo: opts.fomo != null ? opts.fomo : 20,
      alert: opts.alert != null ? opts.alert : 0,
      loyalty: opts.loyalty != null ? opts.loyalty : 50,
      state: opts.state || 'dormant',
      group: g,
      topPivot,
      lowerMat, shaftMat, leafMat, face,
      expr: null,
      phase: Math.random() * Math.PI * 2,
      witherT: 0,
      cut: 0,
      fleeDir: new THREE.Vector3(),
    };
    this.root.add(g);
    this.leeks.push(leek);
    this.refresh(leek);
    return leek;
  }

  refresh(leek) {
    const w = leek.wallet;
    const sy = 0.6 + (w / 100) * 1.0;
    const sxz = 0.85 + (w / 100) * 0.45;
    leek.group.scale.set(sxz, sy, sxz);

    let expr = 'neutral';
    if (leek.state === 'harvested') expr = 'dead';
    else if (leek.alert > 70) expr = 'panic';
    else if (leek.wallet > 55 && leek.fomo > 50) expr = 'happy';
    else if (leek.fomo > 45) expr = 'worried';
    if (expr !== leek.expr) {
      leek.expr = expr;
      leek.face.material.map = this._faces[expr];
      leek.face.material.needsUpdate = true;
    }

    const a = leek.alert / 100;
    leek.shaftMat.emissive.setRGB(a * 0.2, 0, 0);
    leek.leafMat.emissive.setRGB(a * 0.5, a * 0.05, 0);
  }

  harvestWithin(point, range, rate, tax) {
    let gain = 0, count = 0;
    const hits = [];
    const r2 = range * range;
    for (const l of this.leeks) {
      if (l.state === 'harvested' || l.state === 'awakened') continue;
      const dx = l.x - point.x;
      const dz = l.z - point.z;
      if (dx * dx + dz * dz <= r2) {
        const g = Math.round(l.wallet * rate * (STATE_MULT[l.state] || 1.0) * (1 - tax));
        gain += g;
        l.wallet = 0;
        l.state = 'harvested';
        l.cut = 0;
        count++;
        hits.push({ pos: new THREE.Vector3(l.x, this.cutY * l.group.scale.y, l.z), gain: g });
      }
    }
    return { gain, count, hits };
  }

  _awaken(l) {
    l.state = 'awakened';
    const d = new THREE.Vector3(l.x, 0, l.z);
    if (d.lengthSq() < 0.01) d.set(Math.random() - 0.5, 0, Math.random() - 0.5);
    d.normalize();
    l.fleeDir.copy(d);
    if (this.onAwaken) this.onAwaken(l);
  }

  _remove(l, i) {
    this.root.remove(l.group);
    l.lowerMat.dispose();
    l.shaftMat.dispose();
    l.leafMat.dispose();
    if (l.face.material.map) l.face.material.dispose();
    this.leeks.splice(i, 1);
  }

  update(dt, time) {
    for (let i = this.leeks.length - 1; i >= 0; i--) {
      const l = this.leeks[i];
      if (l.state === 'harvested') {
        l.cut += dt;
        if (l.cut < 0.5) {
          l.topPivot.rotation.x = (l.cut / 0.5) * 1.5; // 上半截向前倒伏
        } else {
          const f = (l.cut - 0.5) / 0.6;
          const o = Math.max(0, 1 - f);
          l.lowerMat.opacity = o;
          l.shaftMat.opacity = o;
          l.leafMat.opacity = o;
          l.face.material.opacity = o;
          if (f >= 1) { this._remove(l, i); continue; }
        }
      } else if (l.state === 'awakened') {
        l.group.position.addScaledVector(l.fleeDir, dt * 4);
        l.group.scale.multiplyScalar(1 - dt * 0.8);
        if (l.group.scale.x < 0.05) { this._remove(l, i); continue; }
      } else {
        l.group.rotation.z = Math.sin(time * 1.5 + l.phase) * 0.05;
        if (l.fomo > 0) {
          const resist = 1 - (l.loyalty / 100) * 0.6; // 忠诚度越高越不容易觉醒
          l.alert = Math.min(100, l.alert + dt * (l.fomo / 100) * 1.0 * resist);
          if (l.alert >= 100) this._awaken(l);
          else if (l.alert > 70 && l.expr !== 'panic') this.refresh(l);
        }
      }
    }
  }

  serialize() {
    return this.leeks
      .filter(l => l.state !== 'harvested' && l.state !== 'awakened')
      .map(l => ({ x: l.x, z: l.z, wallet: l.wallet, fomo: l.fomo, alert: l.alert, loyalty: l.loyalty, state: l.state }));
  }

  hydrate(arr) {
    if (!Array.isArray(arr)) return;
    for (const d of arr) {
      this.spawnAt(d.x, d.z, {
        wallet: d.wallet, fomo: d.fomo, alert: d.alert, loyalty: d.loyalty, state: d.state,
      });
    }
  }
}
