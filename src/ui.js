// HUD：顶部现金/热度、底部工具栏、镰刀工坊面板、toast、浮动金额、结算面板。
import { UPGRADES, costOf } from './upgrades.js';
import { ACQUIRE_COST, FATTEN_COST } from './economy.js';
import { rankOf } from './state.js';

export function createUI(handlers) {
  const el = id => document.getElementById(id);
  const toolbar = el('toolbar');
  const upgradePanel = el('upgradePanel');
  const upgradeList = el('upgradeList');
  const toastBox = el('toast');
  const floatLayer = el('floatLayer');

  const mk = (label, sub, onClick) => {
    const b = document.createElement('button');
    b.className = 'btn';
    b.innerHTML = `${label}<span class="k">${sub}</span>`;
    b.addEventListener('click', () => onClick(b));
    return b;
  };

  const bAcq = mk('引流', `¥${ACQUIRE_COST}起`, () => handlers.onAcquire());
  const bFat = mk('养肥', `¥${FATTEN_COST}`, () => handlers.onFatten());
  const bHar = mk('收割', '点田', () => handlers.onToggleHarvest(bHar));
  const bUp = mk('镰刀工坊', '升级', () => handlers.onToggleUpgrade());
  const bDay = mk('下一天', '回合', () => handlers.onNextDay());
  const bMute = mk('音效', '开', () => {
    const muted = handlers.onToggleMute();
    bMute.querySelector('.k').textContent = muted ? '关' : '开';
  });
  [bAcq, bFat, bHar, bUp, bDay, bMute].forEach(b => toolbar.appendChild(b));

  // 升级行只构建一次（避免每帧重建导致点击被吞）；之后每帧仅原地刷新价格/可用态。
  const rows = [];
  function buildUpgrades() {
    upgradeList.innerHTML = '';
    rows.length = 0;
    for (const u of UPGRADES) {
      const row = document.createElement('div');
      row.className = 'uitem';
      const info = document.createElement('div');
      const nm = document.createElement('span'); nm.className = 'nm';
      const lv = document.createElement('span'); lv.className = 'lv';
      const ds = document.createElement('div'); ds.className = 'ds'; ds.textContent = u.desc;
      info.appendChild(nm); info.appendChild(lv); info.appendChild(ds);
      const btn = document.createElement('button');
      btn.addEventListener('click', () => handlers.onBuy(u));
      row.appendChild(info);
      row.appendChild(btn);
      upgradeList.appendChild(row);
      rows.push({ u, nm, lv, btn });
    }
  }
  function refreshUpgrades() {
    for (const r of rows) {
      const c = costOf(r.u, handlers.state);
      const lvl = handlers.state.upgrades[r.u.id + 'Level'] || 0;
      r.nm.textContent = r.u.name;
      r.lv.textContent = 'Lv' + lvl;
      r.btn.textContent = '¥' + c.toLocaleString();
      r.btn.disabled = handlers.state.cash < c;
    }
  }

  function updateHUD() {
    el('cash').textContent = '¥' + Math.round(handlers.state.cash).toLocaleString();
    el('day').textContent = '第 ' + handlers.state.day + ' 天';
    el('rep').textContent = '口碑 ' + Math.round(handlers.state.reputation);
    const hp = Math.min(100, (handlers.state.heat / handlers.state.upgrades.heatMax) * 100);
    el('heatbar').style.width = hp + '%';
    el('heatnum').textContent = Math.round(hp) + '%';
    refreshUpgrades();
  }

  function toast(msg, type) {
    const t = document.createElement('div');
    t.className = 't' + (type ? ' ' + type : '');
    t.textContent = msg;
    toastBox.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  function floatText(pos, text, camera, renderer) {
    const v = pos.clone().project(camera);
    const x = (v.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
    const y = (-v.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
    const d = document.createElement('div');
    d.className = 'float';
    d.textContent = text;
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    floatLayer.appendChild(d);
    setTimeout(() => d.remove(), 1100);
  }

  function setMode(mode) {
    bHar.classList.toggle('active', mode === 'harvest');
  }

  function showSettlement(reason) {
    const s = handlers.state;
    el('goReason').textContent = reason;
    el('goRank').textContent = '段位 · ' + rankOf(s.cash);
    el('goCash').textContent = '¥' + Math.round(s.cash).toLocaleString();
    el('goStats').textContent =
      `第 ${s.day} 天 · 累计收割 ${s.stats.totalHarvested} 棵 · 峰值 ¥${Math.round(s.stats.peakCash).toLocaleString()}`;
    el('gameover').style.display = 'flex';
  }

  el('goAgain').addEventListener('click', () => handlers.onRestart());
  el('goSandbox').addEventListener('click', () => handlers.onSandbox());

  buildUpgrades();

  return { updateHUD, toast, floatText, setMode, refreshUpgrades, buildUpgrades, showSettlement };
}
