/** Hiệu ứng âm thanh bằng Web Audio API (không cần file mp3). */
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('sfx') !== 'off';
  }
  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('sfx', this.enabled ? 'on' : 'off');
    return this.enabled;
  }
  pageFlip() {
    if (!this.enabled) return;
    try {
      this.init();
      const c = this.ctx, size = c.sampleRate * 0.25;
      const buf = c.createBuffer(1, size, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
      f.frequency.setValueAtTime(800, c.currentTime);
      f.frequency.exponentialRampToValueAtTime(300, c.currentTime + 0.25);
      const g = c.createGain();
      g.gain.setValueAtTime(0.01, c.currentTime);
      g.gain.linearRampToValueAtTime(0.2, c.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
      src.connect(f); f.connect(g); g.connect(c.destination); src.start();
    } catch { /* ignore */ }
  }
  tap() {
    if (!this.enabled) return;
    try {
      this.init();
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = 440;
      g.gain.setValueAtTime(0.05, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.06);
    } catch { /* ignore */ }
  }
  unlock() {
    if (!this.enabled) return;
    try {
      this.init();
      const c = this.ctx;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const t = c.currentTime + i * 0.08, o = c.createOscillator(), g = c.createGain();
        o.type = 'triangle'; o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.25);
      });
    } catch { /* ignore */ }
  }
}

export const sfx = new SoundFX();
