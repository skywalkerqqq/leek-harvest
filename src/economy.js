// 经济 / 数值系统：引流、养肥、收割转化、泡沫、崩盘、监管。
import { triggerRandom } from './events.js';

export const ACQUIRE_COST = 120; // 引流基础成本（口碑低时上浮）
export const FATTEN_COST = 90;   // 养肥固定成本

export function computeTax(heat) {
  // heat 0% -> 5%，满热 -> 25%
  return 0.05 + (Math.min(heat, 100) / 100) * 0.20;
}

// 口碑越低，引流越贵（1.0x ~ 1.5x）
function repFactor(state) {
  return 1 + (1 - state.reputation / 100) * 0.5;
}

export function acquire(field, state) {
  const cost = Math.round(ACQUIRE_COST * repFactor(state));
  if (state.cash < cost) return { ok: false, msg: `现金不足，引流需 ¥${cost.toLocaleString()}` };
  state.cash -= cost;
  const base = 7 + Math.floor(Math.random() * 3);
  const n = Math.max(2, Math.round(base * (0.6 + 0.4 * (state.reputation / 100))));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 18;
    field.spawnAt(Math.cos(a) * r, Math.sin(a) * r, {
      wallet: 18 + Math.random() * 27,
      fomo: 18 + Math.random() * 22,
      alert: 0,
      loyalty: 35 + Math.random() * 30,
    });
  }
  return { ok: true, msg: `引流 ${n} 棵韭菜入场` };
}

export function fatten(field, state) {
  if (state.cash < FATTEN_COST) return { ok: false, msg: '现金不足，无法养肥' };
  state.cash -= FATTEN_COST;
  const bubbleBoost = 1 + (state.bubble / 100) * 0.5; // 泡沫越热，越容易吹肥
  let n = 0;
  for (const l of field.leeks) {
    if (l.state === 'harvested' || l.state === 'awakened') continue;
    const mult = 1 + (l.fomo / 100) * 0.6;
    const dim = 1 - (l.wallet / 100) * 0.45; // 边际递减：越肥越难再肥
    const gain = 20 * mult * dim * bubbleBoost;
    l.wallet = Math.min(100, l.wallet + gain);
    l.fomo = Math.min(100, l.fomo + 14);
    l.alert = Math.min(100, l.alert + 4);
    l.loyalty = Math.min(100, l.loyalty + 4); // 社群氛围洗脑，忠诚度上升
    if (l.wallet > 50 && l.fomo > 45) l.state = 'fat';
    else if (l.fomo > 35) l.state = 'fomo';
    else if (l.fomo > 18) l.state = 'curious';
    field.refresh(l);
    n++;
  }
  return { ok: true, msg: `养肥 ${n} 棵韭菜` };
}

// 温和的监管抽查：按热度概率触发，罚小款、降一点热度
export function audit(state) {
  const pct = 0.05 + Math.random() * 0.06;
  const cut = Math.min(state.cash, Math.round(state.cash * pct));
  state.cash -= cut;
  state.heat = Math.max(0, state.heat - 12);
  return `监管抽查！罚款 ¥${cut.toLocaleString()}（热度 -12）`;
}

export function nextDay(field, state) {
  state.day++;
  state.heat = Math.max(0, state.heat - state.upgrades.heatDecay);
  state.bubble = Math.min(100, state.bubble + 6);
  for (const l of field.leeks) {
    if (l.state === 'harvested' || l.state === 'awakened') continue;
    l.wallet = Math.min(100, l.wallet + (Math.random() * 6 - 2));
    l.loyalty = Math.max(0, l.loyalty - 2); // 自然流失
    field.refresh(l);
  }
  const ev = triggerRandom(field, state);
  let auditMsg = null;
  if (Math.random() < (state.heat / 100) * 0.25) {
    auditMsg = audit(state);
  }
  return { ok: true, msg: `第 ${state.day} 天`, event: ev, audit: auditMsg };
}

// 请喝茶：监管热度爆表，没收一半现金并强制终结本轮
export function regulation(state) {
  const cut = Math.round(state.cash * 0.5);
  state.cash -= cut;
  state.heat = state.upgrades.heatMax;
  state.gameOver = true;
  return { msg: `监管突查「请喝茶」！没收 ¥${cut.toLocaleString()}`, gameOver: true };
}
