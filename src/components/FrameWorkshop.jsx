import { useState } from 'react';
import { optimized } from '../api.js';
import { useToast } from './Toast.jsx';

const FRAMES = {
  hoian: { label: 'Hội An Cổ Kính', dot: 'bg-amber-600', border: '#b45309', bg: '#fffbeb', active: 'border-amber-500 bg-amber-50 text-amber-900' },
  halong: { label: 'Hạ Long Ngọc Bích', dot: 'bg-teal-600', border: '#0f766e', bg: '#f0fdfa', active: 'border-teal-500 bg-teal-50 text-teal-900' },
  polaroid: { label: 'Polaroid Phim', dot: 'bg-rose-400', border: '#ffffff', bg: '#ffffff', active: 'border-rose-400 bg-rose-50 text-rose-900' },
  sapa: { label: 'Sa Pa Thổ Cẩm', dot: 'bg-rose-700', border: '#be123c', bg: '#fff1f2', stripe: '#f59e0b', active: 'border-rose-600 bg-rose-50 text-rose-900' },
  hanoi: { label: 'Hà Nội 36 Phố', dot: 'bg-stone-700', border: '#44403c', bg: '#fafaf9', active: 'border-stone-500 bg-stone-100 text-stone-900' },
  phuquoc: { label: 'Phú Quốc Nắng Vàng', dot: 'bg-sky-500', border: '#0284c7', bg: '#eff6ff', active: 'border-sky-500 bg-sky-50 text-sky-900' },
};
const FILTERS = {
  normal: { label: 'Tự nhiên', css: 'none', cls: 'bg-slate-100 text-slate-700' },
  romantic: { label: 'Ngọt ngào', css: 'saturate(1.15) brightness(1.05) hue-rotate(-5deg)', cls: 'bg-rose-50 text-rose-700' },
  warm: { label: 'Nắng ấm', css: 'sepia(0.25) saturate(1.25) contrast(1.05)', cls: 'bg-amber-50 text-amber-700' },
  vintage: { label: 'Hoài niệm', css: 'sepia(0.55) contrast(1.15) brightness(0.95)', cls: 'bg-stone-100 text-stone-700' },
  bw: { label: 'Đen trắng', css: 'grayscale(1) contrast(1.2)', cls: 'bg-slate-800 text-white' },
};

