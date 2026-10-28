/**
 * Quản lý hiệu ứng âm thanh tương tác nhẹ (lật trang, chạm nút)
 * và Store điều khiển Trình phát nhạc YouTube duy nhất (Singleton) trên toàn ứng dụng.
 */

const DEFAULT_YT_URL = 'https://www.youtube.com/watch?v=U07kJZp5b1o';
const DEFAULT_YT_ID = 'U07kJZp5b1o';
const DEFAULT_YT_TITLE = 'Cho Tôi Đi Theo — Ngọt';

/** Trích xuất YouTube Video ID (11 ký tự) từ mọi dạng link YouTube */
export function extractYouTubeId(input = '') {
  const s = String(input || '').trim();
  if (!s) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

class MusicStore {
  constructor() {
    const savedUrl = localStorage.getItem('yt_bgm_url') || DEFAULT_YT_URL;
    const savedId = extractYouTubeId(savedUrl) || DEFAULT_YT_ID;
    const savedTitle = localStorage.getItem('yt_bgm_title') || DEFAULT_YT_TITLE;

    this.state = {
      playing: false,
      videoId: savedId,
      videoUrl: savedUrl,
      title: savedTitle,
      minimized: false,
    };
    this.listeners = new Set();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    const snapshot = { ...this.state };
    this.listeners.forEach((fn) => {
      try {
        fn(snapshot);
      } catch { /* ignore */ }
    });
  }

  play() {
    if (!this.state.playing) {
      this.state.playing = true;
      this.emit();
    }
  }

  pause() {
    if (this.state.playing) {
      this.state.playing = false;
      this.emit();
    }
  }

  toggle() {
    this.state.playing = !this.state.playing;
    this.emit();
  }

  setMinimized(min) {
    this.state.minimized = Boolean(min);
    this.emit();
  }

  async setYouTubeUrl(rawUrl, customTitle = '') {
    const id = extractYouTubeId(rawUrl);
    if (!id) {
      throw new Error('Link YouTube không hợp lệ. Vui lòng dán link dạng https://www.youtube.com/watch?v=... hoặc https://youtu.be/...');
    }
    const cleanUrl = `https://www.youtube.com/watch?v=${id}`;
    let finalTitle = customTitle.trim();

    if (!finalTitle) {
      try {
        const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(cleanUrl)}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.title) finalTitle = data.title;
        }
      } catch { /* ignore */ }
    }
    if (!finalTitle) finalTitle = `Nhạc Kỷ Niệm (${id})`;

    this.state.videoId = id;
    this.state.videoUrl = cleanUrl;
    this.state.title = finalTitle;
    this.state.playing = true;

    localStorage.setItem('yt_bgm_url', cleanUrl);
    localStorage.setItem('yt_bgm_title', finalTitle);
    this.emit();
    return { videoId: id, videoUrl: cleanUrl, title: finalTitle };
  }
}

export const musicStore = new MusicStore();

/** Hiệu ứng lật trang sách & click nhẹ (không phát nhạc mộc) */
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('sfx') !== 'off';
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  pageFlip() {
    if (!this.enabled) return;
    try {
      this.init();
      const c = this.ctx, size = c.sampleRate * 0.22;
      const buf = c.createBuffer(1, size, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 3;
      f.frequency.setValueAtTime(800, c.currentTime);
      f.frequency.exponentialRampToValueAtTime(300, c.currentTime + 0.22);
      const g = c.createGain();
      g.gain.setValueAtTime(0.01, c.currentTime);
      g.gain.linearRampToValueAtTime(0.18, c.currentTime + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22);
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
      g.gain.setValueAtTime(0.05, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + 0.05);
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
        g.gain.setValueAtTime(0.1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        o.connect(g);
        g.connect(c.destination);
        o.start(t);
        o.stop(t + 0.25);
      });
    } catch { /* ignore */ }
  }
}

export const sfx = new SoundFX();
