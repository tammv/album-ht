/** Hiệu ứng âm thanh & Nhạc nền Giai điệu "Cho Tôi Đi Theo" (Ngọt) bằng Web Audio API */
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('sfx') !== 'off';
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.stepIdx = 0;
  }

  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('sfx', this.enabled ? 'on' : 'off');
    if (!this.enabled) this.stopBgm();
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
      const src = this.createBufferSource ? c.createBufferSource() : c.createBufferSource();
      src.buffer = buf;
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

  /**
   * Phát một nốt nhạc ấm áp (Acoustic Guitar / Rhodes Piano)
   */
  playNote(freq, startTime, duration = 0.8, volume = 0.045, type = 'triangle') {
    if (!this.ctx || !freq) return;
    try {
      const c = this.ctx;
      const osc = c.createOscillator();
      const sub = c.createOscillator();
      const filter = c.createBiquadFilter();
      const gain = c.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      sub.type = 'sine';
      sub.frequency.setValueAtTime(freq * 0.5, startTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, startTime);
      filter.frequency.exponentialRampToValueAtTime(450, startTime + duration);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

      osc.connect(filter);
      sub.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);

      osc.start(startTime);
      sub.start(startTime);
      osc.stop(startTime + duration + 0.05);
      sub.stop(startTime + duration + 0.05);
    } catch { /* ignore */ }
  }

  /**
   * Bắt đầu phát giai điệu Acoustic "Cho Tôi Đi Theo" - Ngọt (Vòng hợp âm G - Bm7 - Cmaj7 - Cm6/D7)
   */
  startBgm() {
    if (this.bgmPlaying) return;
    try {
      this.init();
      this.bgmPlaying = true;
      this.stepIdx = 0;

      // Tần số các nốt nhạc chuẩn
      const N = {
        G2: 98.0, B2: 123.47, C3: 130.81, D3: 146.83, E3: 164.81, Fs3: 185.0, G3: 196.0, A3: 220.0, B3: 246.94,
        C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, Fs4: 369.99, G4: 392.0, A4: 440.0, B4: 493.88,
        C5: 523.25, D5: 587.33, E5: 659.25,
      };

      // Vòng rải Guitar + Giai điệu "Cho Tôi Đi Theo" (Ngọt):
      // "Này em ơi... cho tôi đi theo với... đến nơi đâu cũng được..."
      const sequence = [
        // Ô nhịp 1: Gmaj7 (Này em ơi...)
        { bass: N.G2, chord: [N.D3, N.G3, N.B3], melody: N.B4, dur: 1.1 },
        { chord: [N.G3, N.B3], melody: N.D5, dur: 0.7 },
        { chord: [N.D3, N.B3], melody: N.B4, dur: 0.9 },
        { chord: [N.G3], melody: N.G4, dur: 1.0 },
        // Ô nhịp 2: Bm7 (Cho tôi đi theo với...)
        { bass: N.B2, chord: [N.Fs3, N.A3, N.D4], melody: N.Fs4, dur: 1.1 },
        { chord: [N.A3, N.D4], melody: N.A4, dur: 0.7 },
        { chord: [N.Fs3, N.D4], melody: N.B4, dur: 0.9 },
        { chord: [N.A3], melody: N.Fs4, dur: 1.0 },
        // Ô nhịp 3: Cmaj7 (Đến nơi đâu cũng được...)
        { bass: N.C3, chord: [N.E3, N.G3, N.B3], melody: N.E4, dur: 1.1 },
        { chord: [N.G3, N.B3], melody: N.G4, dur: 0.7 },
        { chord: [N.E3, N.C4], melody: N.B4, dur: 0.9 },
        { chord: [N.G3], melody: N.A4, dur: 1.0 },
        // Ô nhịp 4: Cm6 -> D7 (Miễn là cùng bên nhau...)
        { bass: N.C3, chord: [N.Eb4, N.G3, N.A3], melody: N.G4, dur: 1.2 },
        { chord: [N.G3, N.C4], melody: N.E4, dur: 0.7 },
        { bass: N.D3, chord: [N.Fs3, N.A3, N.C4], melody: N.Fs4, dur: 1.1 },
        { chord: [N.A3, N.C4], melody: N.D4, dur: 1.2 },
      ];

      const tick = () => {
        if (!this.bgmPlaying || !this.ctx) return;
        const now = this.ctx.currentTime;
        const item = sequence[this.stepIdx % sequence.length];
        this.stepIdx += 1;

        if (item.bass) {
          this.playNote(item.bass, now, 1.4, 0.035, 'sine');
        }
        if (item.chord) {
          item.chord.forEach((f, idx) => {
            this.playNote(f, now + idx * 0.06, 0.9, 0.022, 'triangle');
          });
        }
        if (item.melody) {
          this.playNote(item.melody, now + 0.08, item.dur, 0.042, 'sine');
        }
      };

      tick();
      this.bgmTimer = setInterval(tick, 460);
    } catch { /* ignore */ }
  }

  stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const sfx = new SoundFX();