export default function FrameWorkshop({ photo, album, onClose }) {
  const toast = useToast();
  const [frame, setFrame] = useState('hoian');
  const [filter, setFilter] = useState('normal');
  const [caption, setCaption] = useState(`${album.location.split(',')[0]} ${album.year}`);
  const [sub, setSub] = useState(photo.caption || 'Bên nhau bình yên từng khoảnh khắc 💕');
  const [busy, setBusy] = useState(false);

  /** Vẽ ảnh + khung + chữ lên canvas rồi tải về. */
  const exportImage = async () => {
    setBusy(true);
    try {
      const img = await new Promise((res, rej) => {
        const im = new Image();
        im.crossOrigin = 'anonymous';
        im.onload = () => res(im);
        im.onerror = () => rej(new Error('Không tải được ảnh (ảnh từ URL ngoài có thể chặn CORS)'));
        im.src = optimized(photo.url, 1600);
      });
      await document.fonts.ready;
      const f = FRAMES[frame];
      const W = img.naturalWidth, H = img.naturalHeight;
      const unit = Math.round(W / 40);
      const border = frame === 'polaroid' ? unit : unit * 1.4;
      const inner = unit * 0.8;
      const captionH = unit * 5;
      const cw = W + (border + inner) * 2;
      const ch = H + (border + inner) * 2 + captionH;
      const canvas = document.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      const ctx = canvas.getContext('2d');

      // Viền
      if (f.stripe) {
        const pat = document.createElement('canvas'); pat.width = pat.height = unit * 3;
        const pc = pat.getContext('2d');
        pc.fillStyle = f.border; pc.fillRect(0, 0, pat.width, pat.height);
        pc.strokeStyle = f.stripe; pc.lineWidth = unit * 0.75;
        for (let k = -1; k <= 2; k++) { pc.beginPath(); pc.moveTo(k * pat.width, pat.height); pc.lineTo((k + 1) * pat.width, 0); pc.stroke(); }
        ctx.fillStyle = ctx.createPattern(pat, 'repeat');
      } else ctx.fillStyle = f.border;
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = f.bg;
      ctx.fillRect(border, border, cw - border * 2, ch - border * 2);

      // Ảnh
      ctx.filter = FILTERS[filter].css;
      ctx.drawImage(img, border + inner, border + inner, W, H);
      ctx.filter = 'none';

      // Chữ
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      ctx.font = `700 ${unit * 1.6}px "Playfair Display", serif`;
      const y = border + inner + H + captionH * 0.45;
      ctx.fillText(caption, cw / 2, y);
      ctx.fillStyle = '#e11d48';
      ctx.font = `600 ${unit * 1.4}px "Dancing Script", cursive`;
      ctx.fillText(sub, cw / 2, y + unit * 2);

      const a = document.createElement('a');
      a.download = `ky-niem-${frame}-${Date.now()}.jpg`;
      a.href = canvas.toDataURL('image/jpeg', 0.92);
      a.click();
      toast('Đã tải ảnh lồng khung về máy 🎁');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card max-w-4xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-serif font-bold text-xl text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-paintbrush text-rose-500" /> Xưởng Lồng Khung Kỷ Niệm Việt Nam
            </h3>
            <p className="text-xs text-slate-500">Chọn phong cách địa danh Việt Nam cho bức ảnh của hai đứa</p>
          </div>
          <button id="frame-close" onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg"><i className="fa-solid fa-xmark" /></button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          <div className="lg:col-span-7 bg-slate-100 rounded-2xl p-6 flex items-center justify-center min-h-[360px] border border-slate-200">
            <div className={`frame-${frame} transition-all duration-300 text-center max-w-full`}>
              <div className="overflow-hidden rounded-sm">
                <img src={optimized(photo.url, 1000)} alt="Kỷ niệm đôi ta" style={{ filter: FILTERS[filter].css }} className="max-h-[300px] w-auto object-cover transition-all duration-300 mx-auto" />
              </div>
              <div className="pt-3 pb-1">
                <h4 className="font-serif font-bold text-sm text-slate-900">{caption}</h4>
                <p className="text-sm font-hand text-rose-600 mt-0.5">{sub}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">1. Chọn Kiểu Khung Danh Thắng</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(FRAMES).map(([k, f]) => (
                  <button key={k} id={`frame-${k}`} onClick={() => setFrame(k)} className={`p-2.5 rounded-xl font-medium text-left flex items-center gap-2 transition ${frame === k ? `border-2 ${f.active}` : 'border border-slate-200 text-slate-700 hover:border-slate-400'}`}>
                    <span className={`w-3 h-3 rounded-full ${f.dot} ${k === 'polaroid' ? 'ring-1 ring-slate-300' : ''}`} /> {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">2. Bộ Lọc Màu Ảnh</label>
              <div className="grid grid-cols-5 gap-1.5 text-[11px] text-center font-medium">
                {Object.entries(FILTERS).map(([k, f]) => (
                  <button key={k} onClick={() => setFilter(k)} className={`py-1.5 px-1 rounded-lg transition ${f.cls} ${filter === k ? 'ring-2 ring-rose-500' : 'hover:opacity-80'}`}>{f.label}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">3. Lời Tựa Cho Bức Ảnh</label>
              <input id="workshop-caption" value={caption} onChange={(e) => setCaption(e.target.value)} className="input text-xs" placeholder="Hội An 2024" />
              <input id="workshop-sub" value={sub} onChange={(e) => setSub(e.target.value)} className="input text-xs" placeholder="Lời thương..." />
            </div>
            <button id="frame-export" onClick={exportImage} disabled={busy} className="btn-rose w-full justify-center py-3">
              <i className={`fa-solid ${busy ? 'fa-spinner fa-spin' : 'fa-download'}`} /> Tải Ảnh Đã Lồng Khung Về Máy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
