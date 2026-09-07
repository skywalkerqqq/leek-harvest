// 镰刀工坊：升级定义 + 购买逻辑（成本随等级指数增长）。
export const UPGRADES = [
  { id: 'range', name: '宽刃镰刀', desc: '收割范围 +2', base: 800, scale: 1.6,
    apply: s => { s.upgrades.range += 2; } },
  { id: 'rate', name: '锋利镰刀', desc: '收割转化 +0.08', base: 1000, scale: 1.7,
    apply: s => { s.upgrades.rate = Math.min(0.95, s.upgrades.rate + 0.08); } },
  { id: 'pr', name: '危机公关', desc: '每日热度衰减 +4', base: 600, scale: 1.6,
    apply: s => { s.upgrades.heatDecay += 4; } },
  { id: 'wash', name: '洗白身份', desc: '监管热度上限 +25', base: 1200, scale: 1.8,
    apply: s => { s.upgrades.heatMax += 25; } },
];

export function costOf(u, state) {
  const lvl = state.upgrades[u.id + 'Level'] || 0;
  return Math.round(u.base * Math.pow(u.scale, lvl));
}

export function buy(u, state) {
  const c = costOf(u, state);
  if (state.cash < c) return { ok: false, msg: '现金不足' };
  state.cash -= c;
  u.apply(state);
  state.upgrades[u.id + 'Level'] = (state.upgrades[u.id + 'Level'] || 0) + 1;
  return { ok: true, msg: `已购买 ${u.name}` };
}
