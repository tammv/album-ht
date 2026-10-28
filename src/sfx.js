/** Hiệu ứng âm thanh & Nhạc nền Giai điệu "Cho Tôi Đi Theo" (Ngọt) bằng Web Audio API */
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('sfx') !== 'off';
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.stepIdx = 0;
    this.listeners = new Set();

    // Tự động đánh thức AudioContext ngay khi người dùng chạm/nhấp chuột lần đầu
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => { });
        }
      };
      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
    }
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify() {
    this.listeners.forEach((fn) => {
      try {
        fn({ bgmPlaying: this.bgmPlaying, enabled: this.enabled });
      } catch { /* ignore */ }
    });
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => { });
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('sfx', this.enabled ? 'on' : 'off');
    if (!this.enabled) this.stopBgm();
    this.notify();
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
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 3;
      f.frequency.setValueAtTime(800, c.currentTime);
      f.frequency.exponentialRampToValueAtTime(300, c.currentTime + 0.25);
      const g = c.createGain();
      g.gain.setValueAtTime(0.01, c.currentTime);
      g.gain.linearRampToValueAtTime(0.22, c.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
      src.connect(f);
      f.connect(g);
      g.connect(c.destination);
      src.start();
    } catch { /* ignore */ }
  }

  tap() {
    if (!this.enabled) return;
    try {
      this.init();
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.value = 440;
      g.gain.setValueAtTime(0.06, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + 0.06);
    } catch { /* ignore */ }
  }

  unlock() {
    if (!this.enabled) return;
    try {
      this.init();
      const c = this.ctx;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const t = c.currentTime + i * 0.08, o = c.createOscillator(), g = c.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        o.connect(g);
        g.connect(c.destination);
        o.start(t);
        o.stop(t + 0.25);
      });
    } catch { /* ignore */ }
  }

  /**
   * Phát một nốt nhạc ấm áp, rõ tiếng (Acoustic Guitar & Piano)
   */
  playNote(freq, startTime, duration = 0.9, volume = 0.14, type = 'triangle') {
    if (!this.ctx || !freq) return;
    try {
      const c = this.ctx;
      const osc = c.createOscillator();
      const harmonic = c.createOscillator();
      const filter = c.createBiquadFilter();
      const gain = c.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      harmonic.type = 'sine';
      harmonic.frequency.setValueAtTime(freq * 2, startTime);

      const harmGain = c.createGain();
      harmGain.gain.setValueAtTime(volume * 0.25, startTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, startTime);
      filter.frequency.exponentialRampToValueAtTime(900, startTime + duration);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(filter);
      harmonic.connect(harmGain);
      harmGain.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);

      osc.start(startTime);
      harmonic.start(startTime);
      osc.stop(startTime + duration + 0.05);
      harmonic.stop(startTime + duration + 0.05);
    } catch { /* ignore */ }
  }

  /**
   * Bắt đầu phát giai điệu Acoustic "Cho Tôi Đi Theo" - Ngọt (Vòng hợp âm G - Bm7 - Cmaj7 - Cm6/D7)
   */
  startBgm() {
    if (this.bgmPlaying) return;
    try {
      this.enabled = true;
      localStorage.setItem('sfx', 'on');
      this.init();
      this.bgmPlaying = true;
      this.stepIdx = 0;
      this.notify();

      // Tần số các nốt nhạc chuẩn
      const N = {
        G2: 98.0, B2: 123.47, C3: 130.81, D3: 146.83, E3: 164.81, Fs3: 185.0, G3: 196.0, A3: 220.0, B3: 246.94,
        C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, Fs4: 369.99, G4: 392.0, A4: 440.0, B4: 493.88,
        C5: 523.25, D5: 587.33, E5: 659.25,
      };

      // Vòng rải Guitar + Giai điệu "Cho Tôi Đi Theo" (Ngọt):
      // "Này em ơi... cho tôi đi theo với... đến nơi đâu cũng được..."
      const sequence = [
        // Ô nhịp 1: Gmaj7 ("Này em ơi...")
        { bass: N.G3, chord: [N.D4, N.G4, N.B4], melody: N.B4, dur: 1.0 },
        { chord: [N.G3, N.B3], melody: N.D5, dur: 0.7 },
        { chord: [N.D4, N.B4], melody: N.B4, dur: 0.85 },
        { chord: [N.G3, N.D4], melody: N.G4, dur: 0.95 },
        // Ô nhịp 2: Bm7 ("Cho tôi đi theo với...")
        { bass: N.B2, chord: [N.Fs3, N.A3, N.D4], melody: N.Fs4, dur: 1.0 },
        { chord: [N.A3, N.D4], melody: N.A4, dur: 0.7 },
        { chord: [N.Fs3, N.D4], melody: N.B4, dur: 0.85 },
        { chord: [N.A3, N.D4], melody: N.Fs4, dur: 0.95 },
        // Ô nhịp 3: Cmaj7 ("Đến nơi đâu cũng được...")
        { bass: N.C3, chord: [N.E3, N.G3, N.B3], melody: N.E4, dur: 1.0 },
        { chord: [N.G3, N.B3], melody: N.G4, dur: 0.7 },
        { chord: [N.E3, N.C4], melody: N.B4, dur: 0.85 },
        { chord: [N.G3, N.C4], melody: N.A4, dur: 0.95 },
        // Ô nhịp 4: Cm6 -> D7 ("Miễn là cùng bên nhau...")
        { bass: N.C3, chord: [N.Eb4, N.G3, N.A3], melody: N.G4, dur: 1.1 },
        { chord: [N.G3, N.C4], melody: N.E4, dur: 0.7 },
        { bass: N.D3, chord: [N.Fs3, N.A3, N.C4], melody: N.Fs4, dur: 1.0 },
        { chord: [N.A3, N.C4], melody: N.G4, dur: 1.1 },
      ];

      const tick = () => {
        if (!this.bgmPlaying || !this.ctx) return;
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => { });
        }
        const now = this.ctx.currentTime;
        const item = sequence[this.stepIdx % sequence.length];
        this.stepIdx += 1;

        if (item.bass) {
          this.playNote(item.bass, now, 1.3, 0.14, 'triangle');
        }
        if (item.chord) {
          item.chord.forEach((f, idx) => {
            this.playNote(f, now + idx * 0.055, 0.85, 0.09, 'triangle');
          });
        }
        if (item.melody) {
          this.playNote(item.melody, now + 0.07, item.dur, 0.18, 'sine');
        }
      };

      tick();
      this.bgmTimer = setInterval(tick, 440);
    } catch { /* ignore */ }
  }

  stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.notify();
  }
}

export const sfx = new SoundFX();
