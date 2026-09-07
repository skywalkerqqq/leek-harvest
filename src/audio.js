// 轻量 WebAudio 合成音效 + 环境底噪（低频风 + 城市嗡鸣），无外部资源文件。
export class GameAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this._ambient = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this._startAmbient();
    } catch (e) {
      this.ctx = null;
    }
  }

  _startAmbient() {
    if (this._ambient || !this.ctx) return;
    const ctx = this.ctx;

    // 低频风（滤波噪声）
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const wind = ctx.createBufferSource();
    wind.buffer = buf;
    wind.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 240;
    lp.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.value = 0.0;
    wind.connect(lp); lp.connect(g); g.connect(ctx.destination);
    wind.start();
    g.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 2.5);

    // 远处城市嗡鸣（低音正弦）
    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 52;
    const dg = ctx.createGain();
    dg.gain.value = 0.0;
    drone.connect(dg); dg.connect(ctx.destination);
    drone.start();
    dg.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 2.5);

    this._ambient = { wind, drone, g, dg };
  }

  setMuted(m) {
    this.muted = m;
    if (this._ambient && this.ctx) {
      const t = this.ctx.currentTime;
      this._ambient.g.gain.setTargetAtTime(m ? 0.0 : 0.05, t, 0.3);
      this._ambient.dg.gain.setTargetAtTime(m ? 0.0 : 0.03, t, 0.3);
    }
  }

  _tone(freq, dur, type = 'sine', gain = 0.2, when = 0) {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(this.ctx.destination);
    const t = this.ctx.currentTime + when;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  acquire() { this._tone(420, 0.08, 'square', 0.12); this._tone(620, 0.08, 'square', 0.1, 0.06); }
  fatten() { this._tone(300, 0.12, 'sawtooth', 0.08); this._tone(360, 0.12, 'sawtooth', 0.08, 0.05); }
  harvest() {
    this._tone(880, 0.07, 'triangle', 0.18);
    this._tone(1320, 0.1, 'triangle', 0.15, 0.05);
    this._tone(1760, 0.12, 'sine', 0.12, 0.1);
  }
  crash() { this._tone(120, 0.5, 'sawtooth', 0.18); this._tone(80, 0.6, 'sine', 0.15, 0.05); }
  event() { this._tone(520, 0.15, 'triangle', 0.12); }
}
