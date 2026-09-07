// 镰刀（收割光标）+ 金币粒子爆发。暗黑写实：冷钢刀刃、金色 additive 粒子。
import * as THREE from 'three';

class Coins {
  constructor(scene, max = 320) {
    this.scene = scene;
    this.pool = [];
    const geo = new THREE.SphereGeometry(0.06, 6, 6);
    for (let i = 0; i < max; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      scene.add(m);
      this.pool.push({ m, life: 0, vel: new THREE.Vector3() });
    }
    this.cursor = 0;
  }

  burst(pos, count) {
    for (let i = 0; i < count; i++) {
      const p = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % this.pool.length;
      p.m.position.copy(pos);
      p.m.position.x += (Math.random() - 0.5) * 0.5;
      p.m.position.z += (Math.random() - 0.5) * 0.5;
      p.vel.set((Math.random() - 0.5) * 1.6, 2.2 + Math.random() * 2.4, (Math.random() - 0.5) * 1.6);
      p.life = 1;
      p.m.visible = true;
      p.m.material.opacity = 1;
    }
  }

  update(dt) {
    for (const p of this.pool) {
      if (p.life > 0) {
        p.life -= dt * 1.25;
        p.vel.y -= 6 * dt;
        p.m.position.addScaledVector(p.vel, dt);
        p.m.material.opacity = Math.max(0, p.life);
        if (p.life <= 0) p.m.visible = false;
      }
    }
  }
}

function buildBlade() {
  const g = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xc9d2db, metalness: 0.95, roughness: 0.22 });
  const torus = new THREE.TorusGeometry(0.55, 0.045, 10, 40, Math.PI * 1.15);
  const blade = new THREE.Mesh(torus, bladeMat);
  blade.rotation.z = Math.PI * 0.12;
  blade.castShadow = true;
  g.add(blade);

  const handleMat = new THREE.MeshStandardMaterial({ color: 0x3a2c20, roughness: 0.7, metalness: 0.1 });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.1, 12), handleMat);
  handle.position.set(-0.5, -0.5, 0);
  handle.rotation.z = Math.PI * 0.5 + 0.3;
  g.add(handle);

  g.scale.set(1.5, 1.5, 1.5);
  return g;
}

export class Scythe {
  constructor(scene) {
    this.scene = scene;
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.92, 1.0, 56),
      new THREE.MeshBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    scene.add(this.ring);

    this.blade = buildBlade();
    this.blade.visible = false;
    scene.add(this.blade);

    this.range = 6;
    this.swingT = 0;
    this.coins = new Coins(scene);
  }

  showAt(point, range) {
    this.ring.visible = true;
    this.ring.position.set(point.x, 0.05, point.z);
    this.ring.scale.set(range, range, range);
    this.blade.visible = true;
    this.blade.position.set(point.x, 0.25, point.z + range * 0.45);
    this.range = range;
  }

  hide() {
    this.ring.visible = false;
    this.blade.visible = false;
  }

  swing() {
    this.swingT = 0.0001;
  }

  update(dt) {
    if (this.swingT > 0) {
      this.swingT += dt;
      const t = this.swingT / 0.35;
      if (t >= 1) {
        this.swingT = 0;
        this.blade.rotation.y = -1.0;
      } else {
        this.blade.rotation.y = -1.0 + Math.sin(t * Math.PI) * 1.7;
      }
    }
    if (this.ring.visible) {
      this.ring.material.opacity = 0.5 + Math.sin(performance.now() * 0.005) * 0.18;
    }
    this.coins.update(dt);
  }

  spawnCoins(pos, count) {
    this.coins.burst(pos, count);
  }
}
