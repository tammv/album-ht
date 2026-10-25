import { useCallback, useEffect, useRef, useState } from 'react';
import { api, optimized } from '../api.js';
import { useToast } from './Toast.jsx';

/** Lightbox full màn hình + chế độ trình chiếu tự động. */
export default function Lightbox({ photos, start = 0, autoPlay = false, title, onClose, onDelete, onFrame, onUpdated }) {
  const toast = useToast();
  const [i, setI] = useState(start);
  const [playing, setPlaying] = useState(autoPlay);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ caption: '', tags: '' });
  const touchX = useRef(null);
  const p = photos[i];

  const next = useCallback(() => setI((v) => (v + 1) % photos.length), [photos.length]);
  const prev = useCallback(() => setI((v) => (v - 1 + photos.length) % photos.length), [photos.length]);

  useEffect(() => { if (i >= photos.length) setI(Math.max(0, photos.length - 1)); }, [photos.length, i]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(next, 3500);
    return () => clearInterval(t);
  }, [playing, next]);

  useEffect(() => {
    const onKey = (e) => {
      if (editing) return;
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') onClose();
      else if (e.key === ' ') { e.preventDefault(); setPlaying((v) => !v); }
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [next, prev, onClose, editing]);

  // Preload ảnh kế tiếp
  useEffect(() => {
    const n = photos[(i + 1) % photos.length];
    if (n) new Image().src = optimized(n.url);
  }, [i, photos]);

  if (!p) return null;

  const startEdit = () => { setPlaying(false); setForm({ caption: p.caption || '', tags: (p.tags || []).join(', ') }); setEditing(true); };
  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.updatePhoto(p._id, form);
      toast('Đã cập nhật ảnh');
      setEditing(false);
      onUpdated();
    } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between p-4 select-none"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touchX.current ?? 0);
        if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
      }}
    >
      <div className="flex items-center justify-between text-white max-w-6xl mx-auto w-full z-10">
        <div>
          <h4 className="font-serif font-bold text-lg">{title}</h4>
          <p className="text-xs text-slate-400">{i + 1} / {photos.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <button title="Sửa ghi chú & tag" onClick={startEdit} className="w-10 h-10 rounded-full bg-white/10 hover:bg-sky-600 transition"><i className="fa-solid fa-pen" /></button>
          <button title="Lồng khung" onClick={() => onFrame(p)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-amber-500 transition"><i className="fa-solid fa-paintbrush" /></button>
          <a title="Mở ảnh gốc" href={p.url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/10 hover:bg-emerald-600 transition flex items-center justify-center"><i className="fa-solid fa-up-right-from-square" /></a>
          <button title="Xoá" onClick={() => onDelete(p)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-rose-700 transition"><i className="fa-solid fa-trash" /></button>
          <button id="lightbox-close" onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-rose-600 transition"><i className="fa-solid fa-xmark text-lg" /></button>
        </div>
      </div>

      <div className="relative flex-grow flex items-center justify-center max-w-6xl mx-auto w-full">
        {photos.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-0 sm:left-4 z-20 w-12 h-12 rounded-full bg-black/40 hover:bg-rose-600 text-white backdrop-blur-md transition"><i className="fa-solid fa-chevron-left" /></button>
            <button onClick={next} className="absolute right-0 sm:right-4 z-20 w-12 h-12 rounded-full bg-black/40 hover:bg-rose-600 text-white backdrop-blur-md transition"><i className="fa-solid fa-chevron-right" /></button>
          </>
        )}
        <div className="text-center">
          <img key={p._id} src={optimized(p.url)} alt={p.caption || 'Ảnh kỷ niệm'} className="max-h-[72vh] max-w-full rounded-2xl shadow-2xl mx-auto object-contain animate-fade-up" />
          {editing ? (
            <form onSubmit={saveEdit} className="mt-4 flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
              <input autoFocus value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} placeholder="Lời ghi chú" className="input text-xs" />
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="tag1, tag2" className="input text-xs" />
              <button className="btn-rose justify-center">Lưu</button>
              <button type="button" onClick={() => setEditing(false)} className="px-3 text-slate-300 text-xs">Huỷ</button>
            </form>
          ) : (
            <>
              {p.caption && <p className="text-white font-hand text-2xl mt-4">{p.caption}</p>}
              {p.tags?.length > 0 && <p className="text-rose-300/80 text-xs mt-1">{p.tags.map((t) => `#${t}`).join('  ')}</p>}
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 text-white pb-2 z-10">
        <button id="slideshow-toggle" onClick={() => setPlaying((v) => !v)} className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-xs font-semibold flex items-center gap-2 shadow-lg transition">
          <i className={`fa-solid ${playing ? 'fa-pause' : 'fa-play'}`} />
          {playing ? 'Tạm dừng' : 'Trình chiếu'}
        </button>
      </div>
    </div>
  );
}
