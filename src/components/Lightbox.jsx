import { useCallback, useEffect, useRef, useState } from 'react';
import { api, optimized, preloadImageUrl, thumb } from '../api.js';
import { useToast } from './Toast.jsx';
import MusicPlayer from './MusicPlayer.jsx';

/** Lightbox full màn hình + chế độ trình chiếu tự động hoàn toàn Responsive. */
export default function Lightbox({ photos = [], start = 0, autoPlay = false, title, onClose, onDelete, onFrame, onUpdated }) {
  const toast = useToast();
  const [i, setI] = useState(start);
  const [playing, setPlaying] = useState(autoPlay);
  const [livePlaying, setLivePlaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ caption: '', tags: '' });
  const touchStartX = useRef(null);
  const p = photos[i];

  const next = useCallback(() => {
    setLivePlaying(false);
    setI((v) => (v + 1) % photos.length);
  }, [photos.length]);

  const prev = useCallback(() => {
    setLivePlaying(false);
    setI((v) => (v - 1 + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (i >= photos.length) setI(Math.max(0, photos.length - 1));
  }, [photos.length, i]);

  // Slideshow timer
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(next, 3200);
    return () => clearInterval(t);
  }, [playing, next]);

  // Bàn phím
  useEffect(() => {
    const onKey = (e) => {
      if (editing) return;
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') onClose();
      else if (e.key === ' ') {
        e.preventDefault();
        setPlaying((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [next, prev, onClose, editing]);

  // Preload 2 ảnh kế tiếp và 1 ảnh trước đó với cùng độ phân giải chuẩn (1080px) để chuyển ảnh tức thì
  useEffect(() => {
    if (!photos.length) return;
    const indices = [(i + 1) % photos.length, (i + 2) % photos.length, (i - 1 + photos.length) % photos.length];
    indices.forEach((idx) => {
      const ph = photos[idx];
      if (ph?.url) preloadImageUrl(optimized(ph.url));
    });
  }, [i, photos]);

  if (!p) return null;

  const startEdit = () => {
    setPlaying(false);
    setForm({
      caption: p.caption || '',
      tags: (p.tags || []).join(', '),
      locationName: p.locationName || '',
      mapUrl: p.mapUrl || '',
    });
    setEditing(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.updatePhoto(p._id, form);
      toast('Đã cập nhật ảnh thành công ✨');
      setEditing(false);
      onUpdated?.();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 w-screen h-screen bg-black/95 z-[100] flex flex-col justify-between p-3 sm:p-5 select-none overflow-y-auto overflow-x-hidden"
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touchStartX.current ?? 0);
        if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
      }}
    >
      {/* Top Header Responsive */}
      <div className="flex items-center justify-between text-white max-w-6xl mx-auto w-full z-20 flex-shrink-0 gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-serif font-bold text-sm sm:text-lg truncate">{title}</h4>
          <p className="text-[11px] sm:text-xs text-slate-400">
            Bức ảnh {i + 1} / {photos.length}
          </p>
        </div>

        {/* Action Buttons Responsive */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <MusicPlayer autoStart={autoPlay} />
          <button
            title="Sửa ghi chú & tag"
            onClick={startEdit}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-sky-600 transition flex items-center justify-center text-xs sm:text-sm text-white"
          >
            <i className="fa-solid fa-pen" />
          </button>
          <button
            title="Lồng khung địa danh"
            onClick={() => onFrame(p)}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-amber-500 transition flex items-center justify-center text-xs sm:text-sm text-white"
          >
            <i className="fa-solid fa-paintbrush" />
          </button>
          <a
            title="Mở ảnh gốc"
            href={p.url}
            target="_blank"
            rel="noreferrer"
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-emerald-600 transition flex items-center justify-center text-xs sm:text-sm text-white"
          >
            <i className="fa-solid fa-up-right-from-square" />
          </a>
          <button
            title="Xoá ảnh"
            onClick={() => onDelete(p)}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-rose-700 transition flex items-center justify-center text-xs sm:text-sm text-white"
          >
            <i className="fa-solid fa-trash" />
          </button>
          <button
            id="lightbox-close"
            onClick={onClose}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-rose-600 transition flex items-center justify-center text-sm sm:text-base text-white"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="relative flex-grow flex items-center justify-center max-w-6xl mx-auto w-full my-auto px-2">
        {photos.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-1 sm:left-4 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/50 hover:bg-rose-600 text-white backdrop-blur-md transition flex items-center justify-center active:scale-95"
            >
              <i className="fa-solid fa-chevron-left" />
            </button>
            <button
              onClick={next}
              className="absolute right-1 sm:right-4 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/50 hover:bg-rose-600 text-white backdrop-blur-md transition flex items-center justify-center active:scale-95"
            >
              <i className="fa-solid fa-chevron-right" />
            </button>
          </>
        )}

        <div className="relative text-center w-full max-h-[78vh] flex flex-col items-center justify-center">
          {/* Huy hiệu & Nút bật chuyển động cho Apple Live Photo */}
          {p.isLivePhoto && (p.livePhotoUrl || p.videoUrl) && (
            <button
              type="button"
              onClick={() => setLivePlaying(!livePlaying)}
              className={`absolute top-2 left-4 sm:top-4 sm:left-8 z-30 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md transition-all shadow-lg active:scale-95 ${
                livePlaying
                  ? 'bg-rose-500 text-white shadow-rose-500/40 ring-2 ring-white/60'
                  : 'bg-black/60 hover:bg-black/80 text-white/95 border border-white/20'
              }`}
              title="Chạm để phát chuyển động Live Photo"
            >
              <span className={`w-2 h-2 rounded-full ${livePlaying ? 'bg-white animate-ping' : 'bg-rose-400'}`} />
              <span className="font-bold tracking-wider">LIVE</span>
              <span className="text-[10px] opacity-80">{livePlaying ? 'Đang phát' : 'Xem'}</span>
            </button>
          )}

          {p.isVideo ? (
            p.videoUrl?.includes('drive.google.com/file/d/') ? (
              <iframe
                key={p._id || p.videoUrl}
                src={p.videoUrl.replace('/view', '/preview')}
                title={p.caption || 'Video Google Drive'}
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                className="w-full max-w-4xl aspect-video rounded-2xl shadow-2xl mx-auto border-0 bg-black/80"
              />
            ) : (
              <video
                key={p._id || p.videoUrl || p.url}
                src={p.videoUrl || p.url}
                poster={thumb(p.url)}
                controls
                autoPlay
                playsInline
                className="max-h-[64vh] sm:max-h-[72vh] max-w-[92vw] rounded-2xl shadow-2xl mx-auto object-contain transition-all duration-300 bg-black/60"
              />
            )
          ) : livePlaying && (p.livePhotoUrl || p.videoUrl) ? (
            <video
              key={`live-${p._id || p.livePhotoUrl}`}
              src={p.livePhotoUrl || p.videoUrl}
              autoPlay
              loop
              playsInline
              className="max-h-[64vh] sm:max-h-[72vh] max-w-[92vw] rounded-2xl shadow-2xl mx-auto object-contain transition-all duration-300 bg-black/40"
            />
          ) : (
            <img
              key={p._id}
              src={optimized(p.url)}
              alt={p.caption || 'Ảnh kỷ niệm'}
              decoding="async"
              referrerPolicy="no-referrer"
              style={{
                backgroundImage: `url("${thumb(p.url)}")`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
              className="max-h-[64vh] sm:max-h-[72vh] max-w-[92vw] rounded-2xl shadow-2xl mx-auto object-contain transition-all duration-300"
            />
          )}

          {editing ? (
            <form onSubmit={saveEdit} className="mt-3 flex flex-col gap-2 max-w-lg w-full px-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  autoFocus
                  value={form.caption}
                  onChange={(e) => setForm({ ...form, caption: e.target.value })}
                  placeholder="Lời ghi chú yêu thương"
                  className="input text-xs"
                />
                <input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="Tag: biển, hoàng hôn..."
                  className="input text-xs"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  value={form.locationName}
                  onChange={(e) => setForm({ ...form, locationName: e.target.value })}
                  placeholder="Tên địa danh (VD: Tháp Trầm Hương)"
                  className="input text-xs"
                />
                <input
                  value={form.mapUrl}
                  onChange={(e) => setForm({ ...form, mapUrl: e.target.value })}
                  placeholder="Link Google Maps..."
                  className="input text-xs"
                />
              </div>
              <div className="flex gap-2 justify-center pt-1">
                <button type="submit" className="btn-rose py-1.5 px-5 text-xs">
                  Lưu thay đổi
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-1.5 text-slate-300 hover:text-white text-xs border border-slate-700 rounded-xl"
                >
                  Huỷ
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-2.5 max-w-xl px-3 flex flex-col items-center">
              {p.caption && (
                <p className="text-white font-hand text-xl sm:text-2xl drop-shadow line-clamp-2">
                  {p.caption}
                </p>
              )}
              {p.tags?.length > 0 && (
                <p className="text-rose-300/80 text-[11px] sm:text-xs mt-0.5">
                  {p.tags.map((t) => `#${t}`).join('  ')}
                </p>
              )}

              {/* Huy hiệu Google Maps */}
              {(p.locationName || p.mapUrl || (p.lat && p.lng)) && (
                <a
                  href={
                    p.mapUrl ||
                    (p.lat && p.lng
                      ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.locationName)}`)
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-white/15 hover:bg-rose-600 text-white text-xs font-medium backdrop-blur-sm transition border border-white/20 active:scale-95"
                  title="Nhấp để mở vị trí trên Google Maps"
                >
                  <i className="fa-solid fa-location-dot text-rose-400" />
                  <span>{p.locationName || 'Xem vị trí trên Google Maps'}</span>
                  <i className="fa-solid fa-arrow-up-right-from-square text-[10px] opacity-70 ml-0.5" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-center gap-4 text-white pb-1 z-20 flex-shrink-0">
        <button
          id="slideshow-toggle"
          onClick={() => setPlaying((v) => !v)}
          className="px-4 sm:px-6 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg transition active:scale-95"
        >
          <i className={`fa-solid ${playing ? 'fa-pause' : 'fa-play'}`} />
          <span>{playing ? 'Tạm dừng trình chiếu' : 'Bật trình chiếu tự động'}</span>
        </button>
      </div>
    </div>
  );
}
