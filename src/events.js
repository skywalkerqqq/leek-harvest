// 随机事件池（带权重）：同行砸盘 / 政策东风 / 黑天鹅 / 韭菜觉醒潮 / 假利好 / 真利好 / 突爆仓 / 同行收割。
// 仅依赖 field 与 state，无循环依赖。
export const EVENTS = [
  { id: 'wind', name: '政策东风', desc: '利好来袭，韭菜膨胀', bad: false, w: 3,
    apply(f, s) {
      s.bubble = Math.min(100, s.bubble + 2);
      for (const l of f.leeks) {
        if (l.state === 'harvested' || l.state === 'awakened') continue;
        l.wallet = Math.min(100, l.wallet * 1.25 + 5);
        f.refresh(l);
      }
    } },
  { id: 'fake', name: '假利好', desc: '放风假消息，韭菜上头但警觉', bad: false, w: 3,
    apply(f, s) {
      s.bubble = Math.min(100, s.bubble + 5);
      for (const l of f.leeks) {
        if (l.state === 'harvested' || l.state === 'awakened') continue;
        l.wallet = Math.min(100, l.wallet + 8);
        l.fomo = Math.min(100, l.fomo + 15);
        l.alert = Math.min(100, l.alert + 10);
        f.refresh(l);
      }
    } },
  { id: 'real', name: '真利好', desc: '实打实的行业利好', bad: false, w: 2,
    apply(f, s) {
      s.bubble = Math.min(100, s.bubble + 3);
      for (const l of f.leeks) {
        if (l.state === 'harvested' || l.state === 'awakened') continue;
        l.wallet = Math.min(100, l.wallet * 1.2 + 3);
        f.refresh(l);
      }
    } },
  { id: 'crash', name: '同行砸盘', desc: '对手盘突袭，韭菜集体缩水', bad: true, w: 2,
    apply(f, s) {
      s.bubble = Math.min(100, s.bubble + 5);
      s.heat = Math.min(s.upgrades.heatMax, s.heat + 15);
      for (const l of f.leeks) {
        if (l.state === 'harvested' || l.state === 'awakened') continue;
        l.wallet *= 0.6;
        f.refresh(l);
      }
    } },
  { id: 'woke', name: '韭菜觉醒潮', desc: '舆论发酵，韭菜开始警惕', bad: true, w: 2,
    apply(f, s) {
      s.reputation = Math.max(0, s.reputation - 3);
      for (const l of f.leeks) {
        if (l.state === 'harvested' || l.state === 'awakened') continue;
        const resist = 1 - (l.loyalty / 100) * 0.5;
        l.alert = Math.min(100, l.alert + 25 * resist);
        f.refresh(l);
      }
    } },
  { id: 'swan', name: '黑天鹅', desc: '突发风险，监管盯上你', bad: true, w: 1,
    apply(f, s) {
      s.bubble = Math.max(0, s.bubble - 12);
      s.heat = Math.min(s.upgrades.heatMax, s.heat + 20);
    } },
  { id: 'burst', name: '突爆仓', desc: '高杠杆韭菜集体爆仓', bad: true, w: 1,
    apply(f, s) {
      s.heat = Math.min(s.upgrades.heatMax, s.heat + 10);
      for (const l of f.leeks) {
        if (l.state === 'harvested' || l.state === 'awakened') continue;
        l.wallet *= 0.7;
        l.alert = Math.min(100, l.alert + 15);
        f.refresh(l);
      }
    } },
  { id: 'rival', name: '同行收割', desc: '有同行来你的地盘抢韭菜', bad: true, w: 1,
    apply(f, s) {
      s.reputation = Math.max(0, s.reputation - 5);
      for (const l of f.leeks) {
        if (l.state === 'harvested' || l.state === 'awakened') continue;
        l.alert = Math.min(100, l.alert + 20);
        f.refresh(l);
      }
    } },
];

export function triggerRandom(field, state) {
  if (Math.random() > 0.55) return null; // 每日约 55% 触发，不再每天必发
  const total = EVENTS.reduce((a, e) => a + e.w, 0);
  let r = Math.random() * total;
  for (const e of EVENTS) {
    r -= e.w;
    if (r <= 0) { e.apply(field, state); return e; }
  }
  return null;
}
