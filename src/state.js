// Game state singleton + persistence (localStorage, corruption-safe).

const KEY = 'leek_harvest_save_v1';

export const MAX_DAY = 30; // 一轮对局共 30 个交易日

// 结算段位（讽刺致敬），按现金从高到低匹配
export const RANKS = [
  { min: 1000000, title: '镰刀之王' },
  { min: 500000, title: '资本大鳄' },
  { min: 250000, title: '割韭宗师' },
  { min: 100000, title: '资深庄家' },
  { min: 50000, title: '初级镰刀' },
  { min: 10000, title: '平本散户' },
  { min: -Infinity, title: '被反割' },
];

export function rankOf(cash) {
  for (const r of RANKS) if (cash >= r.min) return r.title;
  return '被反割';
}

export const state = {
  cash: 10000,
  heat: 0,
  day: 1,
  reputation: 100,
  bubble: 0,        // 泡沫（全局市场热度）：推高养肥收益，也抬高崩盘风险
  gameOver: false,
  sandbox: false,
  upgrades: {
    range: 6,        // 收割半径
    rate: 0.78,      // 收割转化率
    heatMax: 100,    // 监管热度上限
    heatDecay: 8,    // 每日自然衰减
    rangeLevel: 0,
    rateLevel: 0,
    prLevel: 0,
    washLevel: 0,
  },
  stats: { totalHarvested: 0, peakCash: 10000 },
  _leeks: null, // 临时存放从存档恢复的韭菜快照
};

export function save(field) {
  try {
    const leeks = field ? field.serialize() : [];
    localStorage.setItem(KEY, JSON.stringify({
      cash: state.cash,
      heat: state.heat,
      day: state.day,
      reputation: state.reputation,
      bubble: state.bubble,
      gameOver: state.gameOver,
      sandbox: state.sandbox,
      upgrades: state.upgrades,
      stats: state.stats,
      leeks,
    }));
  } catch (e) { /* 存储不可用时静默忽略 */ }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.leeks)) return false;
    state.cash = Number(d.cash) || state.cash;
    state.heat = Number(d.heat) || 0;
    state.day = Number(d.day) || 1;
    state.reputation = Number(d.reputation ?? 100);
    state.bubble = Number(d.bubble) || 0;
    state.gameOver = !!d.gameOver;
    state.sandbox = !!d.sandbox;
    if (d.upgrades) Object.assign(state.upgrades, d.upgrades);
    if (d.stats) Object.assign(state.stats, d.stats);
    state._leeks = d.leeks;
    return true;
  } catch (e) {
    return false;
  }
}

export function reset() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}
